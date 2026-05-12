import type { BudgetPeriod } from './budget';

export type SharedMemberStatus = 'pending' | 'accepted';

export interface SharedBudgetMember {
  userId: string;
  status: SharedMemberStatus;
  invitedBy: string;
  joinedAt?: string;
  username: string | null;
  displayName: string | null;
  amount: number;
}

export interface SharedBudget {
  _id: string;
  ownerId: string;
  name: string | null;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  members: SharedBudgetMember[];
  spent: number;
  remaining: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SharedBudgetInput {
  name?: string;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  inviteUserIds: string[];
}

export interface SharedBudgetUpdate {
  name?: string;
  monthlyLimit?: number;
  period?: BudgetPeriod;
}
