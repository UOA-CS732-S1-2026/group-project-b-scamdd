import type { BudgetPeriod } from '../models/Budget.js';

// Single source of truth for "the current X period" boundaries.
//
// Note: all routes use server-local time. The audit (M14) flags this as a
// timezone bug. We accept an optional `now` so tests can pin the clock, and
// an optional `tz` parameter is reserved for a follow-up that derives boundaries
// from a user's preferred timezone — wiring that through every route is a
// bigger change than this phase covers.
export interface PeriodRangeOptions {
  now?: Date;
  /** Reserved for future timezone-aware boundaries. Currently ignored. */
  tz?: string;
}

export function periodRange(
  period: BudgetPeriod,
  options: PeriodRangeOptions = {},
): { start: Date; end: Date } {
  const now = options.now ?? new Date();
  switch (period) {
    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start, end };
    }
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 … Sun=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return { start: monday, end: nextMonday };
    }
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'yearly':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
  }
}
