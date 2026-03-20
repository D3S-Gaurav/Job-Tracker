import prisma from './prisma';

interface AuditLogParams {
    action: string;
    entity: string;
    entityId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

/**
 * Creates an audit log entry in the database.
 * Fire-and-forget: errors are caught and logged silently
 * to avoid disrupting the main request flow.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                userId: params.userId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                metadata: params.metadata ?? undefined,
            },
        });
    } catch (error) {
        // Silent fail — audit logs should never break the app
        console.error('[AUDIT] Failed to write audit log:', error);
    }
}

// Convenience constants
export const AuditAction = {
    // Auth
    REGISTER: 'REGISTER',
    LOGIN: 'LOGIN',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    TOKEN_REFRESH: 'TOKEN_REFRESH',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

    // Jobs
    JOB_CREATE: 'JOB_CREATE',
    JOB_UPDATE: 'JOB_UPDATE',
    JOB_DELETE: 'JOB_DELETE',

    // Admin
    USER_DEACTIVATE: 'USER_DEACTIVATE',
    USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
} as const;

export const AuditEntity = {
    USER: 'USER',
    JOB: 'JOB',
    TOKEN: 'TOKEN',
} as const;
