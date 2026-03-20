import { Router } from 'express';
import {
    createJob,
    getJobs,
    getJobById,
    getJobStats,
    updateJob,
    deleteJob,
} from '../controllers/job.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// ─── Job CRUD ───────────────────────────────────────────────────────────────
router.post('/', createJob);
router.get('/', getJobs);
router.get('/stats', getJobStats);       // Must be before /:id
router.get('/:id', getJobById);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
