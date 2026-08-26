import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BAYAWAN_CENTER = [9.6894, 122.8353];
const DRAW_DURATION = 2000;

export default function LocationTimelineMap({ timeline = [], center }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !timeline.length) return;

    const init = () => {
      if (mapRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(init);
        return;
      }

      const firstPos = timeline[0];
      const mapCenter = center || [firstPos.latitude, firstPos.longitude] || BAYAWAN_CENTER;

      const map = L.map(containerRef.current, {
        center: mapCenter,
        zoom: 13,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      const latLngs = timeline.map((t) => [t.latitude, t.longitude]);

      // Animated polyline
      const polyline = L.polyline([], {
        color: '#2563eb',
        weight: 3,
        opacity: 0.75,
        dashArray: '8, 12',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

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
      timeline.forEach((t, idx) => {
        const marker = L.circleMarker([t.latitude, t.longitude], {
          radius: 7,
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 0,
          weight: 2,
        }).addTo(map);

        // Animate point opacity
        const pointDelay = (idx / latLngs.length) * DRAW_DURATION;
        setTimeout(() => {
          marker.setStyle({ fillOpacity: 1 });
        }, pointDelay + 300);

        // Popup
        let html = '<div style="padding:4px;min-width:180px">';
        html += `<p style="font-weight:bold;font-size:13px">Stop ${idx + 1} of ${timeline.length}</p>`;
        html += `<p style="font-size:12px;color:#666;margin-top:4px"><b>Owner:</b> ${t.beneficiary_name || ''}</p>`;
        html += `<p style="font-size:12px;color:#666"><b>Barangay:</b> ${t.barangay || ''}</p>`;
        html += `<p style="font-size:12px;color:#666"><b>From:</b> ${t.date || ''}</p>`;
        if (t.end_date) {
          html += `<p style="font-size:12px;color:#666"><b>To:</b> ${t.end_date}</p>`;
        }
        html += '</div>';

        marker.bindPopup(html, { closeButton: false, offset: [0, -8] });
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
  }, [timeline, center]);

  if (!timeline.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
        No location data available for this animal.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', minHeight: '300px' }}
    />
  );
}
