export interface Goal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline: string;
  isPublic: boolean;
}
