import { z } from 'zod';
import { MAX_NAME, trimmedString } from './common.js';

const colorSchema = z.string().max(32);

export const createCategorySchema = z.object({
  name: trimmedString(MAX_NAME),
  color: colorSchema.optional(),
});

export const updateCategorySchema = z
  .object({
    name: trimmedString(MAX_NAME).optional(),
    color: colorSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'no updates supplied' });
