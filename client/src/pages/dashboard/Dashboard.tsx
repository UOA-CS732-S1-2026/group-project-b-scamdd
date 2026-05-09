import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/auth-client'
import { colors } from '../../colours'
import StatCard from './StatCard'
import SpendingChart from './SpendingChart'
import CategoryChart from './CategoryChart'
import RecentTransactions from './RecentTransactions'
import BudgetProgress from './BudgetProgress'
import './Dashboard.css'

interface DashboardProps {
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

export default function Dashboard(props: DashboardProps) {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(false)
  const c = isDark ? colors.dark : colors.light
  const { budget, income, moodAvg, categoryBreakdown, recentTransactions, spendingCurve, user } = props

  const remaining = budget.total - budget.spent
  const budgetPct = Math.min((budget.spent / budget.total) * 100, 100)
  const isOverBudget = budget.spent > budget.total

  return (
    <div
      className="dashboard-root"
      style={{ background: isDark ? colors.dark.background : '#F5F0E8', color: c.textPrimary }}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* ── Navbar ──────────────────────────────── */}
      <nav className="dashboard-nav" style={{ borderBottom: `1px solid ${c.border}`, background: isDark ? colors.dark.background : '#F5F0E8' }}>
        <div className="nav-left">
          <span className="nav-logo" style={{ color: c.textPrimary }}>Pocket</span>
          <div className="nav-links">
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Transactions', path: '/transactions' },
              { label: 'Budgets', path: '/budgets' },
              { label: 'Goals', path: '/goals' },
            ].map(link => (
              <button
                key={link.path}
                className="nav-link"
                style={{
                  color: window.location.pathname === link.path ? c.textPrimary : c.textSecondary,
                  fontWeight: window.location.pathname === link.path ? 500 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  font: 'inherit',
                }}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <button
            className="theme-toggle"
            onClick={() => setIsDark(d => !d)}
            style={{ color: c.textSecondary, border: `1px solid ${c.border}` }}
            title="Toggle dark mode"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            className="avatar"
            style={{
              background: isDark ? colors.dark.rose : colors.light.yellow,
              color: c.textPrimary,
              cursor: 'pointer',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}
            onClick={() => signOut().then(() => navigate('/auth'))}
            title="Sign out"
          >
            {user.avatarInitial}
          </button>
        </div>
      </nav>

      {/* ── Main content ────────────────────────── */}
      <main className="dashboard-main">

        {/* Header row */}
        <div className="dashboard-header">
          <div>
            <div className="header-subtitle" style={{ color: c.textSecondary }}>{budget.periodLabel}</div>
            <div className="header-title" style={{ color: c.textPrimary }}>Hi {user.name} 👋</div>
          </div>
          <button
            className="add-btn"
            style={{
              background: isDark ? colors.dark.surface : colors.light.yellow,
              color: c.textPrimary,
              border: `1px solid ${c.border}`,
            }}
            onClick={() => navigate('/transactions')}
          >
            + Add transaction
          </button>
        </div>

        {/* ── Stat cards ──────────────────────────── */}
        <div className="stat-grid">
          <StatCard
            label="Spent"
            value={`$${budget.spent.toLocaleString()}`}
            sub={`of $${budget.total.toLocaleString()}`}
            isDark={isDark}
            accent={isOverBudget ? colors.semantic.negative : undefined}
          >
            <div className="budget-bar-track" style={{ background: c.border }}>
              <div
                className="budget-bar-fill"
                style={{
                  width: `${budgetPct}%`,
                  background: isOverBudget
                    ? colors.semantic.negative
                    : isDark ? colors.dark.beige : colors.light.accent,
                }}
              />
            </div>
          </StatCard>

          <StatCard
            label="Remaining"
            value={`$${remaining.toLocaleString()}`}
            sub={`${budget.daysLeft} days left`}
            isDark={isDark}
            accent={remaining < 200 ? colors.semantic.negative : colors.semantic.income}
          />

          <StatCard
            label="Income"
            value={`$${income.toLocaleString()}`}
            sub="this month"
            isDark={isDark}
            accent={colors.semantic.income}
          />

          <StatCard
            label="Mood avg"
            value={moodAvg.toFixed(1)}
            sub="on non-essentials"
            isDark={isDark}
            accent={
              moodAvg >= 4 ? colors.semantic.income :
              moodAvg >= 3 ? colors.semantic.warning :
              colors.semantic.expense
            }
          >
            <div className="mood-emojis">
              {['😢', '😕', '😐', '🙂', '😊'].map((e, i) => (
                <span
                  key={i}
                  className="mood-pip"
                  style={{ opacity: i < Math.round(moodAvg) ? 1 : 0.25 }}
                >
                  {e}
                </span>
              ))}
            </div>
          </StatCard>
        </div>

        {/* ── Charts row ──────────────────────────── */}
        <div className="charts-grid">
          <div className="chart-card" style={{ background: c.background, border: `1px solid ${c.border}` }}>
            <div className="card-title" style={{ color: c.textPrimary }}>Spending this month</div>
            <SpendingChart data={spendingCurve} budget={budget.total} isDark={isDark} />
          </div>

          <div className="chart-card" style={{ background: c.background, border: `1px solid ${c.border}` }}>
            <div className="card-title" style={{ color: c.textPrimary }}>By category</div>
            <CategoryChart categories={categoryBreakdown} isDark={isDark} />
          </div>
        </div>

        {/* ── Budget breakdown ─────────────────────── */}
        <div className="chart-card" style={{ background: c.background, border: `1px solid ${c.border}`, marginBottom: '16px' }}>
          <div className="card-title" style={{ color: c.textPrimary }}>Budget breakdown</div>
          <BudgetProgress categories={categoryBreakdown} total={budget.total} isDark={isDark} />
        </div>

        {/* ── Recent transactions ──────────────────── */}
        <div className="chart-card" style={{ background: c.background, border: `1px solid ${c.border}` }}>
          <div className="card-header-row">
            <div className="card-title" style={{ color: c.textPrimary }}>Recent transactions</div>
            <span className="view-all" style={{ color: c.textSecondary }}>View all →</span>
          </div>
          <RecentTransactions transactions={recentTransactions} isDark={isDark} />
        </div>

      </main>
    </div>
  )
}