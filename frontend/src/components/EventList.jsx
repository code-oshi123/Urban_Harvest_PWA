import React from 'react';

export default function EventList({ events, loading, onSelect, savedEvents = [], onSave, showDistance = false, userLocation = null }) {
  
  if (loading) return null;
  if (!events || events.length === 0) {
    return <div className="empty-state">No events found</div>;
  }

  return (
    <div className="event-grid">
      {events.map(event => {
        const isSaved = savedEvents.includes(event.id);
        
        return (
          <div key={event.id} className="event-card" onClick={() => onSelect(event)}>
            <img 
              src={event.image_url || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400'} 
              alt={event.title}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400';
              }}
            />
            <div className="event-info">
              <div className="event-header">
                <span className="category-badge">{event.category}</span>
                <button 
                  className={`save-btn ${isSaved ? 'saved' : ''}`}
                  onClick={(e) => onSave(event.id, e)}
                >
                  {isSaved ? '❤️' : '🤍'}
                </button>
              </div>
              <h3>{event.title}</h3>
              <p className="event-date">📅 {new Date(event.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              {showDistance && event.distance && (
                <p className="event-distance">📍 {event.distance.toFixed(1)} km away</p>
              )}
              <p className="event-description">{event.description.substring(0, 100)}...</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}