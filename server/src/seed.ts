import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Transaction } from './models/Transaction';
import { Budget } from './models/Budget';
import { Goal } from './models/Goal';
import { MonthlyWrapped } from './models/MonthlyWrapped';

const EMAIL = process.argv[2] ?? 'mkim670@aucklanduni.ac.nz';

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
  // ── Week 1: payday + setup ──────────────────────────────────────────
  // Fri 1
  { title: 'Salary (1st half)',     amount: 1600,   type: 'income',  date: d(1) },
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      paymentMethod: 'Bank Transfer', date: d(1) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(1) },
  // Sat 2
  { title: 'Weekly groceries',      amount: 112.40, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(2) },
  { title: 'Brunch',                amount: 18.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Debit',         date: d(2) },
  // Sun 3
  { title: 'Public transport top-up', amount: 40,   type: 'expense', category: 'transport',     essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(3) },
  { title: 'Movie tickets',         amount: 36.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     paymentMethod: 'Credit',        date: d(3) },

  // ── Week 2 ──────────────────────────────────────────────────────────
  // Mon 4
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(4) },
  { title: 'Lunch',                 amount: 13.90,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(4) },
  { title: 'Book',                  amount: 19.99,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     paymentMethod: 'Debit',         date: d(4) },
  { title: 'Power bill',            amount: 88.70,  type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      paymentMethod: 'Bank Transfer', date: d(4) },
  // Tue 5
  { title: 'Petrol',                amount: 85.30,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      paymentMethod: 'Debit',         date: d(5) },
  { title: 'Lunch',                 amount: 12.50,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(5) },
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     paymentMethod: 'Bank Transfer', date: d(5) },
  // Wed 6
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(6) },
  { title: 'Pharmacy',              amount: 23.40,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      paymentMethod: 'Debit',         date: d(6) },
  { title: 'Lunch',                 amount: 11.80,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(6) },
  // Thu 7
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(7) },
  { title: 'Drinks with friends',   amount: 22.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', paymentMethod: 'Cash',          date: d(7) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     paymentMethod: 'Bank Transfer', date: d(7) },
  // Fri 8
  { title: 'Weekly groceries',      amount: 98.20,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(8) },
  { title: 'Dinner out',            amount: 58.00,  type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Credit',        date: d(8) },
  { title: 'Rideshare',             amount: 18.50,  type: 'expense', category: 'transport',     essential: false, mood: 'meh',      paymentMethod: 'Credit',        date: d(8) },
  // Sat 9
  { title: 'Brunch',                amount: 24.50,  type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(9) },
  { title: 'Phone bill',            amount: 49.00,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     paymentMethod: 'Bank Transfer', date: d(9) },
  // Sun 10
  { title: 'Concert tickets',       amount: 89.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', paymentMethod: 'Credit',        date: d(10) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     paymentMethod: 'Credit',        date: d(10) },

  // ── Week 3 ──────────────────────────────────────────────────────────
  // Mon 11
  { title: 'Coffee',                amount: 6.00,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(11) },
  { title: 'Grocery top-up',        amount: 24.50,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(11) },
  { title: 'New headphones',        amount: 279.00, type: 'expense', category: 'shopping',      essential: false, mood: 'regret',   paymentMethod: 'Credit',        date: d(11), note: 'impulse buy' },
  // Tue 12
  { title: 'Freelance income',      amount: 450,    type: 'income',  date: d(12), note: 'Web design project' },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(12) },
  { title: 'Lunch',                 amount: 13.00,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(12) },
  { title: 'Rideshare',             amount: 15.50,  type: 'expense', category: 'transport',     essential: false, mood: 'meh',      paymentMethod: 'Credit',        date: d(12) },
  // Wed 13
  { title: 'Lunch',                 amount: 12.50,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(13) },
  { title: 'Video game',            amount: 24.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'regret',   paymentMethod: 'Debit',         date: d(13) },
  // Thu 14
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(14) },
  { title: 'Pub night',             amount: 32.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     paymentMethod: 'Cash',          date: d(14) },
  // Fri 15
  { title: 'Salary (2nd half)',     amount: 1600,   type: 'income',  date: d(15) },
  { title: 'Weekly groceries',      amount: 124.00, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(15) },
  { title: 'Clothing',              amount: 49.99,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     paymentMethod: 'Credit',        date: d(15) },
  { title: 'Public transport top-up', amount: 40,   type: 'expense', category: 'transport',     essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(15) },
  // Sat 16
  { title: 'Brunch',                amount: 22.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Debit',         date: d(16) },
  { title: 'Doctor visit',          amount: 42.00,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      paymentMethod: 'Debit',         date: d(16) },
  // Sun 17
  { title: 'Live music event',      amount: 45.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', paymentMethod: 'Credit',        date: d(17) },

  // ── Week 4 ──────────────────────────────────────────────────────────
  // Mon 18
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(18) },
  { title: 'Lunch',                 amount: 13.40,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(18) },
  { title: 'Petrol',                amount: 78.40,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      paymentMethod: 'Debit',         date: d(18) },
  // Tue 19
  { title: 'Tutoring side gig',     amount: 150,    type: 'income',  date: d(19), note: 'Maths tutoring' },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(19) },
  { title: 'Lunch',                 amount: 12.00,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(19) },
  // Wed 20
  { title: 'Lunch',                 amount: 14.00,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(20) },
  { title: 'Pharmacy',              amount: 18.50,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      paymentMethod: 'Debit',         date: d(20) },
  // Thu 21
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(21) },
  { title: 'Weekly groceries',      amount: 89.30,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(21) },
  { title: 'Dinner out',            amount: 52.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Credit',        date: d(21) },
  // Fri 22
  { title: 'Household items',       amount: 37.80,  type: 'expense', category: 'shopping',      essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(22) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(22) },
  // Sat 23
  { title: 'Brunch',                amount: 26.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Debit',         date: d(23) },
  { title: 'Rideshare',             amount: 14.20,  type: 'expense', category: 'transport',     essential: false, mood: 'meh',      paymentMethod: 'Credit',        date: d(23) },
  // Sun 24
  { title: 'Freelance income',      amount: 300,    type: 'income',  date: d(24), note: 'Logo design' },

  // ── Week 5 ──────────────────────────────────────────────────────────
  // Mon 25
  { title: 'Coffee',                amount: 5.80,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(25) },
  { title: 'Lunch',                 amount: 12.20,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(25) },
  // Tue 26
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(26) },
  { title: 'Birthday gift',         amount: 35.00,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     paymentMethod: 'Credit',        date: d(26) },
  // Wed 27
  { title: 'Lunch',                 amount: 15.00,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     paymentMethod: 'Cash',          date: d(27) },
  // Thu 28
  { title: 'Weekly groceries',      amount: 107.00, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     paymentMethod: 'Debit',         date: d(28) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', paymentMethod: 'Debit',         date: d(28) },
  // Fri 29
  { title: 'Drinks with friends',   amount: 24.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', paymentMethod: 'Cash',          date: d(29) },
  // Sat 30
  { title: 'Brunch',                amount: 19.00,  type: 'expense', category: 'food',          essential: false, mood: 'glad',     paymentMethod: 'Debit',         date: d(30) },

  // ── January 2026 ────────────────────────────────────────────────────
  { title: 'Salary (1st half)',     amount: 1600,   type: 'income',  date: d(1,  0) },
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      date: d(1,  0) },
  { title: 'Power bill',            amount: 110.20, type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      date: d(3,  0) },
  { title: 'Weekly groceries',      amount: 108.50, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(4,  0) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(6,  0) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(7,  0) },
  { title: 'Lunch',                 amount: 14.50,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     date: d(8,  0) },
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     date: d(9,  0) },
  { title: 'Weekly groceries',      amount: 95.30,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(11, 0) },
  { title: 'Movie tickets',         amount: 34.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     date: d(12, 0) },
  { title: 'Phone bill',            amount: 49.00,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(13, 0) },
  { title: 'Salary (2nd half)',     amount: 1600,   type: 'income',  date: d(15, 0) },
  { title: 'Petrol',                amount: 82.40,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      date: d(15, 0) },
  { title: 'Weekly groceries',      amount: 102.80, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(18, 0) },
  { title: 'Dinner out',            amount: 62.00,  type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(20, 0) },
  { title: 'New Year clothes',      amount: 89.00,  type: 'expense', category: 'shopping',      essential: false, mood: 'glad',     date: d(21, 0) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(22, 0) },
  { title: 'Weekly groceries',      amount: 98.60,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(25, 0) },
  { title: 'Pub night',             amount: 38.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     date: d(27, 0) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'okay',     date: d(28, 0) },
  { title: 'Pharmacy',              amount: 18.50,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      date: d(29, 0) },

  // ── February 2026 ───────────────────────────────────────────────────
  { title: 'Salary (1st half)',     amount: 1600,   type: 'income',  date: d(1,  1) },
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      date: d(1,  1) },
  { title: 'Power bill',            amount: 95.40,  type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      date: d(3,  1) },
  { title: 'Weekly groceries',      amount: 104.20, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(5,  1) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(6,  1) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(7,  1) },
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     date: d(9,  1) },
  { title: 'Weekly groceries',      amount: 91.80,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(12, 1) },
  { title: 'Phone bill',            amount: 49.00,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(13, 1) },
  { title: "Valentine's dinner",    amount: 96.00,  type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(14, 1) },
  { title: 'Salary (2nd half)',     amount: 1600,   type: 'income',  date: d(15, 1) },
  { title: 'Rideshare',             amount: 22.50,  type: 'expense', category: 'transport',     essential: false, mood: 'okay',     date: d(16, 1) },
  { title: 'Weekly groceries',      amount: 99.60,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(19, 1) },
  { title: 'Impulse clothing haul', amount: 134.00, type: 'expense', category: 'shopping',      essential: false, mood: 'regret',   date: d(21, 1) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(23, 1) },
  { title: 'Weekly groceries',      amount: 88.40,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(26, 1) },
  { title: 'Concert tickets',       amount: 89.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', date: d(27, 1) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'okay',     date: d(28, 1) },

  // ── March 2026 ──────────────────────────────────────────────────────
  { title: 'Salary (1st half)',     amount: 1600,   type: 'income',  date: d(1,  2) },
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      date: d(1,  2) },
  { title: 'Power bill',            amount: 88.70,  type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      date: d(4,  2) },
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     date: d(5,  2) },
  { title: 'Weekly groceries',      amount: 115.30, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(7,  2) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(7,  2) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(9,  2) },
  { title: 'Phone bill',            amount: 49.00,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(10, 2) },
  { title: 'Lunch',                 amount: 13.50,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     date: d(11, 2) },
  { title: 'Freelance income',      amount: 450,    type: 'income',  date: d(12, 2) },
  { title: 'Weekly groceries',      amount: 109.80, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(14, 2) },
  { title: 'Salary (2nd half)',     amount: 1600,   type: 'income',  date: d(15, 2) },
  { title: 'Petrol',                amount: 79.60,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      date: d(15, 2) },
  { title: 'Weekend trip accommodation', amount: 210.00, type: 'expense', category: 'entertainment', essential: false, mood: 'worth-it', date: d(15, 2) },
  { title: 'Midnight snack delivery', amount: 38.90, type: 'expense', category: 'food',         essential: false, mood: 'regret',   date: d(18, 2) },
  { title: 'Weekly groceries',      amount: 97.20,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(21, 2) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(23, 2) },
  { title: 'Drinks with friends',   amount: 45.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     date: d(25, 2) },
  { title: 'Weekly groceries',      amount: 103.40, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(28, 2) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'okay',     date: d(30, 2) },
  { title: 'Pharmacy',              amount: 24.80,  type: 'expense', category: 'health',        essential: true,  mood: 'meh',      date: d(31, 2) },

  // ── April 2026 ──────────────────────────────────────────────────────
  { title: 'Salary (1st half)',     amount: 1600,   type: 'income',  date: d(1,  3) },
  { title: 'Rent',                  amount: 950,    type: 'expense', category: 'rent',          essential: true,  mood: 'meh',      date: d(1,  3) },
  { title: 'Power bill',            amount: 88.70,  type: 'expense', category: 'utilities',     essential: true,  mood: 'meh',      date: d(4,  3) },
  { title: 'Gym membership',        amount: 49.90,  type: 'expense', category: 'health',        essential: false, mood: 'glad',     date: d(5,  3) },
  { title: 'Weekly groceries',      amount: 111.60, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(5,  3) },
  { title: 'Internet bill',         amount: 74.99,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(7,  3) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(8,  3) },
  { title: 'Phone bill',            amount: 49.00,  type: 'expense', category: 'utilities',     essential: true,  mood: 'okay',     date: d(9,  3) },
  { title: 'Weekly groceries',      amount: 94.30,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(12, 3) },
  { title: 'Movie tickets',         amount: 36.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     date: d(13, 3) },
  { title: 'Salary (2nd half)',     amount: 1600,   type: 'income',  date: d(15, 3) },
  { title: 'Petrol',                amount: 85.30,  type: 'expense', category: 'transport',     essential: true,  mood: 'meh',      date: d(15, 3) },
  { title: 'New headphones',        amount: 279.00, type: 'expense', category: 'shopping',      essential: false, mood: 'regret',   date: d(17, 3), note: 'impulse buy' },
  { title: 'Weekly groceries',      amount: 101.70, type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(19, 3) },
  { title: 'Coffee',                amount: 5.50,   type: 'expense', category: 'food',          essential: false, mood: 'worth-it', date: d(21, 3) },
  { title: 'Hiking gear',           amount: 145.00, type: 'expense', category: 'shopping',      essential: false, mood: 'worth-it', date: d(22, 3) },
  { title: 'Lunch',                 amount: 12.80,  type: 'expense', category: 'food',          essential: false, mood: 'okay',     date: d(23, 3) },
  { title: 'Weekly groceries',      amount: 96.80,  type: 'expense', category: 'food',          essential: true,  mood: 'okay',     date: d(26, 3) },
  { title: 'Drinks with friends',   amount: 32.00,  type: 'expense', category: 'entertainment', essential: false, mood: 'glad',     date: d(28, 3) },
  { title: 'Music streaming',       amount: 11.99,  type: 'expense', category: 'entertainment', essential: false, mood: 'okay',     date: d(29, 3) },
  { title: 'Freelance income',      amount: 300,    type: 'income',  date: d(30, 3) },
];

const BUDGETS = [
  { category: 'food',          monthlyLimit: 750, isPublic: true  },
  { category: 'entertainment', monthlyLimit: 250, isPublic: true  },
  { category: 'transport',     monthlyLimit: 200, isPublic: false },
  { category: 'shopping',      monthlyLimit: 400, isPublic: false },
  { category: 'health',        monthlyLimit: 150, isPublic: true  },
  { category: 'utilities',     monthlyLimit: 250, isPublic: false },
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

  const [txDel, budgetDel, goalDel, wrappedDel] = await Promise.all([
    Transaction.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    MonthlyWrapped.deleteMany({ userId }),
  ]);
  console.log(`Cleared ${txDel.deletedCount} transactions, ${budgetDel.deletedCount} budgets, ${goalDel.deletedCount} goals, ${wrappedDel.deletedCount} wrapped`);

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
