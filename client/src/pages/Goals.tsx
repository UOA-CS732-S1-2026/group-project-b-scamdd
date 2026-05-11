import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getGoals, deleteGoal } from '../api/goals';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import GoalForm from '../components/GoalForm';
import { useTheme } from '../hooks/useTheme';
import type { Goal } from '../types/goal';

export default function Goals() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchGoals = useCallback(async () => {
    try {
      const data = await getGoals();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchGoals();
      import('../api/profile').then(({ getMyProfile }) => {
        getMyProfile().then(setProfile).catch(console.error);
      });
    }
  }, [session, fetchGoals]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals((gs) => gs.filter((g) => g._id !== id));
    } catch {
      alert('Failed to delete goal.');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGoal(undefined);
    fetchGoals();
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold m-0 text-[var(--c-text)]">Goals</h1>
          <button
            onClick={() => {
              setEditingGoal(undefined);
              setShowForm(true);
            }}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
          >
            + Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="border border-[var(--c-border)] rounded-2xl p-12 text-center bg-[var(--c-card)]">
            <p className="text-[var(--c-text-2)]">No goals yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const daysLeft = Math.ceil(
                (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
              );
              return (
                <div
                  key={goal._id}
                  className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{goal.name}</h3>
                      <p className="text-sm text-[var(--c-text-2)]">
                        ${goal.currentAmount.toFixed(2)} of ${goal.targetAmount.toFixed(2)}
                      </p>
                      <p className="text-xs mt-1 text-[var(--c-text-2)]">
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full mb-4 overflow-hidden bg-[var(--c-border)]">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-[var(--c-income)]"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setShowForm(true);
                      }}
                      className="text-sm font-medium hover:opacity-60 transition-opacity text-[var(--c-accent)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="text-sm font-medium text-red-500 hover:opacity-60 transition-opacity"
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
            goal={editingGoal}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingGoal(undefined);
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
