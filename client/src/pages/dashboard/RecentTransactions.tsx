import { colors } from '../../colours'

interface Transaction {
  id: string
  name: string
  category: string
  subcategory: string | null
  amount: number
  mood: number | null
  moodEmoji: string | null
  isEssential: boolean | null
  date: string
  iconColor: string
  iconTextColor: string
}

interface RecentTransactionsProps {
  transactions: Transaction[]
  isDark: boolean
}

export default function RecentTransactions({ transactions, isDark }: RecentTransactionsProps) {
  const c = isDark ? colors.dark : colors.light
  const isIncome = (t: Transaction) => t.amount > 0

  return (
    <div>
      {transactions.map((t, i) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < transactions.length - 1 ? `0.5px solid ${c.border}` : 'none',
            gap: '12px',
          }}
        >
          {/* Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: t.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: t.iconTextColor,
            flexShrink: 0,
          }}>
            {isIncome(t) ? '$' : t.name[0].toUpperCase()}
          </div>

          {/* Name + category */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              color: c.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {t.name}
            </div>
            <div style={{ fontSize: '11px', color: c.textSecondary, marginTop: '1px' }}>
              {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
              <span style={{ marginLeft: '6px', opacity: 0.5 }}>{t.date}</span>
            </div>
          </div>

          {/* Mood - only shown for non-essential expenses */}
          <div style={{ fontSize: '13px', minWidth: '36px', textAlign: 'center', color: c.textSecondary }}>
            {t.moodEmoji && t.mood !== null
              ? <span title={`Mood: ${t.mood}/5`}>{t.moodEmoji} {t.mood}</span>
              : <span style={{ opacity: 0.3 }}>-</span>
            }
          </div>

          {/* Amount */}
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isIncome(t) ? colors.semantic.income : c.textPrimary,
            flexShrink: 0,
          }}>
            {isIncome(t) ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  )
}