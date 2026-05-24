import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import SearchFilter from './components/SearchFilter';
import OfflineToast from './components/OfflineToast';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import { initDB, saveEventsOffline, getEventsOffline, processQueuedActions } from './utils/db';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    initDB();
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchEvents();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setOffline(true));

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleOnline = async () => {
    setOffline(false);
    await processQueuedActions(API_URL);
    fetchEvents();
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/events`);
      setEvents(res.data.data);
      setFilteredEvents(res.data.data);
      await saveEventsOffline(res.data.data);
    } catch (err) {
      const cached = await getEventsOffline();
      if (cached.length) {
        setEvents(cached);
        setFilteredEvents(cached);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert('Please allow location access')
      );
    }
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Welcome!', { body: 'You will receive event updates' });
      }
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  const renderContent = () => {
    switch (activeTab) {
      case 'events':
        return (
          <>
            <SearchFilter events={events} setFilteredEvents={setFilteredEvents} />
            {selectedEvent ? (
              <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />
            ) : (
              <EventList events={filteredEvents} loading={loading} onSelect={setSelectedEvent} />
            )}
          </>
        );
      case 'nearby':
        return (
          <div>
            <h2>📍 Nearby Events</h2>
            {!userLocation && <button onClick={getLocation} className="action-btn">Share Location</button>}
            <EventList events={filteredEvents.slice(0, 10)} loading={loading} onSelect={setSelectedEvent} />
          </div>
        );
      case 'saved':
        const savedIds = JSON.parse(localStorage.getItem('savedEvents') || '[]');
        return (
          <div>
            <h2>❤️ Saved Events</h2>
            <EventList events={filteredEvents.filter(e => savedIds.includes(e.id))} loading={loading} onSelect={setSelectedEvent} />
          </div>
        );
      case 'profile':
        return (
          <div>
            <h2>👤 Profile</h2>
            {user ? (
              <div className="empty-state">
                <p><strong>{user.name}</strong></p>
                <p>{user.email}</p>
                <button onClick={() => { localStorage.clear(); setUser(null); }} className="primary-btn">Logout</button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Not logged in</h3>
                <button onClick={() => setShowAuthModal(true)} className="primary-btn">Login / Register</button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">HarvestHub</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'events', label: 'Events', icon: '🌱' },
            { id: 'nearby', label: 'Nearby', icon: '📍' },
            { id: 'saved', label: 'Saved', icon: '❤️' },
            { id: 'profile', label: 'Profile', icon: '👤' }
          ].map(tab => (
            <button key={tab.id} className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="sidebar-icon">{tab.icon}</span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!user && (
            <button className="sidebar-login-btn" onClick={() => setShowAuthModal(true)} style={{ width: '100%', padding: '12px', background: '#4a7c59', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '12px' }}>
              🔐 Login / Sign Up
            </button>
          )}
          <small>Sustainable Living</small>
        </div>
      </div>

      <div className="main-content">
        <div className="top-navbar">
          <h1>🌱 Urban Harvest Hub</h1>
          <div className="nav-actions">
            <button className="dark-toggle" onClick={toggleTheme}>{darkMode ? '☀️' : '🌙'}</button>
            {user ? <span>👤 {user.name}</span> : <button className="auth-nav-btn" onClick={() => setShowAuthModal(true)}>Login</button>}
          </div>
        </div>

        <div className="container">
          <div className="actions">
            <button onClick={requestNotifications} className="action-btn">🔔 Enable Notifications</button>
            <button onClick={getLocation} className="action-btn">📍 Find Events Near Me</button>
          </div>
          {offline && <OfflineToast />}
          {renderContent()}
        </div>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal API_URL={API_URL} onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

export default App;