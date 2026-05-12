import cron from 'node-cron';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { MonthlyWrapped } from '../models/MonthlyWrapped.js';
import { computeWrappedStats } from '../lib/computeWrapped.js';

async function generatePreviousMonthWrapped() {
  const now = new Date();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-indexed previous month

  console.log(`[wrapped-cron] Generating wrapped for ${year}-${month}`);

  const users = await User.find({}, '_id');
  let created = 0;

  for (const user of users) {
    const userId = String(user._id);

    const exists = await MonthlyWrapped.exists({ userId, year, month });
    if (exists) continue;

    const txns = await Transaction.find({
      userId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lt:  new Date(year, month, 1),
      },
    });

    if (txns.length === 0) continue;

    await MonthlyWrapped.create({
      userId,
      year,
      month,
      stats: computeWrappedStats(txns),
      generatedAt: new Date(),
    });

    created++;
  }

  console.log(`[wrapped-cron] Done — created ${created} wrapped documents`);
}

export function startWrappedCron() {
  // Runs at 00:00 on the 1st of every month
  cron.schedule('0 0 1 * *', generatePreviousMonthWrapped, { timezone: 'Pacific/Auckland' });
  console.log('[wrapped-cron] Scheduled: 1st of month at midnight NZST');
}
