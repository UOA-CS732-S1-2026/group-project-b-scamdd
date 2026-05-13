import mongoose, { Schema, Document } from 'mongoose';

export interface IGameScore extends Document {
  userId: string;
  game: 'price' | 'budget';
  score: number;
  createdAt?: Date;
}

const GameScoreSchema = new Schema<IGameScore>(
  {
    userId: { type: String, required: true, index: true },
    game: { type: String, required: true, enum: ['price', 'budget'] },
    score: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// Aggregations group by (game, userId) and take max(score). Index supports
// that path and also gives a stable tiebreak by createdAt for same-score
// entries (audit Phase 7).
GameScoreSchema.index({ game: 1, userId: 1, score: -1, createdAt: 1 });

export const GameScore = mongoose.model<IGameScore>('GameScore', GameScoreSchema);
