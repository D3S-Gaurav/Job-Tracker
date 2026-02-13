import { Router } from 'express';

const router = Router();

// Stub routes to fix imports
router.get('/', (req, res) => { res.json({ message: 'List jobs' }) });
router.post('/', (req, res) => { res.json({ message: 'Create job' }) });

export default router;
