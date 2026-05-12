import type { Response } from 'express';

type Client = { id: number; res: Response };

const clients = new Map<string, Set<Client>>();
let nextClientId = 1;

export function registerClient(userId: string, res: Response): () => void {
  const set = clients.get(userId) ?? new Set<Client>();
  const client: Client = { id: nextClientId++, res };
  set.add(client);
  clients.set(userId, set);
  console.log(`[notifications] +client user=${userId} total=${set.size}`);
  return () => {
    set.delete(client);
    if (set.size === 0) clients.delete(userId);
    console.log(`[notifications] -client user=${userId} remaining=${set.size}`);
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
  console.log(`[notifications] notify user=${userId} type=${event.type} listeners=${set?.size ?? 0}`);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of set) {
    try {
      c.res.write(payload);
    } catch (err) {
      console.warn(`[notifications] write failed user=${userId}`, err);
      set.delete(c);
    }
  }
}
