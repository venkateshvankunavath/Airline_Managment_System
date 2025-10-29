const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  booking_ids: [{ type: String }] ,
  notifications: [{ type: String}]
});

module.exports = mongoose.model('User', UserSchema);
