const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_id: { type: String, required: true },
  reported_user_id: { type: String, required: true },
  reported_user_name: { type: String, required: true },
  reason: { type: String, required: true },
  chat_id: { type: String }, // Opsiyonel, sadece sohbetten şikayet varsa
  status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
  reviewed_by: { type: String }, // Admin ID
  review_notes: { type: String },
  created_at: { type: Date, default: Date.now },
  reviewed_at: { type: Date }
});

module.exports = mongoose.model('Report', reportSchema);

