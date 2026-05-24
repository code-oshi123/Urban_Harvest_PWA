import React, { useEffect, useState } from 'react';

export default function MapView({ events, userLocation }) {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (userLocation && events.length > 0) {
      // Create a static map URL using OpenStreetMap (free, no API key needed)
      const center = `${userLocation.lat},${userLocation.lng}`;
      const markers = events.slice(0, 5).map(e => 
        `${e.location_lat || userLocation.lat},${e.location_lng || userLocation.lng}`
      ).join('|');
      
      setMapUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=12&size=400x400&markers=${markers}&key=YOUR_API_KEY`);
      
      // For demo without API key, show a simple embedded map
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng-0.1},${userLocation.lat-0.1},${userLocation.lng+0.1},${userLocation.lat+0.1}&layer=mapnik`);
    }
  }, [userLocation, events]);

  if (!userLocation) {
    return <div className="map-placeholder">📍 Click "Find Events Near Me" to see map</div>;
  }

  return (
    <div className="map-view">
      <h3>Events Near You</h3>
      <div className="map-container">
        <iframe
          src={mapUrl}
          title="Event Locations"
          width="100%"
          height="400"
          style={{ border: 0, borderRadius: '12px' }}
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="nearby-stats">
        <p>📍 You are at: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
        <p>🌱 Found {events.length} events nearby!</p>
      </div>
    </div>
  );
}