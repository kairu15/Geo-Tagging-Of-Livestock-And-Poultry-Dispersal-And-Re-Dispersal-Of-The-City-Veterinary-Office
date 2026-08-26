import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
const DRAW_DURATION = 2000;
const TOTAL_DASH = 3000;

export default function LocationTimelineMap({ timeline = [], center }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const animFrameRef = useRef(null);

  const animateLine = useCallback((map) => {
    if (!map.getLayer('timeline-line')) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DRAW_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const drawn = eased * TOTAL_DASH;
      map.setPaintProperty('timeline-line', 'line-dasharray', [drawn, TOTAL_DASH]);
      map.setPaintProperty('timeline-points', 'circle-opacity', eased);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!timeline.length) return;

    const init = () => {
      if (mapRef.current) return;
      const rect = mapContainer.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(init);
        return;
      }

      const firstPos = timeline[0];
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: RASTER_STYLE,
        center: center || [firstPos.longitude, firstPos.latitude] || BAYAWAN_CENTER,
        zoom: 13,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-left');
      mapRef.current = map;

      const addLayers = () => {
        // Clean up
        try {
          if (map.getLayer('timeline-line')) map.removeLayer('timeline-line');
          if (map.getLayer('timeline-points')) map.removeLayer('timeline-points');
          if (map.getSource('timeline-source')) map.removeSource('timeline-source');
        } catch (e) {}

        const lineCoords = timeline.map((t) => [t.longitude, t.latitude]);
        const pointFeatures = timeline.map((t, idx) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [t.longitude, t.latitude] },
          properties: {
            index: idx,
            beneficiary_name: t.beneficiary_name || '',
            barangay: t.barangay || '',
            date: t.date || '',
            end_date: t.end_date || '',
          },
        }));

        const features = [];
        if (lineCoords.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords },
            properties: { type: 'line' },
          });
        }
        features.push(...pointFeatures);

        map.addSource('timeline-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });

        // Animated line — starts hidden
        if (lineCoords.length >= 2) {
          map.addLayer({
            id: 'timeline-line',
            type: 'line',
            source: 'timeline-source',
            filter: ['==', 'type', 'line'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#2563eb',
              'line-width': 3,
              'line-opacity': 0.75,
              'line-dasharray': [0, TOTAL_DASH],
            },
          });
        }

        // Points — start hidden
        map.addLayer({
          id: 'timeline-points',
          type: 'circle',
          source: 'timeline-source',
          filter: ['!=', 'type', 'line'],
          paint: {
            'circle-radius': 7,
            'circle-color': '#2563eb',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0,
          },
        });

        // Popup
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
        });

        map.on('mouseenter', 'timeline-points', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const p = e.features[0].properties;
          let html = '<div class="p-1 min-w-[180px]">';
          html += `<p class="font-bold text-gray-900 text-sm">Stop ${p.index + 1} of ${timeline.length}</p>`;
          html += `<p class="text-xs text-gray-500 mt-1"><span class="font-medium">Owner:</span> ${p.beneficiary_name}</p>`;
          html += `<p class="text-xs text-gray-500"><span class="font-medium">Barangay:</span> ${p.barangay}</p>`;
          html += `<p class="text-xs text-gray-500"><span class="font-medium">From:</span> ${p.date}</p>`;
          if (p.end_date) {
            html += `<p class="text-xs text-gray-500"><span class="font-medium">To:</span> ${p.end_date}</p>`;
          }
          html += '</div>';
          popup.setLngLat(e.features[0].geometry.coordinates).setHTML(html).addTo(map);
        });

        map.on('mouseleave', 'timeline-points', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        lineCoords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 40 });

        // Start animation
        setTimeout(() => animateLine(map), 300);
      };

      map.on('load', addLayers);
    };

    const timer = setTimeout(init, 100);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [timeline, center, animateLine]);

  if (!timeline.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
        No location data available for this animal.
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{ height: '100%', width: '100%', minHeight: '300px' }}
    />
  );
}
