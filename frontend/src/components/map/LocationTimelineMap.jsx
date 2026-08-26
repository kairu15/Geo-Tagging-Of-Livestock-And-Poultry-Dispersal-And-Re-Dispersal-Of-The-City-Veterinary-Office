import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function LocationTimelineMap({ timeline = [], center }) {
  if (!timeline.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
        No location data available for this animal.
      </div>
    );
  }

  const positions = timeline.map((t) => [t.latitude, t.longitude]);
  const defaultCenter = center || positions[0] || [9.6894, 122.8353];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Movement path polyline */}
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.7, dashArray: '8, 8' }}
        />
      )}

      {/* Location markers */}
      {timeline.map((point, idx) => (
        <Marker key={idx} position={[point.latitude, point.longitude]}>
          <Popup>
            <div className="p-1 min-w-[180px]">
              <p className="font-bold text-gray-900 text-sm">
                Stop {idx + 1} of {timeline.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">Owner:</span> {point.beneficiary_name}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Barangay:</span> {point.barangay}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">From:</span> {point.date}
              </p>
              {point.end_date && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">To:</span> {point.end_date}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
