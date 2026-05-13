import 'dotenv/config';
import mongoose from 'mongoose';
import { Achievement } from '../models/Achievement.js';
import { Budget } from '../models/Budget.js';
import { Cheer } from '../models/Cheer.js';
import { Friendship } from '../models/Friendship.js';
import { GameScore } from '../models/GameScore.js';
import { Goal } from '../models/Goal.js';
import { MonthlyWrapped } from '../models/MonthlyWrapped.js';
import { SharedBudget } from '../models/SharedBudget.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { UserCategory } from '../models/UserCategory.js';

const models: { name: string; model: mongoose.Model<unknown> }[] = [
  { name: 'Achievement', model: Achievement as unknown as mongoose.Model<unknown> },
  { name: 'Budget', model: Budget as unknown as mongoose.Model<unknown> },
  { name: 'Cheer', model: Cheer as unknown as mongoose.Model<unknown> },
  { name: 'Friendship', model: Friendship as unknown as mongoose.Model<unknown> },
  { name: 'GameScore', model: GameScore as unknown as mongoose.Model<unknown> },
  { name: 'Goal', model: Goal as unknown as mongoose.Model<unknown> },
  { name: 'MonthlyWrapped', model: MonthlyWrapped as unknown as mongoose.Model<unknown> },
  { name: 'SharedBudget', model: SharedBudget as unknown as mongoose.Model<unknown> },
  { name: 'Transaction', model: Transaction as unknown as mongoose.Model<unknown> },
  { name: 'User', model: User as unknown as mongoose.Model<unknown> },
  { name: 'UserAvatar', model: UserAvatar as unknown as mongoose.Model<unknown> },
  { name: 'UserCategory', model: UserCategory as unknown as mongoose.Model<unknown> },
];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  for (const { name, model } of models) {
    process.stdout.write(`  ${name} ... `);
    try {
      await model.syncIndexes();
      console.log('ok');
    } catch (err) {
      console.log('FAILED');
      console.error(err);
      process.exitCode = 1;
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
