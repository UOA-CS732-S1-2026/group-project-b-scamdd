import mongoose, { Schema, Document } from 'mongoose';

export interface IUserCategory extends Document {
  userId: string;
  name: string;
  color: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserCategorySchema = new Schema<IUserCategory>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true, default: '#CBCBCB' },
  },
  { timestamps: true },
);

UserCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const UserCategory = mongoose.model<IUserCategory>('UserCategory', UserCategorySchema);
