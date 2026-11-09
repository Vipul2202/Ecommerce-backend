const mongoose = require('mongoose');

// Records any email that every available sending method (Zoho API, Resend)
// failed to deliver, so a failure shows up in the owner panel instead of
// only ever existing as a line in a server log nobody watches.
const emailFailureSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true }, // kept so a failed send can be retried as-is
    error: { type: String },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailFailure', emailFailureSchema);
