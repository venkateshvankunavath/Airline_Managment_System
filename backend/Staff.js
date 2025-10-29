const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const StaffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: uuidv4 }, // auto-generate
  name: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  joinDate: { type: String, required: true },
  status: { type: String, default: "Active" }
});

module.exports = mongoose.model('Staff', StaffSchema);
