import React, { useState, useEffect } from 'react';
import './WeatherWidget.css';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  // Default location (Colombo)
  const defaultLat = 6.9271;
  const defaultLon = 79.8612;

  const fetchWeather = async (lat, lon) => {
    setLoading(true);
    setError(null);
    
    // Using free OpenWeatherMap API (sign up for free key)
    // For demo, using a free public API
    try {
      // Free weather API - no API key needed
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await response.json();
      
      if (data.current) {
        const weatherCodes = {
          0: { text: 'Clear sky', icon: '☀️' },
          1: { text: 'Mainly clear', icon: '🌤️' },
          2: { text: 'Partly cloudy', icon: '⛅' },
          3: { text: 'Overcast', icon: '☁️' },
          45: { text: 'Foggy', icon: '🌫️' },
          51: { text: 'Light drizzle', icon: '🌧️' },
          61: { text: 'Rain', icon: '🌧️' },
          71: { text: 'Snow', icon: '❄️' },
          80: { text: 'Rain showers', icon: '🌧️' }
        };
        
        const weatherInfo = weatherCodes[data.current.weather_code] || { text: 'Variable', icon: '🌥️' };
        
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: weatherInfo.text,
          icon: weatherInfo.icon,
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          location: location?.name || 'Your area'
        });
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Could not load weather data');
    } finally {
      setLoading(false);
    }
  };

  const getLocationAndWeather = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLocation({ lat, lon });
          fetchWeather(lat, lon);
        },
        (err) => {
          console.log('Using default location');
          fetchWeather(defaultLat, defaultLon);
        }
      );
    } else {
      fetchWeather(defaultLat, defaultLon);
    }
  };

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  if (loading && !weather) {
    return (
      <div className="weather-widget loading">
        <div className="weather-skeleton">🌤️ Loading weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget error">
        <span>⚠️</span> {error}
        <button onClick={getLocationAndWeather}>Retry</button>
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
      <button className="weather-refresh" onClick={getLocationAndWeather}>
        🔄 Use my location
      </button>
    </div>
  );
}