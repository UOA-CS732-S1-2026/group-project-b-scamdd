import mongoose, { Schema, Document } from 'mongoose';

export interface IWrappedStats {
  totalSpent: number;
  totalIncome: number;
  savingsRate: number;           // (income - spent) / income, can be negative
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  biggestExpenseTitle: string;
  biggestExpenseAmount: number;
  mostRegrettedTitle: string;    // lowest mood, highest spend
  mostRegrettedAmount: number;
  happiestTitle: string;         // worth-it mood, highest spend
  happiestAmount: number;
  busiestDayOfMonth: number;     // day number with most spend
  busiestDayAmount: number;
  avgDailySpend: number;
  moodAvg: number;               // 1–5
}

export interface IMonthlyWrapped extends Document {
  userId: string;
  year: number;
  month: number;                 // 1-indexed
  stats: IWrappedStats;
  generatedAt: Date;
}

const WrappedStatsSchema = new Schema<IWrappedStats>({
  totalSpent:            { type: Number, required: true },
  totalIncome:           { type: Number, required: true },
  savingsRate:           { type: Number, required: true },
  transactionCount:      { type: Number, required: true },
  topCategory:           { type: String, required: true },
  topCategoryAmount:     { type: Number, required: true },
  biggestExpenseTitle:   { type: String, required: true },
  biggestExpenseAmount:  { type: Number, required: true },
  mostRegrettedTitle:    { type: String, default: '' },
  mostRegrettedAmount:   { type: Number, default: 0 },
  happiestTitle:         { type: String, default: '' },
  happiestAmount:        { type: Number, default: 0 },
  busiestDayOfMonth:     { type: Number, required: true },
  busiestDayAmount:      { type: Number, required: true },
  avgDailySpend:         { type: Number, required: true },
  moodAvg:               { type: Number, required: true },
}, { _id: false });

const MonthlyWrappedSchema = new Schema<IMonthlyWrapped>(
  {
    userId:      { type: String, required: true },
    year:        { type: Number, required: true },
    month:       { type: Number, required: true },
    stats:       { type: WrappedStatsSchema, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

MonthlyWrappedSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export const MonthlyWrapped = mongoose.model<IMonthlyWrapped>('MonthlyWrapped', MonthlyWrappedSchema);
