import { z } from 'zod';
import { MAX_AMOUNT, MAX_NAME, budgetPeriodSchema } from './common.js';

const limit = z
  .number()
  .positive('limit must be a positive number')
  .finite()
  .max(MAX_AMOUNT, `limit must be <= ${MAX_AMOUNT}`);

const categoryField = z
  .string()
  .min(1, 'category is required')
  .max(MAX_NAME)
  .refine((c) => c !== 'emergency', { message: 'Emergency cannot have a budget' });

export const createBudgetSchema = z.object({
  category: categoryField,
  monthlyLimit: limit,
  period: budgetPeriodSchema.optional(),
  isPublic: z.boolean().optional(),
});

export const updateBudgetSchema = z
  .object({
    category: categoryField.optional(),
    monthlyLimit: limit.optional(),
    period: budgetPeriodSchema.optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'no updates supplied' });
