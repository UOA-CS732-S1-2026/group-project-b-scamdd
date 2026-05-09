import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions } from '../api/transactions';
import { getBudgets } from '../api/budgets';
import { getGoals } from '../api/goals';
import { getMyProfile } from '../api/profile';
import Dashboard from './dashboard/Dashboard';
import { colors } from '../colours';
import type { Transaction } from '../types/transaction';
import type { Budget } from '../types/budget';

interface DashboardData {
  user: { name: string; avatarInitial: string };
  budget: { total: number; spent: number; periodLabel: string; daysLeft: number };
  income: number;
  moodAvg: number;
  categoryBreakdown: Array<{ label: string; amount: number; color: string }>;
  recentTransactions: Array<{
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    amount: number;
    mood: number | null;
    moodEmoji: string | null;
    isEssential: boolean | null;
    date: string;
    iconColor: string;
    iconTextColor: string;
  }>;
  spendingCurve: number[];
}

const categoryColors: Record<string, string> = {
  food: colors.categories.food,
  rent: colors.categories.rent,
  transport: colors.categories.transport,
  entertainment: colors.categories.entertainment,
  utilities: colors.semantic.warning,
  shopping: colors.semantic.warning,
  health: colors.categories.health,
  other: colors.categories.other,
};

const daysLeftInMonth = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};

const formatDateRelative = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

function transformData(
  transactions: Transaction[],
  budgets: Budget[],
  profile: any,
): DashboardData {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthTransactions = transactions.filter(
    (t) => new Date(t.date) >= startOfMonth,
  );

  const monthlyIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const categoryBreakdown: Record<string, number> = {};
  monthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryBreakdown[t.category] =
        (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
    });

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);

  const moodAvg =
    monthTransactions.filter((t) => t.mood).length > 0
      ? monthTransactions
          .filter((t) => t.mood)
          .reduce((sum, t) => sum + (parseInt(t.mood || '0') || 0), 0) /
        monthTransactions.filter((t) => t.mood).length
      : 3;

  const recentTransactions = monthTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map((t) => ({
      id: t._id,
      name: t.title,
      category: t.category.charAt(0).toUpperCase() + t.category.slice(1),
      subcategory: null,
      amount: t.type === 'income' ? t.amount : -Math.abs(t.amount),
      mood: t.mood ? parseInt(t.mood) : null,
      moodEmoji: t.mood
        ? ['😢', '😕', '😐', '🙂', '😊'][Math.min(parseInt(t.mood) - 1, 4)]
        : null,
      isEssential:
        t.category === 'rent' ||
        t.category === 'utilities' ||
        t.category === 'food',
      date: formatDateRelative(t.date),
      iconColor:
        t.type === 'income' ? colors.semantic.incomeLight : colors.semantic.expenseLight,
      iconTextColor:
        t.type === 'income' ? colors.semantic.incomeDark : colors.semantic.expenseDark,
    }));

  const spendingCurve = monthTransactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce(
      (acc, t) => {
        const last = acc[acc.length - 1];
        acc.push(last + Math.abs(t.amount));
        return acc;
      },
      [0],
    );

  return {
    user: {
      name: profile?.name || 'User',
      avatarInitial: (profile?.name || 'U')[0].toUpperCase(),
    },
    budget: {
      total: totalBudget || 2000,
      spent: totalSpent,
      periodLabel: 'Monthly budget',
      daysLeft: daysLeftInMonth(),
    },
    income: monthlyIncome,
    moodAvg: Math.max(1, Math.min(5, Math.round(moodAvg * 2) / 2)),
    categoryBreakdown: Object.entries(categoryBreakdown)
      .map(([category, amount]) => ({
        label: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        color: categoryColors[category] || colors.categories.other,
      }))
      .sort((a, b) => b.amount - a.amount),
    recentTransactions,
    spendingCurve,
  };
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPending && !session) {
      navigate('/auth');
    }
  }, [session, isPending, navigate]);

  const fetchData = useCallback(async () => {
    try {
      const [transactions, budgets, , profile] = await Promise.all([
        getTransactions(),
        getBudgets(),
        getGoals(),
        getMyProfile(),
      ]);

      const dashboardData = transformData(
        transactions,
        budgets,
        profile,
      );
      setData(dashboardData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        No data available
      </div>
    );
  }

  return <Dashboard {...data} />;
}
