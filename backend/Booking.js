// models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: String,
  username: String,
  flightNumber: String,
  date: String,
  from: String,
  to: String,
  departureTime: String,
  arrivalTime: String,
  generalinfo: {
    fullName:String,
    email: String,
    phone: String,
  },
  passengers: [
    {
      fullName: String,
      passportNumber: String,
      dob: String,
      seatAllocation: String,
    },
  ],
  allocatedSeats: [String],
  totalPrice: Number,
});

module.exports = mongoose.model('bookings', BookingSchema);
