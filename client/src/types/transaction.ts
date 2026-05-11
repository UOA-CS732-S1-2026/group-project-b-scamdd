export type TransactionType = 'income' | 'expense';

export const CATEGORIES = [
  'food',
  'rent',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'emergency',
  'other',
] as const;

export const EMERGENCY_CATEGORY = 'emergency';
export const OVERALL_CATEGORY = 'overall';

export interface Transaction {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  category?: string;
  date: string;
  note?: string;
  mood?: string;
  essential?: boolean;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionInput = {
  title: string;
  amount: number;
  type: TransactionType;
  category?: string;
  date: string;
  note?: string;
  mood?: string;
  essential?: boolean;
  paymentMethod?: string;
};
