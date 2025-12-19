import mongoose, { Document, Schema } from 'mongoose';

export interface IBlock extends Document {
  _id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string;
  created_at: Date;
}

const BlockSchema = new Schema<IBlock>({
  blocker_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  blocked_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  reason: {
    type: String,
    default: 'Kullanıcı tarafından engellendi',
    maxlength: 200
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes
BlockSchema.index({ blocker_id: 1 });
BlockSchema.index({ blocked_id: 1 });
BlockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);
