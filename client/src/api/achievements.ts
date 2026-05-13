import { apiFetch } from './_fetch';

export interface Achievement {
  key: string;
  earnedAt: string;
}

export function getMyAchievements(): Promise<Achievement[]> {
  return apiFetch<Achievement[]>('/achievements/me');
}
