import { z } from 'zod';

export const GAME_NAMES = ['price', 'budget'] as const;
export type GameName = (typeof GAME_NAMES)[number];

// Server-side ceiling per game. Anything above this is a forged score and
// will be rejected outright. Client-side game logic enforces these too
// (PRICE_ROUNDS * 100 = 500; budgetScore tops out at 100), so a legitimate
// player cannot trip these.
export const MAX_SCORE_BY_GAME: Record<GameName, number> = {
  price: 500,
  budget: 100,
};

export const submitScoreSchema = z.object({
  game: z.enum(GAME_NAMES),
  score: z.number().int('score must be an integer').min(0),
});

export const gameParam = z.object({
  game: z.enum(GAME_NAMES),
});
