import { Router } from 'express';
import {
    register,
    login,
    refreshAccessToken,
    logout,
    getMe,
    changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, strictLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// ─── Public Routes (rate-limited) ───────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshAccessToken);

// ─── Protected Routes ───────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, strictLimiter, changePassword);

export default router;
