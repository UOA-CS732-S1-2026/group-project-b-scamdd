import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { requireAuth } from '../middleware/auth.js';
import { computeBudgetStreak } from '../lib/streaks.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { cascadeDeleteUser } from '../lib/userCascade.js';
import { validate } from '../middleware/validate.js';
import { checkUsernameQuery, updateProfileSchema, usernameParam } from '../schemas/profile.js';

const router = Router();

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function publicProfile(u: {
  _id: unknown;
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
}) {
  return {
    id: String(u._id),
    username: u.username ?? null,
    displayName: u.displayName ?? null,
    bio: u.bio ?? null,
  };
}

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const [user, userAvatar] = await Promise.all([
      User.findById(userId).lean(),
      UserAvatar.findOne({ userId }).lean(),
    ]);
    if (!user) {
      throw HttpError.notFound('User not found');
    }
    const streak = await computeBudgetStreak(String(user._id));
    res.json({
      id: String(user._id),
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      currency: user.currency ?? 'NZD',
      phone: user.phone ?? null,
      avatarColor: userAvatar?.avatarColor ?? null,
      avatarImage: userAvatar?.avatarImage ?? null,
      profileComplete: Boolean(user.profileComplete),
      streak,
    });
  }),
);

router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      username,
      displayName,
      bio,
      currency,
      phone,
      avatarColor,
      avatarImage,
      profileComplete,
    } = req.body as {
      username?: string;
      displayName?: string;
      bio?: string;
      currency?: string;
      phone?: string;
      avatarColor?: string;
      avatarImage?: string;
      profileComplete?: boolean;
    };
    const updates: Record<string, unknown> = {};

    if (username !== undefined) {
      // Fetch existing user to check if username is already set (immutable once set)
      const existingUser = await User.findById(req.user!._id).select('username').lean();
      if (existingUser?.username) {
        throw HttpError.badRequest('Username cannot be changed once set');
      }
      const existing = await User.findOne({ username, _id: { $ne: req.user!._id } }).lean();
      if (existing) {
        throw HttpError.conflict('Username is taken');
      }
      updates.username = username;
    }

    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (currency !== undefined) {
      updates.currency = currency;
    }

    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (avatarColor !== undefined) {
      updates.avatarColor = avatarColor;
    }

    if (avatarImage !== undefined) {
      updates.avatarImage = avatarImage === '' ? null : avatarImage;
    }

    if (profileComplete !== undefined) {
      updates.profileComplete = profileComplete;
    }

    // Separate avatar fields — save to user_avatar collection so better-auth
    // can never wipe them when it updates the user document.
    const userId = req.user!._id;
    const avatarPatch: Record<string, unknown> = {};
    if (updates.avatarColor !== undefined) {
      avatarPatch.avatarColor = updates.avatarColor;
      delete updates.avatarColor;
    }
    if (updates.avatarImage !== undefined) {
      avatarPatch.avatarImage = updates.avatarImage;
      delete updates.avatarImage;
    }

    // Upsert avatar data (always, even when nothing else changes)
    const avatarPromise =
      Object.keys(avatarPatch).length > 0
        ? UserAvatar.findOneAndUpdate(
            { userId },
            { $set: avatarPatch },
            { upsert: true, new: true },
          ).lean()
        : UserAvatar.findOne({ userId }).lean();

    // Update user doc for remaining fields (if any)
    const userPromise =
      Object.keys(updates).length > 0
        ? User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean()
        : User.findById(userId).lean();

    let user;
    let userAvatar;
    try {
      [user, userAvatar] = await Promise.all([userPromise, avatarPromise]);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw HttpError.conflict('Username is taken');
      }
      throw err;
    }
    if (!user) {
      throw HttpError.notFound('User not found');
    }
    res.json({
      id: String(user._id),
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      currency: user.currency ?? 'NZD',
      phone: user.phone ?? null,
      avatarColor: userAvatar?.avatarColor ?? null,
      avatarImage: userAvatar?.avatarImage ?? null,
      profileComplete: Boolean(user.profileComplete),
    });
  }),
);

router.get(
  '/check-username',
  requireAuth,
  validate({ query: checkUsernameQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const raw = String((req.query as { u?: string }).u ?? '')
      .toLowerCase()
      .trim();
    if (!USERNAME_RE.test(raw)) {
      res.json({ available: false, reason: 'invalid' });
      return;
    }
    const existing = await User.findOne({ username: raw, _id: { $ne: req.user!._id } }).lean();
    res.json({ available: !existing });
  }),
);

router.get(
  '/by-username/:username',
  requireAuth,
  validate({ params: usernameParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const u = req.params.username;
    const user = await User.findOne({ username: u }).lean();
    if (!user) {
      throw HttpError.notFound('User not found');
    }
    res.json(publicProfile(user));
  }),
);

router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const report = await cascadeDeleteUser(userId);
    logger.info({ userId, report }, 'user account deleted');
    // Clear Better Auth's session cookie so the client lands on /auth.
    res.clearCookie('better-auth.session_token', { path: '/' });
    res.json({ ok: true, report });
  }),
);

export default router;
