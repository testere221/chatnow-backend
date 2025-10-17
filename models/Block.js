const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
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

// Indexes for better performance
BlockSchema.index({ blocker_id: 1 });
BlockSchema.index({ blocked_id: 1 });
BlockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });

module.exports = mongoose.model('Block', BlockSchema);
