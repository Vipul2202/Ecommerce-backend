const mongoose = require('mongoose');

// Define the schema
const tokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    token: { type: String, required: true },
    is_used: { type: Boolean, required: true },
    is_verified: { type: Boolean, default: false },
    expiration_time: { type: Date, required: false },
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model('token', tokenSchema);
