export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export interface Budget {
  _id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  spent: number;
  remaining: number;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetInput {
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  isPublic: boolean;
}

export interface BudgetUpdate {
  monthlyLimit?: number;
  period?: BudgetPeriod;
  isPublic?: boolean;
}
