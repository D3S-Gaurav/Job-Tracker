import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError, successResponse } from '../lib/errors';
import { createJobSchema, updateJobSchema, paginationSchema } from '../lib/validators';
import { createAuditLog, AuditAction, AuditEntity } from '../lib/audit';

/**
 * POST /api/jobs
 * Creates a new job application entry.
 */
export const createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = createJobSchema.parse(req.body);

        const job = await prisma.job.create({
            data: {
                title: data.title,
                company: data.company,
                description: data.description || null,
                location: data.location || null,
                salary: data.salary || null,
                url: data.url || null,
                notes: data.notes || null,
                status: data.status || 'APPLIED',
                jobType: data.jobType || 'FULL_TIME',
                priority: data.priority || 'MEDIUM',
                appliedDate: data.appliedDate ? new Date(data.appliedDate) : null,
                interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
                offerDeadline: data.offerDeadline ? new Date(data.offerDeadline) : null,
                contactName: data.contactName || null,
                contactEmail: data.contactEmail || null,
                userId: req.user!.id,
            },
        });

        await createAuditLog({
            action: AuditAction.JOB_CREATE,
            entity: AuditEntity.JOB,
            entityId: job.id,
            userId: req.user!.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { title: job.title, company: job.company },
        });

        res.status(201).json(successResponse(job, 'Job created successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/jobs
 * Lists jobs for the authenticated user with pagination, filtering, and search.
 */
export const getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, sortBy, sortOrder, search, status, jobType, priority } =
            paginationSchema.parse(req.query);

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            userId: req.user!.id,
        };

        if (status) where.status = status;
        if (jobType) where.jobType = jobType;
        if (priority) where.priority = priority;

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Validate sortBy field
        const allowedSortFields = [
            'createdAt', 'updatedAt', 'title', 'company',
            'status', 'priority', 'appliedDate'
        ];
        const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [actualSortBy]: sortOrder },
            }),
            prisma.job.count({ where }),
        ]);

        res.json(
            successResponse(jobs, undefined, {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            })
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/jobs/stats
 * Returns job statistics for the authenticated user.
 */
export const getJobStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;

        const [
            totalJobs,
            statusCounts,
            typeCounts,
            priorityCounts,
            recentJobs
        ] = await Promise.all([
            prisma.job.count({ where: { userId } }),
            prisma.job.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
            }),
            prisma.job.groupBy({
                by: ['jobType'],
                where: { userId },
                _count: { jobType: true },
            }),
            prisma.job.groupBy({
                by: ['priority'],
                where: { userId },
                _count: { priority: true },
            }),
            prisma.job.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    company: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        const stats = {
            total: totalJobs,
            byStatus: statusCounts.reduce((acc: any, item: any) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {}),
            byType: typeCounts.reduce((acc: any, item: any) => {
                acc[item.jobType] = item._count.jobType;
                return acc;
            }, {}),
            byPriority: priorityCounts.reduce((acc: any, item: any) => {
                acc[item.priority] = item._count.priority;
                return acc;
            }, {}),
            recentJobs,
        };

        res.json(successResponse(stats));
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/jobs/:id
 * Gets a single job by ID (owned by the authenticated user).
 */
export const getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;

        const job = await prisma.job.findUnique({ where: { id } });

        if (!job) {
            throw AppError.notFound('Job not found');
        }

        // Ensure ownership (unless admin)
        if (job.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('You do not have access to this job');
        }

        res.json(successResponse(job));
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/jobs/:id
 * Updates a job by ID.
 */
export const updateJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const data = updateJobSchema.parse(req.body);

        // Check ownership
        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) {
            throw AppError.notFound('Job not found');
        }
        if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('You do not have access to this job');
        }

        const updateData: any = { ...data };
        if (data.appliedDate) updateData.appliedDate = new Date(data.appliedDate);
        if (data.interviewDate) updateData.interviewDate = new Date(data.interviewDate);
        if (data.offerDeadline) updateData.offerDeadline = new Date(data.offerDeadline);

        // Clean empty strings
        for (const key of Object.keys(updateData)) {
            if (updateData[key] === '') updateData[key] = null;
        }

        const job = await prisma.job.update({
            where: { id },
            data: updateData,
        });

        await createAuditLog({
            action: AuditAction.JOB_UPDATE,
            entity: AuditEntity.JOB,
            entityId: job.id,
            userId: req.user!.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { changes: Object.keys(data) },
        });

        res.json(successResponse(job, 'Job updated successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/jobs/:id
 * Deletes a job by ID.
 */
export const deleteJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) {
            throw AppError.notFound('Job not found');
        }
        if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('You do not have access to this job');
        }

        await prisma.job.delete({ where: { id } });

        await createAuditLog({
            action: AuditAction.JOB_DELETE,
            entity: AuditEntity.JOB,
            entityId: id,
            userId: req.user!.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { title: existing.title, company: existing.company },
        });

        res.json(successResponse(null, 'Job deleted successfully'));
    } catch (error) {
        next(error);
    }
};
