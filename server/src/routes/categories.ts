import { Router, Request, Response } from 'express';
import { UserCategory } from '../models/UserCategory.js';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/categories.js';
import { idParam } from '../schemas/common.js';

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
  validate({ body: createCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body as { name: string; color?: string };
    try {
      const cat = await UserCategory.create({
        userId: req.user!._id,
        name: name.toLowerCase(),
        color: color ?? '#CBCBCB',
      });
      res.status(201).json(cat);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw HttpError.conflict('A category with that name already exists');
      }
      throw err;
    }
  }),
);

router.patch(
  '/:id',
  validate({ params: idParam, body: updateCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body as { name?: string; color?: string };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.toLowerCase();
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
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw HttpError.conflict('A category with that name already exists');
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const cat = await UserCategory.findOne({ _id: req.params.id, userId });
    if (!cat) {
      throw HttpError.notFound('Category not found');
    }
    const reassignTo =
      typeof req.query.reassignTo === 'string' ? req.query.reassignTo.toLowerCase() : '';
    const force = req.query.force === 'true';

    const inUse = await Transaction.exists({ userId, category: cat.name });

    if (inUse && !force && !reassignTo) {
      const err = HttpError.conflict('Category is in use by existing transactions');
      err.details = {
        hint: 'Pass ?force=true to delete anyway (transactions keep the category string) or ?reassignTo=<name> to move them.',
      };
      throw err;
    }

    if (reassignTo && reassignTo !== cat.name) {
      await Transaction.updateMany(
        { userId, category: cat.name },
        { $set: { category: reassignTo } },
      );
    }

    await cat.deleteOne();
    res.status(204).send();
  }),
);

export default router;
