import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contributeToGoal, deleteGoal, getGoals, updateGoal } from '../api/goals';
import GoalForm from '../components/GoalForm';
import type { Goal } from '../types/goal';

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>();

  const fetchGoals = useCallback(async () => {
    try {
      const data = await getGoals();
      setGoals(data);
    } catch {
      setError('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals((g) => g.filter((x) => x._id !== id));
    } catch {
      alert('Failed to delete goal.');
    }
  }

  async function handleContribute(g: Goal) {
    const raw = prompt(`Add to "${g.name}":`, '50');
    if (!raw) return;
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a positive number.');
      return;
    }
    try {
      const updated = await contributeToGoal(g._id, amount);
      setGoals((gs) => gs.map((x) => (x._id === updated._id ? updated : x)));
    } catch {
      alert('Failed to contribute.');
    }
  }

  async function handleTogglePublic(g: Goal) {
    try {
      const updated = await updateGoal(g._id, { isPublic: !g.isPublic });
      setGoals((gs) => gs.map((x) => (x._id === updated._id ? updated : x)));
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[var(--text)] hover:text-[var(--accent)]"
          >
            ← Home
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-h)]">Goals</h1>
        </div>
        <button
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          + New goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text)]">
          No goals yet. Create one to start saving toward something.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            const deadline = new Date(g.deadline).toLocaleDateString('en-NZ', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <div
                key={g._id}
                className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg)]"
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-[var(--text-h)]">{g.name}</h3>
                  <button
                    onClick={() => handleTogglePublic(g)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                      g.isPublic
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'bg-[var(--code-bg)] text-[var(--text)]'
                    }`}
                    title="Toggle whether friends can see this goal"
                  >
                    {g.isPublic ? 'Public' : 'Private'}
                  </button>
                </div>
                <p className="text-xs text-[var(--text)] mb-3">By {deadline}</p>

                <div className="h-2 bg-[var(--code-bg)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[var(--accent)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-[var(--text-h)] font-medium">
                    ${g.currentAmount.toFixed(2)} / ${g.targetAmount.toFixed(2)}
                  </span>
                  <span className="text-[var(--text)]">{pct}%</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleContribute(g)}
                    className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold hover:opacity-90 cursor-pointer"
                  >
                    + Contribute
                  </button>
                  <button
                    onClick={() => {
                      setEditing(g);
                      setShowForm(true);
                    }}
                    className="px-3 py-1.5 border border-[var(--border)] text-[var(--text-h)] rounded-lg text-xs hover:bg-[var(--code-bg)] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(g._id)}
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
        <GoalForm
          goal={editing}
          onSuccess={() => {
            setShowForm(false);
            setEditing(undefined);
            fetchGoals();
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
