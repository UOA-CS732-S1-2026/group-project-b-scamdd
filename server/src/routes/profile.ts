import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { UserAvatar } from '../models/UserAvatar';
import { requireAuth } from '../middleware/auth';

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

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const [user, userAvatar] = await Promise.all([
      User.findById(userId).lean(),
      UserAvatar.findOne({ userId }).lean(),
    ]);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
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
  } catch {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { username, displayName, bio, currency, phone, profileComplete } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (username !== undefined) {
      const u = String(username).toLowerCase().trim();
      if (!USERNAME_RE.test(u)) {
        res.status(400).json({ message: 'Username must be 3-20 chars, lowercase letters, numbers, or underscore' });
        return;
      }
      // Fetch existing user to check if username is already set (immutable once set)
      const existingUser = await User.findById(req.user!._id).select('username').lean();
      if (existingUser?.username) {
        res.status(400).json({ message: 'Username cannot be changed once set' });
        return;
      }
      const existing = await User.findOne({ username: u, _id: { $ne: req.user!._id } }).lean();
      if (existing) {
        res.status(409).json({ message: 'Username is taken' });
        return;
      }
      updates.username = u;
    }

    if (displayName !== undefined) {
      const dn = String(displayName).trim();
      if (dn.length < 1 || dn.length > 50) {
        res.status(400).json({ message: 'Display name must be 1-50 chars' });
        return;
      }
      updates.displayName = dn;
    }

    if (bio !== undefined) {
      const b = String(bio).trim();
      if (b.length > 200) {
        res.status(400).json({ message: 'Bio must be 200 chars or fewer' });
        return;
      }
      updates.bio = b;
    }

    if (currency !== undefined) {
      const c = String(currency).toUpperCase();
      if (!ALLOWED_CURRENCIES.includes(c)) {
        res.status(400).json({ message: `Currency must be one of ${ALLOWED_CURRENCIES.join(', ')}` });
        return;
      }
      updates.currency = c;
    }

    if (phone !== undefined) {
      const p = String(phone).trim();
      if (p.length > 30) {
        res.status(400).json({ message: 'Phone number must be 30 chars or fewer' });
        return;
      }
      updates.phone = p;
    }

    if (req.body.avatarColor !== undefined) {
      const ac = String(req.body.avatarColor).trim();
      if (ac.length > 20) {
        res.status(400).json({ message: 'Invalid avatar color' });
        return;
      }
      updates.avatarColor = ac;
    }

    if (req.body.avatarImage !== undefined) {
      const img = String(req.body.avatarImage);
      if (img !== '' && !img.startsWith('data:image/')) {
        res.status(400).json({ message: 'Invalid image format' });
        return;
      }
      if (img.length > 1_500_000) {
        res.status(400).json({ message: 'Image too large (max ~1 MB)' });
        return;
      }
      updates.avatarImage = img === '' ? null : img;
    }

    if (profileComplete !== undefined) {
      updates.profileComplete = Boolean(profileComplete);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
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

    const [user, userAvatar] = await Promise.all([userPromise, avatarPromise]);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
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
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ message: 'Username is taken' });
      return;
    }
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.get('/check-username', requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.u ?? '').toLowerCase().trim();
    if (!USERNAME_RE.test(raw)) {
      res.json({ available: false, reason: 'invalid' });
      return;
    }
    const existing = await User.findOne({ username: raw, _id: { $ne: req.user!._id } }).lean();
    res.json({ available: !existing });
  } catch {
    res.status(500).json({ message: 'Failed to check username' });
  }
});

router.get('/by-username/:username', requireAuth, async (req: Request, res: Response) => {
  try {
    const u = String(req.params.username).toLowerCase().trim();
    if (!USERNAME_RE.test(u)) {
      res.status(400).json({ message: 'Invalid username' });
      return;
    }
    const user = await User.findOne({ username: u }).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(publicProfile(user));
  } catch {
    res.status(500).json({ message: 'Failed to look up user' });
  }
});

export default router;
