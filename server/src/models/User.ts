import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  emailVerified?: boolean;
  image?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  currency?: string;
  profileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true },
    name: { type: String },
    emailVerified: { type: Boolean },
    image: { type: String },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
    },
    displayName: { type: String, maxlength: 50, trim: true },
    bio: { type: String, maxlength: 200, trim: true },
    currency: { type: String, default: 'NZD', uppercase: true, minlength: 3, maxlength: 3 },
    profileComplete: { type: Boolean, default: false },
  },
  { collection: 'user', timestamps: true, strict: false },
);

export const User = mongoose.model<IUser>('User', UserSchema);
