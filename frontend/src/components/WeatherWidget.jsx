import React, { useState, useEffect, useRef } from "react";
import "./WeatherWidget.css";

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  // Ref to track the active AbortController so we can cancel on unmount
  const controllerRef = useRef(null);

  // Default location (Colombo)
  const defaultLat = 6.9271;
  const defaultLon = 79.8612;

  const fetchWeather = async (lat, lon) => {
    // Cancel any in-flight request before starting a new one
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    // 10 s — enough for slow connections; 5 s was too aggressive
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Weather API error");
      }

      const data = await response.json();

      if (data.current) {
        const weatherCodes = {
          0:  { text: "Clear sky",     icon: "☀️" },
          1:  { text: "Mainly clear",  icon: "🌤️" },
          2:  { text: "Partly cloudy", icon: "⛅" },
          3:  { text: "Overcast",      icon: "☁️" },
          45: { text: "Foggy",         icon: "🌫️" },
          51: { text: "Light drizzle", icon: "🌧️" },
          61: { text: "Rain",          icon: "🌧️" },
          71: { text: "Snow",          icon: "❄️" },
          80: { text: "Rain showers",  icon: "🌧️" },
        };

        const weatherInfo = weatherCodes[data.current.weather_code] || {
          text: "Variable",
          icon: "🌥️",
        };

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: weatherInfo.text,
          icon: weatherInfo.icon,
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          location: location ? "Your area" : "Colombo",
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);

      // Ignore errors caused by intentional cleanup aborts (unmount / new request)
      if (err.name === "AbortError") {
        return;
      }

      console.error("Weather fetch failed:", err.message);
      setError("Weather unavailable");
      setWeather({
        temp: "--",
        condition: "Check forecast",
        icon: "🌤️",
        humidity: "--",
        wind: "--",
        location: "Unavailable",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationAndWeather = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLocation({ lat, lon });
          fetchWeather(lat, lon);
        },
        () => {
          // Permission denied or unavailable — fall back to Colombo
          fetchWeather(defaultLat, defaultLon);
        }
      );
    } else {
      fetchWeather(defaultLat, defaultLon);
    }
  };

  useEffect(() => {
    getLocationAndWeather();

    // Cancel any pending fetch when the component unmounts
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  if (loading && !weather) {
    return (
      <div className="weather-widget loading">
        <div className="weather-skeleton">🌤️ Loading weather...</div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <span className="weather-icon">{weather.icon}</span>
        <div className="weather-temp">{weather.temp}°C</div>
      </div>

      <div className="weather-condition">{weather.condition}</div>

      <div className="weather-details">
        <span>📍 {weather.location}</span>
        <span>💧 {weather.humidity}%</span>
        <span>💨 {weather.wind} km/h</span>
      </div>

      {error && <p className="weather-error">⚠️ {error}</p>}

      <button className="weather-refresh" onClick={getLocationAndWeather}>
        🔄 Use my location
      </button>
    </div>
  );
}
