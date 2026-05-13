import { z } from 'zod';

export const MAX_AMOUNT = 1e9;
export const MAX_TITLE = 200;
export const MAX_NOTE = 1000;
export const MAX_NAME = 60;

export const objectIdLikeString = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'must be an id');

export const idParam = z.object({
  id: objectIdLikeString,
});

export const amountSchema = z
  .number()
  .positive('amount must be positive')
  .finite()
  .max(MAX_AMOUNT, `amount must be <= ${MAX_AMOUNT}`);

export const optionalAmount = amountSchema.optional();

export const dateInput = z.union([
  z.string().min(1),
  z.date(),
]);

export const trimmedString = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max));

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => (s === undefined ? undefined : s.trim() || undefined));

export const budgetPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().max(10000).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});
