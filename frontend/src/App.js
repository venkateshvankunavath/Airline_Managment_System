import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginRegister from './Components/LoginRegister/LoginRegister';
import Dashboard from './Components/Dashboard/Dashboard';
import FlightResults from './Components/FlightResults/FlightResults';
import PreviousBooking from './Components/PreviousBookings/PreviousBooking';
import BookedFlights from './Components/BookedFlights/BookedFlights';
import Profile from './Components/profile/profile';
import Searchflights from './Components/searchflights/searchflights';
import Homepage from './Components/Homepage/Homepage';
import Notification from './Components/Notifications/Notifications';
import Bookingpage from './Components/Bookingpage/Bookingpage';
import Payment from './Components/Payment/Payment';
import Details from './Components/Details/Details';
import Aiagent from './Components/aiagent/aiagent';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Sidebar from './Components/Admin/features/Sidebar';
import Admindash from './Components/Admin/features/Admindash';
import FlightOperations from './Components/Admin/features/FlightOperations';
import StaffAccounts from './Components/Admin/features/StaffAccounts';
import PassengerProfiles from './Components/Admin/features/PassengerProfiles';
import Cancellations from './Components/Admin/features/Cancellations';
import './Components/Admin/styles/main.css';
import './Components/Admin/styles/AdminOverride.css';
import './Components/Admin/styles/AdminPageStyles.css';

// Container style
const containerStyle = {
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  position: 'relative'
};

// Main content style
const mainContentStyle = {
  marginLeft: '210px',
  padding: '1rem 2rem',
  backgroundColor: '#f8fafc',
  minHeight: '100vh',
  width: 'calc(100% - 210px)',
  overflowX: 'hidden'
};

const AdminLayout = () => (
    <div style={containerStyle}>
      <Sidebar />
      <div style={mainContentStyle}>
        <Routes>
          <Route path="/" element={<Admindash />} />
          <Route path="dashboard" element={<Admindash />} />
          <Route path="flight-operations" element={<FlightOperations />} />
          <Route path="staff-accounts" element={<StaffAccounts />} />
          <Route path="passenger-profiles" element={<PassengerProfiles />} />
          <Route path="cancellations" element={<Cancellations />} />
        </Routes>
      </div>
    </div>
);

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginRegister />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/results" element={<FlightResults />} />
        <Route path="/previous-bookings" element={<PreviousBooking />} />
        <Route path="/booked-flights" element={<BookedFlights />} />
        <Route path="/bookingpage" element={<Bookingpage />} />
        <Route path="/searchflights" element={<Searchflights />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notification />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/details" element={<Details />} />
        <Route path="/aiagent" element={<Aiagent />} />

        {/* Admin section under /admin */}
        <Route path="/admin/*" element={<AdminLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
