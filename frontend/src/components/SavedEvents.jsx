import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SavedEvents({ events, onSelect, API_URL }) {
  const [savedIds, setSavedIds] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('savedEvents');
    if (saved) {
      const ids = JSON.parse(saved);
      setSavedIds(ids);
      const filtered = events.filter(e => ids.includes(e.id));
      setSavedEvents(filtered);
    }
  }, [events]);

  if (savedEvents.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❤️</div>
        <h3>No saved events yet</h3>
        <p>Click the heart icon on any event to save it for later</p>
      </div>
    );
  }

  return (
    <div className="event-grid">
      {savedEvents.map(event => (
        <div key={event.id} className="event-card" onClick={() => onSelect(event)}>
          <img src={event.image_url || 'https://via.placeholder.com/300x180?text=Urban+Harvest'} alt={event.title} />
          <div className="event-info">
            <span className="category-badge">{event.category}</span>
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}