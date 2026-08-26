import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons by species
const speciesColors = {
  Goat: '#16a34a',
  Cattle: '#2563eb',
  Swine: '#eab308',
  Chicken: '#dc2626',
  Duck: '#8b5cf6',
};

function getMarkerIcon(species) {
  const color = speciesColors[species] || '#6b7280';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function DispersalMap({ features = [], center = [9.6894, 122.8353], zoom = 13 }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {features.map((feature, idx) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        return (
          <Marker
            key={idx}
            position={[lat, lng]}
            icon={getMarkerIcon(props.species)}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <p className="font-bold text-gray-900 text-sm">{props.tag_id}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Species:</span> {props.species}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Owner:</span> {props.beneficiary_name}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Barangay:</span> {props.barangay}
                </p>
                {props.batch_quantity > 1 && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Batch:</span> {props.batch_quantity} heads
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Status:</span> {props.status}
                </p>
                <Link
                  to={`/animals/${props.id}`}
                  className="mt-2 inline-block text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
