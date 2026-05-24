import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import SearchFilter from './components/SearchFilter';
import OfflineToast from './components/OfflineToast';
import BottomNav from './components/BottomNav';
import Auth from './components/Auth';
import LanguageSwitcher from './components/LanguageSwitcher';
import { initDB, cacheAPIResponse, getCachedAPIResponse, saveEventsOffline, getEventsOffline, processQueuedActions } from './utils/db';
import { t, setLanguage, getCurrentLanguage } from './utils/i18n';
import './App.css';

// Use environment variable or fallback to localhost
const API_URL = "https://urban-harvest-pwa-backend.onrender.com/api" || "http://localhost:5000/api";

function App() {
  // State Management
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [language, setLanguageState] = useState(getCurrentLanguage());

  // Initialize app
  useEffect(() => {
    // Initialize IndexedDB
    initDB();
    
    // Check for saved user
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    
    // Fetch events
    fetchEvents();
    
    // Network listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setOffline(true));
    
    // Apply dark mode
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', darkMode);
    
    // Process queued offline actions when online
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [darkMode]);

  const handleOnline = async () => {
    setOffline(false);
    await processQueuedActions(API_URL);
    fetchEvents();
  };

  // Fetch events with advanced caching
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Try network first
      const res = await axios.get(`${API_URL}/events`);
      const eventsData = res.data.data;
      
      setEvents(eventsData);
      setFilteredEvents(eventsData);
      
      // Cache in IndexedDB for offline use
      await saveEventsOffline(eventsData);
      await cacheAPIResponse('/events', eventsData);
      
      console.log('✅ Events loaded from network');
    } catch (err) {
      console.log('📡 Network failed, loading from cache...');
      // Fallback to IndexedDB
      const cachedEvents = await getEventsOffline();
      if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        setFilteredEvents(cachedEvents);
        setOffline(true);
        console.log('✅ Events loaded from IndexedDB cache');
      } else {
        console.error('❌ No cached data available');
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Geolocation with distance calculation
  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
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
              event.location_lat || location.lat + 0.01,
              event.location_lng || location.lng + 0.01
            )
          }));
          
          // Sort by distance
          const sorted = [...eventsWithDistance].sort((a, b) => a.distance - b.distance);
          setFilteredEvents(sorted);
          
          alert(`📍 Found you! ${sorted.length} events near you. Closest is ${sorted[0]?.distance?.toFixed(1) || '?'}km away`);
        },
        (err) => {
          alert('📍 Location access denied. Using default view.');
        }
      );
    } else {
      alert('📍 Geolocation not supported in your browser');
    }
  };

  // Haversine formula for accurate distance calculation
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Push Notifications with VAPID
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        registration.showNotification('Urban Harvest Hub', {
          body: '🌱 Welcome! You will now receive updates about new events',
          icon: '/icons/android-chrome-192x192.png',
          badge: '/icons/favicon-32x32.png',
          vibrate: [200, 100, 200],
          tag: 'welcome'
        });
        
        // Schedule reminder for nearest event
        if (events.length > 0) {
          const nearestEvent = events[0];
          const eventDate = new Date(nearestEvent.date);
          const now = new Date();
          const hoursUntil = (eventDate - now) / (1000 * 60 * 60);
          
          if (hoursUntil > 0 && hoursUntil < 48) {
            setTimeout(() => {
              new Notification('📅 Event Reminder!', {
                body: `${nearestEvent.title} starts in ${Math.round(hoursUntil)} hours!`,
                icon: '/icons/android-chrome-192x192.png'
              });
            }, hoursUntil * 60 * 60 * 1000);
          }
        }
      }
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuth(false);
    fetchEvents(); // Refresh with auth token if needed
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleLanguageChange = () => {
    setLanguageState(getCurrentLanguage());
    // Force re-render of text
    fetchEvents();
  };

  // Render different content based on active tab
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
          <div className="nearby-view">
            <h2>📍 Events Near You</h2>
            {userLocation ? (
              <>
                <p>📍 Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
                <EventList events={filteredEvents.slice(0, 10)} loading={loading} onSelect={setSelectedEvent} />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <h3>Click "Find Events Near Me"</h3>
                <p>Allow location access to see events near you</p>
                <button onClick={getLocation} className="primary-btn">Find Events Near Me</button>
              </div>
            )}
          </div>
        );
      case 'saved':
        return (
          <div className="saved-view">
            <h2>❤️ Saved Events</h2>
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
          <div className="profile-view">
            <h2>👤 Profile</h2>
            {user ? (
              <div className="profile-card">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Not logged in</h3>
                <p>Create an account to save events and get personalized recommendations</p>
                <button onClick={() => setShowAuth(true)} className="primary-btn">Login / Register</button>
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
      <Navbar 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        user={user}
        onAuthClick={() => setShowAuth(true)}
      />
      
      <div className="language-bar">
        <LanguageSwitcher onLanguageChange={handleLanguageChange} />
      </div>
      
      <div className="container">
        <div className="actions">
          <button onClick={requestNotificationPermission} className="action-btn">
            🔔 {t('enable_notifications')}
          </button>
          <button onClick={getLocation} className="action-btn">
            📍 {t('find_near_me')}
          </button>
        </div>
        
        {offline && <OfflineToast />}
        
        {renderContent()}
      </div>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {showAuth && (
        <Auth 
          API_URL={API_URL} 
          onLogin={handleLogin} 
          onClose={() => setShowAuth(false)} 
        />
      )}
    </div>
  );
}

export default App;