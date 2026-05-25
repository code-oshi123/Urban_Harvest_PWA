import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyBookings.css';

export default function MyBookings({ API_URL }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/auth/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (eventId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (window.confirm('Cancel this booking?')) {
      try {
        await axios.delete(`${API_URL}/auth/bookings/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBookings();
        alert('Booking cancelled');
      } catch (error) {
        alert('Failed to cancel');
      }
    }
  };

  if (loading) return <div className="loading">Loading your bookings...</div>;

  if (!localStorage.getItem('token')) {
    return (
      <div className="bookings-empty">
        <div className="empty-icon">🔐</div>
        <h3>Please Login</h3>
        <p>Login to view and manage your event bookings</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bookings-empty">
        <div className="empty-icon">📅</div>
        <h3>No Bookings Yet</h3>
        <p>Browse events and click "Book Now" to secure your spot!</p>
      </div>
    );
  }

  return (
    <div className="my-bookings">
      <h2>📅 My Bookings ({bookings.length})</h2>
      <div className="bookings-list">
        {bookings.map(booking => (
          <div key={booking.id} className="booking-card">
            <img src={booking.image_url || 'https://via.placeholder.com/100'} alt={booking.title} />
            <div className="booking-info">
              <h4>{booking.title}</h4>
              <p>📅 {new Date(booking.date).toLocaleDateString()}</p>
              <p>🎫 {booking.tickets} ticket(s)</p>
              <p>📅 Booked on: {new Date(booking.booking_date).toLocaleDateString()}</p>
            </div>
            <button className="cancel-booking" onClick={() => cancelBooking(booking.event_id)}>
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}