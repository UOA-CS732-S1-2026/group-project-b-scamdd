import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(HttpError.notFound(`Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  let status = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = err.message;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (
    err instanceof Error &&
    (err.name === 'MongoServerError' || err.name === 'MongoNetworkError')
  ) {
    status = 502;
    message = 'Database error';
  }

  const logPayload = {
    err,
    method: req.method,
    path: req.path,
    userId: req.user?._id,
    status,
  };
  if (status >= 500) logger.error(logPayload, message);
  else logger.warn(logPayload, message);

  const body: { message: string; details?: unknown } = { message };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}
