import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for different point types
const custodyIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="background:#16a34a;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const checkinIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="background:#3b82f6;width:8px;height:8px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, points]);

  return null;
}

export default function CustodyTrailMap({ trailData, height = '400px' }) {
  const points = trailData?.properties?.points || [];

  // Convert points to lat/lng for map
  const latLngPoints = points.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
    ...p,
  }));

  // Default center (Philippines)
  const center = latLngPoints.length > 0
    ? [latLngPoints[0].lat, latLngPoints[0].lng]
    : [9.6894, 122.8353]; // Bayawan City, Negros Oriental

  // Polyline coordinates
  const polylineCoords = latLngPoints.map((p) => [p.lat, p.lng]);

  return (
    <div style={{ height, borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {latLngPoints.length > 0 && <FitBounds points={latLngPoints} />}

        {/* Trail polyline */}
        {polylineCoords.length >= 2 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#16a34a',
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 4',
            }}
          />
        )}

        {/* Markers for each point */}
        {latLngPoints.map((point, idx) => (
          <Marker
            key={idx}
            position={[point.lat, point.lng]}
            icon={point.type === 'custody_start' ? custodyIcon : checkinIcon}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                {point.type === 'custody_start' ? (
                  <>
                    <p className="font-semibold text-gray-900">Custody Start</p>
                    <p className="text-gray-600">{point.caretaker_name}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">Location Check-in</p>
                    <p className="text-gray-600">{point.source}</p>
                  </>
                )}
                <p className="text-gray-500 text-xs mt-1">{point.date}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
