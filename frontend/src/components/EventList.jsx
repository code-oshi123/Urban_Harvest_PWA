import React, { useState } from 'react';
import axios from 'axios';
import './EventList.css';

export default function EventList({ 
  events, 
  loading, 
  onSelect, 
  savedEvents = [], 
  onSave, 
  showDistance = false, 
  userLocation = null,
  API_URL,
  user,
  isAdmin = false,
  onEventDelete 
}) {
  const [bookingLoading, setBookingLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});

  // Book an event
  const bookEvent = async (eventId, e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('🔐 Please login to book events');
      return;
    }
    
    setBookingLoading(prev => ({ ...prev, [eventId]: true }));
    
    try {
      await axios.post(
        `${API_URL}/auth/bookings/${eventId}`,
        { tickets: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Event booked successfully! Check your Bookings page.');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Booking failed';
      alert(`❌ ${errorMsg}`);
    } finally {
      setBookingLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Delete event (admin only)
  const deleteEvent = async (eventId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('⚠️ Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    const token = localStorage.getItem('token');
    setDeleteLoading(prev => ({ ...prev, [eventId]: true }));
    
    try {
      await axios.delete(
        `${API_URL}/auth/admin/events/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('🗑️ Event deleted successfully');
      if (onEventDelete) onEventDelete(eventId);
    } catch (error) {
      alert('❌ Failed to delete event');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Format date nicely
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Get category badge color
  const getCategoryColor = (category) => {
    const colors = {
      workshop: '#4a7c59',
      event: '#c4a265',
      product: '#5a6e5d'
    };
    return colors[category] || '#4a7c59';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="event-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text short"></div>
              <div className="skeleton-buttons">
                <div className="skeleton-button"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No events state
  if (!events || events.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🌱</div>
        <h3>No Events Available</h3>
        <p>Check back later for new sustainable events, workshops, and products!</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      <div className="event-stats">
        <span className="stats-badge">
          🌿 {events.length} {events.length === 1 ? 'Event' : 'Events'} Available
        </span>
        {showDistance && userLocation && (
          <span className="stats-badge location-active">
            📍 Showing events by distance
          </span>
        )}
      </div>

      <div className="event-grid">
        {events.map(event => {
          const isSaved = savedEvents.includes(event.id);
          const isBooking = bookingLoading[event.id];
          const isDeleting = deleteLoading[event.id];
          
          return (
            <div key={event.id} className="event-card">
              {/* Event Image */}
              <div className="event-image-container" onClick={() => onSelect(event)}>
                <img 
                  src={event.image_url || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400'} 
                  alt={event.title}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400';
                  }}
                />
                <span 
                  className="event-category-badge" 
                  style={{ backgroundColor: getCategoryColor(event.category) }}
                >
                  {event.category === 'workshop' ? '🔧 Workshop' : 
                   event.category === 'event' ? '🎪 Event' : '🌿 Product'}
                </span>
                
                {/* Show distance if available */}
                {showDistance && event.distance && (
                  <span className="event-distance-badge">
                    📍 {event.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              {/* Event Content */}
              <div className="event-content" onClick={() => onSelect(event)}>
                <h3 className="event-title">{event.title}</h3>
                
                <div className="event-meta">
                  <span className="event-date">
                    📅 {formatDate(event.date)}
                  </span>
                </div>
                
                <p className="event-description">
                  {event.description.substring(0, 100)}
                  {event.description.length > 100 ? '...' : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="event-actions">
                <button 
                  className={`action-btn save-btn ${isSaved ? 'saved' : ''}`}
                  onClick={(e) => onSave && onSave(event.id, e)}
                  title={isSaved ? 'Remove from saved' : 'Save for later'}
                >
                  {isSaved ? '❤️ Saved' : '🤍 Save'}
                </button>
                
                <button 
                  className="action-btn book-btn"
                  onClick={(e) => bookEvent(event.id, e)}
                  disabled={isBooking}
                >
                  {isBooking ? '⏳ Booking...' : '📅 Book Now'}
                </button>
                
                {/* Admin Delete Button */}
                {isAdmin && (
                  <button 
                    className="action-btn delete-btn"
                    onClick={(e) => deleteEvent(event.id, e)}
                    disabled={isDeleting}
                    title="Delete event (Admin only)"
                  >
                    {isDeleting ? '⏳' : '🗑️ Delete'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}