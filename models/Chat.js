const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user1_id: { type: String, required: true },
  user2_id: { type: String, required: true },
  chat_id: { type: String, required: true }, // Chat ID'yi de kaydet
  last_message: { type: String, default: '' },
  last_time: { type: Date, default: Date.now },
  unread_count_user1: { type: Number, default: 0 }, // User1 için unread count
  unread_count_user2: { type: Number, default: 0 }, // User2 için unread count
  name: { type: String, required: true },
  avatar: { type: String },
  avatar_image: { type: String },
  bg_color: { type: String },
  gender: { type: String },
  deleted_for: [{ type: String }] // Hangi kullanıcılar için silinmiş
});

module.exports = mongoose.model('Chat', chatSchema);
