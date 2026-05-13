import { Router, Request, Response } from 'express';
import { UserCategory } from '../models/UserCategory.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const cats = await UserCategory.find({ userId: req.user!._id }).sort({ name: 1 }).lean();
    res.json(cats);
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw HttpError.badRequest('name is required');
    }
    try {
      const cat = await UserCategory.create({
        userId: req.user!._id,
        name: name.trim().toLowerCase(),
        color: color ?? '#CBCBCB',
      });
      res.status(201).json(cat);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        throw HttpError.conflict('A category with that name already exists');
      }
      throw err;
    }
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw HttpError.badRequest('name must be a non-empty string');
      }
      updates.name = name.trim().toLowerCase();
    }
    if (color !== undefined) updates.color = color;

    try {
      const cat = await UserCategory.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!._id },
        updates,
        { new: true, runValidators: true },
      );
      if (!cat) {
        throw HttpError.notFound('Category not found');
      }
      res.json(cat);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        throw HttpError.conflict('A category with that name already exists');
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const cat = await UserCategory.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!cat) {
      throw HttpError.notFound('Category not found');
    }
    res.status(204).send();
  }),
);

export default router;
