const mongoose = require('mongoose');

const tokenPackageSchema = new mongoose.Schema({
  product_id: { 
    type: String, 
    required: true, 
    unique: true,
    // Google Play product ID (örn: "token_pack_1")
  },
  token_amount: { 
    type: Number, 
    required: true,
    min: 1
  },
  price_try: { 
    type: Number, 
    required: true,
    min: 0
  },
  price_usd: { 
    type: Number, 
    required: true,
    min: 0
  },
  display_order: { 
    type: Number, 
    default: 0 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-update middleware
tokenPackageSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function() {
  this.set({ updated_at: new Date() });
});

module.exports = mongoose.model('TokenPackage', tokenPackageSchema);

