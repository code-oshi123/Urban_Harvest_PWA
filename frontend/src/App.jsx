import React, { useState, useEffect } from "react";
import axios from "axios";
import EventList from "./components/EventList";
import EventDetail from "./components/EventDetail";
import SearchFilter from "./components/SearchFilter";
import OfflineToast from "./components/OfflineToast";
import BottomNav from "./components/BottomNav";
import AuthModal from "./components/AuthModal";
import ProfilePage from "./components/ProfilePage";
import EventManagement from "./components/EventManagement";
import MyBookings from "./components/MyBookings";
import WeatherWidget from "./components/WeatherWidget";
import Toast from "./components/Toast";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { initDB, saveEventsOffline, getEventsOffline, cacheAPIResponse } from "./utils/db";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || 
  ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1" || window.location.hostname === "[::1]")
    ? "http://localhost:5000/api" 
    : "https://urban-harvest-pwa-backend.onrender.com/api");

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  // State Management
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark",
  );
  const [activeTab, setActiveTab] = useState("events");
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [toast, setToast] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // ============ HELPER FUNCTIONS ============

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Clear all cached data
  const clearCache = async () => {
    if (window.confirm("Clear cached events and refresh data?")) {
      // Clear IndexedDB
      const request = indexedDB.deleteDatabase("UrbanHarvestDB");
      request.onsuccess = () => {
        console.log("Cache cleared successfully");
        showToast("Cache cleared! Refreshing data...", "success");
        fetchEvents(true);
      };
      request.onerror = () => {
        console.log("Failed to clear cache");
        showToast("Failed to clear cache", "error");
      };
    }
  };

  // ============ EVENT CRUD OPERATIONS ============

  // ============ FETCH EVENTS WITH FORCE REFRESH ============

  const fetchEvents = async (forceRefresh = false) => {
    setLoading(true);

    // Only use cache when the browser is genuinely offline
    const useCache = !forceRefresh && !navigator.onLine;

    try {
      // Always try network first when online
      if (!useCache && navigator.onLine) {
        console.log("🌐 Fetching fresh events from network...");

        // Show a hint if the server may be cold-starting (Render free tier)
        showToast("⏳ Connecting to server, please wait…", "info");

        const controller = new AbortController();
        // Allow 60 s so Render's free-tier cold-start (≈30-50 s) can complete
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await axios.get(`${API_URL}/events`, {
          signal: controller.signal,
          timeout: 60000,
        });

        clearTimeout(timeoutId);

        if (res.data && res.data.data) {
          const eventsData = res.data.data;
          console.log(`✅ Loaded ${eventsData.length} events from network`);

          setEvents(eventsData);
          setFilteredEvents(eventsData);

          // Update cache with fresh data
          await saveEventsOffline(eventsData);
          await cacheAPIResponse("/events", eventsData);

          // We are definitely online now
          setIsOffline(false);
          showToast(
            `🌱 Loaded ${eventsData.length} sustainable events!`,
            "success",
          );
        }
      }
      // Fallback to cache when browser is offline
      else {
        console.log("📡 Loading events from cache...");
        const cachedEvents = await getEventsOffline();

        if (cachedEvents && cachedEvents.length > 0) {
          console.log(`✅ Loaded ${cachedEvents.length} events from cache`);
          setEvents(cachedEvents);
          setFilteredEvents(cachedEvents);

          if (!navigator.onLine) {
            setIsOffline(true);
            showToast(
              `📡 Offline mode - showing ${cachedEvents.length} cached events`,
              "info",
            );
          }
        } else {
          console.log("❌ No cached events found");
          setEvents([]);
          setFilteredEvents([]);
          showToast(
            "❌ No events available. Please check your connection.",
            "error",
          );
        }
      }
    } catch (err) {
      console.log("Network error, loading from cache...", err?.message);

      // Try cache as last resort
      const cachedEvents = await getEventsOffline();
      if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        setFilteredEvents(cachedEvents);
        // Only mark offline if the browser itself says so — a backend
        // timeout does NOT mean the user is offline
        if (!navigator.onLine) {
          setIsOffline(true);
          showToast(
            `📡 Offline - showing ${cachedEvents.length} cached events`,
            "warning",
          );
        } else {
          showToast(
            `⚠️ Server unreachable - showing ${cachedEvents.length} cached events`,
            "warning",
          );
        }
      } else {
        if (!navigator.onLine) {
          setIsOffline(true);
          showToast("📡 You're offline. No cached events found.", "error");
        } else {
          showToast(
            "⚠️ Server is starting up. Please wait a moment and refresh.",
            "warning",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a manual refresh button
  const refreshEvents = () => {
    showToast("🔄 Refreshing events...", "info");
    fetchEvents(true);
  };

  // Save event to database
  const saveEventToDatabase = async (eventId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Please login to save events", "warning");
      setShowAuthModal(true);
      return false;
    }

    try {
      await axios.post(
        `${API_URL}/auth/saved-events/${eventId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return true;
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to save event", "error");
      return false;
    }
  };

  // Remove saved event from database
  const unsaveEventFromDatabase = async (eventId) => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      await axios.delete(`${API_URL}/auth/saved-events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error) {
      console.error("Unsave error:", error);
      return false;
    }
  };

  // Load saved events from database
  const loadSavedEventsFromDatabase = async () => {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
      const res = await axios.get(`${API_URL}/auth/saved-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const savedIds = res.data.data.map((event) => event.id);
      setSavedEvents(savedIds);
      return savedIds;
    } catch (error) {
      console.error("Load saved events error:", error);
      return [];
    }
  };

  // Load user bookings
  const loadUserBookings = async () => {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
      const res = await axios.get(`${API_URL}/auth/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserBookings(res.data.bookings || []);
      return res.data.bookings;
    } catch (error) {
      console.error("Load bookings error:", error);
      return [];
    }
  };

  // Toggle save event
  const toggleSave = async (eventId, e) => {
    e.stopPropagation();

    const isCurrentlySaved = savedEvents.includes(eventId);

    if (isCurrentlySaved) {
      const success = await unsaveEventFromDatabase(eventId);
      if (success) {
        setSavedEvents(savedEvents.filter((id) => id !== eventId));
        showToast("Removed from your saved events", "info");
      }
    } else {
      const success = await saveEventToDatabase(eventId);
      if (success) {
        setSavedEvents([...savedEvents, eventId]);
        showToast("Event saved to your collection! ❤️", "success");

        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }
    }
  };

  // ============ USER LOCATION & WEATHER ============

  const getLocation = () => {
    if ("geolocation" in navigator) {
      showToast("📍 Getting your location...", "info");

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(location);

          const eventsWithDistance = events.map((event) => ({
            ...event,
            distance: calculateDistance(
              location.lat,
              location.lng,
              event.location_lat || location.lat + (Math.random() - 0.5) * 0.1,
              event.location_lng || location.lng + (Math.random() - 0.5) * 0.1,
            ),
          }));

          const sorted = [...eventsWithDistance].sort(
            (a, b) => a.distance - b.distance,
          );
          setFilteredEvents(sorted);

          const closest = sorted[0];
          if (closest) {
            showToast(
              `📍 Found you! Closest event is ${closest.distance.toFixed(1)}km away - ${closest.title}`,
              "success",
            );
          }

          setActiveTab("nearby");

          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
        },
        (err) => {
          console.error("Location error:", err);
          showToast(
            "❌ Unable to get location. Please enable location access.",
            "error",
          );
        },
      );
    } else {
      showToast("❌ Geolocation is not supported in your browser", "error");
    }
  };

  // ============ NOTIFICATIONS ============

  const subscribeUserToPush = async (registration, trigger = null) => {
    try {
      const response = await axios.get(`${API_URL}/notify/vapid-key`);
      const vapidPublicKey = response.data.publicKey;
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      console.log('Push subscription generated:', subscription);
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.post(
        `${API_URL}/notify/subscribe`,
        { subscription, trigger },
        { headers }
      );
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe user to push:', error);
      throw error;
    }
  };

  const requestNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showToast("❌ Push notifications are not supported in this browser", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        await subscribeUserToPush(registration);
        showToast("🔔 Push notifications enabled successfully!", "success");
      } else {
        showToast(
          "❌ Notifications blocked. You can enable them in browser settings.",
          "warning",
        );
      }
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
      showToast("❌ Error enabling push notifications", "error");
    }
  };

  // ============ AUTHENTICATION ============

  const handleLogin = (userData, isRegister = false) => {
    setUser(userData);
    setShowAuthModal(false);
    showToast(`🎉 Welcome ${userData.name}! You're now logged in.`, "success");

    loadSavedEventsFromDatabase();
    loadUserBookings();

    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((registration) => {
        subscribeUserToPush(registration, isRegister ? "register" : "login").catch((err) =>
          console.error("Post-login subscribe failed:", err)
        );
      });
    }

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  };

  const handleLogout = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await axios.post(`${API_URL}/notify/logout-subscription`, {
            endpoint: subscription.endpoint,
          });
        }
      } catch (err) {
        console.error("Failed to notify backend on logout:", err);
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSavedEvents([]);
    setUserBookings([]);
    showToast("👋 You have been logged out. Come back soon!", "info");
    setActiveTab("events");
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
    showToast("Profile updated successfully!", "success");
  };

  // ============ THEME ============

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    showToast(
      darkMode ? "☀️ Light mode enabled" : "🌙 Dark mode enabled",
      "info",
    );
  };

  // ============ EFFECTS ============

  // PWA Install Prompt Handler
  useEffect(() => {
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setShowInstallBtn(true);
    }

    const handleInstallable = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setShowInstallBtn(true);
      }
    };

    window.addEventListener("pwa-installable", handleInstallable);

    const handleBeforePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforePrompt);

    // Hide if already in standalone (installed) mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Installation instructions: Tap the 'Share' button in your browser, then select 'Add to Home Screen' 📲");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      showToast("🎉 HarvestHub is now installing!", "success");
    }
  };

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Online/offline detection — only fires when the network status CHANGES,
  // not on initial mount (initial load is handled by the init effect below)
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast("✅ Back online! Refreshing data...", "success");
      fetchEvents(true);
      if (user) {
        loadSavedEventsFromDatabase();
        loadUserBookings();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast("📡 You are offline. Viewing cached content.", "warning");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user]);

  // Initialize app
  useEffect(() => {
    initDB();

    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      loadSavedEventsFromDatabase();
      loadUserBookings();

      if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          subscribeUserToPush(registration).catch((err) =>
            console.error("Silent subscribe refresh failed:", err)
          );
        });
      }
    }

    fetchEvents();
  }, []);

  // ============ RENDER CONTENT BASED ON TAB ============

  const renderContent = () => {
    if (loading && events.length === 0) {
      return <LoadingSkeleton />;
    }

    switch (activeTab) {
      case "events":
        return (
          <>
            <SearchFilter
              events={events}
              setFilteredEvents={setFilteredEvents}
            />
            {selectedEvent ? (
              <EventDetail
                event={selectedEvent}
                onBack={() => setSelectedEvent(null)}
              />
            ) : (
              <EventList
                events={filteredEvents}
                loading={loading}
                onSelect={setSelectedEvent}
                savedEvents={savedEvents}
                onSave={toggleSave}
                API_URL={API_URL}
                user={user}
                isAdmin={user?.email === "admin1@gmail.com"}
                onEventDelete={() => fetchEvents()}
              />
            )}
          </>
        );

      case "nearby":
        return (
          <div className="nearby-view">
            <div className="nearby-header">
              <h2>📍 Events Near You</h2>
              {!userLocation && (
                <button className="location-btn" onClick={getLocation}>
                  📍 Share My Location
                </button>
              )}
            </div>

            {userLocation && (
              <div className="location-info">
                <p>
                  📍 Your location: {userLocation.lat.toFixed(4)},{" "}
                  {userLocation.lng.toFixed(4)}
                </p>
                <p>
                  🌱 Showing {filteredEvents.length} events sorted by distance
                </p>
              </div>
            )}

            <EventList
              events={filteredEvents}
              loading={loading}
              onSelect={setSelectedEvent}
              savedEvents={savedEvents}
              onSave={toggleSave}
              showDistance={!!userLocation}
              userLocation={userLocation}
              API_URL={API_URL}
              user={user}
              isAdmin={user?.email === "admin1@gmail.com"}
            />
          </div>
        );

      case "bookings":
        return <MyBookings API_URL={API_URL} />;

      case "saved":
        const savedEventObjects = events.filter((e) =>
          savedEvents.includes(e.id),
        );
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
                onSave={toggleSave}
                API_URL={API_URL}
                user={user}
                isAdmin={user?.email === "admin1@gmail.com"}
              />
            )}
          </div>
        );

      case "manage":
        // Check if user is logged in
        if (!user) {
          return (
            <div className="empty-state">
              <div className="empty-icon">🔒</div>
              <h3>Admin Access Required</h3>
              <p>Please login with admin credentials to manage events</p>
              <button
                className="primary-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Login as Admin
              </button>
              <div
                className="admin-info"
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "var(--bg-card)",
                  borderRadius: "12px",
                }}
              >
                <p style={{ marginBottom: "8px", fontWeight: "bold" }}>
                  Demo Admin:
                </p>
                <code>admin1@gmail.com / admin123</code>
              </div>
            </div>
          );
        }

        // Check if user is admin
        if (user.email !== "admin1@gmail.com") {
          return (
            <div className="empty-state">
              <div className="empty-icon">⛔</div>
              <h3>Access Denied</h3>
              <p>This page is only accessible to administrators</p>
              <button className="primary-btn" onClick={handleLogout}>
                Logout and try admin account
              </button>
            </div>
          );
        }

        return (
          <EventManagement
            events={events}
            onEventUpdate={fetchEvents}
            API_URL={API_URL}
            user={user}
          />
        );

      case "profile":
        return (
          <ProfilePage
            user={user}
            onLogout={handleLogout}
            API_URL={API_URL}
            savedCount={savedEvents.length}
            totalEvents={events.length}
            onUpdate={handleProfileUpdate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );

      default:
        return null;
    }
  };

  // ============ MAIN RENDER ============

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
            { id: "events", label: "Events", icon: "🌱" },
            { id: "nearby", label: "Nearby", icon: "📍" },
            { id: "bookings", label: "Bookings", icon: "📅" },
            { id: "saved", label: "Saved", icon: "❤️" },
            { id: "manage", label: "Manage", icon: "📝" },
            { id: "profile", label: "Profile", icon: "👤" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setSelectedEvent(null);
                setActiveTab(tab.id);
              }}
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
            {user && (
              <div className="stat-item">
                <span>👤</span>
                <span>{user.name?.split(" ")[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar">
          <h1>
            🌱 <span className="mobile-header-title">HarvestHub</span>
            <span className="mobile-header-title-full">Urban Harvest Hub</span>
          </h1>
          <div className="nav-actions">
            {showInstallBtn && (
              <button className="install-nav-btn" onClick={handleInstallClick} title="Install App">
                📥 Install Now
              </button>
            )}
            <button className="dark-toggle" onClick={toggleTheme}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            {user ? (
              <div className="user-badge">
                <span>👤 {user.name?.split(" ")[0]}</span>
              </div>
            ) : (
              <button
                className="auth-nav-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Login
              </button>
            )}
          </div>
        </div>

        <div className="container">
          {activeTab === "events" && <WeatherWidget API_URL={API_URL} />}

          {activeTab === "events" && (
            <div className="utility-actions">
              <button onClick={requestNotifications} className="action-btn" type="button">
                🔔 Enable Notifications
              </button>
              <button onClick={getLocation} className="action-btn" type="button">
                📍 Find Events Near Me
              </button>
              <button onClick={refreshEvents} className="action-btn refresh-btn" type="button">
                🔄 Refresh Events
              </button>
            </div>
          )}

          <div className="utility-actions-secondary">
            <button onClick={refreshEvents} className="action-btn refresh-btn" type="button">
              🔄 Refresh Events
            </button>
            <button
              onClick={async () => {
                indexedDB.deleteDatabase("UrbanHarvestDB");
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((name) => caches.delete(name)));
                window.location.reload();
              }}
              className="action-btn"
              type="button"
              style={{ background: "#dc3545" }}
            >
              🗑️ Clear All Cache & Reload
            </button>
          </div>

          {isOffline && <OfflineToast />}
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedEvent(null);
          setActiveTab(tab);
        }}
      />

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
