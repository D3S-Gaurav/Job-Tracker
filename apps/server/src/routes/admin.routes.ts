import { Router } from 'express';
import {
    listUsers,
    changeUserRole,
    toggleUserStatus,
    getAuditLogs,
    getDashboardStats,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// ─── Admin Routes ───────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);
router.get('/users', listUsers);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/status', toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

export default router;
