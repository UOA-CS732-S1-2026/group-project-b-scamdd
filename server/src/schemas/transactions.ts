import { z } from 'zod';
import {
  MAX_NOTE,
  MAX_TITLE,
  amountSchema,
  dateInput,
  optionalTrimmedString,
  paginationQuery,
  trimmedString,
} from './common.js';

const typeSchema = z.enum(['income', 'expense']);
const moodSchema = z.string().max(40);
const paymentMethodSchema = z.string().max(40);

export const createTransactionSchema = z
  .object({
    title: trimmedString(MAX_TITLE),
    amount: amountSchema,
    type: typeSchema,
    category: z.string().max(60).optional(),
    date: dateInput,
    note: optionalTrimmedString(MAX_NOTE),
    mood: moodSchema.optional(),
    essential: z.boolean().optional(),
    paymentMethod: paymentMethodSchema.optional(),
  })
  .refine((d) => d.type === 'income' || (d.category && d.category.length > 0), {
    message: 'category is required for expenses',
    path: ['category'],
  });

export const updateTransactionSchema = z
  .object({
    title: trimmedString(MAX_TITLE).optional(),
    amount: amountSchema.optional(),
    type: typeSchema.optional(),
    category: z.string().max(60).optional(),
    date: dateInput.optional(),
    note: optionalTrimmedString(MAX_NOTE),
    mood: moodSchema.optional(),
    essential: z.boolean().optional(),
    paymentMethod: paymentMethodSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'no updates supplied' });

export const listTransactionsQuery = paginationQuery;
