import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError, errorResponse } from '../lib/errors';

/**
 * Global error handling middleware.
 * Catches all errors and returns a standardized JSON response.
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Log the error
    console.error(`[ERROR] ${req.method} ${req.path}:`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        requestId: req.requestId,
    });

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
        const details = (err as any).issues?.map((e: any) => ({
            field: e.path?.join('.') || '',
            message: e.message,
        })) || (err as any).errors?.map((e: any) => ({
            field: e.path?.join('.') || '',
            message: e.message,
        })) || [];

        res.status(422).json(
            errorResponse(
                'VALIDATION_ERROR',
                'Validation failed',
                details
            )
        );
        return;
    }

    // Handle our custom AppError
    if (err instanceof AppError) {
        res.status(err.statusCode).json(
            errorResponse(err.code, err.message)
        );
        return;
    }

    // Handle Prisma errors
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as any;
        if (prismaError.code === 'P2002') {
            res.status(409).json(
                errorResponse('CONFLICT', 'A record with this data already exists')
            );
            return;
        }
        if (prismaError.code === 'P2025') {
            res.status(404).json(
                errorResponse('NOT_FOUND', 'Record not found')
            );
            return;
        }
    }

    // Default 500 error
    res.status(500).json(
        errorResponse(
            'INTERNAL_ERROR',
            process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message
        )
    );
};
