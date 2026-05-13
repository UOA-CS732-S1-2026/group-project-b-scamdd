import { z } from 'zod';
import {
  MAX_AMOUNT,
  MAX_NAME,
  amountSchema,
  dateInput,
  trimmedString,
} from './common.js';

const nonNegativeAmount = z
  .number()
  .nonnegative('must be a non-negative number')
  .finite()
  .max(MAX_AMOUNT, `must be <= ${MAX_AMOUNT}`);

export const createGoalSchema = z.object({
  name: trimmedString(MAX_NAME),
  targetAmount: amountSchema,
  currentAmount: nonNegativeAmount.optional(),
  deadline: dateInput,
  isPublic: z.boolean().optional(),
});

export const updateGoalSchema = z
  .object({
    name: trimmedString(MAX_NAME).optional(),
    targetAmount: amountSchema.optional(),
    currentAmount: nonNegativeAmount.optional(),
    deadline: dateInput.optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'no updates supplied' });

export const contributeGoalSchema = z.object({
  amount: amountSchema,
});
