import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions, deleteTransaction } from '../api/transactions';
import Navbar from '../components/Navbar';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import type { Transaction } from '../types/transaction';
import { CATEGORIES } from '../types/transaction';

const MOOD_DISPLAY: Record<string, { label: string; color: string }> = {
  'regret':   { label: 'Regret',   color: '#F87171' },
  'meh':      { label: 'Meh',      color: '#FB923C' },
  'okay':     { label: 'Okay',     color: '#FCD34D' },
  'glad':     { label: 'Glad',     color: '#86EFAC' },
  'worth-it': { label: 'Worth It', color: '#C68BE1' },
};

function MoodDot({ mood }: { mood: string }) {
  const m = MOOD_DISPLAY[mood];
  if (!m) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--c-text-2)] text-left whitespace-nowrap';
const TD = 'px-4 py-4 text-sm align-middle';

export default function Transactions() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTransactions();
      import('../api/profile').then(({ getMyProfile }) => {
        getMyProfile().then(setProfile).catch(console.error);
      });
    }
  }, [session, fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((ts) => ts.filter((t) => t._id !== id));
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTransaction(undefined);
    fetchTransactions();
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterFrom && new Date(t.date) < new Date(filterFrom)) return false;
    if (filterTo && new Date(t.date) > new Date(filterTo + 'T23:59:59')) return false;
    return true;
  });

  const hasActiveFilters = filterType !== 'all' || filterCategory !== 'all' || filterFrom !== '' || filterTo !== '';

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold m-0 text-[var(--c-text)]">Transactions</h1>
          <button
            onClick={() => { setEditingTransaction(undefined); setShowForm(true); }}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
          >
            + Add Transaction
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)]">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
            className="px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)] transition-colors cursor-pointer"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)] transition-colors cursor-pointer capitalize"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--c-text-2)] flex-shrink-0">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--c-text-2)] flex-shrink-0">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)] transition-colors"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setFilterType('all'); setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); }}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--c-text-2)] border border-[var(--c-border)] hover:opacity-80 transition-opacity"
            >
              Clear
            </button>
          )}

          <span className="ml-auto text-xs text-[var(--c-text-2)]">
            {filteredTransactions.length} of {transactions.length} transactions
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="border border-[var(--c-border)] rounded-2xl p-12 text-center bg-[var(--c-card)]">
            <p className="text-[var(--c-text-2)]">
              {transactions.length === 0 ? 'No transactions yet. Add one to get started.' : 'No transactions match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="border border-[var(--c-border)] rounded-2xl overflow-hidden bg-[var(--c-card)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--c-surface)] border-b border-[var(--c-border)]">
                    <th className={TH}>Date</th>
                    <th className={TH}>Title</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Essential</th>
                    <th className={TH}>Mood</th>
                    <th className={TH}>Payment</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-[var(--c-border)] last:border-b-0 hover:bg-[var(--c-surface)] transition-colors group"
                    >
                      {/* Date */}
                      <td className={`${TD} text-[var(--c-text-2)] whitespace-nowrap`}>
                        {new Date(t.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                      </td>

                      {/* Title */}
                      <td className={`${TD} font-medium text-[var(--c-text)] max-w-[180px]`}>
                        <span className="block truncate">{t.title}</span>
                        {t.note && (
                          <span className="block text-xs text-[var(--c-text-2)] truncate mt-0.5 font-normal">
                            {t.note}
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td className={TD}>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            t.type === 'income'
                              ? 'bg-[var(--c-income-light)] text-[var(--c-income-dark)]'
                              : 'bg-[var(--c-expense-light)] text-[var(--c-expense-dark)]'
                          }`}
                        >
                          {t.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className={`${TD} capitalize text-[var(--c-text-2)]`}>
                        {t.category ?? <span className="text-[var(--c-border)]">—</span>}
                      </td>

                      {/* Essential */}
                      <td className={TD}>
                        {t.type === 'expense' && t.essential !== undefined ? (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              t.essential
                                ? 'bg-[var(--c-tint-green)] text-[var(--c-tint-text)]'
                                : 'bg-[var(--c-tint-yellow)] text-[var(--c-tint-text)]'
                            }`}
                          >
                            {t.essential ? 'Essential' : 'Non-essential'}
                          </span>
                        ) : (
                          <span className="text-[var(--c-border)]">—</span>
                        )}
                      </td>

                      {/* Mood */}
                      <td className={TD}>
                        {t.essential === false && t.mood ? (
                          <MoodDot mood={t.mood} />
                        ) : (
                          <span className="text-[var(--c-border)]">—</span>
                        )}
                      </td>

                      {/* Payment method */}
                      <td className={`${TD} text-[var(--c-text-2)] whitespace-nowrap`}>
                        {t.paymentMethod ?? <span className="text-[var(--c-border)]">—</span>}
                      </td>

                      {/* Amount */}
                      <td className={`${TD} text-right font-semibold whitespace-nowrap ${
                        t.type === 'income' ? 'text-[var(--c-income)]' : 'text-[var(--c-expense)]'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className={TD}>
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingTransaction(t); setShowForm(true); }}
                            className="text-xs text-[var(--c-accent)] hover:opacity-60 transition-opacity whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(t._id)}
                            className="text-xs text-red-500 hover:opacity-60 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <TransactionForm
            transaction={editingTransaction}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingTransaction(undefined); }}
          />
        )}

        {confirmDeleteId && (
          <ConfirmDialog
            message="Delete this transaction? This can't be undone."
            onConfirm={() => handleDelete(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </main>
    </div>
  );
}
