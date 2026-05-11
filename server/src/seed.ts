import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Transaction } from './models/Transaction';
import { Budget } from './models/Budget';
import { Goal } from './models/Goal';

const EMAIL = process.argv[2] ?? 'bgib630@aucklanduni.ac.nz';

function d(day: number, month = 4 /* 0-indexed, 4 = May */, year = 2026) {
  return new Date(year, month, day);
}

interface SeedTx {
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: Date;
  note?: string;
  mood?: string;
  essential?: boolean;
  paymentMethod?: string;
}

const TRANSACTIONS: SeedTx[] = [
  // ── Income ──────────────────────────────────────────────────────────
  { title: 'Monthly salary',        amount: 3200,   type: 'income', date: d(1), note: '' },
  { title: 'Freelance income',      amount: 450,    type: 'income', date: d(6), note: 'Web design project' },

  // ── Food & Drink ─────────────────────────────────────────────────────
  { title: 'Weekly groceries',      amount: 112.40, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',        date: d(1) },
  { title: 'Grocery top-up',        amount: 34.20,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',        date: d(4) },
  { title: 'Coffee',                amount: 6.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',        date: d(2) },
  { title: 'Brunch',                amount: 18.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Debit',        date: d(3) },
  { title: 'Takeaway delivery',     amount: 32.50,  type: 'expense', category: 'food',          essential: false, mood: 'meh',      paymentMethod: 'Credit',       date: d(5) },
  { title: 'Dinner out',            amount: 58.00,  type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Credit',       date: d(7) },
  { title: 'Lunch',                 amount: 13.90,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',         date: d(8) },

  // ── Entertainment ────────────────────────────────────────────────────
  { title: 'Movie tickets',         amount: 36.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     paymentMethod: 'Credit',       date: d(3) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     paymentMethod: 'Credit',       date: d(1) },
  { title: 'Video game',            amount: 24.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'regret',   paymentMethod: 'Debit',        date: d(6) },
  { title: 'Drinks with friends',   amount: 22.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', paymentMethod: 'Cash',         date: d(9) },

  // ── Transport ────────────────────────────────────────────────────────
  { title: 'Public transport',      amount: 40.00,  type: 'expense', category: 'transport',     essential: true,  mood: 'okay',     paymentMethod: 'Debit',        date: d(1) },
  { title: 'Petrol',                amount: 85.30,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      paymentMethod: 'Debit',        date: d(5) },
  { title: 'Rideshare',             amount: 18.50,  type: 'expense', category: 'transport',     essential: false, mood: 'meh',      paymentMethod: 'Credit',       date: d(8) },

  // ── Shopping ─────────────────────────────────────────────────────────
  { title: 'Clothing',              amount: 49.99,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     paymentMethod: 'Credit',       date: d(2) },
  { title: 'Household items',       amount: 37.80,  type: 'expense', category: 'shopping',      essential: true,  mood: 'okay',     paymentMethod: 'Debit',        date: d(7) },
  { title: 'Book',                  amount: 19.99,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     paymentMethod: 'Debit',        date: d(4) },

  // ── Health ───────────────────────────────────────────────────────────
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     paymentMethod: 'Bank Transfer', date: d(1) },
  { title: 'Pharmacy',              amount: 23.40,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      paymentMethod: 'Debit',        date: d(6) },

  // ── Rent / Bills ─────────────────────────────────────────────────────
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      paymentMethod: 'Bank Transfer', date: d(1) },
  { title: 'Power bill',            amount: 88.70,  type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      paymentMethod: 'Bank Transfer', date: d(3) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     paymentMethod: 'Bank Transfer', date: d(2) },
];

const BUDGETS = [
  { category: 'food',          monthlyLimit: 400,  isPublic: true  },
  { category: 'entertainment', monthlyLimit: 200,  isPublic: true  },
  { category: 'transport',     monthlyLimit: 160,  isPublic: false },
  { category: 'shopping',      monthlyLimit: 150,  isPublic: false },
  { category: 'health',        monthlyLimit: 100,  isPublic: true  },
];

const GOALS = [
  { name: 'Emergency fund',  targetAmount: 5000, currentAmount: 1850, deadline: new Date(2026, 11, 31), isPublic: false },
  { name: 'New laptop',      targetAmount: 2200, currentAmount: 920,  deadline: new Date(2026, 8,  1),  isPublic: false },
  { name: 'Japan holiday',   targetAmount: 4500, currentAmount: 600,  deadline: new Date(2027, 2,  1),  isPublic: true  },
];

async function seed() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } });
  if (!user) {
    console.error(`No user found with email: ${EMAIL}`);
    console.error('Make sure you have signed up first, then re-run this script.');
    process.exit(1);
  }
  const userId = String(user._id);
  console.log(`Seeding for: ${user.email} (${userId})`);

  const [txDel, budgetDel, goalDel] = await Promise.all([
    Transaction.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
  ]);
  console.log(`Cleared ${txDel.deletedCount} transactions, ${budgetDel.deletedCount} budgets, ${goalDel.deletedCount} goals`);

  const txDocs = TRANSACTIONS.map((t) => ({ ...t, userId, amount: Number(t.amount) }));
  const [txs, budgets, goals] = await Promise.all([
    Transaction.insertMany(txDocs),
    Budget.insertMany(BUDGETS.map((b) => ({ ...b, userId }))),
    Goal.insertMany(GOALS.map((g) => ({ ...g, userId }))),
  ]);

  console.log(`✓ Created ${txs.length} transactions`);
  console.log(`✓ Created ${budgets.length} budgets`);
  console.log(`✓ Created ${goals.length} goals`);
  console.log('Done!');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
