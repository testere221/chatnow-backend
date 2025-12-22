const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  product_id: { 
    type: String, 
    required: true 
  },
  purchase_token: { 
    type: String, 
    required: true, 
    unique: true // Aynı purchase token ile tekrar jeton yüklenmesini engelle
  },
  order_id: { 
    type: String 
  },
  package_name: { 
    type: String, 
    required: true 
  },
  token_amount: { 
    type: Number, 
    required: true 
  },
  verified: { 
    type: Boolean, 
    default: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster lookups
purchaseSchema.index({ purchase_token: 1 });
purchaseSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);

