import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveAnimalsMap, useActiveAnimalsPaths } from '../../api/hooks';
import AnimalDetailModal from '../AnimalDetailModal';

const BAYAWAN = [9.6894, 122.8353];

const SPECIES_COLORS = {
  Goat: '#16a34a', Cattle: '#2563eb', Swine: '#dc2626', Chicken: '#f59e0b', Duck: '#8b5cf6',
};
// SVG icons for map markers — simple animal silhouettes as inline SVG data URIs
const SPECIES_SVG_PATHS = {
  Goat: 'M12 3C9.5 3 7.5 5 7 7.2C5.3 7.8 4 9.4 4 11.5c0 1.4.6 2.6 1.6 3.4L5 20h2l.8-3.5c.7.2 1.3.3 2.2.3 1.5 0 2.8-.5 3.8-1.3.5.1 1 .1 1.5.1 3 0 5.5-2.2 5.5-5S15 6 12 6c-.7 0-1.4.1-2 .3C10.5 4.2 11.5 3 12 3z',
  Cattle: 'M4 8c0-1 .5-2 1.5-2.5L7 4h2l.5 1h3L13 4h2l1.5 1.5c1 .5 1.5 1.5 1.5 2.5v2c0 1.5-1 3-2.5 3.5V18h-2v-4.5C10.5 13 9.5 12 9.5 11H8.5c0 1-1 2-2.5 2.5V18h-2v-4.5C2.5 13 2 12 2 11V8z',
  Swine: 'M12 4c-2 0-3.5 1-4.5 2.5C6 7 4.5 8 4 9.5 3.2 11 3 12.5 3 14c0 2.5 2 4 4.5 4H17c2.5 0 4.5-1.5 4.5-4 0-1.5-.2-3-1-4.5-.5-1.5-2-2.5-3.5-3C15.5 5 14 4 12 4z',
  Chicken: 'M10 3c0 0-1 1-1 2 0 .5.2 1 .5 1.3C7.5 7 6 9 6 11c0 1.5.5 3 1.5 4l-1 4h2l1-3c.6.1 1.3.2 2 .2 3 0 5.5-1.5 6.5-4 .3-.8.5-1.6.5-2.5 0-2-1.5-3.5-3.5-4l-.5-1.5c-.3-.5-.5-1-1-1.2-.5-.2-1-.5-1-.5z',
  Duck: 'M5 7c0-1 .5-2 1.5-2.5.5-.3 1-.5 1.5-.5 1 0 2 .5 2.5 1.5.5-.3 1.2-.5 2-.5 2 0 3.5 1.5 3.5 3.5 0 1-.5 2-1 2.5v4.5h-2V12H9v3H7V10c-1-.5-2-1.5-2-3z',
};

function createSpeciesSvgIcon(color, species) {
  const svgPath = SPECIES_SVG_PATHS[species] || '';
  const svgContent = svgPath
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" fill="white" fill-rule="evenodd" clip-rule="evenodd"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" fill="white"/></svg>`;

  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
    html: `<div style="
      width:32px;height:32px;background:${color};
      border:3px solid #fff;border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
    ">${svgContent}</div>`,
  });
}

const ICON_CACHE = {};
function getIcon(species) {
  if (!ICON_CACHE[species]) {
    const color = SPECIES_COLORS[species] || '#6b7280';
    ICON_CACHE[species] = createSpeciesSvgIcon(color, species);
  }
  return ICON_CACHE[species];
}

/** Fits the map to the bounds of all features */
function FitBounds({ features }) {
  const map = useMap();
  useEffect(() => {
    if (!features?.length) return;
    const coords = features.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [features, map]);
  return null;
}

/**
 * Animated polyline that draws itself progressively.
 * Uses Leaflet's L.polyline for smooth animation.
 */
function AnimatedPolyline({ positions, color, weight = 2.5, opacity = 0.7, dashArray = '8 6' }) {
  const map = useMap();
  const lineRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    const latLngs = positions.map((p) => [p[0], p[1]]);
    const polyline = L.polyline([], {
      color,
      weight,
      opacity,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    lineRef.current = polyline;

    // Animate drawing
    const duration = Math.min(2000, 500 + latLngs.length * 200);
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const drawCount = Math.floor(eased * latLngs.length);
      const pts = latLngs.slice(0, drawCount + 1);
      if (pts.length >= 2) {
        polyline.setLatLngs(pts);
      }

      if (progress < 1) {
        timerRef.current = requestAnimationFrame(step);
      }
    };

    // Small delay before starting animation
    timerRef.current = requestAnimationFrame(step);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      polyline.remove();
      lineRef.current = null;
    };
  }, [map, positions, color, weight, opacity, dashArray]);

  return null;
}

export default function DispersalMap({ height = '500px', onAnimalSelect }) {
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [showPaths, setShowPaths] = useState(true);
  const { data: mapData, isLoading } = useActiveAnimalsMap();
  const { data: pathsData } = useActiveAnimalsPaths();
  const features = mapData?.features || [];
  const pathFeatures = pathsData?.features || [];

  return (
    <div className="relative" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[500] rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading map data…</p>
          </div>
        </div>
      )}

      <MapContainer
        center={BAYAWAN}
        zoom={12}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds features={features} />

        {/* Movement path polylines */}
        {showPaths && pathFeatures.map((pf) => {
          const species = pf.properties.species || '';
          const color = SPECIES_COLORS[species] || '#6b7280';
          const coords = pf.geometry.coordinates; // [[lng, lat], ...]

          return (
            <AnimatedPolyline
              key={`path-${pf.properties.animal_id}`}
              positions={coords}
              color={color}
              weight={2.5}
              opacity={0.65}
              dashArray="8 6"
            />
          );
        })}

        {/* Animal markers */}
        {features.map((f, idx) => {
          const [lng, lat] = f.geometry.coordinates;
          const p = f.properties;
          const species = p.species || '';
          return (
            <Marker
              key={p.tag_id || idx}
              position={[lat, lng]}
              icon={getIcon(species)}
              eventHandlers={{
                click: () => {
                  if (p.id) {
                    setSelectedAnimalId(String(p.id));
                    onAnimalSelect?.(p.id);
                  }
                },
              }}
            >
              <Popup closeButton={false} offset={[0, -18]}>
                <div style={{ padding: 4, minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: SPECIES_COLORS[species] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="${SPECIES_SVG_PATHS[species] || ''}" fill="white" fillRule="evenodd" clipRule="evenodd"/></svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>{p.tag_id || ''}</p>
                      <p style={{ color: '#666', margin: 0, fontSize: 12 }}>{species}</p>
                    </div>
                  </div>
                  <div style={{ background: '#f3f4f6', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12 }}><strong>Beneficiary:</strong> {p.beneficiary_name || 'N/A'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12 }}><strong>Location:</strong> {p.barangay || 'N/A'}, Bayawan City</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12 }}><strong>Status:</strong> {p.status || 'N/A'}</p>
                  </div>
                  <p style={{ color: '#888', fontSize: 11, margin: 0 }}>📍 {p.transfer_type || ''} • {p.start_date || ''}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend + Path Toggle */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Species</p>
        <div className="space-y-1.5">
          {Object.entries(SPECIES_COLORS).map(([species, color]) => (
            <div key={species} className="flex items-center gap-2">
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span className="text-xs text-gray-600">{species}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPaths}
              onChange={(e) => setShowPaths(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs font-medium text-gray-700">Movement Paths</span>
          </label>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-dashed border-green-500 opacity-60" />
            <span className="text-[10px] text-gray-400">Historical path</span>
          </div>
        </div>
      </div>

      {selectedAnimalId && (
        <AnimalDetailModal animalId={selectedAnimalId} onClose={() => setSelectedAnimalId(null)} />
      )}
    </div>
  );
}
