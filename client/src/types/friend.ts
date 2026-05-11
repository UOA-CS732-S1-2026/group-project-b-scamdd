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

export interface FriendGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface FriendBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
}

export interface Friend {
  id: string;
  friendshipId: string | null;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  streak: number;
  goals: FriendGoal[];
  budgets: FriendBudget[];
}
