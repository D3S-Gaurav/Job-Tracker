import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Assigns a unique request ID to every incoming request.
 * Used for log correlation and traceability.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};

/**
 * Security headers middleware (supplements Helmet).
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};

/**
 * Request sanitizer - strips dangerous characters from string inputs.
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};

function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        // Strip script tags and common XSS vectors
        return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/on\w+\s*=\s*'[^']*'/gi, '');
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
}
