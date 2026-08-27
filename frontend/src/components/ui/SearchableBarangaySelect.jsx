import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, MapPin } from 'lucide-react';

/**
 * SearchableBarangaySelect — a custom dropdown that groups barangays by
 * city/municipality and supports type-ahead filtering.
 *
 * Replaces the native <select> to add:
 * - Real-time text filtering as the user types
 * - Grouped display by city/municipality (matching Beneficiaries page pattern)
 * - Clear button to reset selection
 * - Keyboard navigation (Escape to close, arrow keys optional)
 */
export default function SearchableBarangaySelect({
  value,
  onChange,
  barangays = [],
  placeholder = 'All Barangays',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Find the currently selected barangay name for display
  const selectedBarangay = useMemo(
    () => barangays.find((b) => String(b.id) === String(value)),
    [barangays, value]
  );

  // Group barangays by city/municipality
  const grouped = useMemo(() => {
    const map = {};
    for (const b of barangays) {
      const city = b.city_municipality || 'Other';
      if (!map[city]) map[city] = [];
      map[city].push(b);
    }
    // Sort cities and barangays within each city
    const sorted = {};
    for (const city of Object.keys(map).sort()) {
      sorted[city] = map[city].sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [barangays]);

  // Filter grouped results based on search query
  const filteredGrouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped;

    const filtered = {};
    for (const [city, items] of Object.entries(grouped)) {
      const matchCity = city.toLowerCase().includes(q);
      const matchItems = items.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          city.toLowerCase().includes(q)
      );
      if (matchCity || matchItems.length > 0) {
        filtered[city] = matchCity ? items : matchItems;
      }
    }
    return filtered;
  }, [grouped, query]);

  const totalFiltered = useMemo(
    () => Object.values(filteredGrouped).reduce((sum, arr) => sum + arr.length, 0),
    [filteredGrouped]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (barangayId) => {
    onChange(barangayId === value ? '' : barangayId);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-xl text-sm bg-white transition-all cursor-pointer
          ${open
            ? 'border-green-500 ring-2 ring-green-500/30'
            : 'border-slate-200 hover:border-slate-300'
          }
          ${selectedBarangay ? 'text-slate-900' : 'text-slate-500'}
        `}
        aria-label="Filter by barangay"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedBarangay ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="truncate">{selectedBarangay.name}</span>
              <span className="text-xs text-slate-400 truncate hidden sm:inline">
                {selectedBarangay.city_municipality}
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedBarangay && (
            <span
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
              role="button"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search barangay or city..."
                className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {/* "All Barangays" option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-50
                ${!value ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}
              `}
            >
              {placeholder}
            </button>

            {totalFiltered === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No barangays match</p>
                <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(filteredGrouped).map(([city, items]) => (
                <div key={city}>
                  <div className="px-4 py-1.5 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {city}
                    </span>
                  </div>
                  {items.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelect(String(b.id))}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                        ${String(value) === String(b.id)
                          ? 'bg-green-50 text-green-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                        }
                      `}
                    >
                      <MapPin className="h-3 w-3 text-slate-300 flex-shrink-0" />
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer count */}
          {totalFiltered > 0 && (
            <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400">
                {totalFiltered} barangay{totalFiltered !== 1 ? 's' : ''}
                {query && ` matching "${query}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
