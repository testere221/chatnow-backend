import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  _id: string;
  user1_id: string;
  user2_id: string;
  last_message: string;
  last_time: Date;
  unread_count: number;
  name: string;
  avatar?: string;
  avatar_image?: string;
  bg_color?: string;
  gender?: string;
  created_at: Date;
  updated_at: Date;
}

const ChatSchema = new Schema<IChat>({
  user1_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  user2_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  last_message: {
    type: String,
    default: ''
  },
  last_time: {
    type: Date,
    default: Date.now
  },
  unread_count: {
    type: Number,
    default: 0,
    min: 0
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: '👤'
  },
  avatar_image: {
    type: String,
    default: ''
  },
  bg_color: {
    type: String,
    default: '#FFB6C1'
  },
  gender: {
    type: String,
    enum: ['male', 'female']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
ChatSchema.index({ user1_id: 1 });
ChatSchema.index({ user2_id: 1 });
ChatSchema.index({ last_time: -1 });
ChatSchema.index({ user1_id: 1, user2_id: 1 }, { unique: true });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);
