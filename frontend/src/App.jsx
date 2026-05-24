const [userLocation, setUserLocation] = useState(null);
const [distanceSortedEvents, setDistanceSortedEvents] = useState([]);

const getLocation = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
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
        setDistanceSortedEvents(sorted);
        
        alert(`📍 Found you! ${sorted.length} events within 50km`);
      },
      err => {
        alert('Location access denied. Using default view.');
      }
    );
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