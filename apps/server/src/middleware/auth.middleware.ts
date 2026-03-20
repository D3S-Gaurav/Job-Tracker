import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { verifyRole } from '../lib/crypto';
import { AppError } from '../lib/errors';

// Extend Express Request with authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                name?: string | null;
            };
            requestId?: string;
        }
    }
}

interface JWTPayload {
    id: string;
    role: string;
    iat: number;
    exp: number;
}

/**
 * Authentication middleware.
 * Verifies the JWT token and attaches user info to the request.
 * Also performs encrypted role integrity verification.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw AppError.unauthorized('No token provided. Please log in.');
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;

        // Fetch user from DB to ensure they still exist and are active
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                isActive: true,
                encryptedRole: true,
            },
        });

        if (!user) {
            throw AppError.unauthorized('User no longer exists');
        }

        if (!user.isActive) {
            throw AppError.forbidden('Account has been deactivated');
        }

        // ─── Encrypted Role Integrity Check ─────────────────────────────
        // If the user has an encrypted role, verify it matches
        if (user.encryptedRole) {
            const roleValid = verifyRole(user.role, user.encryptedRole);
            if (!roleValid) {
                console.error(`[SECURITY] Role integrity check failed for user ${user.id}`);
                throw AppError.forbidden('Role verification failed. Contact an administrator.');
            }
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error instanceof jwt.JsonWebTokenError) {
            next(AppError.unauthorized('Invalid token'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(AppError.unauthorized('Token expired. Please refresh or log in again.'));
        } else {
            next(AppError.unauthorized('Authentication failed'));
        }
    }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
 */
export const requireRole = (...roles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(AppError.unauthorized('Authentication required'));
        }

        if (!roles.includes(req.user.role)) {
            return next(AppError.forbidden(`Access denied. Required role: ${roles.join(' or ')}`));
        }

        next();
    };
};
