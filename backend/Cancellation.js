const mongoose = require('mongoose');

const CancellationSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested' },
  remarks: { type: String, default: '' },
  approvedAt: { type: Date }
});

module.exports = mongoose.model('cancellations', CancellationSchema);
