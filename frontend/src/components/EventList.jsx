import React from 'react';

export default function EventList({ events, loading, onSelect }) {
  if (loading) return <div className="loading">🌾 Loading sustainable events...</div>;
  if (events.length === 0) return <div className="loading">No events found 🌍</div>;

  return (
    <div className="event-grid">
      {events.map(event => (
        <div key={event.id} className="event-card" onClick={() => onSelect(event)}>
          <img src={event.image_url || 'https://via.placeholder.com/300x180?text=Urban+Harvest'} alt={event.title} />
          <div className="event-info">
            <span className="category-badge">{event.category}</span>
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleDateString()}</p>
            <p>{event.description.substring(0, 80)}...</p>
          </div>
        </div>
      ))}
    </div>
  );
}