import { Router } from 'express';
import { handleEventStream } from '../lib/live-events.js';

const router = Router();

router.get('/', handleEventStream);

export default router;
