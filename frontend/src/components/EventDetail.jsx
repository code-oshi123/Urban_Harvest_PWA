import React from 'react';

export default function EventDetail({ event, onBack }) {
  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back to Events</button>
      <img src={event.image_url || 'https://via.placeholder.com/800x400?text=Urban+Harvest'} alt={event.title} style={{ width: '100%', borderRadius: '16px', marginBottom: '1rem' }} />
      <h2>{event.title}</h2>
      <p><strong>📅 Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
      <p><strong>🏷️ Category:</strong> {event.category}</p>
      <p><strong>📝 Description:</strong></p>
      <p>{event.description}</p>
      {event.location_lat && (
        <p><strong>📍 Location:</strong> {event.location_lat}, {event.location_lng}</p>
      )}
    </div>
  );
}