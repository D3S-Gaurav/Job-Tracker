import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { encryptRole, generateSecureToken } from '../lib/crypto';
import { AppError, successResponse } from '../lib/errors';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } from '../lib/validators';
import { createAuditLog, AuditAction, AuditEntity } from '../lib/audit';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

/**
 * Generates access and refresh tokens for a user.
 */
async function generateTokens(user: { id: string; role: string }, req: Request) {
    // Access token (short-lived)
    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Refresh token (long-lived, stored in DB)
    const refreshTokenValue = generateSecureToken(64);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenValue,
            userId: user.id,
            expiresAt,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || null,
        },
    });

    return { accessToken, refreshToken: refreshTokenValue, expiresAt };
}

/**
 * POST /api/auth/register
 * Registers a new user with encrypted role.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password, name, role } = registerSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw AppError.conflict('An account with this email already exists');
        }

        // Hash password and encrypt role
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const userRole = role || 'USER';
        const encryptedRoleValue = encryptRole(userRole);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                name: name || null,
                password: hashedPassword,
                role: userRole,
                encryptedRole: encryptedRoleValue,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        // Audit log
        await createAuditLog({
            action: AuditAction.REGISTER,
            entity: AuditEntity.USER,
            entityId: user.id,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { email: user.email },
        });

        res.status(201).json(
            successResponse(user, 'Account created successfully')
        );
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Authenticates user and returns access + refresh tokens.
 * Implements account lockout after max failed attempts.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw AppError.unauthorized('Invalid email or password');
        }

        if (!user.isActive) {
            throw AppError.forbidden('This account has been deactivated');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);

            await createAuditLog({
                action: AuditAction.LOGIN_FAILED,
                entity: AuditEntity.USER,
                entityId: user.id,
                userId: user.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'Account locked', minutesLeft },
            });

            throw AppError.tooManyRequests(
                `Account is locked. Please try again in ${minutesLeft} minute(s).`
            );
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Increment failed attempts
            const failedAttempts = user.failedLoginAttempts + 1;
            const updateData: any = { failedLoginAttempts: failedAttempts };

            // Lock account after max attempts
            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

                await createAuditLog({
                    action: AuditAction.ACCOUNT_LOCKED,
                    entity: AuditEntity.USER,
                    entityId: user.id,
                    userId: user.id,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { failedAttempts, lockDurationMinutes: LOCK_DURATION_MINUTES },
                });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });

            await createAuditLog({
                action: AuditAction.LOGIN_FAILED,
                entity: AuditEntity.USER,
                entityId: user.id,
                userId: user.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { failedAttempts },
            });

            throw AppError.unauthorized('Invalid email or password');
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });

        // Generate tokens
        const tokens = await generateTokens(user, req);

        // Audit log
        await createAuditLog({
            action: AuditAction.LOGIN,
            entity: AuditEntity.USER,
            entityId: user.id,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.json(
            successResponse({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            }, 'Login successful')
        );
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/refresh
 * Issues a new access token using a valid refresh token.
 * Implements refresh token rotation.
 */
export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);

        // Find the refresh token
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { select: { id: true, role: true, isActive: true } } },
        });

        if (!storedToken) {
            throw AppError.unauthorized('Invalid refresh token');
        }

        if (storedToken.isRevoked) {
            // Potential token theft — revoke ALL tokens for this user
            await prisma.refreshToken.updateMany({
                where: { userId: storedToken.userId },
                data: { isRevoked: true },
            });
            throw AppError.unauthorized('Refresh token has been revoked. All sessions terminated.');
        }

        if (storedToken.expiresAt < new Date()) {
            throw AppError.unauthorized('Refresh token has expired. Please log in again.');
        }

        if (!storedToken.user.isActive) {
            throw AppError.forbidden('Account has been deactivated');
        }

        // Rotate: revoke old token and issue new pair
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true },
        });

        const tokens = await generateTokens(storedToken.user, req);

        await createAuditLog({
            action: AuditAction.TOKEN_REFRESH,
            entity: AuditEntity.TOKEN,
            entityId: storedToken.id,
            userId: storedToken.userId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.json(
            successResponse({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
            }, 'Token refreshed')
        );
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 * Revokes the refresh token and ends the session.
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true },
            });
        }

        await createAuditLog({
            action: AuditAction.LOGOUT,
            entity: AuditEntity.USER,
            userId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.json(successResponse(null, 'Logged out successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
                _count: { select: { jobs: true } },
            },
        });

        if (!user) {
            throw AppError.notFound('User not found');
        }

        res.json(successResponse(user));
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/auth/password
 * Changes the authenticated user's password.
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!user) throw AppError.notFound('User not found');

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw AppError.unauthorized('Current password is incorrect');

        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Revoke all refresh tokens (force re-login on all devices)
        await prisma.refreshToken.updateMany({
            where: { userId: user.id },
            data: { isRevoked: true },
        });

        await createAuditLog({
            action: AuditAction.PASSWORD_CHANGE,
            entity: AuditEntity.USER,
            entityId: user.id,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.json(successResponse(null, 'Password changed successfully. Please log in again.'));
    } catch (error) {
        next(error);
    }
};
