import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import SearchFilter from './components/SearchFilter';
import OfflineToast from './components/OfflineToast';
import BottomNav from './components/BottomNav';
import Auth from './components/Auth';
import { initDB, saveEventsOffline, getEventsOffline, processQueuedActions } from './utils/db';
import { t, setLanguage, getCurrentLanguage } from './utils/i18n';
import './App.css';

const API_URL = "https://urban-harvest-pwa-backend.onrender.com/api" || "http://localhost:5000/api";

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  // Apply theme on load and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    initDB();
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) setUser(JSON.parse(savedUser));
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
      const eventsData = res.data.data;
      setEvents(eventsData);
      setFilteredEvents(eventsData);
      await saveEventsOffline(eventsData);
    } catch (err) {
      const cachedEvents = await getEventsOffline();
      if (cachedEvents.length > 0) {
        setEvents(cachedEvents);
        setFilteredEvents(cachedEvents);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          alert(`📍 Location found! Check the Nearby tab for events near you.`);
        },
        () => alert('📍 Please allow location access')
      );
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Urban Harvest Hub', {
          body: '🌱 Welcome! You will receive updates about new events',
          icon: '/icons/android-chrome-192x192.png'
        });
      }
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCurrentLanguage(lang);
    window.location.reload();
  };

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
            <h2 style={{ marginBottom: '20px' }}>📍 Events Near You</h2>
            {!userLocation && (
              <button onClick={getLocation} className="action-btn" style={{ marginBottom: '20px' }}>
                📍 Share My Location
              </button>
            )}
            <EventList events={filteredEvents.slice(0, 10)} loading={loading} onSelect={setSelectedEvent} />
          </div>
        );
      case 'saved':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>❤️ Saved Events</h2>
            <EventList 
              events={filteredEvents.filter(e => {
                const saved = localStorage.getItem('savedEvents');
                const savedIds = saved ? JSON.parse(saved) : [];
                return savedIds.includes(e.id);
              })} 
              loading={loading} 
              onSelect={setSelectedEvent} 
            />
          </div>
        );
      case 'profile':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>👤 Profile</h2>
            {user ? (
              <div className="empty-state">
                <p><strong>{user.name}</strong></p>
                <p>{user.email}</p>
                <button onClick={() => { localStorage.clear(); setUser(null); }} className="primary-btn">
                  Logout
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Not logged in</h3>
                <p>Create an account to save events</p>
                <button onClick={() => setShowAuth(true)} className="primary-btn">
                  Login / Register
                </button>
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
      {/* Sidebar for Desktop */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">HarvestHub</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'events', label: 'Events', icon: '🌱', activeIcon: '🌿' },
            { id: 'nearby', label: 'Nearby', icon: '📍', activeIcon: '📍' },
            { id: 'saved', label: 'Saved', icon: '🤍', activeIcon: '❤️' },
            { id: 'profile', label: 'Profile', icon: '👤', activeIcon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-icon">{activeTab === tab.id ? tab.activeIcon : tab.icon}</span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>Sustainable Living</small>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar">
          <h1>🌱 Urban Harvest Hub</h1>
          <div className="nav-actions">
            <select 
              className="language-selector"
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="fr">🇫🇷 Français</option>
            </select>
            <button className="dark-toggle" onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <span style={{ fontSize: '14px' }}>👤 {user.name}</span>
            ) : (
              <button className="auth-nav-btn" onClick={() => setShowAuth(true)}>
                Login
              </button>
            )}
          </div>
        </div>

        <div className="container">
          <div className="actions">
            <button onClick={requestNotificationPermission} className="action-btn">
              🔔 Enable Notifications
            </button>
            <button onClick={getLocation} className="action-btn">
              📍 Find Events Near Me
            </button>
          </div>

          {offline && <OfflineToast />}
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {showAuth && <Auth API_URL={API_URL} onLogin={(u) => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default App;