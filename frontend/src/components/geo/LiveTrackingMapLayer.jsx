import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useActiveGeoMap, useActiveAnimalsMap } from '../../api/hooks';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const caretakerTypeColors = {
  FORMAL_BENEFICIARY: '#3b82f6',     // blue
  INFORMAL_CARETAKER: '#a855f7',     // purple
  TEMPORARY_FOSTER: '#eab308',       // yellow
  CVO_HOLDING_FACILITY: '#6b7280',   // gray
};

const caretakerTypeLabels = {
  FORMAL_BENEFICIARY: 'Formal Beneficiary',
  INFORMAL_CARETAKER: 'Informal Caretaker',
  TEMPORARY_FOSTER: 'Temporary Foster',
  CVO_HOLDING_FACILITY: 'CVO Facility',
};

function FitAllBounds({ geoData, dispersalData, showGeo, showDispersal }) {
  const map = useMap();

  useEffect(() => {
    const points = [];
    if (showGeo && geoData?.features) {
      geoData.features.forEach((f) => {
        if (f.geometry?.coordinates) {
          points.push([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
        }
      });
    }
    if (showDispersal && dispersalData?.features) {
      dispersalData.features.forEach((f) => {
        if (f.geometry?.coordinates) {
          points.push([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
        }
      });
    }
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }
  }, [map, geoData, dispersalData, showGeo, showDispersal]);

  return null;
}

export default function LiveTrackingMapLayer({ filters = {}, height = '500px', onFeatureClick }) {
  const [showGeo, setShowGeo] = useState(true);
  const [showDispersal, setShowDispersal] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  const { data: geoData } = useActiveGeoMap(filters);
  const { data: dispersalData } = useActiveAnimalsMap();

  const center = [9.6894, 122.8353]; // Bayawan City, Negros Oriental

  const geoFeatures = showGeo ? (geoData?.features || []) : [];
  const dispersalFeatures = showDispersal ? (dispersalData?.features || []) : [];

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height, width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitAllBounds
          geoData={geoData}
          dispersalData={dispersalData}
          showGeo={showGeo}
          showDispersal={showDispersal}
        />

        {/* Geo-tag custodianship markers (colored by caretaker type) */}
        {geoFeatures.map((feature, idx) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;
          const color = caretakerTypeColors[props.caretaker_type] || '#6b7280';

          return (
            <CircleMarker
              key={`geo-${idx}`}
              center={[lat, lng]}
              radius={8}
              fillColor={color}
              fillOpacity={0.8}
              color="white"
              weight={2}
              eventHandlers={{
                click: () => onFeatureClick?.(props, 'geo'),
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-semibold text-gray-900">{props.tag_code}</p>
                  <p className="text-gray-600">{props.animal_tag} — {props.species}</p>
                  <p className="text-gray-600">Caretaker: {props.caretaker_name}</p>
                  <p className="text-gray-500 text-xs">
                    {caretakerTypeLabels[props.caretaker_type] || props.caretaker_type}
                  </p>
                  {props.barangay && (
                    <p className="text-gray-500 text-xs">{props.barangay}</p>
                  )}
                  {!props.has_dispersion_link && (
                    <p className="text-purple-600 text-xs font-medium mt-1">⚡ Field-Recorded / Unofficial</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Dispersal markers (green) */}
        {dispersalFeatures.map((feature, idx) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;

          return (
            <CircleMarker
              key={`disp-${idx}`}
              center={[lat, lng]}
              radius={8}
              fillColor="#16a34a"
              fillOpacity={0.8}
              color="white"
              weight={2}
              eventHandlers={{
                click: () => onFeatureClick?.(props, 'dispersal'),
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-semibold text-gray-900">{props.tag_id}</p>
                  <p className="text-gray-600">{props.species}</p>
                  <p className="text-gray-600">Owner: {props.beneficiary_name}</p>
                  <p className="text-gray-500 text-xs">
                    {props.transfer_type} — {props.start_date}
                  </p>
                  {props.barangay && (
                    <p className="text-gray-500 text-xs">{props.barangay}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Layer toggle panel */}
      <div className="absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-lg border border-gray-200">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 w-full"
        >
          <Layers className="h-4 w-4" />
          Layers
          {panelOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </button>

        {panelOpen && (
          <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
            {/* Geo-tag layer */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGeo}
                onChange={(e) => setShowGeo(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-gray-700">Geo-Tag Custody</span>
              </div>
            </label>

            {/* Dispersal layer */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDispersal}
                onChange={(e) => setShowDispersal(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-700">Dispersal Records</span>
              </div>
            </label>

            {/* Legend */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Caretaker Types</p>
              {Object.entries(caretakerTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{caretakerTypeLabels[type]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
