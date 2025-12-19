import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  participants: string[]; // [user1Id, user2Id]
  sender_id: string;
  receiver_id: string;
  text: string;
  image_url?: string;
  timestamp: Date;
  read: boolean;
  deleted_for: string[]; // Hangi kullanıcılar için silindi
  chat_id: string;
}

const MessageSchema = new Schema<IMessage>({
  participants: {
    type: [String],
    required: true,
    index: true
  },
  sender_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  receiver_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  image_url: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  deleted_for: {
    type: [String],
    default: []
  },
  chat_id: {
    type: String,
    required: true,
    index: true
  }
});

// Indexes
MessageSchema.index({ participants: 1, timestamp: -1 });
MessageSchema.index({ chat_id: 1, timestamp: -1 });
MessageSchema.index({ sender_id: 1 });
MessageSchema.index({ receiver_id: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
