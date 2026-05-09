import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteBudget, getBudgets, updateBudget } from '../api/budgets';
import BudgetForm from '../components/BudgetForm';
import type { Budget } from '../types/budget';

export default function Budgets() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | undefined>();

  const fetchBudgets = useCallback(async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch {
      setError('Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this budget?')) return;
    try {
      await deleteBudget(id);
      setBudgets((b) => b.filter((x) => x._id !== id));
    } catch {
      alert('Failed to delete budget.');
    }
  }

  async function handleTogglePublic(b: Budget) {
    try {
      const updated = await updateBudget(b._id, { isPublic: !b.isPublic });
      setBudgets((bs) => bs.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
    } catch {
      alert('Failed to update visibility.');
    }
  }

  if (loading) {
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

  const monthLabel = new Date().toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[var(--text)] hover:text-[var(--accent)]"
          >
            ← Home
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-h)]">Budgets</h1>
        </div>
        <button
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          + New budget
        </button>
      </div>
      <p className="text-sm text-[var(--text)] mb-6">Showing spend for {monthLabel}</p>

      {budgets.length === 0 ? (
        <div className="border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text)]">
          No budgets yet. Set a monthly limit per category to track your spending.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((b) => {
            const pct = Math.min(100, Math.round((b.spent / b.monthlyLimit) * 100));
            const over = b.spent > b.monthlyLimit;
            return (
              <div
                key={b._id}
                className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg)]"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-[var(--text-h)] capitalize">
                    {b.category}
                  </h3>
                  <button
                    onClick={() => handleTogglePublic(b)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                      b.isPublic
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'bg-[var(--code-bg)] text-[var(--text)]'
                    }`}
                  >
                    {b.isPublic ? 'Public' : 'Private'}
                  </button>
                </div>

                <div className="h-2 bg-[var(--code-bg)] rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all ${over ? 'bg-red-500' : 'bg-[var(--accent)]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-[var(--text-h)] font-medium">
                    ${b.spent.toFixed(2)} / ${b.monthlyLimit.toFixed(2)}
                  </span>
                  <span className={over ? 'text-red-500' : 'text-[var(--text)]'}>
                    {over ? `over by $${(b.spent - b.monthlyLimit).toFixed(2)}` : `$${b.remaining.toFixed(2)} left`}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditing(b);
                      setShowForm(true);
                    }}
                    className="px-3 py-1.5 border border-[var(--border)] text-[var(--text-h)] rounded-lg text-xs hover:bg-[var(--code-bg)] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="px-3 py-1.5 border border-[var(--border)] text-[var(--text)] rounded-lg text-xs hover:text-red-500 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <BudgetForm
          budget={editing}
          existingCategories={budgets.map((b) => b.category)}
          onSuccess={() => {
            setShowForm(false);
            setEditing(undefined);
            fetchBudgets();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}
