import { z } from 'zod';

const usernameSchema = z
  .string()
  .transform((s) => s.toLowerCase().trim())
  .pipe(
    z
      .string()
      .min(3, 'Username must be 3-20 chars')
      .max(20, 'Username must be 3-20 chars')
      .regex(/^[a-z0-9_]+$/, 'Username must be lowercase letters, numbers, or underscore'),
  );

const displayNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z.string().min(1, 'Display name must be 1-50 chars').max(50, 'Display name must be 1-50 chars'),
  );

const bioSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(200, 'Bio must be 200 chars or fewer'));

const currencySchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .pipe(z.enum(['NZD', 'USD', 'AUD', 'EUR', 'GBP']));

const phoneSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(30, 'Phone number must be 30 chars or fewer'));

const avatarColorSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(20, 'Invalid avatar color'));

const avatarImageSchema = z
  .string()
  .max(1_500_000, 'Image too large (max ~1 MB)')
  .refine((s) => s === '' || s.startsWith('data:image/'), {
    message: 'Invalid image format',
  });

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: displayNameSchema.optional(),
    bio: bioSchema.optional(),
    currency: currencySchema.optional(),
    phone: phoneSchema.optional(),
    avatarColor: avatarColorSchema.optional(),
    avatarImage: avatarImageSchema.optional(),
    profileComplete: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const checkUsernameQuery = z.object({
  u: z.string().max(64).optional(),
});

export const usernameParam = z.object({
  username: z
    .string()
    .transform((s) => s.toLowerCase().trim())
    .pipe(
      z
        .string()
        .min(3, 'Invalid username')
        .max(20, 'Invalid username')
        .regex(/^[a-z0-9_]+$/, 'Invalid username'),
    ),
});
