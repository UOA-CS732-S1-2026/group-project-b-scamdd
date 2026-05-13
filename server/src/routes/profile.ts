import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { requireAuth } from '../middleware/auth.js';
import { computeBudgetStreak } from '../lib/streaks.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

const router = Router();

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const ALLOWED_CURRENCIES = ['NZD', 'USD', 'AUD', 'EUR', 'GBP'];

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
  asyncHandler(async (req: Request, res: Response) => {
    const { username, displayName, bio, currency, phone, profileComplete } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (username !== undefined) {
      const u = String(username).toLowerCase().trim();
      if (!USERNAME_RE.test(u)) {
        throw HttpError.badRequest('Username must be 3-20 chars, lowercase letters, numbers, or underscore');
      }
      // Fetch existing user to check if username is already set (immutable once set)
      const existingUser = await User.findById(req.user!._id).select('username').lean();
      if (existingUser?.username) {
        throw HttpError.badRequest('Username cannot be changed once set');
      }
      const existing = await User.findOne({ username: u, _id: { $ne: req.user!._id } }).lean();
      if (existing) {
        throw HttpError.conflict('Username is taken');
      }
      updates.username = u;
    }

    if (displayName !== undefined) {
      const dn = String(displayName).trim();
      if (dn.length < 1 || dn.length > 50) {
        throw HttpError.badRequest('Display name must be 1-50 chars');
      }
      updates.displayName = dn;
    }

    if (bio !== undefined) {
      const b = String(bio).trim();
      if (b.length > 200) {
        throw HttpError.badRequest('Bio must be 200 chars or fewer');
      }
      updates.bio = b;
    }

    if (currency !== undefined) {
      const c = String(currency).toUpperCase();
      if (!ALLOWED_CURRENCIES.includes(c)) {
        throw HttpError.badRequest(`Currency must be one of ${ALLOWED_CURRENCIES.join(', ')}`);
      }
      updates.currency = c;
    }

    if (phone !== undefined) {
      const p = String(phone).trim();
      if (p.length > 30) {
        throw HttpError.badRequest('Phone number must be 30 chars or fewer');
      }
      updates.phone = p;
    }

    if (req.body.avatarColor !== undefined) {
      const ac = String(req.body.avatarColor).trim();
      if (ac.length > 20) {
        throw HttpError.badRequest('Invalid avatar color');
      }
      updates.avatarColor = ac;
    }

    if (req.body.avatarImage !== undefined) {
      const img = String(req.body.avatarImage);
      if (img !== '' && !img.startsWith('data:image/')) {
        throw HttpError.badRequest('Invalid image format');
      }
      if (img.length > 1_500_000) {
        throw HttpError.badRequest('Image too large (max ~1 MB)');
      }
      updates.avatarImage = img === '' ? null : img;
    }

    if (profileComplete !== undefined) {
      updates.profileComplete = Boolean(profileComplete);
    }

    if (Object.keys(updates).length === 0) {
      throw HttpError.badRequest('No fields to update');
    }

    // Separate avatar fields — save to user_avatar collection so better-auth
    // can never wipe them when it updates the user document.
    const userId = req.user!._id;
    const avatarPatch: Record<string, unknown> = {};
    if (updates.avatarColor !== undefined) { avatarPatch.avatarColor = updates.avatarColor; delete updates.avatarColor; }
    if (updates.avatarImage !== undefined) { avatarPatch.avatarImage = updates.avatarImage; delete updates.avatarImage; }

    // Upsert avatar data (always, even when nothing else changes)
    const avatarPromise = Object.keys(avatarPatch).length > 0
      ? UserAvatar.findOneAndUpdate(
          { userId },
          { $set: avatarPatch },
          { upsert: true, new: true },
        ).lean()
      : UserAvatar.findOne({ userId }).lean();

    // Update user doc for remaining fields (if any)
    const userPromise = Object.keys(updates).length > 0
      ? User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean()
      : User.findById(userId).lean();

    let user;
    let userAvatar;
    try {
      [user, userAvatar] = await Promise.all([userPromise, avatarPromise]);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
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
  asyncHandler(async (req: Request, res: Response) => {
    const raw = String(req.query.u ?? '').toLowerCase().trim();
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
  asyncHandler(async (req: Request, res: Response) => {
    const u = String(req.params.username).toLowerCase().trim();
    if (!USERNAME_RE.test(u)) {
      throw HttpError.badRequest('Invalid username');
    }
    const user = await User.findOne({ username: u }).lean();
    if (!user) {
      throw HttpError.notFound('User not found');
    }
    res.json(publicProfile(user));
  }),
);

export default router;
