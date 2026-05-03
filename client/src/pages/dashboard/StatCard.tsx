import { colors } from '../../colours'

interface StatCardProps {
  label: string
  value: string
  sub: string
  isDark: boolean
  accent?: string
  children?: React.ReactNode
}

export default function StatCard({ label, value, sub, isDark, accent, children }: StatCardProps) {
  const c = isDark ? colors.dark : colors.light

  return (
    <div
      style={{
        background: isDark ? colors.dark.surface : colors.light.yellow,
        borderRadius: '14px',
        padding: '14px 16px',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ fontSize: '11px', color: c.textSecondary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 600, color: accent ?? c.textPrimary, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: c.textSecondary, marginTop: '3px' }}>
        {sub}
      </div>
      {children}
    </div>
  )
}