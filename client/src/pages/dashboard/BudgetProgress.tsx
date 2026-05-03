import { colors } from '../../colours'

interface Category {
  label: string
  amount: number
  color: string
}

interface BudgetProgressProps {
  categories: Category[]
  total: number
  isDark: boolean
}

export default function BudgetProgress({ categories, total, isDark }: BudgetProgressProps) {
  const c = isDark ? colors.dark : colors.light

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {categories.map(cat => {
        const pct = Math.min((cat.amount / total) * 100, 100)
        return (
          <div key={cat.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
              <span style={{ fontSize: '12px', color: c.textPrimary, fontWeight: 500 }}>{cat.label}</span>
              <span style={{ fontSize: '11px', color: c.textSecondary }}>
                ${cat.amount.toLocaleString()}
                <span style={{ opacity: 0.55, marginLeft: '4px' }}>· {Math.round(pct)}% of budget</span>
              </span>
            </div>
            <div style={{
              height: '5px',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: cat.color,
                borderRadius: '3px',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
