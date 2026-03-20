import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT',
            message: 'Too many requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints.
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT',
            message: 'Too many authentication attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Even stricter limiter for sensitive operations.
 * 5 requests per hour per IP.
 */
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT',
            message: 'Rate limit exceeded for this operation. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
