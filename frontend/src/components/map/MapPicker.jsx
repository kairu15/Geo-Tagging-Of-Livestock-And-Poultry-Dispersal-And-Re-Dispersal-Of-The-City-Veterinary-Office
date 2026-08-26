import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, X } from 'lucide-react';

const BAYAWAN = [9.6894, 122.8353];

const markerIcon = new L.DivIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
  html: `<div style="
    width:28px;height:28px;background:#16a34a;
    border:3px solid #fff;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);
  "><div style="
    width:10px;height:10px;background:#fff;border-radius:50%;
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  "></div></div>`,
});

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.2 });
  }, [position, map]);
  return null;
}

export default function MapPicker({ position, setPosition, label = 'Pin Location', hint = 'Search for a location' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const abortRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search Nominatim
  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setOpen(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=8&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal,
      });
      const data = await res.json();
      if (!controller.signal.aborted) {
        setResults(data);
        setSearching(false);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setResults([]);
        setSearching(false);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setPosition([lat, lng]);
    setQuery(item.display_name);
    setResults([]);
    setOpen(false);
  };

  const clearSelection = () => {
    setPosition(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    setSearching(false);
    clearTimeout(debounceRef.current);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-green-600" />
        {label}
      </h2>
      <p className="text-xs text-gray-400 mb-3">{hint}</p>

      {/* Search bar with autocomplete */}
      <div ref={wrapperRef} className="relative mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            placeholder="Search location..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Loading spinner */}
        {searching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Autocomplete dropdown — always positioned below input */}
        {open && (
          <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {results.length > 0 ? (
              results.map((item, idx) => (
                <button
                  key={item.place_id || idx}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{item.display_name}</p>
                      {item.address && (
                        <p className="text-xs text-gray-400 mt-1">
                          {[item.address.city, item.address.state, item.address.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : !searching && query.trim().length >= 2 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : searching ? (
              <div className="px-4 py-6 text-center">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Searching locations...</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
        <MapContainer
          center={position || BAYAWAN}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {position && <Marker position={position} icon={markerIcon} />}
          <FlyTo position={position} />
        </MapContainer>
      </div>

      {position && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
