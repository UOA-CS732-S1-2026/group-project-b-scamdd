import { MOOD_KEYS } from './transactions';
import type { TimeRange } from './transactions';

export function timeRangeBounds(range: TimeRange): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range) {
    case 'all':
      return { start: null, end: null };
    case 'today': {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1) };
    }
    case 'this-week': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day - 1));
      mon.setHours(0, 0, 0, 0);
      const next = new Date(mon);
      next.setDate(mon.getDate() + 7);
      return { start: mon, end: next };
    }
    case 'this-month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end:   new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'last-month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end:   new Date(now.getFullYear(), now.getMonth(), 1),
      };
  }
}

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

export function moodIdx(mood?: string): number {
  if (!mood) return -1;
  return MOOD_KEYS.indexOf(mood as typeof MOOD_KEYS[number]);
}
