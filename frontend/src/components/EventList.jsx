import React, { useState, useEffect } from "react";
import { t } from "../utils/i18n";

export default function EventList({ events, loading, onSelect }) {
  const [savedEvents, setSavedEvents] = useState([]);

  // Load saved events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("savedEvents");
    if (saved) {
      setSavedEvents(JSON.parse(saved));
    }
  }, []);

  const toggleSave = (eventId, e) => {
    e.stopPropagation();
    let newSaved;
    if (savedEvents.includes(eventId)) {
      newSaved = savedEvents.filter((id) => id !== eventId);
    } else {
      newSaved = [...savedEvents, eventId];
    }
    setSavedEvents(newSaved);
    localStorage.setItem("savedEvents", JSON.stringify(newSaved));

    // Show feedback
    const message = savedEvents.includes(eventId)
      ? "Removed from saved"
      : "Saved for later!";
    alert(message);
  };

  if (loading) return <div>{t("loading")}</div>;
  if (events.length === 0) return <div>{t("no_events")}</div>;

  return (
    <div className="event-grid">
      {events.map((event) => (
        <div
          key={event.id}
          className="event-card"
          onClick={() => onSelect(event)}
        >
          <img
            src={
              event.image_url ||
              "https://via.placeholder.com/300x180?text=Urban+Harvest"
            }
            alt={event.title}
          />
          <div className="event-info">
            <span className="category-badge">{event.category}</span>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>{event.title}</h3>
              <button
                onClick={(e) => toggleSave(event.id, e)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                {savedEvents.includes(event.id) ? "❤️" : "🤍"}
              </button>
            </div>
            <p>{new Date(event.date).toLocaleDateString()}</p>
            <p>{event.description.substring(0, 80)}...</p>
          </div>
        </div>
      ))}
    </div>
  );
}
