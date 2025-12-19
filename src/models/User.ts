import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  surname: string;
  age: number;
  location: string;
  gender: 'male' | 'female';
  about?: string;
  avatar?: string;
  avatar_image?: string;
  bg_color?: string;
  diamonds: number;
  is_online: boolean;
  last_active?: Date;
  hobbies: string[];
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female']
  },
  about: {
    type: String,
    default: 'Yeni kullanıcı',
    maxlength: 500
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
  diamonds: {
    type: Number,
    default: 500,
    min: 0
  },
  is_online: {
    type: Boolean,
    default: false
  },
  last_active: {
    type: Date,
    default: Date.now
  },
  hobbies: {
    type: [String],
    default: ['Yeni kullanıcı']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ is_online: 1 });
UserSchema.index({ last_active: -1 });
UserSchema.index({ created_at: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
