import React, { useState, useEffect } from 'react';
import { Menu, Bookmark, Clock, Map, Settings, Info, User, LogOut, X, MapPin, Plus, Trash2, Star } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedLocation {
  id: number;
  name: string;
  address: string;
  loc: [number, number];
}

interface RecentSearch {
  id: number;
  name: string;
  address: string;
  loc: [number, number];
  timestamp: number;
}

export function ThinSidebar({ 
  userProfile, 
  onLogin, 
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  onSelectLocation,
  currentEndLoc,
  currentEndQuery,
  onSaveLocation
}: { 
  userProfile?: any, 
  onLogin?: () => void, 
  onLogout?: () => void,
  isSidebarOpen?: boolean,
  setIsSidebarOpen?: (open: boolean) => void,
  onSelectLocation?: (loc: [number, number], name: string) => void,
  currentEndLoc?: [number, number] | null,
  currentEndQuery?: string,
  onSaveLocation?: () => void
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<'saved' | 'recents' | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    // Load saved locations from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('savedLocations') || '[]');
      setSavedLocations(saved);
    } catch (e) {
      setSavedLocations([]);
    }
  }, []);

  useEffect(() => {
    // Load recent searches from localStorage
    const loadRecents = () => {
      try {
        const recents = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        setRecentSearches(recents);
      } catch (e) {
        setRecentSearches([]);
      }
    };
    
    loadRecents();
    
    // Listen for updates from FloatingSearchBar
    window.addEventListener('recentsUpdated', loadRecents);
    
    return () => {
      window.removeEventListener('recentsUpdated', loadRecents);
    };
  }, []);

  const handleDeleteSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedLocations.filter(loc => loc.id !== id);
    setSavedLocations(updated);
    localStorage.setItem('savedLocations', JSON.stringify(updated));
  };

  const handleDeleteRecent = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(rec => rec.id !== id);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSelectLocation = (item: SavedLocation | RecentSearch) => {
    onSelectLocation?.(item.loc, item.name);
    setActivePanel(null);
    navigate('/');
  };

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex flex-col items-center gap-1 group w-full ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`;
  };

  const getIconContainerClass = (path: string) => {
    const isActive = location.pathname === path;
    return `p-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <div className="w-16 shrink-0 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-4 z-30 shadow-sm relative">
        <button 
          onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}
          className={`p-2 rounded-lg transition-colors mb-8 ${isSidebarOpen ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <Menu size={24} />
        </button>

        <div className="flex flex-col gap-6 w-full flex-1 overflow-y-auto scrollbar-hide">
          <button 
            onClick={() => setActivePanel(activePanel === 'saved' ? null : 'saved')}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${activePanel === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
          >
            <div className={`p-2 rounded-lg transition-colors ${activePanel === 'saved' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Bookmark size={24} />
            </div>
            <span className="text-[10px] font-medium">Saved</span>
          </button>

          <button 
            onClick={() => setActivePanel(activePanel === 'recents' ? null : 'recents')}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${activePanel === 'recents' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
          >
            <div className={`p-2 rounded-lg transition-colors ${activePanel === 'recents' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Clock size={24} />
            </div>
            <span className="text-[10px] font-medium">Recents</span>
          </button>

          <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 mx-auto my-2" />

          <Link to="/" className={getLinkClass('/')} onClick={() => setActivePanel(null)}>
            <div className={getIconContainerClass('/')}>
              <Map size={24} />
            </div>
            <span className="text-[10px] font-medium">Map</span>
          </Link>

          <Link to="/settings" className={getLinkClass('/settings')} onClick={() => setActivePanel(null)}>
            <div className={getIconContainerClass('/settings')}>
              <Settings size={24} />
            </div>
            <span className="text-[10px] font-medium">Settings</span>
          </Link>

          <Link to="/about" className={getLinkClass('/about')} onClick={() => setActivePanel(null)}>
            <div className={getIconContainerClass('/about')}>
              <Info size={24} />
            </div>
            <span className="text-[10px] font-medium">About</span>
          </Link>
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-4 w-full items-center border-t border-zinc-200 dark:border-zinc-800">
          {userProfile ? (
            <div className="flex flex-col items-center gap-2 w-full group relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer">
                {userProfile.photo ? (
                  <img src={userProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <User size={20} className="text-zinc-600 dark:text-zinc-400" />
                  </div>
                )}
              </div>
              <button 
                onClick={onLogout}
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity whitespace-nowrap flex items-center gap-1 shadow-lg"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 group w-full"
            >
              <div className="p-2 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                <User size={24} />
              </div>
              <span className="text-[10px] font-medium">Login</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="absolute left-16 top-0 bottom-0 w-80 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {activePanel === 'saved' ? (
                  <><Bookmark size={20} className="text-emerald-500" /> Saved Locations</>
                ) : (
                  <><Clock size={20} className="text-emerald-500" /> Recent Searches</>
                )}
              </h2>
              <button 
                onClick={() => setActivePanel(null)}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {activePanel === 'saved' && savedLocations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Star size={48} className="text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">No saved locations yet.</p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Search for a place and save it!</p>
                </div>
              )}
              
              {activePanel === 'recents' && recentSearches.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Clock size={48} className="text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">No recent searches.</p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Your search history will appear here.</p>
                </div>
              )}

              {activePanel === 'saved' && savedLocations.map((item) => (
                <div
                  key={item.id}
                  className="relative group"
                >
                  <button
                    onClick={() => handleSelectLocation(item)}
                    className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl flex items-start gap-3 transition-colors"
                  >
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg shrink-0">
                      <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{item.address}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSaved(item.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 rounded-lg transition-all"
                    title="Delete location"
                  >
                    <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                  </button>
                </div>
              ))}

              {activePanel === 'recents' && recentSearches.map((item) => (
                <div
                  key={item.id}
                  className="relative group"
                >
                  <button
                    onClick={() => handleSelectLocation(item)}
                    className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl flex items-start gap-3 transition-colors"
                  >
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
                      <MapPin size={18} className="text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{item.address}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteRecent(item.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 rounded-lg transition-all"
                    title="Delete from history"
                  >
                    <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                  </button>
                </div>
              ))}
            </div>

            {activePanel === 'saved' && currentEndLoc && currentEndQuery && (
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Save current destination?</p>
                <button
                  onClick={() => {
                    const newSaved: SavedLocation = {
                      id: Date.now(),
                      name: currentEndQuery.split(',')[0],
                      address: currentEndQuery,
                      loc: currentEndLoc
                    };
                    const updated = [...savedLocations, newSaved];
                    setSavedLocations(updated);
                    localStorage.setItem('savedLocations', JSON.stringify(updated));
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Plus size={16} /> Save "{currentEndQuery.split(',')[0]}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
