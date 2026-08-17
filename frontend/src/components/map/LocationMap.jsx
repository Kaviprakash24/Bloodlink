import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationMap = ({ 
  hospitalLocation, 
  hospitalName,
  searchRadiusKm,
  className = "h-64 w-full rounded-md z-0"
}) => {
  if (!hospitalLocation || hospitalLocation.coordinates.length < 2) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center text-slate-500 ${className}`}>
        No map data available
      </div>
    );
  }

  // GeoJSON uses [longitude, latitude], Leaflet needs [latitude, longitude]
  const position = [hospitalLocation.coordinates[1], hospitalLocation.coordinates[0]];

  return (
    <div className={className}>
      <MapContainer 
        center={position} 
        zoom={searchRadiusKm ? 11 : 13} 
        style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={position}>
          <Popup>
            <strong>{hospitalName || 'Hospital'}</strong>
            <br />
            Donation Center
          </Popup>
        </Marker>

        {searchRadiusKm && (
          <Circle 
            center={position} 
            radius={searchRadiusKm * 1000} 
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, weight: 1 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
