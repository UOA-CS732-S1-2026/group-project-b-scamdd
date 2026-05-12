import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const t0 = Date.now();
  console.log('[requireAuth] start');
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    console.log(`[requireAuth] getSession resolved in ${Date.now() - t0}ms, hasSession=${!!session}`);
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    req.user = { _id: session.user.id };
    next();
  } catch (err) {
    console.error(`[requireAuth] error after ${Date.now() - t0}ms:`, err);
    res.status(500).json({ message: 'Auth check failed' });
  }
}
