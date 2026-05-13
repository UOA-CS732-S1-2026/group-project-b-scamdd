import { createContext, useContext, useState, type ReactNode } from 'react';
import { symbolFor, fmtAmount, fmtYAxis, convertFromNZD } from '../lib/currency';

interface CurrencyCtx {
  currency: string;
  symbol: string;
  fmt: (nzdAmount: number) => string;
  fmtY: (nzdValue: number) => string;
  convert: (nzdAmount: number) => number;
  /** Call this after the user saves a new currency in the Profile page. */
  setCurrency: (c: string) => void;
}

const CurrencyContext = createContext<CurrencyCtx>({
  currency: 'NZD',
  symbol: '$',
  fmt: (a) => `$${Math.abs(a).toFixed(2)}`,
  fmtY: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`),
  convert: (a) => a,
  setCurrency: () => {},
});

export function CurrencyProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const [currency, setCurrencyState] = useState(initial);

  const symbol = symbolFor(currency);
  const convert = (a: number) => convertFromNZD(a, currency);
  const fmt = (a: number) => fmtAmount(a, currency);
  const fmtY = (v: number) => fmtYAxis(v, currency);
  const setCurrency = (c: string) => setCurrencyState(c);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, fmt, fmtY, convert, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
