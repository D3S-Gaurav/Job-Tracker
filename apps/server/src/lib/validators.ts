import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    role: z.enum(['USER', 'ADMIN', 'MANAGER']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ─── Job Schemas ────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
    title: z.string().min(1, 'Job title is required').max(200),
    company: z.string().min(1, 'Company name is required').max(200),
    description: z.string().max(5000).optional(),
    location: z.string().max(200).optional(),
    salary: z.string().max(100).optional(),
    url: z.string().url('Invalid URL').optional().or(z.literal('')),
    notes: z.string().max(5000).optional(),
    status: z.enum([
        'SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW',
        'TECHNICAL', 'OFFER', 'ACCEPTED', 'REJECTED',
        'WITHDRAWN', 'GHOSTED'
    ]).optional(),
    jobType: z.enum([
        'FULL_TIME', 'PART_TIME', 'CONTRACT',
        'INTERNSHIP', 'FREELANCE', 'REMOTE'
    ]).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    appliedDate: z.string().datetime().optional().or(z.literal('')),
    interviewDate: z.string().datetime().optional().or(z.literal('')),
    offerDeadline: z.string().datetime().optional().or(z.literal('')),
    contactName: z.string().max(200).optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
});

export const updateJobSchema = createJobSchema.partial();

// ─── Query Schemas ──────────────────────────────────────────────────────────

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    status: z.enum([
        'SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW',
        'TECHNICAL', 'OFFER', 'ACCEPTED', 'REJECTED',
        'WITHDRAWN', 'GHOSTED'
    ]).optional(),
    jobType: z.enum([
        'FULL_TIME', 'PART_TIME', 'CONTRACT',
        'INTERNSHIP', 'FREELANCE', 'REMOTE'
    ]).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
