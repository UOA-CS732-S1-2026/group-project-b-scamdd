import { useState } from 'react'
import { colors } from '../../colours'
import StatCard from './StatCard'
import SpendingChart from './SpendingChart'
import CategoryChart from './CategoryChart'
import RecentTransactions from './RecentTransactions'
import BudgetProgress from './BudgetProgress'
import './Dashboard.css'

const MOCK_DATA = {
  user: { name: 'Name', avatarInitial: 'A' },
  budget: { total: 1800, spent: 1247, periodLabel: 'Monthly budget', daysLeft: 12 },
  income: 2100,
  moodAvg: 3.8,
  categoryBreakdown: [
    { label: 'Food',      amount: 412, color: colors.categories.food },
    { label: 'Rent',      amount: 280, color: colors.categories.rent },
    { label: 'Transport', amount: 253, color: colors.categories.transport },
    { label: 'Other',     amount: 302, color: colors.categories.other },
  ],
  recentTransactions: [
    {
      id: '1',
      name: 'Supermarket',
      category: 'Food',
      subcategory: 'groceries',
      amount: -47.20,
      mood: 3,
      moodEmoji: '😐',
      isEssential: true,
      date: 'Today',
      iconColor: colors.semantic.warningLight,
      iconTextColor: colors.semantic.warningDark,
    },
    {
      id: '2',
      name: 'Coffee shop',
      category: 'Cafés',
      subcategory: 'non-essential',
      amount: -5.50,
      mood: 5,
      moodEmoji: '😊',
      isEssential: false,
      date: 'Today',
      iconColor: colors.semantic.purpleLight,
      iconTextColor: colors.semantic.purpleDark,
    },
    {
      id: '3',
      name: 'Monthly salary',
      category: 'Income',
      subcategory: null,
      amount: 1050,
      mood: null,
      moodEmoji: null,
      isEssential: null,
      date: 'Yesterday',
      iconColor: colors.semantic.incomeLight,
      iconTextColor: colors.semantic.incomeDark,
    },
    {
      id: '4',
      name: 'Online store',
      category: 'Entertainment',
      subcategory: 'non-essential',
      amount: -89.00,
      mood: 2,
      moodEmoji: '🥲',
      isEssential: false,
      date: 'Yesterday',
      iconColor: colors.semantic.expenseLight,
      iconTextColor: colors.semantic.expenseDark,
    },
  ],
  spendingCurve: [
    0, 47, 52, 140, 145, 195, 250, 298, 303, 392, 400, 450, 490,
    537, 600, 650, 689, 750, 800, 890, 950, 1010, 1100, 1150, 1200, 1230, 1247,
  ],
}

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false)
  const c = isDark ? colors.dark : colors.light
  const { budget, income, moodAvg, categoryBreakdown, recentTransactions, spendingCurve, user } = MOCK_DATA

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
            {['Dashboard', 'Transactions', 'Budgets', 'Insights'].map(link => (
              <span
                key={link}
                className="nav-link"
                style={{
                  color: link === 'Dashboard' ? c.textPrimary : c.textSecondary,
                  fontWeight: link === 'Dashboard' ? 500 : 400,
                }}
              >
                {link}
              </span>
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
          <div
            className="avatar"
            style={{
              background: isDark ? colors.dark.rose : colors.light.yellow,
              color: c.textPrimary,
            }}
          >
            {user.avatarInitial}
          </div>
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