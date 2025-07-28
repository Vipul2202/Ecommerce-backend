const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtPurchase: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  items: [orderItemSchema],

  totalAmount: {
    type: Number,
    required: true
  },

  

  shippingAddress: {
    fullName: String,
    address: String,
    city: String,
    state: String,
    postalCode: Number,
    country: String,
    phone: String
  },

  shippingStatus: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  paidAt: Date,
  deliveredAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
