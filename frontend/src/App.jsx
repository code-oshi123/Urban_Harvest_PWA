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
  const [isOffline, setIsOffline] = useState(false); // Changed from 'offline'
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Better online/offline detection
  useEffect(() => {
    // Check actual online status
    const checkOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
      console.log('Online status:', navigator.onLine ? 'ONLINE ✅' : 'OFFLINE ❌');
    };

    // Initial check
    checkOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Browser says: ONLINE');
      setIsOffline(false);
      // Refresh data when coming back online
      fetchEvents();
    });
    
    window.addEventListener('offline', () => {
      console.log('Browser says: OFFLINE');
      setIsOffline(true);
    });

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Initialize and fetch data
  useEffect(() => {
    initDB();
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchEvents();
  }, []);

  // Improved fetch with better error handling
  const fetchEvents = async () => {
    setLoading(true);
    
    // Check if actually online first
    const isActuallyOnline = navigator.onLine;
    console.log('Fetching events - Online status:', isActuallyOnline);
    
    try {
      // Try to fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await axios.get(`${API_URL}/events`, {
        signal: controller.signal,
        timeout: 5000
      });
      
      clearTimeout(timeoutId);
      
      console.log('✅ Events fetched from network:', res.data.data?.length);
      setEvents(res.data.data);
      setFilteredEvents(res.data.data);
      await saveEventsOffline(res.data.data);
      setIsOffline(false); // Successfully fetched, definitely online
      
    } catch (err) {
      console.log('Network fetch failed, trying cache...');
      
      // Try to get from IndexedDB cache
      const cachedEvents = await getEventsOffline();
      
      if (cachedEvents && cachedEvents.length > 0) {
        console.log('📦 Using cached events:', cachedEvents.length);
        setEvents(cachedEvents);
        setFilteredEvents(cachedEvents);
        // Only set offline if we're actually offline AND cache was used
        if (!navigator.onLine) {
          setIsOffline(true);
        }
      } else {
        console.error('❌ No cached events available');
        setEvents([]);
        setFilteredEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your functions (handleLogin, getLocation, etc.)

  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          alert(`📍 Location found!`);
        },
        (err) => {
          console.error('Location error:', err);
          alert('Please allow location access');
        }
      );
    }
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Welcome to Urban Harvest Hub!', { 
          body: 'You will receive updates about new events',
          icon: '/icons/android-chrome-192x192.png'
        });
      }
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  // Render function
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
            {!userLocation && (
              <button onClick={getLocation} className="action-btn" style={{ marginBottom: '20px' }}>
                📍 Share My Location
              </button>
            )}
            <EventList events={filteredEvents.slice(0, 10)} loading={loading} onSelect={setSelectedEvent} />
          </div>
        );
      case 'saved':
        const savedIds = JSON.parse(localStorage.getItem('savedEvents') || '[]');
        const savedEvents = filteredEvents.filter(e => savedIds.includes(e.id));
        return (
          <div>
            <h2>❤️ Saved Events</h2>
            {savedEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🤍</div>
                <h3>No saved events yet</h3>
                <p>Click the heart icon on any event to save it for later</p>
              </div>
            ) : (
              <EventList events={savedEvents} loading={loading} onSelect={setSelectedEvent} />
            )}
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
                <button onClick={() => { localStorage.clear(); setUser(null); }} className="primary-btn">
                  Logout
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Not logged in</h3>
                <p>Create an account to save events and get personalized recommendations</p>
                <button onClick={() => setShowAuthModal(true)} className="primary-btn">
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
            { id: 'events', label: 'Events', icon: '🌱' },
            { id: 'nearby', label: 'Nearby', icon: '📍' },
            { id: 'saved', label: 'Saved', icon: '❤️' },
            { id: 'profile', label: 'Profile', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-icon">{tab.icon}</span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!user && (
            <button 
              className="sidebar-login-btn" 
              onClick={() => setShowAuthModal(true)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                background: '#4a7c59', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer',
                marginBottom: '12px',
                fontWeight: '600'
              }}
            >
              🔐 Login / Sign Up
            </button>
          )}
          <small>Sustainable Living</small>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar">
          <h1>🌱 Urban Harvest Hub</h1>
          <div className="nav-actions">
            <button className="dark-toggle" onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <span style={{ fontSize: '14px' }}>👤 {user.name}</span>
            ) : (
              <button className="auth-nav-btn" onClick={() => setShowAuthModal(true)}>
                Login
              </button>
            )}
          </div>
        </div>

        <div className="container">
          <div className="actions">
            <button onClick={requestNotifications} className="action-btn">
              🔔 Enable Notifications
            </button>
            <button onClick={getLocation} className="action-btn">
              📍 Find Events Near Me
            </button>
          </div>

          {/* Only show offline toast when actually offline */}
          {isOffline && <OfflineToast />}
          
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          API_URL={API_URL} 
          onLogin={handleLogin} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </div>
  );
}

export default App;