export interface AchievementMeta {
  key: string;
  label: string;
  message: string;
  messageYou: string;
}

export const ACHIEVEMENT_META: Record<string, AchievementMeta> = {
  first_transaction:   {
    key: 'first_transaction',  label: 'First steps',
    message: 'Logged their first transaction!',
    messageYou: 'You logged your first transaction!',
  },
  txn_100:             {
    key: 'txn_100',            label: 'Century',
    message: 'Hit 100 logged transactions!',
    messageYou: 'You hit 100 logged transactions!',
  },
  txn_500:             {
    key: 'txn_500',            label: 'Power tracker',
    message: 'Hit 500 logged transactions!',
    messageYou: 'You hit 500 logged transactions!',
  },
  streak_7:            {
    key: 'streak_7',           label: 'Week one',
    message: '7 days under budget!',
    messageYou: "You're 7 days under budget!",
  },
  streak_30:           {
    key: 'streak_30',          label: 'Solid month',
    message: '30 days under budget!',
    messageYou: "You're 30 days under budget!",
  },
  streak_100:          {
    key: 'streak_100',         label: 'Centenarian',
    message: '100 days under budget!',
    messageYou: "You're 100 days under budget!",
  },
  first_budget:        {
    key: 'first_budget',       label: 'Planner',
    message: 'Created their first budget!',
    messageYou: 'You created your first budget!',
  },
  under_budget_month:  {
    key: 'under_budget_month', label: 'Clean sheet',
    message: 'Stayed under every budget for a full month!',
    messageYou: 'You stayed under every budget for a full month!',
  },
  first_goal:          {
    key: 'first_goal',         label: 'Dream big',
    message: 'Set their first savings goal!',
    messageYou: 'You set your first savings goal!',
  },
  goal_completed:      {
    key: 'goal_completed',     label: 'Goal getter',
    message: 'Reached a savings goal!',
    messageYou: 'You reached a savings goal!',
  },
  no_regret_14:        {
    key: 'no_regret_14',       label: 'No regrets',
    message: 'No regret tags in 2 weeks!',
    messageYou: "You haven't tagged a regret in 2 weeks!",
  },
  safety_net:          {
    key: 'safety_net',         label: 'Safety net',
    message: 'Used their emergency category!',
    messageYou: 'You used your emergency category!',
  },
};

export function metaFor(key: string): AchievementMeta {
  return ACHIEVEMENT_META[key] ?? { key, label: key, message: 'Unlocked an achievement!', messageYou: 'You unlocked an achievement!' };
}

export function achievementMessage(key: string, isMe: boolean): string {
  const m = metaFor(key);
  return isMe ? m.messageYou : m.message;
}
