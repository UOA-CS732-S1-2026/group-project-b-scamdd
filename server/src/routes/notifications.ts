import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { registerClient } from '../lib/notificationBus';

const router = Router();
router.use(requireAuth);

router.get('/stream', (req: Request, res: Response) => {
  const userId = req.user!._id;

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`retry: 5000\n\n`);
  res.write(`: connected\n\n`);

  const cleanup = registerClient(userId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      /* ignore */
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    cleanup();
    res.end();
  });
});

export default router;
