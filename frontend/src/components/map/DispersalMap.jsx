import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useActiveAnimalsMap } from '../../api/hooks';
import AnimalDetailModal from '../AnimalDetailModal';
import { useState } from 'react';

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

const speciesColors = {
  'Goat': '#16a34a',
  'Cattle': '#2563eb',
  'Swine': '#dc2626',
  'Chicken': '#f59e0b',
  'Duck': '#8b5cf6',
  'default': '#6b7280',
};

const speciesEmoji = {
  'Goat': '🐐',
  'Cattle': '🐄',
  'Swine': '🐷',
  'Chicken': '🐔',
  'Duck': '🦆',
  'default': '🐾',
};

function createMarker(color, emoji, label) {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 32px;
    height: 32px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: transform 0.2s;
  `;
  el.textContent = emoji;
  el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
  el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
  el.title = label;
  return el;
}

export default function DispersalMap({ height = '500px', onAnimalSelect }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);

  const { data: mapData, isLoading } = useActiveAnimalsMap();

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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      if (!mapData?.features?.length) return;

      const allCoords = [];

      mapData.features.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const species = props.species || 'default';
        const color = speciesColors[species] || speciesColors['default'];
        const emoji = speciesEmoji[species] || speciesEmoji['default'];
        const label = `${props.tag_id || ''} - ${props.species || ''} (${props.beneficiary_name || ''})`;

        const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
          .setHTML(`
            <div style="padding: 8px; min-width: 200px; font-family: system-ui, sans-serif;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 24px;">${emoji}</span>
                <div>
                  <p style="font-weight: 600; margin: 0; font-size: 14px;">${props.tag_id || ''}</p>
                  <p style="color: #666; margin: 0; font-size: 12px;">${props.species || ''}</p>
                </div>
              </div>
              <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                <p style="margin: 0; font-size: 12px;"><strong>Beneficiary:</strong> ${props.beneficiary_name || 'N/A'}</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Location:</strong> ${props.barangay || 'N/A'}, Bayawan City</p>
                <p style="margin: 2px 0 0 0; font-size: 12px;"><strong>Status:</strong> ${props.status || 'N/A'}</p>
              </div>
              <p style="color: #888; font-size: 11px; margin: 0;">📍 ${props.transfer_type || ''} • ${props.start_date || ''}</p>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: createMarker(color, emoji, label) })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        marker.getElement().addEventListener('click', () => {
          if (props.id) {
            setSelectedAnimalId(props.id);
            onAnimalSelect?.(props.id);
          }
        });

        markersRef.current.push(marker);
        allCoords.push([lng, lat]);
      });

      // Fit bounds to show all markers
      if (allCoords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allCoords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    };

    if (map.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.on('load', updateMarkers);
    }
  }, [mapData]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading map data...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} style={{ height, width: '100%', borderRadius: '12px', minHeight: '400px' }} />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[10] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Species</p>
        <div className="space-y-1.5">
          {Object.entries(speciesEmoji).filter(([k]) => k !== 'default').map(([species, emoji]) => (
            <div key={species} className="flex items-center gap-2">
              <span className="text-sm">{emoji}</span>
              <span className="text-xs text-gray-600">{species}</span>
            </div>
          ))}
        </div>
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
