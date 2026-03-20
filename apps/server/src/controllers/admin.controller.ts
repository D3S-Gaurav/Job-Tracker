import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { encryptRole } from '../lib/crypto';
import { AppError, successResponse } from '../lib/errors';
import { createAuditLog, AuditAction, AuditEntity } from '../lib/audit';
import { paginationSchema } from '../lib/validators';

/**
 * GET /api/admin/users
 * Lists all users (admin only) with pagination.
 */
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, search } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    lastLoginAt: true,
                    createdAt: true,
                    _count: { select: { jobs: true } },
                },
            }),
            prisma.user.count({ where }),
        ]);

        res.json(
            successResponse(users, undefined, {
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
 * PUT /api/admin/users/:id/role
 * Changes a user's role (admin only). Re-encrypts the role.
 */
export const changeUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { role } = req.body;

        if (!['USER', 'ADMIN', 'MANAGER'].includes(role)) {
            throw AppError.badRequest('Invalid role. Must be USER, ADMIN, or MANAGER');
        }

        // Prevent admins from changing their own role
        if (id === req.user!.id) {
            throw AppError.badRequest('Cannot change your own role');
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) throw AppError.notFound('User not found');

        const encryptedRoleValue = encryptRole(role);

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role, encryptedRole: encryptedRoleValue },
            select: { id: true, email: true, name: true, role: true },
        });

        await createAuditLog({
            action: AuditAction.USER_ROLE_CHANGE,
            entity: AuditEntity.USER,
            entityId: id,
            userId: req.user!.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { previousRole: user.role, newRole: role },
        });

        res.json(successResponse(updatedUser, 'User role updated successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/admin/users/:id/status
 * Activates or deactivates a user (admin only).
 */
export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            throw AppError.badRequest('isActive must be a boolean');
        }

        if (id === req.user!.id) {
            throw AppError.badRequest('Cannot deactivate your own account');
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) throw AppError.notFound('User not found');

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: { id: true, email: true, name: true, isActive: true },
        });

        // If deactivating, revoke all refresh tokens
        if (!isActive) {
            await prisma.refreshToken.updateMany({
                where: { userId: id },
                data: { isRevoked: true },
            });
        }

        await createAuditLog({
            action: AuditAction.USER_DEACTIVATE,
            entity: AuditEntity.USER,
            entityId: id,
            userId: req.user!.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { isActive },
        });

        res.json(successResponse(updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/audit-logs
 * Lists audit logs with pagination (admin only).
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const skip = (page - 1) * limit;

        const { action, entity, userId } = req.query as any;

        const where: any = {};
        if (action) where.action = action;
        if (entity) where.entity = entity;
        if (userId) where.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, name: true },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json(
            successResponse(logs, undefined, {
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
 * GET /api/admin/dashboard
 * Returns admin dashboard statistics.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalJobs,
            recentLogins,
            jobsByStatus,
            newUsersThisWeek,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.job.count(),
            prisma.auditLog.count({
                where: {
                    action: 'LOGIN',
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            prisma.job.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            prisma.user.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        res.json(
            successResponse({
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                totalJobs,
                loginsLast24h: recentLogins,
                newUsersThisWeek,
                jobsByStatus: jobsByStatus.reduce((acc: any, item: any) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {}),
            })
        );
    } catch (error) {
        next(error);
    }
};
