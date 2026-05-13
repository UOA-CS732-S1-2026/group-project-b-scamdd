import mongoose, { Schema, Document } from 'mongoose';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface IFriendship extends Document {
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  seenByRequester?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: String, required: true, index: true },
    addresseeId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    seenByRequester: { type: Boolean, default: true },
  },
  { timestamps: true },
);

FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
FriendshipSchema.index({ addresseeId: 1, requesterId: 1 });
FriendshipSchema.index({ status: 1, requesterId: 1 });
FriendshipSchema.index({ status: 1, addresseeId: 1 });

export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema);
