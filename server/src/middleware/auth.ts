import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { HttpError } from '../lib/httpError.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  try {
    session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  } catch (err) {
    next(new HttpError(502, 'Auth service unavailable', { cause: String(err) }));
    return;
  }
  if (!session) {
    next(HttpError.unauthorized());
    return;
  }
  req.user = { _id: session.user.id };
  next();
}
