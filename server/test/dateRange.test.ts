import { describe, it, expect } from 'vitest';
import { periodRange } from '../src/lib/dateRange.js';

describe('periodRange', () => {
  const fixed = new Date(2026, 4, 13, 14, 30, 0); // 2026-05-13 (Wed) 14:30 local

  it('returns today for "daily"', () => {
    const { start, end } = periodRange('daily', { now: fixed });
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4);
    expect(start.getDate()).toBe(13);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(14);
  });

  it('returns Mon..next-Mon for "weekly" when given a Wed', () => {
    const { start, end } = periodRange('weekly', { now: fixed });
    expect(start.getDay()).toBe(1); // Mon
    expect(end.getDay()).toBe(1);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('returns first..first-of-next-month for "monthly"', () => {
    const { start, end } = periodRange('monthly', { now: fixed });
    expect(start.getMonth()).toBe(4);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(5);
    expect(end.getDate()).toBe(1);
  });

  it('returns Jan 1..next-Jan 1 for "yearly"', () => {
    const { start, end } = periodRange('yearly', { now: fixed });
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(end.getFullYear()).toBe(2027);
  });

  it('handles Sunday correctly for weekly (treats as day 7)', () => {
    const sun = new Date(2026, 4, 17, 10, 0, 0); // 2026-05-17 is a Sunday
    const { start } = periodRange('weekly', { now: sun });
    expect(start.getDay()).toBe(1); // Mon
    expect(start.getDate()).toBe(11);
  });
});
