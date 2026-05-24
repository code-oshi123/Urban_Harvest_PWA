import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import SearchFilter from './components/SearchFilter';
import OfflineToast from './components/OfflineToast';
import './App.css';
import InstallPrompt from './components/InstallPrompt';

// ✅ FIXED: Use local backend (no trailing slash)
const API_URL = 'https://urban-harvest-pwa-backend.onrender.com/api';

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    fetchEvents();
    window.addEventListener('online', () => setOffline(false));
    window.addEventListener('offline', () => setOffline(true));
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Proper URL construction
      const res = await axios.get(`${API_URL}/events`);
      console.log('Events loaded:', res.data.data.length);
      setEvents(res.data.data);
      setFilteredEvents(res.data.data);
    } catch (err) {
      console.error('Fetch error:', err);
      // Try to get from cache if offline
      if (caches) {
        const cached = await caches.match(`${API_URL}/events`);
        if (cached) {
          const data = await cached.json();
          setEvents(data.data);
          setFilteredEvents(data.data);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Urban Harvest Hub', { body: 'Stay updated with new events!' });
        });
      }
    }
  };

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        alert(`📍 Near you: Lat ${pos.coords.latitude}, Lng ${pos.coords.longitude}`);
      });
    }
  };

  return (
    <div className="app">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <div className="actions">
          <button onClick={requestNotificationPermission}>🔔 Enable Notifications</button>
          <button onClick={getLocation}>📍 Find Events Near Me</button>
        </div>
        {offline && <OfflineToast />}
        <SearchFilter events={events} setFilteredEvents={setFilteredEvents} />
        {selectedEvent ? (
          <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />
        ) : (
          <EventList events={filteredEvents} loading={loading} onSelect={setSelectedEvent} />
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}

export default App;