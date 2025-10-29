const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const emailCheck = require('email-check');

require('dotenv').config();

const User = require('./User');
const Flight = require('./flight');
const Admin = require('./Admin'); 
const Booking = require('./Booking');
const Staff = require('./Staff');
const Cancellation = require('./Cancellation');

const app = express();


// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log(process.env.GEMINI_API_KEY)

app.use(cors());
app.use(express.json());

async function updatePastFlights() {
  try {
    const today = new Date().toISOString().split('T')[0];

    while (true) {
      const pastFlights = await Flight.find({ date: { $lt: today } });

      if (pastFlights.length === 0) {
        console.log('All flights are up to date (on or after today).');
        break;
      }

      console.log(`Found ${pastFlights.length} flights with dates before ${today}. Updating...`);

      for (const flight of pastFlights) {
        const currentDate = new Date(flight.date);
        currentDate.setDate(currentDate.getDate() + 28);
        const newDate = currentDate.toISOString().split('T')[0];

        await Flight.updateOne(
          { _id: flight._id },
          {
            $set: {
              date: newDate,
              bookedseats: [],
              booking_ids: [],
              total_seats: 242,
              e_seats: 216,
              p_seats: 8,
              b_seats: 18,
              status: "Scheduled"
            }
          }
        );
        console.log(`Updated flight ${flight.flightno}: New date ${newDate}, seats reset.`);
      }
    }
  } catch (err) {
    console.error('Error updating past flights:', err);
  }
}

// Connect to MongoDB and run updatePastFlights before starting the server
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await updatePastFlights(); 
  })
  .catch((err) => console.error('MongoDB error:', err));

// Register Route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  try {
    const emailExists = await emailCheck(email)
      .catch(err => {
        console.log('Email verification error:', err.message);
        return true; 
      });
    
    if (!emailExists) {
      return res.status(400).json({ message: 'Email address does not exist or cannot receive emails' });
    }
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already used' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/admin-login', async (req, res) => {
  const { adminname, password } = req.body;

  try {
    const admin = await Admin.findOne({ adminname });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (password != admin.password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      message: 'Admin login successful',
      admin: {
        adminname: admin.adminname,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Flight Search Route
app.get('/flights', async (req, res) => {
  const { fromCity, toCity, departureDate, starttime, passengers, class: travelClass } = req.query;

  if (!fromCity || !toCity) {
    return res.status(400).json({ message: 'From and To cities are required' });
  }

  const query = {
    source: { $regex: new RegExp(fromCity, 'i') },
    destination: { $regex: new RegExp(toCity, 'i') },
    status: { $in: ['Scheduled', 'Delayed'] }
  };

  const searchDate = new Date();
  const todayDate = searchDate.toISOString().split('T')[0]; 
  const currentTime = `${searchDate.getHours().toString().padStart(2, '0')}:${searchDate.getMinutes().toString().padStart(2, '0')}`;

  if (departureDate) {
    query.date = departureDate;
    if (starttime) {
      query.start_time = { $gte: starttime };
    } else {
      query.start_time = { $gte: currentTime };
    }
  } else {
    query.$or = [
      { date: { $gt: todayDate } },
      { date: todayDate, start_time: { $gte: currentTime } }
    ];
  }

  if (passengers) {
    const p = parseInt(passengers);
    if (travelClass === 'platinum') query.p_seats = { $gte: p };
    else if (travelClass === 'business') query.b_seats = { $gte: p };
    else if (travelClass === 'economy') query.e_seats = { $gte: p };
    else query.total_seats = { $gte: p };
  }

  try {
    const flights = await Flight.find(query);
    res.json({ flights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/nowbookings', async (req, res) => {
  try {

    const newBooking = new Booking(req.body);
    await newBooking.save();
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      user.booking_ids.push(req.body.bookingId);
      await user.save();
    } else {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    const flight = await Flight.findOne({ flightno: req.body.flightNumber });
    if (flight) {
      flight.booking_ids.push(req.body.bookingId);
      await flight.save();
    } else {
      return res.status(400).json({ success: false, error: 'Flight not found' });
    }

    res.json({ success: true, bookingId: req.body.bookingId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/updateFlightSeats/:flightId', async (req, res) => {
  const { flightId } = req.params;
  const { bookedSeats } = req.body;

  try {
    const flight = await Flight.findById(flightId);

    if (!flight) {
      return res.status(404).json({ success: false, error: 'Flight not found' });
    }

    if (!Array.isArray(flight.bookedseats)) {
      flight.bookedseats = [];
    }

    const alreadyBooked = bookedSeats.filter(seat => flight.bookedseats.includes(seat));
    if (alreadyBooked.length > 0) {
      return res.status(400).json({
        success: false,
        error: `The following seat(s) are already booked: ${alreadyBooked.join(', ')}`
      });
    }

    let p_seats = 0;
    let b_seats = 0;
    let e_seats = 0;

    bookedSeats.forEach(seat => {
      const seatCategory = getSeatCategory(seat);

      if (seatCategory === 'platinum') {
        p_seats += 1;
      } else if (seatCategory === 'business') {
        b_seats += 1;
      } else if (seatCategory === 'economy') {
        e_seats += 1;
      }

      flight.bookedseats.push(seat);
    });

    flight.p_seats -= p_seats;
    flight.b_seats -= b_seats;
    flight.e_seats -= e_seats;
    flight.total_seats -= (p_seats + b_seats + e_seats);

    await flight.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const getSeatCategory = (seat) => {
  if (seat.startsWith('p-')) return 'platinum';
  if (seat.startsWith('b-')) return 'business';
  if (seat.startsWith('e-')) return 'economy';
  return null;
};

app.post('/bookings', async (req, res) => {
  const { username } = req.body;
  try {
    const bookings = await Booking.find({ username: username });

    const upcomingBookings = [];

    const today = new Date();

    for (const booking of bookings) {
      const bookingDate = new Date(booking.date); 
      const [hour, minute] = booking.departureTime.split(':').map(Number); 
      bookingDate.setHours(hour, minute);

      if (bookingDate <= today) {
        const { username, ...rest } = booking.toObject();
        upcomingBookings.push(rest);
      }
    }

    res.status(200).json({ bookings: upcomingBookings });
  } catch (error) {
    console.error('Error fetching booked flights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/booked-flights', async (req, res) => {
  const { username } = req.body;
  try {
    const bookings = await Booking.find({ username: username });

    const upcomingBookings = [];

    const today = new Date();

    for (const booking of bookings) {
      const bookingDate = new Date(booking.date); 
      const [hour, minute] = booking.departureTime.split(':').map(Number); 
      bookingDate.setHours(hour, minute);

      if (bookingDate > today) {
        const { username, ...rest } = booking.toObject(); 
        upcomingBookings.push(rest);
      }
    }

    res.status(200).json({ bookings: upcomingBookings });
  } catch (error) {
    console.error('Error fetching booked flights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/flights', async (req, res) => {
  const {
    flightId,
    from,
    to,
    startTime,
    endTime,
    p_price: platinumCost,
    b_price: businessCost,
    e_price: economyCost,
    status
  } = req.body;
  try {
    const existingFlight = await Flight.findOne({ flightno: flightId });
    if (existingFlight) {
      return res.status(400).json({ error: "Flight ID already exists" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = start.toISOString().split('T')[0];
    const startStr = start.toTimeString().slice(0, 5);
    const endStr = end.toTimeString().slice(0, 5);

    const newFlight = new Flight({
      flightno: flightId,
      source: from,
      start_time: startStr,
      date: dateStr,
      destination: to,
      end_time: endStr,
      e_price: economyCost,
      b_price: businessCost,
      p_price: platinumCost,
      status: status
    });
    await newFlight.save();
    res.status(201).json({ message: "Flight added", flight: newFlight });
  } catch (err) {
    console.error("Add flight error:", err);
    res.status(500).json({ error: "Failed to add flight" });
  }
});

app.get('/api/flights', async (req, res) => {
  try {
    const allFlights = await Flight.find({});
    
    const formattedFlights = allFlights.map(f => {
      const dateTime = new Date(`${f.date}T${f.start_time}`);
      return {
        flightId: f.flightno,
        from: f.source,
        to: f.destination,
        startTime: dateTime.toISOString(),
        endTime: new Date(`${f.date}T${f.end_time}`).toISOString(),
        p_price: f.p_price,
        b_price: f.b_price,
        e_price: f.e_price,
        status: f.status
      };
    });

    res.json(formattedFlights);
  } catch (err) {
    console.error("Fetch flight error:", err);
    res.status(500).json({ error: "Failed to fetch flights" });
  }
});

app.put('/api/flights/:flightId', async (req, res) => {
  const { flightId } = req.params;
  const { from, to, startTime, endTime, p_price, b_price, e_price, status } = req.body;
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = start.toISOString().split('T')[0];
    const startStr = start.toTimeString().slice(0, 5); // "HH:MM"
    const endStr = end.toTimeString().slice(0, 5);

    // Fetch the existing flight to compare status
    const existingFlight = await Flight.findOne({ flightno: flightId });
    if (!existingFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    const statusChanged = existingFlight.status !== status;

    // Update the flight information
    const updatedFlight = await Flight.findOneAndUpdate(
      { flightno: flightId },
      {
        source: from,
        destination: to,
        date: dateStr,
        start_time: startStr,
        end_time: endStr,
        p_price: p_price,
        b_price: b_price,
        e_price: e_price,
        status: status
      },
      { new: true }
    );

    // If status has changed, send notifications
    if (true) {
      const bookings = await Booking.find({ flightNumber: flightId });

      for (const booking of bookings) {
        const user = await User.findOne({ username: booking.username });
        if (user) {
          const notificationMessage = `Booking ID: ${booking.bookingId}
Your flight from ${updatedFlight.source} to ${updatedFlight.destination} on ${updatedFlight.date} has changed status to "${updatedFlight.status}". New timing: ${updatedFlight.start_time} - ${updatedFlight.end_time}.`;
              const updatedbooking = await Booking.findOneAndUpdate(
                { bookingId:  booking.bookingId},
                {
                  date: updatedFlight.date,
                  from: updatedFlight.source,
                  to: updatedFlight.destination,
                  departureTime: updatedFlight.start_time,
                  arrivalTime: updatedFlight.end_time,
                },
                { new: true }
              );
          user.notifications.push(notificationMessage);
          if (user.notifications.length > 20) {
            user.notifications.shift();
          }

          await user.save();
        }
      }
    }

    res.json({ message: "Flight updated successfully", flight: updatedFlight });
  } catch (err) {
    console.error("Update flight error:", err);
    res.status(500).json({ error: "Failed to update flight" });
  }
});

app.delete('/api/flights/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;

    const flight = await Flight.findOne({ flightno: flightId });

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const relatedBookings = await Booking.find({ flightno: flightId });

    for (const booking of relatedBookings) {
      await User.updateOne(
        { username: booking.username }, 
        { $pull: { booking_ids: booking.bookingId } }
      );
    }

    await Booking.deleteMany({ flightNumber: flightId });

    await Flight.deleteOne({ flightno: flightId });

    res.status(200).json({ message: 'Flight and related bookings deleted successfully' });

  } catch (error) {
    console.error('Error deleting flight and bookings:', error);
    res.status(500).json({ message: 'Server error while deleting flight' });
  }
});

app.get('/passengers', async (req, res) => {
  try {
    const users = await User.find({});

    const passengers = users.map(user => ({
      username: user.username,
      email: user.email,
      bookings: user.booking_ids.length
    }));

    res.json(passengers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch passengers' });
  }
});

app.get('/admin/dashboard-stats', async (req, res) => {
  try {
    const now = new Date(); 

    const convertToDate = (dateString, timeString) => {
      const [year, month, day] = dateString.split('-'); 
      const [hour, minute] = timeString.split(':');
      return new Date(year, month - 1, day, hour, minute); 
    };

    const activeFlights = await Flight.find();
    const activeFlightsFiltered = activeFlights.filter(flight => {
      const startDate = convertToDate(flight.date, flight.start_time);
      const endDate = convertToDate(flight.date, flight.end_time);

      return startDate <= now && endDate >= now;
    });

    const passengersToday = activeFlightsFiltered.reduce((sum, flight) => {
      return sum + (242 - flight.total_seats); 
    }, 0);

    res.json({
      activeFlights: activeFlightsFiltered.length,
      passengersToday
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

app.post("/api/staff", async (req, res) => {
  const { name, position, department, email, phone, joinDate, status } = req.body;

  if (!name || !position || !department || !email || !phone || !joinDate || !status) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const existingEmail = await Staff.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const existingPhone = await Staff.findOne({ phone: phone });
    if (existingPhone) {
      return res.status(400).json({ error: "Phone number already exists" });
    }

    const newStaff = new Staff({
      name,
      position,
      department,
      email,
      phone,
      joinDate,
      status
    });

    await newStaff.save();

    res.status(201).json({ message: "Staff added successfully", staff: newStaff });

  } catch (err) {
    console.error("Error adding staff:", err);
    res.status(500).json({ error: "Server error while adding staff" });
  }
});

// GET: Fetch all staff members
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Edit existing staff member
app.put('/api/staff/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Delete a staff member
app.delete('/api/staff/:id', async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/notifications/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found' });


    const reversedNotifications = [...user.notifications].reverse();

    res.json({ notifications: reversedNotifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/request-cancellation', async (req, res) => {
  const { bookingId, reason } = req.body;
  try {
    const existing = await Cancellation.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Cancellation already requested' });
    }

    const newCancellation = new Cancellation({
      bookingId,
      requestedAt: new Date(),
      status: 'requested',
      remarks: reason
    });

    await newCancellation.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Cancellation request failed:', err);
    res.status(500).json({ success: false });
  }
});

app.get('/get-cancellations', async (req, res) => {
  try {
    const cancellations = await Cancellation.find({ status: 'requested' });
    const detailed = await Promise.all(cancellations.map(async (cancel) => {
      const booking = await Booking.findOne({ bookingId: cancel.bookingId });
      return {
        ...cancel._doc,
        booking
      };
    }));
    res.json({ success: true, cancellations: detailed });
  } catch (err) {
    console.error('Get cancellations error:', err);
    res.status(500).json({ success: false });
  }
});

app.post('/approve-cancellation', async (req, res) => {
  const { bookingId } = req.body;

  try {
    const cancellation = await Cancellation.findOne({ bookingId });
    if (!cancellation) {
      return res.status(404).json({ success: false, message: 'Cancellation not found' });
    }

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    cancellation.status = 'approved';
    await cancellation.save();

    const flight = await Flight.findOne({ flightno: booking.flightNumber });
    if (flight) {
      flight.bookedseats = flight.bookedseats.filter(
        seat => !booking.allocatedSeats.includes(seat)
      );

      booking.allocatedSeats.forEach(seat => {
        if (seat.startsWith('e-')) {
          flight.e_seats += 1;
        } else if (seat.startsWith('b-')) {
          flight.b_seats += 1;
        } else if (seat.startsWith('p-')) {
          flight.p_seats += 1;
        }

        flight.total_seats += 1;
      });

      await flight.save();
    }

    const user = await User.findOne({ username: booking.username });
    if (user) {
      const notification = `Your cancellation request for Booking ID ${bookingId} on flight ${booking.flightNumber} has been approved. Seats ${booking.allocatedSeats.join(', ')} are released.`;
      user.notifications.push(notification);
      await user.save();
    }

    await Booking.deleteOne({ bookingId });

    res.json({ success: true, message: 'Cancellation approved, seats freed, user notified.' });

  } catch (err) {
    console.error('Error during cancellation approval:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Flight booking prompt template
const FLIGHT_PROMPT_TEMPLATE = `You are a helpful flight booking assistant. 
Given the following user request, provide only travel recommendations and destination places to visit.
Format your response in markdown with the following sections:

# Places to visit
- List places to visit
- Use bullet points for each place
- Elaborate each visiting place

# Best places to stay 
- List hotels, resorts in the destination city
- Use bullet points
- Elaborate the details and prices

# Travel Tips
- Provide relevant travel tips
- Use bullet points for each tip

# Best Times to Travel
- Suggest optimal travel times
- Use bullet points for each suggestion

# Important Notes
- Include any relevant travel restrictions or requirements
- Use bullet points for each note

Note: When user responds with anything else other than flight suggestions and recommendations, respond normally saying
that you are a flight suggestions assistant. 
Also if user asks something related to destination city like about a place to visit or a hotel to stay, please respond about that, no need to stick 
with the above format. Just answer the question.

User request: {userRequest}

Please provide a detailed response in markdown format.`;

app.post('/api/flight-suggestions', async (req, res) => {
    try {
        const { userRequest } = req.body;

        if (!userRequest) {
            return res.status(400).json({ error: 'User request is required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set');
            return res.status(500).json({ error: 'API key is not configured' });
        }

        console.log('Generating content with prompt:', userRequest);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = FLIGHT_PROMPT_TEMPLATE.replace('{userRequest}', userRequest);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Successfully generated response');
        res.json({ suggestions: text });
    } catch (error) {
        console.error('Detailed error:', error);
        if (error.message.includes('API key')) {
            res.status(401).json({ error: 'Invalid API key. Please check your Gemini API key configuration.' });
        } else {
            res.status(500).json({ error: 'Failed to generate flight suggestions: ' + error.message });
        }
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});