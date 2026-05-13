/** All amounts in the DB are stored in NZD. These rates convert FROM NZD. */
export const FROM_NZD: Record<string, number> = {
  NZD: 1,
  USD: 0.6,
  AUD: 0.85,
  EUR: 0.51,
  GBP: 0.44,
};

export const SYMBOLS: Record<string, string> = {
  NZD: '$',
  USD: '$',
  AUD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_PREFIX: Record<string, string> = {
  NZD: 'NZD ',
  USD: 'USD ',
  AUD: 'AUD ',
  EUR: '',
  GBP: '',
};

/** Convert a raw NZD amount to the user's currency. */
export function convertFromNZD(amount: number, currency: string): number {
  return amount * (FROM_NZD[currency] ?? 1);
}

/** Convert an amount in a given currency back to NZD for storage. */
export function convertToNZD(amount: number, currency: string): number {
  return amount / (FROM_NZD[currency] ?? 1);
}

/** Return a currency symbol string for a given code. */
export function symbolFor(currency: string): string {
  return SYMBOLS[currency] ?? '$';
}

/** Format an absolute NZD amount as the user's currency string (always positive). */
export function fmtAmount(nzdAmount: number, currency: string): string {
  const sym = SYMBOLS[currency] ?? '$';
  return `${sym}${convertFromNZD(Math.abs(nzdAmount), currency).toFixed(2)}`;
}

/** Format for Y-axis chart labels (compact: 1.2k style). */
export function fmtYAxis(nzdValue: number, currency: string): string {
  const sym = SYMBOLS[currency] ?? '$';
  const v = convertFromNZD(nzdValue, currency);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return abs >= 1000
    ? `${sign}${sym}${(abs / 1000).toFixed(1)}k`
    : `${sign}${sym}${abs.toFixed(0)}`;
}
