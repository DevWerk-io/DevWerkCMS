import { Router } from 'express';
import documentsRouter from './documents.routes.js';


const router = Router();
router.use('/documents', documentsRouter);
router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));


export default router;