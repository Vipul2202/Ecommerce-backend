const mongoose = require("mongoose");

const servicePriceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    category: { type: String, enum: ["tier", "premium", "extra"], required: true },
    label: { type: String, required: true },
    // Tiers (wash/detail) are priced per vehicle type.
    sedan: { type: Number, default: null },
    suv: { type: Number, default: null },
    fourWd: { type: Number, default: null },
    // Premium finishes and extras have a single flat price.
    flatPrice: { type: Number, default: null },
    // When true, the price is shown as "in-person inspection required"
    // regardless of flatPrice (used by Ceramic Coating).
    quoteOnly: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("servicePrice", servicePriceSchema);
