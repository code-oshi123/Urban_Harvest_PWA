import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import SearchFilter from './components/SearchFilter';
import OfflineToast from './components/OfflineToast';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import LoadingSkeleton from './components/LoadingSkeleton';
import { initDB, saveEventsOffline, getEventsOffline, processQueuedActions } from './utils/db';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [toast, setToast] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load saved events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedEvents');
    if (saved) setSavedEvents(JSON.parse(saved));
  }, []);

  // Save event to localStorage with feedback
  const saveEvent = (eventId, e) => {
    e.stopPropagation();
    
    let newSaved;
    if (savedEvents.includes(eventId)) {
      newSaved = savedEvents.filter(id => id !== eventId);
      showToast('Removed from saved events', 'info');
    } else {
      newSaved = [...savedEvents, eventId];
      showToast('Event saved to your collection! ❤️', 'success');
      
      // Haptic feedback on mobile
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
    
    setSavedEvents(newSaved);
    localStorage.setItem('savedEvents', JSON.stringify(newSaved));
  };

  // Online/offline detection
  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) {
        showToast('Back online! Refreshing data...', 'success');
        fetchEvents();
      } else {
        showToast('You are offline. Viewing cached content.', 'warning');
      }
    };

    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

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

  // Initialize
  useEffect(() => {
    initDB();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      showToast(`Welcome back, ${JSON.parse(savedUser).name}! 🌱`, 'success');
    }
    fetchEvents();
  }, []);

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get user location and find nearby events
  const getLocation = () => {
    if ('geolocation' in navigator) {
      showToast('📍 Getting your location...', 'info');
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setUserLocation(location);
          
          // Calculate distances for all events
          const eventsWithDistance = events.map(event => ({
            ...event,
            distance: calculateDistance(
              location.lat, location.lng,
              event.location_lat || location.lat + (Math.random() - 0.5) * 0.1,
              event.location_lng || location.lng + (Math.random() - 0.5) * 0.1
            )
          }));
          
          // Sort by distance
          const sorted = [...eventsWithDistance].sort((a, b) => a.distance - b.distance);
          setFilteredEvents(sorted);
          
          const closest = sorted[0];
          showToast(
            `📍 Found you! Closest event is ${closest.distance.toFixed(1)}km away - ${closest.title}`,
            'success'
          );
          
          // Switch to nearby tab
          setActiveTab('nearby');
          
          // Haptic feedback
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
        },
        (err) => {
          console.error('Location error:', err);
          showToast('❌ Unable to get location. Please enable location access.', 'error');
        }
      );
    } else {
      showToast('❌ Geolocation is not supported in your browser', 'error');
    }
  };

  // Fetch events with caching
  const fetchEvents = async () => {
    setLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await axios.get(`${API_URL}/events`, {
        signal: controller.signal,
        timeout: 8000
      });
      
      clearTimeout(timeoutId);
      
      setEvents(res.data.data);
      setFilteredEvents(res.data.data);
      await saveEventsOffline(res.data.data);
      setIsOffline(false);
      
      showToast(`🌱 Loaded ${res.data.data.length} sustainable events!`, 'success');
      
    } catch (err) {
      console.log('Network failed, loading from cache...');
      const cachedEvents = await getEventsOffline();
      
      if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        setFilteredEvents(cachedEvents);
        showToast(`📡 Offline mode - showing ${cachedEvents.length} cached events`, 'info');
      } else {
        showToast('❌ Unable to load events. Please check your connection.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
    showToast(`🎉 Welcome ${userData.name}! You're now logged in.`, 'success');
    
    // Haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    showToast('👋 You have been logged out. Come back soon!', 'info');
  };

  // Request notifications with feedback
  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('✨ Notifications Enabled!', {
          body: 'You will now receive updates about new events and reminders',
          icon: '/icons/android-chrome-192x192.png',
          badge: '/icons/favicon-32x32.png',
          vibrate: [200, 100, 200]
        });
        showToast('🔔 Notifications enabled! You\'ll get event updates.', 'success');
      } else {
        showToast('❌ Notifications blocked. You can enable them in browser settings.', 'warning');
      }
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    showToast(darkMode ? '☀️ Light mode enabled' : '🌙 Dark mode enabled', 'info');
  };

  // Render content based on active tab
  const renderContent = () => {
    if (loading) return <LoadingSkeleton />;

    switch (activeTab) {
      case 'events':
        return (
          <>
            <SearchFilter events={events} setFilteredEvents={setFilteredEvents} />
            {selectedEvent ? (
              <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />
            ) : (
              <EventList 
                events={filteredEvents} 
                loading={loading} 
                onSelect={setSelectedEvent}
                savedEvents={savedEvents}
                onSave={saveEvent}
              />
            )}
          </>
        );
        
      case 'nearby':
        return (
          <div className="nearby-view">
            <div className="nearby-header">
              <h2>📍 Events Near You</h2>
              {!userLocation && (
                <button onClick={getLocation} className="location-btn">
                  📍 Share My Location
                </button>
              )}
            </div>
            
            {userLocation && (
              <div className="location-info">
                <p>📍 Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
                <p>🌱 Showing events sorted by distance</p>
              </div>
            )}
            
            {filteredEvents.length === 0 && userLocation && (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <h3>No events nearby</h3>
                <p>Try expanding your search or check back later for new events</p>
              </div>
            )}
            
            <EventList 
              events={filteredEvents} 
              loading={loading} 
              onSelect={setSelectedEvent}
              savedEvents={savedEvents}
              onSave={saveEvent}
              showDistance={!!userLocation}
              userLocation={userLocation}
            />
          </div>
        );
        
      case 'saved':
        const savedEventObjects = events.filter(e => savedEvents.includes(e.id));
        return (
          <div className="saved-view">
            <h2>❤️ Saved Events</h2>
            {savedEventObjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🤍</div>
                <h3>No saved events yet</h3>
                <p>Click the heart icon on any event to save it for later</p>
              </div>
            ) : (
              <EventList 
                events={savedEventObjects} 
                loading={false} 
                onSelect={setSelectedEvent}
                savedEvents={savedEvents}
                onSave={saveEvent}
              />
            )}
          </div>
        );
        
      case 'profile':
        return (
          <div className="profile-view">
            <h2>👤 Profile</h2>
            {user ? (
              <div className="profile-card">
                <div className="profile-avatar">🌱</div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-value">{savedEvents.length}</span>
                    <span className="stat-label">Saved Events</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{events.length}</span>
                    <span className="stat-label">Total Events</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  🚪 Logout
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Not logged in</h3>
                <p>Create an account to save events and track your favorites</p>
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
      {/* Sidebar Desktop */}
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
          <div className="sidebar-stats">
            <div className="stat-item">
              <span>{events.length}</span>
              <span>Events</span>
            </div>
            <div className="stat-item">
              <span>{savedEvents.length}</span>
              <span>Saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-navbar">
          <h1>🌱 Urban Harvest Hub</h1>
          <div className="nav-actions">
            <button className="dark-toggle" onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="user-badge">
                <span>👤 {user.name.split(' ')[0]}</span>
              </div>
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

          {isOffline && <OfflineToast />}
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          API_URL={API_URL} 
          onLogin={handleLogin} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default App;