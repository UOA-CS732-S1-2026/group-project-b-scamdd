import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions, deleteTransaction } from '../api/transactions';
import TransactionForm from '../components/TransactionForm';
import type { Transaction } from '../types/transaction';

export default function Transactions() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch {
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchTransactions();
  }, [session, fetchTransactions]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      setTransactions((ts) => ts.filter((t) => t._id !== id));
    } catch {
      alert('Failed to delete transaction.');
    }
  }

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingTransaction(undefined);
    fetchTransactions();
  }

  function handleFormCancel() {
    setShowForm(false);
    setEditingTransaction(undefined);
  }

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-h)]">Transactions</h1>
        <button
          onClick={() => {
            setEditingTransaction(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          + Add Transaction
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text)]">
          No transactions yet. Add one to get started.
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--code-bg)]">
                {['Date', 'Title', 'Category', 'Type', 'Amount', 'Note', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-[var(--text)] uppercase tracking-wider ${h === 'Amount' || h === '' ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t._id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--code-bg)] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-[var(--text)] whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('en-NZ', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-h)]">{t.title}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] capitalize">{t.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'income'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right ${
                      t.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text)]">
                    {t.note || <span className="text-[var(--border)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="text-sm text-[var(--text)] hover:text-red-500 transition-colors cursor-pointer"
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
      )}

      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}
