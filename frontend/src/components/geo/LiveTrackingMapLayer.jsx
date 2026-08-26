import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useActiveGeoMap, useActiveAnimalsMap } from '../../api/hooks';
import { Layers, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import AnimalDetailModal from '../AnimalDetailModal';

const BAYAWAN_CENTER = [122.8353, 9.6894];

const RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm-raster', minzoom: 0, maxzoom: 19 }],
};

const caretakerTypeColors = {
  FORMAL_BENEFICIARY: '#3b82f6',
  INFORMAL_CARETAKER: '#a855f7',
  TEMPORARY_FOSTER: '#eab308',
  CVO_HOLDING_FACILITY: '#6b7280',
};

const caretakerTypeLabels = {
  FORMAL_BENEFICIARY: 'Formal Beneficiary',
  INFORMAL_CARETAKER: 'Informal Caretaker',
  TEMPORARY_FOSTER: 'Temporary Foster',
  CVO_HOLDING_FACILITY: 'CVO Facility',
};

function createMarkerElement(color, label) {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 24px;
    height: 24px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.2s;
  `;
  el.onmouseenter = () => { el.style.transform = 'scale(1.3)'; };
  el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
  el.title = label;
  return el;
}

export default function LiveTrackingMapLayer({ filters = {}, height = '500px', onFeatureClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showGeo, setShowGeo] = useState(true);
  const [showDispersal, setShowDispersal] = useState(true);

  const { data: geoData } = useActiveGeoMap(filters);
  const { data: dispersalData } = useActiveAnimalsMap();

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: RASTER_STYLE,
      center: BAYAWAN_CENTER,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      linesRef.current.forEach(l => { try { l.remove(); } catch(e) {} });
      linesRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when data or toggles change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for map to be ready
    const updateMarkers = () => {
      // Clear existing markers and lines
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      linesRef.current.forEach(l => { try { l.remove(); } catch(e) {} });
      linesRef.current = [];

      const allCoords = [];

      // Add geo-tag markers
      if (showGeo && geoData?.features?.length) {
        geoData.features.forEach((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;
          const color = caretakerTypeColors[props.caretaker_type] || '#6b7280';
          const label = `${props.tag_code || ''} - ${props.caretaker_name || 'Unknown'}`;

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="padding: 8px; min-width: 180px;">
                <p style="font-weight: 600; margin: 0;">${props.tag_code || ''}</p>
                <p style="color: #666; margin: 2px 0;">${props.animal_tag || ''} — ${props.species || ''}</p>
                <p style="color: #666; margin: 2px 0;">Caretaker: ${props.caretaker_name || ''}</p>
                <p style="color: #888; font-size: 12px;">${caretakerTypeLabels[props.caretaker_type] || ''}</p>
                ${!props.has_dispersion_link ? '<p style="color: #a855f7; font-size: 11px; font-weight: 500; margin-top: 4px;">⚡ Field-Recorded</p>' : ''}
              </div>
            `);

          const marker = new maplibregl.Marker({ element: createMarkerElement(color, label) })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            if (props.animal_id) setSelectedAnimalId(props.animal_id);
            onFeatureClick?.(props, 'geo');
          });

          markersRef.current.push(marker);
          allCoords.push([lng, lat]);
        });

        // Draw line traces for animals with multiple points
        const animalGroups = {};
        geoData.features.forEach((f) => {
          const aid = f.properties.animal_id;
          if (!animalGroups[aid]) animalGroups[aid] = [];
          animalGroups[aid].push(f.geometry.coordinates);
        });

        Object.entries(animalGroups)
          .filter(([, coords]) => coords.length >= 2)
          .forEach(([, coords]) => {
            const line = document.createElement('div');
            const polyline = new maplibregl.Marker({ element: line, anchor: 'center' })
              .setLngLat(coords[0]);
            // Use a canvas overlay for lines instead
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none;';

            // Simple line using multiple small markers
            for (let i = 0; i < coords.length - 1; i++) {
              const start = coords[i];
              const end = coords[i + 1];
              const steps = 5;
              for (let s = 1; s < steps; s++) {
                const lng = start[0] + (end[0] - start[0]) * (s / steps);
                const lat = start[1] + (end[1] - start[1]) * (s / steps);
                const dot = document.createElement('div');
                dot.style.cssText = `
                  width: 6px;
                  height: 6px;
                  background: #a855f7;
                  border-radius: 50%;
                  opacity: 0.5;
                `;
                const dotMarker = new maplibregl.Marker({ element: dot, anchor: 'center' })
                  .setLngLat([lng, lat])
                  .addTo(map);
                markersRef.current.push(dotMarker);
              }
            }
          });
      }

      // Add dispersal markers
      if (showDispersal && dispersalData?.features?.length) {
        dispersalData.features.forEach((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="padding: 8px; min-width: 180px;">
                <p style="font-weight: 600; margin: 0;">${props.tag_id || ''}</p>
                <p style="color: #666; margin: 2px 0;">${props.species || ''}</p>
                <p style="color: #666; margin: 2px 0;">Owner: ${props.beneficiary_name || ''}</p>
                <p style="color: #888; font-size: 12px;">${props.transfer_type || ''} — ${props.start_date || ''}</p>
              </div>
            `);

          const marker = new maplibregl.Marker({
            element: createMarkerElement('#16a34a', `${props.tag_id || ''} - ${props.beneficiary_name || ''}`)
          })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            if (props.id) setSelectedAnimalId(props.id);
            onFeatureClick?.(props, 'dispersal');
          });

          markersRef.current.push(marker);
          allCoords.push([lng, lat]);
        });
      }

      // Fit bounds to show all markers
      if (allCoords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allCoords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    };

    // Wait for map to be loaded
    if (map.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.on('load', updateMarkers);
    }
  }, [geoData, dispersalData, showGeo, showDispersal]);

  return (
    <div className="relative">
      <div ref={mapContainer} style={{ height, width: '100%', borderRadius: '12px', minHeight: '400px' }} />

      {/* Layer toggle panel */}
      <div className="absolute top-3 right-3 z-[10] bg-white rounded-xl shadow-lg border border-gray-200">
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

            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Caretaker Types</p>
              {Object.entries(caretakerTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{caretakerTypeLabels[type]}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 pt-1">
              {markersRef.current.length} markers shown
            </p>
          </div>
        )}
      </div>

      {selectedAnimalId && (
        <AnimalDetailModal
          animalId={selectedAnimalId}
          onClose={() => setSelectedAnimalId(null)}
        />
      )}
    </div>
  );
}
