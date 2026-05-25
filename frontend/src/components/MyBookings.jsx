import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyBookings.css';

export default function MyBookings({ API_URL }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState({});

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
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (eventId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(prev => ({ ...prev, [eventId]: true }));

    try {
      await axios.delete(`${API_URL}/auth/bookings/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from local state
      setBookings(bookings.filter(b => b.event_id !== eventId));
      alert('✅ Booking cancelled successfully');
    } catch (error) {
      alert('❌ Failed to cancel booking');
    } finally {
      setCancelling(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Not logged in
  if (!localStorage.getItem('token')) {
    return (
      <div className="bookings-empty">
        <div className="empty-icon">🔐</div>
        <h3>Please Login</h3>
        <p>Login to view and manage your event bookings</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bookings-loading">
        <div className="loading-spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );
  }

  // No bookings
  if (bookings.length === 0) {
    return (
      <div className="bookings-empty">
        <div className="empty-icon">📅</div>
        <h3>No Bookings Yet</h3>
        <p>Browse events and click "Book Now" to secure your spot!</p>
        <button 
          className="browse-events-btn"
          onClick={() => window.location.href = '/events'}
        >
          🌱 Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className="my-bookings">
      <div className="bookings-header">
        <h2>📅 My Bookings</h2>
        <span className="bookings-count">{bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}</span>
      </div>

      <div className="bookings-list">
        {bookings.map(booking => (
          <div key={booking.id} className="booking-card">
            <div className="booking-image">
              <img 
                src={booking.image_url || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=150'} 
                alt={booking.title}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=150';
                }}
              />
            </div>
            
            <div className="booking-info">
              <h3 className="booking-title">{booking.title}</h3>
              <div className="booking-details">
                <p className="booking-date">
                  📅 {formatDate(booking.date)}
                </p>
                <p className="booking-tickets">
                  🎫 {booking.tickets} {booking.tickets === 1 ? 'ticket' : 'tickets'}
                </p>
                <p className="booking-booked-date">
                  📌 Booked on: {new Date(booking.booking_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="booking-actions">
              <button 
                className="cancel-booking-btn"
                onClick={() => cancelBooking(booking.event_id)}
                disabled={cancelling[booking.event_id]}
              >
                {cancelling[booking.event_id] ? '⏳ Cancelling...' : '❌ Cancel'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bookings-footer">
        <p>💡 Tip: Cancelled bookings can be rebooked later if spots are available.</p>
      </div>
    </div>
  );
}