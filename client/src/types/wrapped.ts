export interface WrappedStats {
  totalSpent: number;
  totalIncome: number;
  savingsRate: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  biggestExpenseTitle: string;
  biggestExpenseAmount: number;
  mostRegrettedTitle: string;
  mostRegrettedAmount: number;
  happiestTitle: string;
  happiestAmount: number;
  busiestDayOfMonth: number;
  busiestDayAmount: number;
  avgDailySpend: number;
  moodAvg: number;
}

export interface WrappedMonth {
  _id: string;
  userId: string;
  year: number;
  month: number;
  stats: WrappedStats;
  generatedAt: string;
}
