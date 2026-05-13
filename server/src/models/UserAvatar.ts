import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAvatar extends Document {
  userId: string; // better-auth user id (string)
  avatarColor: string | null;
  avatarImage: string | null;
}

const UserAvatarSchema = new Schema<IUserAvatar>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    avatarColor: { type: String, default: null },
    avatarImage: { type: String, default: null },
  },
  { collection: 'user_avatar', timestamps: true },
);

export const UserAvatar = mongoose.model<IUserAvatar>('UserAvatar', UserAvatarSchema);
