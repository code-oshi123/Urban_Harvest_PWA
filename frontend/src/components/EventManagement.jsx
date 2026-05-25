import React, { useState } from 'react';
import axios from 'axios';
import './EventManagement.css';

export default function EventManagement({ events, onEventUpdate, API_URL, user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'workshop',
    date: '',
    image_url: '',
    location_lat: '',
    location_lng: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      setLoading(false);
      return;
    }

    try {
      if (editingEvent) {
        // UPDATE
        await axios.put(
          `${API_URL}/auth/events/${editingEvent.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Event updated successfully!');
      } else {
        // CREATE
        await axios.post(
          `${API_URL}/auth/events`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Event created successfully!');
      }
      
      onEventUpdate();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.delete(
        `${API_URL}/auth/events/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Event deleted successfully!');
      onEventUpdate();
    } catch (error) {
      alert('Failed to delete event');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date.split('T')[0],
      image_url: event.image_url || '',
      location_lat: event.location_lat || '',
      location_lng: event.location_lng || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      category: 'workshop',
      date: '',
      image_url: '',
      location_lat: '',
      location_lng: ''
    });
  };

  // Filter events created by current user (for now, show all events)
  const userEvents = events;

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
              <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button className="close-btn" onClick={resetForm}>✕</button>
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
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="workshop">Workshop</option>
                    <option value="event">Event</option>
                    <option value="product">Product</option>
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
                <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-list-management">
        <h3>All Events ({userEvents.length})</h3>
        <div className="management-grid">
          {userEvents.map(event => (
            <div key={event.id} className="management-card">
              <img src={event.image_url || 'https://via.placeholder.com/100'} alt={event.title} />
              <div className="management-card-content">
                <h4>{event.title}</h4>
                <p className="event-category">{event.category}</p>
                <p className="event-date">📅 {new Date(event.date).toLocaleDateString()}</p>
              </div>
              <div className="management-card-actions">
                <button className="edit-btn" onClick={() => handleEdit(event)}>✏️ Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(event.id)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}