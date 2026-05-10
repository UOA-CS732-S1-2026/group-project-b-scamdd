import { useState, useCallback, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useSession } from '../lib/auth-client';
import { useTheme } from '../hooks/useTheme';
import { submitScore, getLeaderboard, type LeaderboardEntry } from '../api/games';

// ── Item database (NZD prices, specific brands/sizes/stores) ──────────────────
interface Item {
  name: string;
  category: string;
  price: number;
  emoji: string;
}

const ITEMS: Item[] = [
  // Supermarket - Grocery
  { name: 'Anchor Blue Cap Milk 2L (Countdown)',                     category: 'Supermarket', price: 3.99,  emoji: '🥛' },
  { name: 'Mainland Mild Cheddar Block 500g (New World)',            category: 'Supermarket', price: 9.49,  emoji: '🧀' },
  { name: "Vogel's Original Mixed Grain Bread 700g (Pak'nSave)",     category: 'Supermarket', price: 5.29,  emoji: '🍞' },
  { name: "Wattie's Baked Beans in Tomato Sauce 420g (Countdown)",   category: 'Supermarket', price: 1.99,  emoji: '🫘' },
  { name: 'Sanitarium Weet-Bix 750g (Countdown)',                    category: 'Supermarket', price: 4.49,  emoji: '🥣' },
  { name: 'Pams Free Range Eggs 12pk (Countdown)',                   category: 'Supermarket', price: 7.99,  emoji: '🥚' },
  { name: 'Tasti Peanut Butter Smooth 380g (New World)',             category: 'Supermarket', price: 4.29,  emoji: '🥜' },
  { name: 'Marmite Original Spread 400g (New World)',                category: 'Supermarket', price: 6.99,  emoji: '🫙' },
  { name: "Sunrice Medium Grain White Rice 5kg (Pak'nSave)",         category: 'Supermarket', price: 10.99, emoji: '🍚' },
  { name: 'Macro Organic Chicken Breast 500g (Countdown)',           category: 'Supermarket', price: 11.99, emoji: '🍗' },
  { name: 'Lewis Road Creamery Chocolate Milk 1L (New World)',       category: 'Supermarket', price: 5.99,  emoji: '🍫' },
  { name: "Whittaker's Dark Ghana Chocolate 250g (Countdown)",       category: 'Supermarket', price: 5.99,  emoji: '🍫' },
  { name: 'Tip Top Boysenberry Ripple Ice Cream 2L (Countdown)',     category: 'Supermarket', price: 7.99,  emoji: '🍦' },
  { name: "Barker's Boysenberry Jam 370g (Countdown)",               category: 'Supermarket', price: 5.49,  emoji: '🫙' },
  { name: 'Proper Crisps Marlborough Sea Salt 140g (New World)',     category: 'Supermarket', price: 5.99,  emoji: '🧂' },
  { name: "Tegel Chicken Drumsticks 1kg (Pak'nSave)",                category: 'Supermarket', price: 8.99,  emoji: '🍗' },
  { name: "Gregg's Espresso Ground Coffee 200g (Countdown)",         category: 'Supermarket', price: 8.99,  emoji: '☕' },
  { name: 'Healtheries Peppermint Tea 40 bags (New World)',          category: 'Supermarket', price: 4.49,  emoji: '🍵' },
  { name: 'Homebrand White Sandwich Bread 700g (Countdown)',         category: 'Supermarket', price: 1.79,  emoji: '🍞' },
  { name: "Countdown Salmon Portions 300g (Pak'nSave)",              category: 'Supermarket', price: 10.99, emoji: '🐟' },
  { name: "Nescafé Gold Blend Instant Coffee 100g (Countdown)",      category: 'Supermarket', price: 8.49,  emoji: '☕' },
  { name: 'Primo Kransky Sausages 4pk (New World)',                  category: 'Supermarket', price: 6.99,  emoji: '🌭' },
  { name: "Pam's Frozen Garden Peas 1kg (Countdown)",                category: 'Supermarket', price: 3.49,  emoji: '🫛' },
  { name: "Charlie's Apple & Feijoa Juice 1L (New World)",           category: 'Supermarket', price: 4.99,  emoji: '🍎' },
  // Fast food
  { name: "McDonald's Big Mac (NZ)",                                 category: 'Fast Food',   price: 8.60,  emoji: '🍔' },
  { name: 'KFC 3pc Box Meal (NZ)',                                   category: 'Fast Food',   price: 16.49, emoji: '🍗' },
  { name: "Domino's Traditional Value Pizza Large (pickup)",         category: 'Fast Food',   price: 9.99,  emoji: '🍕' },
  { name: 'Subway 6-inch Italian BMT',                               category: 'Fast Food',   price: 9.90,  emoji: '🥖' },
  { name: 'Burger King Whopper Meal (NZ)',                           category: 'Fast Food',   price: 15.49, emoji: '🍔' },
  { name: "Hell's Pizza Classic Meltdown 11-inch (pickup)",          category: 'Fast Food',   price: 19.00, emoji: '🍕' },
  { name: "Wendy's Dave's Single Burger (NZ)",                       category: 'Fast Food',   price: 10.99, emoji: '🍔' },
  { name: "Carl's Jr. Double Famous Star (NZ)",                      category: 'Fast Food',   price: 13.99, emoji: '🍔' },
  { name: "Taco Bell Crunchy Taco Supreme (NZ)",                     category: 'Fast Food',   price: 5.99,  emoji: '🌮' },
  // Café
  { name: 'Flat White (standard NZ café)',                           category: 'Café',        price: 5.50,  emoji: '☕' },
  { name: 'Gong Cha Milk Tea Large (NZ)',                            category: 'Café',        price: 8.50,  emoji: '🧋' },
  { name: 'Muffin Break Large Blueberry Muffin',                     category: 'Café',        price: 5.00,  emoji: '🧁' },
  { name: 'Starbucks Caramel Macchiato Tall (NZ)',                   category: 'Café',        price: 7.50,  emoji: '☕' },
  // Clothing
  { name: "Kmart Women's Basic T-Shirt Size M",                      category: 'Clothing',    price: 7.00,  emoji: '👕' },
  { name: "The Warehouse Men's Slim Chino Pants (32x30)",            category: 'Clothing',    price: 35.00, emoji: '👖' },
  { name: 'Cotton On Crew Neck Sweatshirt Adults M',                 category: 'Clothing',    price: 39.99, emoji: '👕' },
  { name: 'Hallensteins Basic Jogger Pants (M)',                     category: 'Clothing',    price: 39.99, emoji: '🩳' },
  { name: "Glassons Women's Linen Shorts Size S",                    category: 'Clothing',    price: 39.99, emoji: '🩳' },
  { name: "Farmers Men's Merino Blend Socks 3pk",                    category: 'Clothing',    price: 12.99, emoji: '🧦' },
  { name: "Postie Girls' School Uniform Blouse Size 8",              category: 'Clothing',    price: 14.99, emoji: '👚' },
  { name: "Hannahs Women's Ballet Flat Size 7",                      category: 'Clothing',    price: 49.99, emoji: '👡' },
  // Pharmacy / Health
  { name: 'Panadol Rapid 20 Caplets (Countdown)',                    category: 'Pharmacy',    price: 7.49,  emoji: '💊' },
  { name: 'Dettol Antibacterial Hand Wash 250ml (Countdown)',        category: 'Pharmacy',    price: 4.49,  emoji: '🧴' },
  { name: 'Oral-B Classic Manual Toothbrush 2pk',                    category: 'Pharmacy',    price: 6.99,  emoji: '🪥' },
  { name: 'Band-Aid Flexible Fabric 25pk',                           category: 'Pharmacy',    price: 5.49,  emoji: '🩹' },
  { name: 'Biofreeze Pain Relief Gel 118ml (Chemist Warehouse)',     category: 'Pharmacy',    price: 19.99, emoji: '🧴' },
  { name: 'Colgate Total Advanced Toothpaste 170g (Countdown)',      category: 'Pharmacy',    price: 5.49,  emoji: '🪥' },
  // Household
  { name: 'Palmolive Antibacterial Dish Liquid 500ml (Countdown)',   category: 'Household',   price: 3.79,  emoji: '🫧' },
  { name: "Quilton 3-ply Toilet Paper 18pk (Pak'nSave)",             category: 'Household',   price: 14.99, emoji: '🧻' },
  { name: 'Fairy Dishwashing Liquid 750ml (New World)',              category: 'Household',   price: 6.49,  emoji: '🫧' },
  { name: 'Jif Cream Cleanser 500ml (Countdown)',                    category: 'Household',   price: 3.99,  emoji: '🧹' },
  { name: 'Huggies Gold Nappies Size 4 40pk (Countdown)',            category: 'Household',   price: 24.99, emoji: '👶' },
  { name: "Finish Quantum Dishwasher Tablets 60pk (Pak'nSave)",      category: 'Household',   price: 19.99, emoji: '✨' },
  { name: "Glad Press'n Seal Wrap 30m (Countdown)",                  category: 'Household',   price: 5.99,  emoji: '📦' },
  // Drinks / Snacks
  { name: "Monster Energy Ultra White 500ml (Pak'nSave)",            category: 'Drinks',      price: 3.49,  emoji: '⚡' },
  { name: 'Coca-Cola Original 1.5L (Countdown)',                     category: 'Drinks',      price: 3.99,  emoji: '🥤' },
  { name: 'Up&Go Energize Vanilla 3pk (Countdown)',                  category: 'Drinks',      price: 6.49,  emoji: '🥤' },
  { name: "Schweppes Lemon Sparkling Water 1.5L (Pak'nSave)",        category: 'Drinks',      price: 2.79,  emoji: '💧' },
  { name: 'Bundaberg Ginger Beer 375ml 4pk (New World)',             category: 'Drinks',      price: 9.99,  emoji: '🍺' },
  { name: 'V Energy Drink 250ml 4pk (Countdown)',                    category: 'Drinks',      price: 7.99,  emoji: '⚡' },
  // Electronics / Stationery
  { name: 'Energizer Max AA Batteries 8pk (The Warehouse)',          category: 'Electronics', price: 12.99, emoji: '🔋' },
  { name: 'Duracell Plus AA Batteries 4pk (Countdown)',              category: 'Electronics', price: 8.49,  emoji: '🔋' },
  { name: 'Verbatim USB-C to USB-A Cable 1m (The Warehouse)',        category: 'Electronics', price: 14.99, emoji: '🔌' },
  { name: 'Reflex A4 Copy Paper 500 sheets (OfficeMax)',             category: 'Stationery',  price: 12.99, emoji: '📄' },
  { name: 'Bic Cristal Ballpoint Pens 10pk Blue (The Warehouse)',    category: 'Stationery',  price: 5.99,  emoji: '✏️' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: T[], n: number): T[] { return shuffle(arr).slice(0, n); }

function priceScore(guess: number, actual: number): number {
  return Math.max(0, Math.round(100 - Math.abs(guess - actual) / actual * 100));
}
function budgetScore(total: number, budget: number): number {
  const diff = total - budget;
  if (Math.abs(diff) > budget) return 0;
  const pct = Math.abs(diff) / budget * 100;
  return diff > 0
    ? Math.max(0, Math.round(100 - 2 * pct))
    : Math.max(0, Math.round(100 - pct));
}

const HS_KEYS = { price: 'game-price-hs', budget: 'game-budget-hs' };
function getHs(key: string): number { return parseInt(localStorage.getItem(key) ?? '0', 10) || 0; }
function setHs(key: string, v: number) { if (v > getHs(key)) localStorage.setItem(key, String(v)); }

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', className = '' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: 'primary' | 'ghost'; className?: string;
}) {
  const base = 'px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-[var(--c-accent)] text-white hover:opacity-90',
    ghost:   'border border-[var(--c-border)] text-[var(--c-text)] hover:opacity-70',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ── Leaderboard card ──────────────────────────────────────────────────────────
const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const MAX_SCORE: Record<'price' | 'budget', number> = { price: 500, budget: 100 };

function Leaderboard({ game, entries, loading }: {
  game: 'price' | 'budget';
  entries: LeaderboardEntry[];
  loading: boolean;
}) {
  return (
    <Card>
      <h3 className="text-base font-bold text-[var(--c-text)] mb-4">Leaderboard</h3>
      {loading ? (
        <p className="text-sm text-[var(--c-text-2)]">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--c-text-2)]">Add friends to see how you compare!</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e) => {
            const ranked = e.score !== null;
            const rank = entries.filter(x => x.score !== null).findIndex(x => x.userId === e.userId);
            return (
              <div
                key={e.userId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  e.isMe ? 'bg-[var(--c-accent)]/10 border border-[var(--c-accent)]/30' : 'hover:bg-[var(--c-surface)]'
                }`}
              >
                <span className="text-sm w-6 text-center flex-shrink-0 font-bold text-[var(--c-text-2)]">
                  {ranked ? (rank < 3 ? RANK_MEDALS[rank] : `#${rank + 1}`) : '-'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--c-text)] truncate">
                    {e.name}{e.isMe && <span className="text-xs text-[var(--c-text-2)] ml-1">(you)</span>}
                  </div>
                  {e.username && (
                    <div className="text-xs text-[var(--c-text-2)]">@{e.username}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {ranked ? (
                    <>
                      <div className="text-sm font-bold text-[var(--c-accent)]">{e.score}</div>
                      <div className="text-xs text-[var(--c-text-2)]">/ {MAX_SCORE[game]}</div>
                    </>
                  ) : (
                    <div className="text-sm text-[var(--c-text-2)]">not played</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Price Guesser ─────────────────────────────────────────────────────────────
const PRICE_ROUNDS = 5;
type PGState = 'idle' | 'guessing' | 'revealed' | 'done';
interface PGRound { item: Item; guess: number; score: number }

function PriceGuesser({ onScore }: { onScore: (score: number) => void }) {
  const [state, setState] = useState<PGState>('idle');
  const [queue, setQueue] = useState<Item[]>([]);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<PGRound[]>([]);
  const [guess, setGuess] = useState('');
  const [lastScore, setLastScore] = useState<number | null>(null);

  const totalScore = history.reduce((s, r) => s + r.score, 0);
  const currentItem = queue[round];

  const startGame = useCallback(() => {
    setQueue(pick(ITEMS, PRICE_ROUNDS));
    setRound(0); setHistory([]); setGuess(''); setLastScore(null);
    setState('guessing');
  }, []);

  const submitGuess = () => {
    const g = parseFloat(guess);
    if (isNaN(g) || g < 0) return;
    setLastScore(priceScore(g, currentItem.price));
    setState('revealed');
  };

  const next = () => {
    const newHistory = [...history, { item: currentItem, guess: parseFloat(guess), score: lastScore! }];
    setHistory(newHistory);
    if (round + 1 >= PRICE_ROUNDS) {
      const total = newHistory.reduce((s, r) => s + r.score, 0);
      setHs(HS_KEYS.price, total);
      onScore(total);
      setState('done');
    } else {
      setRound(r => r + 1); setGuess(''); setLastScore(null);
      setState('guessing');
    }
  };

  if (state === 'idle' || state === 'done') {
    const finalScore = state === 'done' ? history.reduce((s, r) => s + r.score, 0) : null;
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Price Guesser</h2>
            <p className="text-sm text-[var(--c-text-2)] mt-0.5">Guess the NZD price of everyday items - closer = more points.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--c-text-2)]">Best</div>
            <div className="text-xl font-bold text-[var(--c-accent)]">{getHs(HS_KEYS.price)}</div>
          </div>
        </div>

        {state === 'done' && finalScore !== null && (
          <div className="bg-[var(--c-surface)] rounded-xl p-4 flex flex-col gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--c-text)]">{finalScore} / {PRICE_ROUNDS * 100}</div>
              <div className="text-sm text-[var(--c-text-2)] mt-1">
                {finalScore >= 400 ? '🎯 Excellent! You really know your prices.' :
                 finalScore >= 250 ? "👍 Pretty good! A bit more grocery shopping and you'll ace it." :
                 '📉 Keep practising - prices can be tricky!'}
              </div>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {history.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm gap-2">
                  <span className="text-[var(--c-text)] truncate min-w-0">{r.item.emoji} {r.item.name}</span>
                  <span className="text-[var(--c-text-2)] flex-shrink-0 text-right text-xs">
                    ${r.guess.toFixed(2)} → <span className="text-[var(--c-text)]">${r.item.price.toFixed(2)}</span>
                    {' · '}
                    <span className={r.score >= 70 ? 'text-[var(--c-income)]' : r.score >= 40 ? 'text-[var(--c-accent)]' : 'text-[var(--c-expense)]'}>
                      {r.score} pts
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn onClick={startGame}>{state === 'done' ? 'Play again' : 'Start game'}</Btn>
        <p className="text-xs text-[var(--c-text-2)]">{PRICE_ROUNDS} rounds · Max {PRICE_ROUNDS * 100} points · All prices in NZD</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--c-text)]">Price Guesser</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--c-text-2)]">Round {round + 1}/{PRICE_ROUNDS}</span>
          <span className="text-sm font-semibold text-[var(--c-accent)]">{totalScore} pts</span>
        </div>
      </div>

      <div className="bg-[var(--c-surface)] rounded-2xl p-8 flex flex-col items-center gap-3">
        <span className="text-6xl">{currentItem.emoji}</span>
        <div className="text-center">
          <div className="text-lg font-bold text-[var(--c-text)] leading-snug">{currentItem.name}</div>
          <div className="text-sm text-[var(--c-text-2)] mt-0.5">{currentItem.category}</div>
        </div>
      </div>

      {state === 'guessing' && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[var(--c-text)]">What does this cost? (NZD $)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)] font-semibold">$</span>
              <input
                type="number" min="0" step="0.01" value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && guess !== '' && submitGuess()}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)] text-sm focus:outline-none focus:border-[var(--c-accent)]"
                autoFocus
              />
            </div>
            <Btn onClick={submitGuess} disabled={guess === ''}>Submit</Btn>
          </div>
        </div>
      )}

      {state === 'revealed' && (
        <div className="flex flex-col gap-3">
          <div className="bg-[var(--c-surface)] rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-[var(--c-text-2)]">
              <div>Your guess: <span className="text-[var(--c-text)] font-semibold">${parseFloat(guess).toFixed(2)}</span></div>
              <div className="mt-1">Actual price: <span className="text-[var(--c-text)] font-semibold">${currentItem.price.toFixed(2)}</span></div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${lastScore! >= 70 ? 'text-[var(--c-income)]' : lastScore! >= 40 ? 'text-[var(--c-accent)]' : 'text-[var(--c-expense)]'}`}>
                +{lastScore}
              </div>
              <div className="text-xs text-[var(--c-text-2)]">points</div>
            </div>
          </div>
          <Btn onClick={next}>{round + 1 >= PRICE_ROUNDS ? 'See results' : 'Next item →'}</Btn>
        </div>
      )}

      <div className="flex gap-1">
        {Array.from({ length: PRICE_ROUNDS }, (_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
            i < round ? 'bg-[var(--c-accent)]' : i === round ? 'bg-[var(--c-accent)] opacity-40' : 'bg-[var(--c-border)]'
          }`} />
        ))}
      </div>
    </Card>
  );
}

// ── Budget Challenge ──────────────────────────────────────────────────────────
const BUDGET_ITEM_COUNT = 15;
const BUDGET_AMOUNTS = [25, 30, 35, 40, 45, 50, 60, 75, 100];
type BCState = 'idle' | 'picking' | 'done';

function BudgetChallenge({ onScore }: { onScore: (score: number) => void }) {
  const [state, setState] = useState<BCState>('idle');
  const [budget, setBudget] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [revealedTotal, setRevealedTotal] = useState(0);

  const total = items.filter((_, i) => selected.has(i)).reduce((s, it) => s + it.price, 0);

  const startGame = useCallback(() => {
    setBudget(BUDGET_AMOUNTS[Math.floor(Math.random() * BUDGET_AMOUNTS.length)]);
    setItems(pick(ITEMS, BUDGET_ITEM_COUNT));
    setSelected(new Set()); setFinalScore(null); setRevealedTotal(0);
    setState('picking');
  }, []);

  const toggleItem = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const submit = () => {
    const s = budgetScore(total, budget);
    setHs(HS_KEYS.budget, s);
    onScore(s);
    setFinalScore(s); setRevealedTotal(total);
    setState('done');
  };

  if (state === 'idle' || state === 'done') {
    const selectedItems = state === 'done' ? items.filter((_, i) => selected.has(i)) : [];
    const over = revealedTotal > budget;
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Budget Challenge</h2>
            <p className="text-sm text-[var(--c-text-2)] mt-0.5">
              Pick items to spend as close to the budget as possible - without going over.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--c-text-2)]">Best</div>
            <div className="text-xl font-bold text-[var(--c-accent)]">{getHs(HS_KEYS.budget)}</div>
          </div>
        </div>

        {state === 'done' && finalScore !== null && (
          <div className="bg-[var(--c-surface)] rounded-xl p-5 flex flex-col gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${finalScore >= 70 ? 'text-[var(--c-income)]' : finalScore >= 40 ? 'text-[var(--c-accent)]' : 'text-[var(--c-expense)]'}`}>
                {finalScore} / 100
              </div>
              <div className="text-sm text-[var(--c-text-2)] mt-1">
                Budget: <span className="text-[var(--c-text)] font-semibold">${budget.toFixed(2)}</span>
                {' · '}You spent: <span className={`font-semibold ${over ? 'text-[var(--c-expense)]' : 'text-[var(--c-text)]'}`}>${revealedTotal.toFixed(2)}</span>
                {' · '}
                {over
                  ? <span className="text-[var(--c-expense)]">${(revealedTotal - budget).toFixed(2)} over</span>
                  : <span className="text-[var(--c-income)]">${(budget - revealedTotal).toFixed(2)} under</span>}
              </div>
              <div className="text-sm text-[var(--c-text-2)] mt-2">
                {finalScore >= 90 ? '🏆 Nearly perfect budget management!' :
                 finalScore >= 70 ? '🎯 Great job staying close to the budget!' :
                 over ? '⚠️ Going over budget costs double - stay under next time.' :
                 '💡 Try to get a bit closer to the limit for more points.'}
              </div>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-[var(--c-text-2)] mb-1">Your selection (prices revealed):</div>
                <div className="divide-y divide-[var(--c-border)]">
                  {selectedItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-[var(--c-text)] truncate min-w-0">{item.emoji} {item.name}</span>
                      <span className="text-[var(--c-text)] font-semibold flex-shrink-0 ml-3">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--c-border)]">
                  <span className="text-[var(--c-text)]">Total</span>
                  <span className={over ? 'text-[var(--c-expense)]' : 'text-[var(--c-income)]'}>${revealedTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <Btn onClick={startGame}>{state === 'done' ? 'Play again' : 'Start game'}</Btn>
        <div className="text-xs text-[var(--c-text-2)] flex flex-col gap-0.5">
          <span>• Prices are hidden - use your knowledge!</span>
          <span>• Under budget: -1 pt per 1% under</span>
          <span>• Over budget: -2 pts per 1% over</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-[var(--c-text)]">Budget Challenge</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--c-text-2)]">
            Budget: <span className="text-[var(--c-text)] font-bold text-base">${budget.toFixed(2)}</span>
          </div>
          <div className="text-xs px-2 py-1 rounded-lg bg-[var(--c-surface)] text-[var(--c-text-2)]">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--c-text-2)] -mt-2">Prices are hidden - select items you think will get you closest to the budget without going over.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item, i) => {
          const sel = selected.has(i);
          return (
            <button
              key={i}
              onClick={() => toggleItem(i)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                sel
                  ? 'border-[var(--c-accent)] bg-[var(--c-accent)]/10 text-[var(--c-text)]'
                  : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)] hover:border-[var(--c-accent)]/50'
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium leading-tight line-clamp-3">{item.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Btn onClick={submit} disabled={selected.size === 0} className="flex-1">
          Submit ({selected.size} item{selected.size !== 1 ? 's' : ''})
        </Btn>
        <Btn variant="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type GameTab = 'price' | 'budget';

export default function Games() {
  const { data: session } = useSession();
  const userName = (session?.user as { username?: string } | undefined)?.username ?? session?.user?.name ?? '';
  const { isDark, toggle } = useTheme();
  const [tab, setTab] = useState<GameTab>('price');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (game: GameTab) => {
    setLbLoading(true);
    try {
      const data = await getLeaderboard(game);
      setLeaderboard(data);
    } catch {
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(tab);
  }, [tab, fetchLeaderboard]);

  const handleScore = async (game: GameTab, score: number) => {
    try {
      await submitScore(game, score);
      await fetchLeaderboard(game);
    } catch {
      // score submission failure is non-critical
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={userName} />
      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Games</h1>
          <p className="text-sm text-[var(--c-text-2)]">Test your money knowledge with quick mini-games.</p>
        </div>

        <div className="flex gap-1 bg-[var(--c-surface)] p-1 rounded-xl w-fit">
          {([['price', '🎯 Price Guesser'], ['budget', '💰 Budget Challenge']] as [GameTab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-[var(--c-card)] text-[var(--c-text)] shadow-sm border border-[var(--c-border)]'
                  : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'price'
          ? <PriceGuesser onScore={s => handleScore('price', s)} />
          : <BudgetChallenge onScore={s => handleScore('budget', s)} />
        }

        <Leaderboard game={tab} entries={leaderboard} loading={lbLoading} />
      </main>
    </div>
  );
}
