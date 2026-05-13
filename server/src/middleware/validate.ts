import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { HttpError } from '../lib/httpError.js';

type Schemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

function formatZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const VALIDATED = Symbol.for('felt.validated');

type ValidatedBag = { body?: unknown; params?: unknown; query?: unknown };

export function getValidated<T>(req: Request, slot: keyof ValidatedBag): T {
  const bag = (req as unknown as Record<symbol, ValidatedBag>)[VALIDATED];
  return bag?.[slot] as T;
}

export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const bag: ValidatedBag = ((req as unknown as Record<symbol, ValidatedBag>)[VALIDATED] ??= {});
      if (schemas.body) {
        const parsed = schemas.body.parse(req.body);
        req.body = parsed;
        bag.body = parsed;
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        Object.assign(req.params, parsed);
        bag.params = parsed;
      }
      if (schemas.query) {
        // Express 5 makes req.query read-only. Stash the coerced result on a
        // symbol property and let handlers read via getValidated.
        const parsed = schemas.query.parse(req.query);
        bag.query = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(HttpError.badRequest('Validation failed', formatZodError(err)));
        return;
      }
      next(err);
    }
  };
}
