import { Router, Request, Response } from 'express';
import { UserCategory } from '../models/UserCategory.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const cats = await UserCategory.find({ userId: req.user!._id }).sort({ name: 1 }).lean();
    res.json(cats);
  } catch {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'name is required' });
      return;
    }
    const cat = await UserCategory.create({
      userId: req.user!._id,
      name: name.trim().toLowerCase(),
      color: color ?? '#CBCBCB',
    });
    res.status(201).json(cat);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ message: 'A category with that name already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create category' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'name must be a non-empty string' });
        return;
      }
      updates.name = name.trim().toLowerCase();
    }
    if (color !== undefined) updates.color = color;

    const cat = await UserCategory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      updates,
      { new: true, runValidators: true },
    );
    if (!cat) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    res.json(cat);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ message: 'A category with that name already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to update category' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const cat = await UserCategory.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!cat) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

export default router;
