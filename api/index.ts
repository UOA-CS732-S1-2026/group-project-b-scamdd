import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/src/app.js';
import { ensureBootstrapped } from '../server/src/bootstrap.js';

// One-time, idempotent bootstrap. Cron is intentionally OFF here — Vercel
// functions are serverless and cannot host long-running schedulers. The
// monthly cron must be invoked from a separate scheduled job (Vercel Cron
// Jobs or an external scheduler that POSTs an authorized trigger).
ensureBootstrapped({ withCron: false });

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (r: VercelRequest, s: VercelResponse) => void)(req, res);
}
