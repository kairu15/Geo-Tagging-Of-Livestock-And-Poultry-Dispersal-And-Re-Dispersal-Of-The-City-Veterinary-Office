import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BAYAWAN_CENTER = [9.6894, 122.8353];
const DRAW_DURATION = 2000;

// Tile layer configurations
const TILE_LAYERS = {
  stadia: {
    name: 'Stadia Maps',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  },
};

export default function CustodyTrailMap({ trailData, height = '400px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const [activeTile, setActiveTile] = useState('stadia');

  useEffect(() => {
    if (!containerRef.current) return;

    const points = trailData?.properties?.points || [];
    if (points.length === 0) return;

    // Wait for container to have dimensions
    const init = () => {
      if (mapRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(init);
        return;
      }

      const map = L.map(containerRef.current, {
        center: BAYAWAN_CENTER,
        zoom: 12,
        scrollWheelZoom: true,
      });

      // Add default tile layer
      const tileConfig = TILE_LAYERS[activeTile];
      L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: 20,
      }).addTo(map);

      // Add layer control
      const baseLayers = {};
      for (const [key, config] of Object.entries(TILE_LAYERS)) {
        baseLayers[config.name] = L.tileLayer(config.url, {
          attribution: config.attribution,
          maxZoom: 20,
        });
      }
      L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

      mapRef.current = map;

      // Build coords
      const latLngs = points.map((p) => [p.latitude, p.longitude]);

      // Animated polyline
      const polyline = L.polyline([], {
        color: '#16a34a',
        weight: 3,
        opacity: 0.85,
        dashArray: '8, 12',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Start animation
      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / DRAW_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const drawCount = Math.floor(eased * latLngs.length);
        const pts = latLngs.slice(0, drawCount + 1);
        if (pts.length >= 2) {
          polyline.setLatLngs(pts);
        }

        if (progress < 1) {
          timerRef.current = requestAnimationFrame(step);
        }
      };
      timerRef.current = requestAnimationFrame(step);

      // Add points
      points.forEach((p, idx) => {
        const isStart = p.type === 'custody_start';
        const color = isStart ? '#16a34a' : '#3b82f6';
        const radius = isStart ? 8 : 5;

        const marker = L.circleMarker([p.latitude, p.longitude], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0,
          weight: 2,
          className: 'trail-point',
        }).addTo(map);

        // Animate point opacity
        const pointDelay = (idx / latLngs.length) * DRAW_DURATION;
        setTimeout(() => {
          marker.setStyle({ fillOpacity: 1 });
        }, pointDelay + 300);

        // Popup
        let popupHtml = '<div class="text-sm" style="padding:4px">';
        if (isStart) {
          popupHtml += `<p style="font-weight:600">Custody Start</p>`;
          popupHtml += `<p style="color:#666">${p.caretaker_name || ''}</p>`;
        } else {
          popupHtml += `<p style="font-weight:600">Location Check-in</p>`;
          popupHtml += `<p style="color:#666">${p.source || ''}</p>`;
        }
        popupHtml += `<p style="color:#888;font-size:11px;margin-top:4px">${p.date || ''}</p>`;
        popupHtml += '</div>';

        marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -8] });

        marker.on('mouseover', function () { this.openPopup(); });
        marker.on('mouseout', function () { this.closePopup(); });
      });

      // Fit bounds
      if (latLngs.length > 0) {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      }
    };

    timerRef.current = setTimeout(init, 100);

    return () => {
      clearTimeout(timerRef.current);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [trailData]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: '12px', overflow: 'hidden', minHeight: '300px' }}
    />
  );
}
