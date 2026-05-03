import { colors } from '../../colours'

interface Category {
  label: string
  amount: number
  color: string
}

interface CategoryChartProps {
  categories: Category[]
  isDark: boolean
}

export default function CategoryChart({ categories, isDark }: CategoryChartProps) {
  const c = isDark ? colors.dark : colors.light
  const total = categories.reduce((s, cat) => s + cat.amount, 0)

  const R = 30
  const CX = 40
  const CY = 40
  const circumference = 2 * Math.PI * R

  let offset = 0
  const segments = categories.map(cat => {
    const pct = cat.amount / total
    const dash = pct * circumference
    const seg = { ...cat, dash, offset: -offset }
    offset += dash
    return seg
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg viewBox="0 0 80 80" style={{ width: '88px', height: '88px', flexShrink: 0 }}>
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.06)' : '#F1EFE8'}
          strokeWidth="13" />
        {/* Segments */}
        {segments.map(seg => (
          <circle
            key={seg.label}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth="13"
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={seg.offset}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        ))}
        {/* Centre label */}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="9" fill={c.textSecondary}>total</text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="10" fontWeight="600" fill={c.textPrimary}>
          ${total.toLocaleString()}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {categories.map(cat => {
          const pct = Math.round((cat.amount / total) * 100)
          return (
            <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px',
                  background: cat.color, borderRadius: '2px',
                }} />
                <span style={{ fontSize: '12px', color: c.textPrimary }}>{cat.label}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: c.textSecondary }}>{pct}%</span>
                <span style={{ fontSize: '12px', color: c.textSecondary }}>${cat.amount.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}