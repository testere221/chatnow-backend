const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat_id: { type: String, required: true },
  sender_id: { type: String, required: true },
  receiver_id: { type: String, required: true },
  text: { type: String },
  image_url: { type: String },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  deleted_for: [{ type: String }]
});

module.exports = mongoose.model('Message', messageSchema);
