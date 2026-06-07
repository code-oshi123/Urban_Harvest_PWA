import React, { useState, useEffect, useRef } from "react";
import "./WeatherWidget.css";

const WEATHER_CODES = {
  0: { text: "Clear sky", icon: "☀️", theme: "clear" },
  1: { text: "Mainly clear", icon: "🌤️", theme: "clear" },
  2: { text: "Partly cloudy", icon: "⛅", theme: "cloudy" },
  3: { text: "Overcast", icon: "☁️", theme: "cloudy" },
  45: { text: "Foggy", icon: "🌫️", theme: "fog" },
  48: { text: "Foggy", icon: "🌫️", theme: "fog" },
  51: { text: "Light drizzle", icon: "🌧️", theme: "rain" },
  53: { text: "Drizzle", icon: "🌧️", theme: "rain" },
  55: { text: "Heavy drizzle", icon: "🌧️", theme: "rain" },
  61: { text: "Light rain", icon: "🌧️", theme: "rain" },
  63: { text: "Rain", icon: "🌧️", theme: "rain" },
  65: { text: "Heavy rain", icon: "🌧️", theme: "rain" },
  71: { text: "Snow", icon: "❄️", theme: "cloudy" },
  80: { text: "Rain showers", icon: "🌧️", theme: "rain" },
  81: { text: "Rain showers", icon: "🌧️", theme: "rain" },
  95: { text: "Thunderstorm", icon: "⛈️", theme: "rain" },
};

function getWeatherTheme(code) {
  return WEATHER_CODES[code]?.theme || "default";
}

export default function WeatherWidget({ API_URL }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState("default");

  const controllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const defaultLat = 6.9271;
  const defaultLon = 79.8612;

  const fetchWeather = async (lat, lon, useCustomLocation = false) => {
    if (!isMountedRef.current) return;

    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        controller.abort();
      }
    }, 10000);

    const url = API_URL
      ? `${API_URL}/weather?latitude=${lat}&longitude=${lon}`
      : `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;
      if (!response.ok) throw new Error("Weather API error");

      const data = await response.json();
      if (!isMountedRef.current) return;

      if (data.current) {
        const weatherInfo = WEATHER_CODES[data.current.weather_code] || {
          text: "Variable",
          icon: "🌥️",
          theme: "default",
        };

        setTheme(getWeatherTheme(data.current.weather_code));
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: weatherInfo.text,
          icon: weatherInfo.icon,
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          location: useCustomLocation ? "Your area" : "Colombo",
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);

      if (
        err.name === "AbortError" ||
        err.message === "signal is aborted without reason" ||
        err.message?.toLowerCase().includes("abort") ||
        controller.signal.aborted
      ) {
        return;
      }

      if (!isMountedRef.current) return;

      console.error("Weather fetch failed:", err.message);
      setError("Weather unavailable");
      setTheme("default");
      setWeather({
        temp: "--",
        condition: "Check forecast",
        icon: "🌤️",
        humidity: "--",
        wind: "--",
        location: "Unavailable",
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getLocationAndWeather = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMountedRef.current) return;
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLocation({ lat, lon });
          fetchWeather(lat, lon, true);
        },
        () => {
          if (!isMountedRef.current) return;
          fetchWeather(defaultLat, defaultLon, false);
        },
      );
    } else {
      fetchWeather(defaultLat, defaultLon, false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    getLocationAndWeather();

    return () => {
      isMountedRef.current = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  if (loading && !weather) {
    return (
      <div className="weather-widget loading">
        <div className="weather-skeleton">Loading local weather…</div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className={`weather-widget weather-${theme}`}>
      <div className="weather-top">
        <div className="weather-info">
          <span className="weather-emoji" aria-hidden="true">
            {weather.icon}
          </span>
          <p className="weather-condition">{weather.condition}</p>
          <p className="weather-location">📍 {weather.location}</p>
        </div>
        <div className="weather-temp-block">
          <span className="weather-temp-value">{weather.temp}</span>
          <span className="weather-temp-unit">°C</span>
        </div>
      </div>

      <div className="weather-stats">
        <div className="weather-stat">
          <span className="weather-stat-label">Humidity</span>
          <span className="weather-stat-value">{weather.humidity}%</span>
        </div>
        <div className="weather-stat">
          <span className="weather-stat-label">Wind</span>
          <span className="weather-stat-value">{weather.wind} km/h</span>
        </div>
        <div className="weather-stat">
          <span className="weather-stat-label">Feels</span>
          <span className="weather-stat-value">
            {typeof weather.temp === "number"
              ? `${weather.temp + (weather.wind > 15 ? -2 : 0)}°`
              : "--"}
          </span>
        </div>
      </div>

      {error && <p className="weather-error">⚠️ {error}</p>}

      <div className="weather-footer">
        <span className="weather-tag">Live forecast</span>
        <button
          type="button"
          className="weather-refresh"
          onClick={getLocationAndWeather}
          disabled={loading}
        >
          {loading ? "Updating…" : "📍 My location"}
        </button>
      </div>
    </div>
  );
}
