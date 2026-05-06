export interface Budget {
  _id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetInput {
  category: string;
  monthlyLimit: number;
  isPublic: boolean;
}

export interface BudgetUpdate {
  monthlyLimit?: number;
  isPublic?: boolean;
}
