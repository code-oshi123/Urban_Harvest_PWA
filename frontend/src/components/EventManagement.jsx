import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EventManagement.css";

export default function EventManagement({
  events,
  onEventUpdate,
  API_URL,
  user,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "workshop",
    date: "",
    image_url: "",
    location_lat: "",
    location_lng: "",
  });

  // Load all events for admin
  useEffect(() => {
    loadAdminEvents();
  }, []);

  const loadAdminEvents = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/auth/admin/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllEvents(res.data.events || []);
    } catch (error) {
      console.error("Failed to load admin events:", error);
      // Fallback to regular events
      setAllEvents(events || []);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      return;
    }

    try {
      // Convert date to ISO8601 format for backend
      const dataToSend = {
        ...formData,
        date: formData.date ? new Date(formData.date).toISOString() : null,
        location_lat: formData.location_lat
          ? parseFloat(formData.location_lat)
          : null,
        location_lng: formData.location_lng
          ? parseFloat(formData.location_lng)
          : null,
      };

      if (editingEvent) {
        await axios.put(
          `${API_URL}/auth/events/${editingEvent.id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        alert("✅ Event updated successfully!");
      } else {
        await axios.post(`${API_URL}/auth/events`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("✅ Event created successfully!");
      }

      resetForm();
      loadAdminEvents();
      if (onEventUpdate) onEventUpdate();
    } catch (error) {
      alert(error.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async (eventId) => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to delete this event? This action cannot be undone.",
      )
    )
      return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/auth/admin/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("🗑️ Event deleted successfully!");
      loadAdminEvents();
      if (onEventUpdate) onEventUpdate();
    } catch (error) {
      alert("Failed to delete event");
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date?.split("T")[0] || "",
      image_url: event.image_url || "",
      location_lat: event.location_lat || "",
      location_lng: event.location_lng || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      category: "workshop",
      date: "",
      image_url: "",
      location_lat: "",
      location_lng: "",
    });
  };

  if (loading) {
    return (
      <div className="event-management">
        <div className="loading">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="event-management">
      <div className="management-header">
        <h2>📝 Manage Events</h2>
        <button className="create-event-btn" onClick={() => setShowForm(true)}>
          + Create New Event
        </button>
      </div>

      {showForm && (
        <div className="event-form-modal">
          <div className="event-form-container">
            <div className="form-header">
              <h3>{editingEvent ? "Edit Event" : "Create New Event"}</h3>
              <button className="close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter event title"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe your event..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="workshop">🔧 Workshop</option>
                    <option value="event">🎪 Event</option>
                    <option value="product">🌿 Product</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="location_lat"
                    value={formData.location_lat}
                    onChange={handleInputChange}
                    placeholder="7.1388"
                  />
                </div>

                <div className="form-group">
                  <label>Location Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="location_lng"
                    value={formData.location_lng}
                    onChange={handleInputChange}
                    placeholder="79.9036"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-list-management">
        <h3>All Events ({allEvents.length})</h3>
        {allEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No Events Yet</h3>
            <p>Click "Create New Event" to add your first event!</p>
          </div>
        ) : (
          <div className="management-grid">
            {allEvents.map((event) => (
              <div key={event.id} className="management-card">
                <img
                  src={
                    event.image_url ||
                    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=200"
                  }
                  alt={event.title}
                  onError={(e) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=200";
                  }}
                />
                <div className="management-card-content">
                  <h4>{event.title}</h4>
                  <p className="event-category">{event.category}</p>
                  <p className="event-date">
                    📅 {new Date(event.date).toLocaleDateString()}
                  </p>
                  {event.booking_count > 0 && (
                    <p className="event-bookings">
                      📊 {event.booking_count} bookings
                    </p>
                  )}
                </div>
                <div className="management-card-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(event)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(event.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
