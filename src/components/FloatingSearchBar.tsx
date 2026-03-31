import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface SearchResult {
  place_id: number;
  display_name: string;
  lon: string;
  lat: string;
  type: string;
}

export default function FloatingSearchBar({ 
  setEndLoc, 
  setEndQuery,
  viewState
}: { 
  setEndLoc?: (loc: [number, number] | null) => void; 
  setEndQuery?: (query: string) => void;
  viewState?: { longitude: number, latitude: number }
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    try {
      let url = `/api/geocode?q=${encodeURIComponent(searchQuery)}`;
      
      if (viewState?.latitude && viewState?.longitude) {
        url += `&lat=${viewState.latitude}&lon=${viewState.longitude}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchPlaces(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (setEndLoc) {
      setEndLoc([lon, lat]);
    }
    if (setEndQuery) {
      setEndQuery(result.display_name);
    }
    
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    
    // Save to recent searches
    try {
      const recents = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const newRecent = {
        id: Date.now(),
        name: result.display_name.split(',')[0],
        address: result.display_name,
        loc: [lon, lat] as [number, number],
        timestamp: Date.now()
      };
      const filtered = recents.filter((r: any) => r.address !== result.display_name);
      const updated = [newRecent, ...filtered].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      window.dispatchEvent(new Event('recentsUpdated'));
    } catch (e) {
      console.error('Failed to save recent:', e);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const categories = [
    { label: 'ATM', query: 'ATM' },
    { label: 'Hospital', query: 'hospital' },
    { label: 'Petrol', query: 'petrol pump' },
    { label: 'Parking', query: 'parking' },
    { label: 'Police', query: 'police station' },
  ];

  return (
    <div ref={containerRef} className="relative" style={{ zIndex: 9999 }}>
      {/* Search Input */}
      <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl px-4 py-3 w-96 border-2 border-emerald-300 dark:border-emerald-700 transition-all">
        <Search className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search city, address, ATM, hospital..."
          className="flex-1 bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        )}
        {isLoading && (
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin ml-2" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-[10002]">
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={result.place_id || index}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {result.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {result.display_name}
                      </p>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded capitalize">
                        {result.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-500">No results found for "{query}"</p>
              <p className="text-xs text-zinc-400 mt-1">Try different keywords</p>
            </div>
          ) : isLoading ? (
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-500">Searching...</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Category Buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => {
              setQuery(cat.query);
              searchPlaces(cat.query);
            }}
            className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
