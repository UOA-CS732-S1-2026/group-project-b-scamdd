import type { Response } from 'express';

type Client = { id: number; res: Response };

const clients = new Map<string, Set<Client>>();
let nextClientId = 1;

export function registerClient(userId: string, res: Response): () => void {
  const set = clients.get(userId) ?? new Set<Client>();
  const client: Client = { id: nextClientId++, res };
  set.add(client);
  clients.set(userId, set);
  return () => {
    set.delete(client);
    if (set.size === 0) clients.delete(userId);
  };
}

export type NotificationEvent =
  | { type: 'friend-request' }
  | { type: 'friend-request-responded' }
  | { type: 'cheer' }
  | { type: 'shared-budget-invite' }
  | { type: 'shared-budget-updated' };

export function notify(userId: string, event: NotificationEvent) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of set) {
    try {
      c.res.write(payload);
    } catch {
      set.delete(c);
    }
  }
}
