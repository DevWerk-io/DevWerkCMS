import { Router } from 'express';
import multer from 'multer';
import * as DocumentsController from '../controllers/documents.controller.js';

const router = Router();
const upload = multer();

router.post('/ingest', upload.single('file'), DocumentsController.ingest);
router.post('/ingest-batch', upload.array('files'), DocumentsController.ingestBatch);

router.get('/', DocumentsController.list);          // Paging + Filter + Sort
router.get('/keywords', DocumentsController.keywords); // Distinct Keywords (für Filter-UI)

export default router;
