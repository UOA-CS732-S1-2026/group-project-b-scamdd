import { z } from 'zod';
import { MAX_AMOUNT, MAX_NAME, budgetPeriodSchema, objectIdLikeString } from './common.js';

const ALLOWED = [
  'food',
  'rent',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'other',
] as const;
const shareableCategory = z.enum(ALLOWED);

const limit = z.number().positive().finite().max(MAX_AMOUNT);

export const createSharedBudgetSchema = z.object({
  name: z.string().max(MAX_NAME).optional(),
  category: shareableCategory,
  monthlyLimit: limit,
  period: budgetPeriodSchema.optional(),
  inviteUserIds: z.array(objectIdLikeString).min(1).max(50),
});

export const updateSharedBudgetSchema = z
  .object({
    name: z.string().max(MAX_NAME).optional(),
    monthlyLimit: limit.optional(),
    period: budgetPeriodSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'no updates supplied' });

export const inviteSchema = z.object({
  userIds: z.array(objectIdLikeString).min(1).max(50),
});
