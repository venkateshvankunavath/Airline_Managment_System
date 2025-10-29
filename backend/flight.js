const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  flightno: { type: Number, required: true, unique: true },
  source: { type: String, required: true },
  start_time: { type: String, required: true },
  date: { type: String, required: true },
  destination: { type: String, required: true },
  end_time: { type: String, required: true },
  booking_ids: { type: [String], default: [] },  
  total_seats: { type: Number, default: 242 },
  p_seats: { type: Number, default: 8 },
  b_seats: { type: Number,  default: 18 },
  e_seats: { type: Number,  default: 216 },
  bookedseats:  { type: [String], default: [] },
  e_price: { type: Number, default: 9000},
  b_price: { type: Number, default: 9000 },
  p_price: { type: Number, default: 9000},
  status: { type: String, default: "Scheduled" }
});

module.exports = mongoose.model('flights', FlightSchema);
