export type TransactionType = 'income' | 'expense';

export const CATEGORIES = [
  'food',
  'rent',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'other',
] as const;

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
