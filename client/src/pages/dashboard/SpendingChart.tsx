import { colors } from '../../colours'

interface SpendingChartProps {
  data: number[]
  budget: number
  isDark: boolean
}

export default function SpendingChart({ data, budget, isDark }: SpendingChartProps) {
  const W = 360
  const H = 120
  const PAD = { top: 8, bottom: 20, left: 4, right: 4 }
  const chartH = H - PAD.top - PAD.bottom
  const chartW = W - PAD.left - PAD.right

  const max = Math.max(budget, ...data) * 1.05
  const points = data.map((v, i) => {
    const x = PAD.left + (i / (data.length - 1)) * chartW
    const y = PAD.top + chartH - (v / max) * chartH
    return [x, y] as [number, number]
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${PAD.top + chartH} L ${PAD.left} ${PAD.top + chartH} Z`

  const budgetY = PAD.top + chartH - (budget / max) * chartH

  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : '#D3D1C7'
  const lineColor = isDark ? colors.dark.beige : colors.semantic.purple
  const areaColor = isDark ? 'rgba(231,212,187,0.12)' : 'rgba(83,74,183,0.09)'
  const budgetLineColor = colors.semantic.expense
  const textColor = isDark ? colors.dark.textMuted : '#888780'

  const labels = [
    { label: 'Oct 1', x: PAD.left },
    { label: `Oct ${Math.round(data.length / 2)}`, x: W / 2 - 12 },
    { label: `Oct ${data.length}`, x: W - PAD.right - 24 },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => {
        const y = PAD.top + chartH * (1 - pct)
        return (
          <line key={pct} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke={gridColor} strokeWidth="0.5" strokeDasharray="3,3" />
        )
      })}
      <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH}
        stroke={gridColor} strokeWidth="0.5" />

      {/* Budget limit line */}
      <line x1={PAD.left} y1={budgetY} x2={W - PAD.right} y2={budgetY}
        stroke={budgetLineColor} strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
      <text x={W - PAD.right - 2} y={budgetY - 3} fontSize="8" fill={budgetLineColor}
        textAnchor="end" opacity="0.7">budget</text>

      {/* Area fill */}
      <path d={areaPath} fill={areaColor} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Today dot */}
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]}
        r="3" fill={lineColor} />

      {/* X-axis labels */}
      {labels.map(({ label, x }) => (
        <text key={label} x={x} y={H - 2} fontSize="9" fill={textColor}>{label}</text>
      ))}
    </svg>
  )
}