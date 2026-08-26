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
const DRAW_DURATION = 2000; // ms for line to fully draw
const TOTAL_DASH = 3000; // large enough to cover any line length in pixels

export default function CustodyTrailMap({ trailData, height = '400px' }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const animFrameRef = useRef(null);

  const animateLine = useCallback((map) => {
    if (!map.getLayer('trail-line')) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DRAW_DURATION, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const drawn = eased * TOTAL_DASH;
      map.setPaintProperty('trail-line', 'line-dasharray', [drawn, TOTAL_DASH]);

      // Fade in points as line passes them
      if (map.getLayer('trail-points')) {
        const pointCount = map.querySourceFeatures('trail', { sourceLayer: '', filter: ['!=', 'type', 'trail'] }).length;
        // Approximate: reveal points proportionally
        map.setPaintProperty('trail-points', 'circle-opacity', eased);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const points = trailData?.properties?.points || [];
    if (points.length === 0) return;

    const init = () => {
      if (mapRef.current) return;
      const rect = mapContainer.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(init);
        return;
      }

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: RASTER_STYLE,
        center: BAYAWAN_CENTER,
        zoom: 12,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-left');
      mapRef.current = map;

      const addLayers = () => {
        // Clean up old
        try {
          if (map.getLayer('trail-line')) map.removeLayer('trail-line');
          if (map.getLayer('trail-points')) map.removeLayer('trail-points');
          if (map.getSource('trail')) map.removeSource('trail');
        } catch (e) {}

        // Build GeoJSON
        const lineCoords = points.map((p) => [p.longitude, p.latitude]);
        const pointFeatures = points.map((p, idx) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          properties: {
            index: idx,
            date: p.date,
            caretaker_name: p.caretaker_name || '',
            source: p.source || '',
            type: p.type,
          },
        }));

        const features = [];
        if (lineCoords.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords },
            properties: { type: 'trail' },
          });
        }
        features.push(...pointFeatures);

        map.addSource('trail', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });

        // Animated line layer — starts hidden
        if (lineCoords.length >= 2) {
          map.addLayer({
            id: 'trail-line',
            type: 'line',
            source: 'trail',
            filter: ['==', 'type', 'trail'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#16a34a',
              'line-width': 3,
              'line-opacity': 0.85,
              'line-dasharray': [0, TOTAL_DASH], // start hidden
            },
          });
        }

        // Points — start invisible, fade in with animation
        map.addLayer({
          id: 'trail-points',
          type: 'circle',
          source: 'trail',
          filter: ['!=', 'type', 'trail'],
          paint: {
            'circle-radius': [
              'match', ['get', 'type'],
              'custody_start', 8,
              'checkin', 5,
              5,
            ],
            'circle-color': [
              'match', ['get', 'type'],
              'custody_start', '#16a34a',
              'checkin', '#3b82f6',
              '#6b7280',
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0, // start hidden
          },
        });

        // Popup on hover
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
        });

        map.on('mouseenter', 'trail-points', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = e.features[0];
          const props = feature.properties;
          let html = '<div class="text-sm">';
          if (props.type === 'custody_start') {
            html += `<p class="font-semibold">Custody Start</p>`;
            html += `<p class="text-gray-600">${props.caretaker_name}</p>`;
          } else {
            html += `<p class="font-semibold">Location Check-in</p>`;
            html += `<p class="text-gray-600">${props.source}</p>`;
          }
          html += `<p class="text-gray-500 text-xs mt-1">${props.date}</p>`;
          html += '</div>';
          popup.setLngLat(feature.geometry.coordinates).setHTML(html).addTo(map);
        });

        map.on('mouseleave', 'trail-points', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        lineCoords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 40 });

        // Start animation after a short delay
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
  }, [trailData, animateLine]);

  return (
    <div
      ref={mapContainer}
      style={{ height, borderRadius: '12px', overflow: 'hidden', minHeight: '300px' }}
    />
  );
}
