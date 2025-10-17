const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  surname: { type: String, required: false },
  age: { type: Number, required: true },
  location: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  about: { type: String },
  avatar: { type: String },
  avatar_image: { type: String },
  bg_color: { type: String },
  diamonds: { type: Number, default: 1000 },
  is_online: { type: Boolean, default: false },
  last_active: { type: Date },
  hobbies: [{ type: String }],
  push_token: { type: String },
  platform: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Pre-save middleware - TAMAMEN KALDIRILDI
// userSchema.pre('save', async function(next) {
//   // Hash password if modified
//   if (this.isModified('password') && this.password) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   
//   // Always update timestamp fields
//   this.updated_at = new Date();
//   
//   // Set last_active if not provided
//   if (!this.last_active) {
//     this.last_active = new Date();
//   }
//   
//   next();
// });

// Pre-update middleware for findAndUpdate operations
userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function() {
  this.set({ updated_at: new Date() });
});

module.exports = mongoose.model('User', userSchema);
