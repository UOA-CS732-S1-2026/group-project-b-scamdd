import { z } from 'zod';
import { objectIdLikeString } from './common.js';

export const searchFriendsQuery = z.object({
  q: z.string().trim().min(2, 'Query must be at least 2 characters').max(100),
});

export const createFriendRequestSchema = z.object({
  addresseeId: objectIdLikeString,
});

export const respondFriendRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export const friendIdParam = z.object({
  friendId: objectIdLikeString,
});
