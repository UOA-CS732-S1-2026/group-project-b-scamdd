export type SearchStatus = 'none' | 'pending-out' | 'pending-in' | 'accepted' | 'self';

export interface SearchResult {
  id: string;
  username: string | null;
  displayName: string | null;
  status: SearchStatus;
}

export interface IncomingRequest {
  id: string;
  fromId: string;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface OutgoingRequest {
  id: string;
  toId: string;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface Requests {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
}

export interface FriendAcceptance {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  acceptedAt: string;
}

export interface FriendGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

import type { BudgetPeriod } from './budget';

export interface FriendBudget {
  id: string;
  category: string;
  period: BudgetPeriod;
  monthlyLimit: number;
  spent: number;
}

export interface FriendAchievement {
  key: string;
  earnedAt: string;
}

export interface Friend {
  id: string;
  friendshipId: string | null;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
  streak: number;
  achievements: FriendAchievement[];
  goals: FriendGoal[];
  budgets: FriendBudget[];
}
