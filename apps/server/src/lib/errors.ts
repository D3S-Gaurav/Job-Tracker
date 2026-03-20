/**
 * Custom application error class with HTTP status codes.
 * Used throughout the application for consistent error handling.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }

    // ─── Common Error Factories ─────────────────────────────────────────

    static badRequest(message: string = 'Bad Request', code: string = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    static notFound(message: string = 'Not Found', code: string = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }

    static conflict(message: string = 'Conflict', code: string = 'CONFLICT') {
        return new AppError(message, 409, code);
    }

    static tooManyRequests(message: string = 'Too many requests', code: string = 'RATE_LIMIT') {
        return new AppError(message, 429, code);
    }

    static internal(message: string = 'Internal Server Error', code: string = 'INTERNAL_ERROR') {
        return new AppError(message, 500, code, false);
    }

    static validation(message: string = 'Validation Error', code: string = 'VALIDATION_ERROR') {
        return new AppError(message, 422, code);
    }
}

/**
 * Standard API response format.
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
    requestId?: string;
}

/**
 * Creates a success response.
 */
export function successResponse<T>(data: T, message?: string, meta?: ApiResponse['meta']): ApiResponse<T> {
    return {
        success: true,
        data,
        message,
        meta,
    };
}

/**
 * Creates an error response.
 */
export function errorResponse(code: string, message: string, details?: any): ApiResponse {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
    };
}
