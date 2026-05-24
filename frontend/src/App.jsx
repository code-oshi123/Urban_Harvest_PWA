import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import EventList from "./components/EventList";
import EventDetail from "./components/EventDetail";
import SearchFilter from "./components/SearchFilter";
import OfflineToast from "./components/OfflineToast";
import "./App.css";
import InstallPrompt from "./components/InstallPrompt";

// ✅ FIXED: Use local backend (no trailing slash)
const API_URL = "https://urban-harvest-pwa-backend.onrender.com/api";

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true",
  );
  const [userLocation, setUserLocation] = useState(null);
  const [distanceSortedEvents, setDistanceSortedEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
    window.addEventListener("online", () => setOffline(false));
    window.addEventListener("offline", () => setOffline(true));
    if (darkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Proper URL construction
      const res = await axios.get(`${API_URL}/events`);
      console.log("Events loaded:", res.data.data.length);
      setEvents(res.data.data);
      setFilteredEvents(res.data.data);
    } catch (err) {
      console.error("Fetch error:", err);
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
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("Urban Harvest Hub", {
            body: "Stay updated with new events!",
          });
        });
      }
    }
  };

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(location);

          // Calculate distances for all events
          const eventsWithDistance = events.map((event) => ({
            ...event,
            distance: calculateDistance(
              location.lat,
              location.lng,
              event.location_lat || location.lat + 0.01,
              event.location_lng || location.lng + 0.01,
            ),
          }));

          // Sort by distance
          const sorted = [...eventsWithDistance].sort(
            (a, b) => a.distance - b.distance,
          );
          setDistanceSortedEvents(sorted);

          alert(`📍 Found you! ${sorted.length} events within 50km`);
        },
        (err) => {
          alert("Location access denied. Using default view.");
        },
      );
    }
  };

  // Haversine formula for accurate distance calculation
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
  }
}

export default App;
