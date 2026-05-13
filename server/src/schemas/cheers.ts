import { z } from 'zod';
import { objectIdLikeString } from './common.js';

const achievementKeySchema = z.string().min(1).max(100);

export const createCheerSchema = z.object({
  toUserId: objectIdLikeString,
  achievementKey: achievementKeySchema,
});

export const deleteCheerSchema = z.object({
  toUserId: objectIdLikeString,
  achievementKey: achievementKeySchema,
});

export const cheersForParams = z.object({
  userId: objectIdLikeString,
  key: achievementKeySchema,
});
