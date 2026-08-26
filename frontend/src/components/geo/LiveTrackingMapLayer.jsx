import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveGeoMap, useActiveAnimalsMap } from '../../api/hooks';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import AnimalDetailModal from '../AnimalDetailModal';

const BAYAWAN = [9.6894, 122.8353];

const CARETAKER_COLORS = {
  FORMAL_BENEFICIARY: '#3b82f6',
  INFORMAL_CARETAKER: '#a855f7',
  TEMPORARY_FOSTER: '#eab308',
  CVO_HOLDING_FACILITY: '#6b7280',
};
const CARETAKER_LABELS = {
  FORMAL_BENEFICIARY: 'Formal Beneficiary',
  INFORMAL_CARETAKER: 'Informal Caretaker',
  TEMPORARY_FOSTER: 'Temporary Foster',
  CVO_HOLDING_FACILITY: 'CVO Facility',
};

function makeIcon(color) {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
    html: `<div style="
      width:20px;height:20px;background:${color};
      border:2px solid #fff;border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    "></div>`,
  });
}

export default function LiveTrackingMapLayer({ filters = {}, height = '500px', onFeatureClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const geoGroupRef = useRef(null);
  const dispGroupRef = useRef(null);
  const dotsGroupRef = useRef(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showGeo, setShowGeo] = useState(true);
  const [showDispersal, setShowDispersal] = useState(true);
  const [markerCount, setMarkerCount] = useState(0);

  const { data: geoData, isLoading: geoLoading } = useActiveGeoMap(filters);
  const { data: dispersalData, isLoading: dispLoading } = useActiveAnimalsMap();

  // Store latest data in refs
  const geoDataRef = useRef(geoData);
  const dispDataRef = useRef(dispersalData);
  const showGeoRef = useRef(showGeo);
  const showDispersalRef = useRef(showDispersal);

  useEffect(() => { geoDataRef.current = geoData; }, [geoData]);
  useEffect(() => { dispDataRef.current = dispersalData; }, [dispersalData]);
  useEffect(() => { showGeoRef.current = showGeo; }, [showGeo]);
  useEffect(() => { showDispersalRef.current = showDispersal; }, [showDispersal]);

  function clearLayers() {
    geoGroupRef.current?.clearLayers();
    dispGroupRef.current?.clearLayers();
    dotsGroupRef.current?.clearLayers();
  }

  function addMarkers(map, geo, dispersal, sg, sd) {
    clearLayers();
    let count = 0;
    const allCoords = [];

    // ── Geo-tag markers ──
    if (sg && geo?.features?.length) {
      for (const f of geo.features) {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties;
        const color = CARETAKER_COLORS[p.caretaker_type] || '#6b7280';

        const popupHtml = `<div style="padding:8px;min-width:180px;font-family:system-ui,sans-serif">
          <p style="font-weight:600;margin:0">${p.tag_code || ''}</p>
          <p style="color:#555;margin:2px 0">${p.animal_tag || ''} — ${p.species || ''}</p>
          <p style="color:#555;margin:2px 0">Caretaker: ${p.caretaker_name || ''}</p>
          <p style="color:#888;font-size:12px">${CARETAKER_LABELS[p.caretaker_type] || ''}</p>
          ${!p.has_dispersion_link ? '<p style="color:#a855f7;font-size:11px;font-weight:500;margin-top:4px">⚡ Field-Recorded</p>' : ''}
        </div>`;

        const marker = L.marker([lat, lng], { icon: makeIcon(color) })
          .bindPopup(popupHtml, { closeButton: false, offset: [0, -12] });

        marker.on('click', () => {
          if (p.animal_id) setSelectedAnimalId(String(p.animal_id));
          onFeatureClick?.(p, 'geo');
        });

        geoGroupRef.current.addLayer(marker);
        allCoords.push([lat, lng]);
        count++;
      }

      // Dashed line traces between points of same animal
      const groups = {};
      for (const f of geo.features) {
        const aid = f.properties.animal_id;
        if (!groups[aid]) groups[aid] = [];
        groups[aid].push(f.geometry.coordinates);
      }
      for (const coords of Object.values(groups)) {
        if (coords.length < 2) continue;
        const latLngs = coords.map((c) => [c[1], c[0]]);
        L.polyline(latLngs, {
          color: '#a855f7',
          weight: 1.5,
          opacity: 0.5,
          dashArray: '4, 6',
        }).addTo(dotsGroupRef.current);
      }
    }

    // ── Dispersal markers ──
    if (sd && dispersal?.features?.length) {
      for (const f of dispersal.features) {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties;

        const popupHtml = `<div style="padding:8px;min-width:180px;font-family:system-ui,sans-serif">
          <p style="font-weight:600;margin:0">${p.tag_id || ''}</p>
          <p style="color:#555;margin:2px 0">${p.species || ''}</p>
          <p style="color:#555;margin:2px 0">Owner: ${p.beneficiary_name || ''}</p>
          <p style="color:#888;font-size:12px">${p.transfer_type || ''} — ${p.start_date || ''}</p>
        </div>`;

        const marker = L.marker([lat, lng], { icon: makeIcon('#16a34a') })
          .bindPopup(popupHtml, { closeButton: false, offset: [0, -12] });

        marker.on('click', () => {
          if (p.id) setSelectedAnimalId(String(p.id));
          onFeatureClick?.(p, 'dispersal');
        });

        dispGroupRef.current.addLayer(marker);
        allCoords.push([lat, lng]);
        count++;
      }
    }

    setMarkerCount(count);

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14 });
    }
  }

  function tryAddMarkers() {
    const map = mapRef.current;
    if (!map) return;
    addMarkers(map, geoDataRef.current, dispDataRef.current, showGeoRef.current, showDispersalRef.current);
  }

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: BAYAWAN,
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    geoGroupRef.current = L.layerGroup().addTo(map);
    dispGroupRef.current = L.layerGroup().addTo(map);
    dotsGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      clearLayers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // When data or toggles change, try adding markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (showGeo) {
      if (!mapRef.current.hasLayer(geoGroupRef.current)) mapRef.current.addLayer(geoGroupRef.current);
      if (!mapRef.current.hasLayer(dotsGroupRef.current)) mapRef.current.addLayer(dotsGroupRef.current);
    } else {
      if (mapRef.current.hasLayer(geoGroupRef.current)) mapRef.current.removeLayer(geoGroupRef.current);
      if (mapRef.current.hasLayer(dotsGroupRef.current)) mapRef.current.removeLayer(dotsGroupRef.current);
    }

    if (showDispersal) {
      if (!mapRef.current.hasLayer(dispGroupRef.current)) mapRef.current.addLayer(dispGroupRef.current);
    } else {
      if (mapRef.current.hasLayer(dispGroupRef.current)) mapRef.current.removeLayer(dispGroupRef.current);
    }

    // Re-add markers when data changes
    if (geoData || dispersalData) {
      addMarkers(mapRef.current, geoData, dispersalData, showGeo, showDispersal);
    }
  }, [geoData, dispersalData, showGeo, showDispersal]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', minHeight: 400 }} />

      {/* Layer toggle panel */}
      <div className="absolute top-3 right-3 z-10 bg-white rounded-xl shadow-lg border border-gray-200">
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
              <input type="checkbox" checked={showGeo} onChange={e => setShowGeo(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-gray-700">Geo-Tag Custody</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showDispersal} onChange={e => setShowDispersal(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-700">Dispersal Records</span>
              </div>
            </label>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Caretaker Types</p>
              {Object.entries(CARETAKER_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{CARETAKER_LABELS[type]}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 pt-1">
              {geoLoading || dispLoading ? 'Loading…' : `${markerCount} markers shown`}
            </p>
          </div>
        )}
      </div>

      {selectedAnimalId && (
        <AnimalDetailModal animalId={selectedAnimalId} onClose={() => setSelectedAnimalId(null)} />
      )}
    </div>
  );
}
