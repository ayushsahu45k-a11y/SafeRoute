import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Navigation, CloudRain, Clock, AlertTriangle, ShieldCheck, Activity, Bike, Car, Moon, Sun, Eye, EyeOff, Map, Crosshair, ListOrdered, Info, RefreshCw, ArrowUpDown, Volume2, VolumeX, Share2, BookmarkPlus, Plus, X, Mic, MicOff, AlertCircle } from 'lucide-react';
import { geocode, getRoute, getWeather, analyzeRoute } from '../lib/api';
import { speakDirection, stopSpeaking, isSpeaking } from '../lib/voiceNavigation';
import { RouteLoadingSkeleton, DirectionsLoadingSkeleton } from './SkeletonLoader';
import { useKeyboardShortcuts, announceToScreenReader } from '../hooks';

interface Waypoint {
  id: number;
  query: string;
  loc: [number, number] | null;
}

interface SidebarProps {
  setRouteData: (data: any) => void;
  setAlternativeRoutes: (data: any[]) => void;
  alternativeRoutes: any[];
  setRiskData: (data: any) => void;
  setPreviousRouteData: (data: any) => void;
  setPreviousRiskData: (data: any) => void;
  setIncidentsData: (data: any) => void;
  setWeather: (data: any) => void;
  setStartLoc: (loc: [number, number] | null) => void;
  setEndLoc: (loc: [number, number] | null) => void;
  startLoc: [number, number] | null;
  endLoc: [number, number] | null;
  startQuery: string;
  setStartQuery: (query: string) => void;
  endQuery: string;
  setEndQuery: (query: string) => void;
  routeData: any;
  riskData: any;
  previousRouteData: any;
  previousRiskData: any;
  incidentsData: any;
  weather: any;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  vehicleType: 'driving' | 'cycling';
  setVehicleType: (type: 'driving' | 'cycling') => void;
  showIncidents: boolean;
  setShowIncidents: (show: boolean) => void;
  showRoutePlayback: boolean;
  setShowRoutePlayback: (show: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  onOpenIncidentReport?: (location: [number, number]) => void;
  onOpenTripHistory?: () => void;
  onToggleVoiceNav?: (enabled: boolean) => void;
  voiceNavEnabled?: boolean;
}

export default function Sidebar({ 
  setRouteData, 
  setAlternativeRoutes,
  alternativeRoutes,
  setRiskData, 
  setPreviousRouteData,
  setPreviousRiskData,
  setIncidentsData,
  setWeather, 
  setStartLoc, 
  setEndLoc,
  startLoc,
  endLoc,
  startQuery,
  setStartQuery,
  endQuery,
  setEndQuery,
  routeData,
  riskData,
  previousRouteData,
  previousRiskData,
  incidentsData,
  weather,
  theme,
  setTheme,
  vehicleType,
  setVehicleType,
  showIncidents,
  setShowIncidents,
  showRoutePlayback,
  setShowRoutePlayback,
  playbackSpeed,
  setPlaybackSpeed,
  onOpenIncidentReport,
  onOpenTripHistory,
  onToggleVoiceNav,
  voiceNavEnabled = false
}: SidebarProps) {
  const [startResults, setStartResults] = useState<any[]>([]);
  const [endResults, setEndResults] = useState<any[]>([]);
  const [waypointResults, setWaypointResults] = useState<Record<number, any[]>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [voiceNavActive, setVoiceNavActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts([
    { key: 'Enter', handler: () => handleCalculate(), description: 'Calculate route' },
    { key: 'Escape', handler: () => { setError(''); setWaypoints([]); }, description: 'Close panels' },
    { key: 'r', ctrl: true, handler: () => handleCalculate(), description: 'Calculate route' },
    { key: 'k', ctrl: true, handler: () => startInputRef.current?.focus(), description: 'Focus start location' },
  ]);

  const saveTripToHistory = (start: [number, number], end: [number, number], route: any, risk: any, w: any) => {
    try {
      const trip = {
        id: Date.now(),
        startName: startQuery || `${start[1].toFixed(4)}, ${start[0].toFixed(4)}`,
        endName: endQuery || `${end[1].toFixed(4)}, ${end[0].toFixed(4)}`,
        startLoc: start,
        endLoc: end,
        distance: route?.distance || 0,
        duration: route?.duration || 0,
        safetyScore: Math.round((1 - (risk?.reduce?.((a: number, b: any) => a + (b.risk_probability || 0), 0) / (risk?.length || 1) || 0)) * 100),
        riskLevel: (risk?.reduce?.((a: number, b: any) => a + (b.risk_probability || 0), 0) / (risk?.length || 1) || 0) >= 0.6 ? 'high' :
                   (risk?.reduce?.((a: number, b: any) => a + (b.risk_probability || 0), 0) / (risk?.length || 1) || 0) >= 0.35 ? 'moderate' : 'low',
        weather: w?.weather?.[0]?.main || 'Clear',
        vehicleType,
        timestamp: Date.now()
      };
      const history = JSON.parse(localStorage.getItem('tripHistory') || '[]');
      history.unshift(trip);
      localStorage.setItem('tripHistory', JSON.stringify(history.slice(0, 50)));
    } catch {}
  };

  const handleShareRoute = () => {
    if (!routeData) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${startLoc?.[1]},${startLoc?.[0]}&destination=${endLoc?.[1]},${endLoc?.[0]}`;
    if (navigator.share) {
      navigator.share({ title: 'SafeRoute', text: `My route: ${startQuery} → ${endQuery}`, url }).catch(() => {
        navigator.clipboard.writeText(url);
        announceToScreenReader('Link copied to clipboard');
      });
    } else {
      navigator.clipboard.writeText(url);
      setError('Route link copied to clipboard!');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleVoiceNav = () => {
    if (!routeData?.legs?.[0]?.steps?.length) return;
    const steps = routeData.legs[0].steps;
    if (voiceNavActive) {
      stopSpeaking();
      setVoiceNavActive(false);
      setCurrentStepIndex(0);
    } else {
      setVoiceNavActive(true);
      setCurrentStepIndex(0);
      speakDirection(steps[0]);
      announceToScreenReader(`Voice navigation started. First direction: ${steps[0].maneuver?.instruction || steps[0].maneuver?.type}`);
    }
  };

  const handleAddWaypoint = () => {
    if (waypoints.length >= 3) return;
    setWaypoints(prev => [...prev, { id: Date.now(), query: '', loc: null }]);
  };

  const handleRemoveWaypoint = (id: number) => {
    setWaypoints(prev => prev.filter(w => w.id !== id));
    setWaypointResults(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  const handleWaypointQueryChange = (id: number, query: string) => {
    setWaypoints(prev => prev.map(w => w.id === id ? { ...w, query, loc: null } : w));
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        try {
          const res = await geocode(query);
          setWaypointResults(prev => ({ ...prev, [id]: res }));
        } catch {}
      } else {
        setWaypointResults(prev => { const n = {...prev}; delete n[id]; return n; });
      }
    }, 500);
    return () => clearTimeout(timer);
  };

  const handleSelectWaypoint = (id: number, result: any) => {
    setWaypoints(prev => prev.map(w => w.id === id ? { ...w, query: result.place_name, loc: result.center } : w));
    setWaypointResults(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  useEffect(() => {
    if (voiceNavActive && routeData?.legs?.[0]?.steps?.length) {
      const steps = routeData.legs[0].steps;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' && currentStepIndex < steps.length - 1) {
          const next = currentStepIndex + 1;
          setCurrentStepIndex(next);
          speakDirection(steps[next]);
          announceToScreenReader(`Step ${next + 1}: ${steps[next].maneuver?.instruction || steps[next].maneuver?.type}`);
        } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
          const prev = currentStepIndex - 1;
          setCurrentStepIndex(prev);
          speakDirection(steps[prev]);
          announceToScreenReader(`Step ${prev + 1}: ${steps[prev].maneuver?.instruction || steps[prev].maneuver?.type}`);
        } else if (e.key === 'Escape') {
          stopSpeaking();
          setVoiceNavActive(false);
          setCurrentStepIndex(0);
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [voiceNavActive, routeData, currentStepIndex]);

  const saveToRecents = (placeName: string, loc: [number, number]) => {
    try {
      const recents = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const newRecent = {
        id: Date.now(),
        name: placeName.split(',')[0],
        address: placeName,
        loc: loc,
        timestamp: Date.now()
      };
      const filtered = recents.filter((r: any) => r.address !== placeName);
      const updated = [newRecent, ...filtered].slice(0, 20);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      window.dispatchEvent(new Event('recentsUpdated'));
    } catch (e) {
      console.error('Failed to save recent:', e);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (startQuery.length > 2 && !startLoc) {
        try {
          const res = await geocode(startQuery);
          setStartResults(res);
        } catch (e) {}
      } else {
        setStartResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [startQuery, startLoc]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (endQuery.length > 2 && !endLoc) {
        try {
          const res = await geocode(endQuery);
          setEndResults(res);
        } catch (e) {}
      } else {
        setEndResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [endQuery, endLoc]);

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setStartLoc([longitude, latitude]);
          setStartQuery('Current Location');
          setLoading(false);
        },
        (err) => {
          setError('Could not get current location. Please check permissions or allow location access.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleDetectCurrentLocation = () => {
    if (startQuery.toLowerCase().includes('current') && !startLoc) {
      handleUseCurrentLocation();
    }
  };

  const handleReverse = () => {
    const tempLoc = startLoc;
    const tempQuery = startQuery;
    
    setStartLoc(endLoc);
    setStartQuery(endQuery);
    
    setEndLoc(tempLoc);
    setEndQuery(tempQuery);
  };

  const handleCalculate = async () => {
    if (!startLoc) {
      if (startQuery.toLowerCase().includes('current')) {
        handleUseCurrentLocation();
        setError('Getting your current location...');
        setTimeout(() => {
          if (startLoc) setError('');
        }, 2000);
        return;
      }
      if (startResults.length > 0) {
        const firstResult = startResults[0];
        setStartQuery(firstResult.place_name);
        setStartLoc(firstResult.center);
        setStartResults([]);
        setError('Using first search result for origin...');
        setTimeout(() => setError(''), 2000);
        return;
      }
      setError('Please enter a start location and select it from the dropdown, or click the crosshair button for Current Location.');
      startInputRef.current?.focus();
      announceToScreenReader('Start location required. Please enter and select a start location.');
      return;
    }
    if (!endLoc) {
      if (endResults.length > 0) {
        const firstResult = endResults[0];
        setEndQuery(firstResult.place_name);
        setEndLoc(firstResult.center);
        setEndResults([]);
        setError('Using first search result for destination...');
        setTimeout(() => setError(''), 2000);
        return;
      }
      setError('Please select a destination from the dropdown, or try a shorter search term.');
      endInputRef.current?.focus();
      announceToScreenReader('Destination required. Please enter and select a destination.');
      return;
    }

    const unresolvedWaypoints = waypoints.filter(w => !w.loc);
    if (unresolvedWaypoints.length > 0) {
      setError(`Please select "${unresolvedWaypoints[0].query}" from the dropdown or remove it.`);
      return;
    }

    setError('');
    setLoading(true);
    setVoiceNavActive(false);
    setCurrentStepIndex(0);
    stopSpeaking();

    try {
      if (routeData) {
        setPreviousRouteData(routeData);
        setPreviousRiskData(riskData);
      }

      setRouteData(null);
      setRiskData(null);
      setAlternativeRoutes([]);

      const allPoints: [number, number][] = [startLoc];
      waypoints.forEach(w => { if (w.loc) allPoints.push(w.loc); });
      allPoints.push(endLoc);

      let primaryRoute: any = null;
      let altRoutes: any[] = [];

      if (allPoints.length === 2) {
        const routes = await getRoute(startLoc, endLoc, vehicleType);
        if (!routes || routes.length === 0) {
          throw new Error(`No route found between "${startQuery}" and "${endQuery}". Try different locations or check spelling.`);
        }
        primaryRoute = routes[0];
        altRoutes = routes.slice(1);
      } else {
        let cumulativeRoute: any = { geometry: { coordinates: [] as [number, number][] }, distance: 0, duration: 0, legs: [] as any[] };
        for (let i = 0; i < allPoints.length - 1; i++) {
          const segmentRoutes = await getRoute(allPoints[i], allPoints[i + 1], vehicleType);
          if (!segmentRoutes || segmentRoutes.length === 0) {
            throw new Error(`No route found between stop ${i + 1} and stop ${i + 2}. Try different waypoints.`);
          }
          const seg = segmentRoutes[0];
          cumulativeRoute.geometry.coordinates.push(...seg.geometry.coordinates);
          cumulativeRoute.distance += seg.distance;
          cumulativeRoute.duration += seg.duration;
          if (seg.legs?.[0]?.steps) {
            cumulativeRoute.legs.push(...seg.legs);
          }
        }
        primaryRoute = cumulativeRoute;
      }

      const weatherData = await getWeather(startLoc[1], startLoc[0]);
      setWeather(weatherData);

      const weatherCondition = weatherData.weather?.[0]?.main || 'Clear';
      const timeOfDay = new Date().getHours();
      
      const analysis = await analyzeRoute(primaryRoute.geometry.coordinates, weatherCondition, timeOfDay, vehicleType);
      
      setRouteData(primaryRoute);
      setAlternativeRoutes(altRoutes);
      setRiskData(analysis.segments);
      setIncidentsData(analysis.incidents);

      saveTripToHistory(startLoc, endLoc, primaryRoute, analysis.segments, weatherData);

      const safetyScore = Math.round((1 - analysis.overallRisk) * 100);
      announceToScreenReader(`Route calculated! Distance: ${(primaryRoute.distance / 1000).toFixed(1)} kilometers. Safety score: ${safetyScore}%`);

    } catch (err: any) {
      console.error('Calculation Error:', err.response?.data || err.message || err);
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('No route')) {
        setError(msg);
      } else if (msg.includes('geocoding') || msg.includes('coordinates')) {
        setError('Could not find those locations. Please check the addresses and try again.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Network error. Check your internet connection and try again.');
      } else {
        setError('Failed to calculate route. Please try different locations or try again later.');
      }
      announceToScreenReader('Route calculation failed. ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate base risk from risk data
  const baseRisk = riskData && riskData.length > 0 
    ? riskData.reduce((acc: number, seg: any) => acc + (seg.risk_probability || 0), 0) / riskData.length 
    : 0;
  
  // Determine risk level from segment data
  const highRiskSegments = riskData ? riskData.filter((seg: any) => (seg.risk_probability || 0) >= 0.6).length : 0;
  const moderateRiskSegments = riskData ? riskData.filter((seg: any) => {
    const risk = seg.risk_probability || 0;
    return risk >= 0.35 && risk < 0.6;
  }).length : 0;
  
  // Calculate incident penalty
  const incidentPenalty = (incidentsData || []).reduce((acc: number, incident: any) => {
    let penalty = 0.03;
    if (incident.severity?.toLowerCase() === 'high') penalty += 0.08;
    else if (incident.severity?.toLowerCase() === 'medium') penalty += 0.05;
    if (incident.type?.toLowerCase() === 'accident') penalty += 0.03;
    return acc + penalty;
  }, 0);

  // Calculate overall risk
  const overallRisk = Math.min(0.95, baseRisk + incidentPenalty);
  
  // Determine risk level based on conditions
  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  let riskMessage = 'This route is safe and suitable for travel.';
  
  if (overallRisk >= 0.6 || highRiskSegments > (riskData?.length || 1) * 0.3) {
    riskLevel = 'high';
    riskMessage = 'This route has high risk. Proceed with caution.';
  } else if (overallRisk >= 0.35 || moderateRiskSegments > (riskData?.length || 1) * 0.4) {
    riskLevel = 'moderate';
    riskMessage = 'This route has moderate risk. Stay alert while traveling.';
  }
  
  // Calculate safety percentage (inverse of risk)
  const safePercentage = Math.round((1 - overallRisk) * 100);

  const [width, setWidth] = useState(384); // 384px is w-96
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width, constrained between 320px and 600px
      const newWidth = Math.max(320, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <motion.div 
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      style={{ width: `${width}px` }}
      className="h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl z-10 transition-colors duration-300 relative shrink-0"
    >
      {/* Drag Handle */}
      <div 
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
      
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Activity className="text-emerald-500" />
            SafeRoute
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Smart Traffic & Risk Prediction</p>
        </div>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setVehicleType('driving')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                vehicleType === 'driving' 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Car className="w-4 h-4" /> Car
            </button>
            <button
              type="button"
              onClick={() => setVehicleType('cycling')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                vehicleType === 'cycling' 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Bike className="w-4 h-4" /> Bike
            </button>
          </div>

          <div className="relative">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Origin</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                ref={startInputRef}
                type="text" 
                value={startQuery}
                onChange={(e) => { setStartQuery(e.target.value); setStartLoc(null); }}
                placeholder="Enter start location..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                aria-label="Start location input"
              />
              <button 
                onClick={handleUseCurrentLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-500 transition-colors"
                title="Use Current Location"
              >
                <Crosshair size={18} />
              </button>
            </div>
            {startResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                {startResults.map((res: any) => (
                  <button 
                    key={res.id}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 transition-colors border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                    onClick={() => {
                      setStartQuery(res.place_name);
                      setStartLoc(res.center);
                      setStartResults([]);
                      saveToRecents(res.place_name, res.center);
                    }}
                  >
                    {res.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleReverse}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-full shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 transition-colors"
              title="Reverse Origin and Destination"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          <div className="relative">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Destination</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                ref={endInputRef}
                type="text" 
                value={endQuery}
                onChange={(e) => { setEndQuery(e.target.value); setEndLoc(null); }}
                placeholder="Enter destination..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                aria-label="Destination input"
              />
            </div>
            {endResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                {endResults.map((res: any) => (
                  <button 
                    key={res.id}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 transition-colors border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                    onClick={() => {
                      setEndQuery(res.place_name);
                      setEndLoc(res.center);
                      setEndResults([]);
                      saveToRecents(res.place_name, res.center);
                    }}
                  >
                    {res.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {waypoints.map((wp) => (
            <div key={wp.id} className="relative">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">{waypoints.indexOf(wp) + 1}</span>
                Stop {waypoints.indexOf(wp) + 1}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                <input 
                  type="text" 
                  value={wp.query}
                  onChange={(e) => handleWaypointQueryChange(wp.id, e.target.value)}
                  placeholder={`Add stop ${waypoints.indexOf(wp) + 1}...`}
                  className="w-full bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800 rounded-xl py-3 pl-10 pr-10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                  aria-label={`Waypoint ${waypoints.indexOf(wp) + 1} input`}
                />
                <button 
                  onClick={() => handleRemoveWaypoint(wp.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 transition-colors"
                  aria-label={`Remove waypoint ${waypoints.indexOf(wp) + 1}`}
                >
                  <X size={16} />
                </button>
              </div>
              {waypointResults[wp.id]?.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                  {waypointResults[wp.id].map((res: any) => (
                    <button 
                      key={res.id}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-sm text-zinc-700 dark:text-zinc-300 transition-colors border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                      onClick={() => {
                        handleSelectWaypoint(wp.id, res);
                        saveToRecents(res.place_name, res.center);
                      }}
                    >
                      {res.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {waypoints.length < 3 && (
            <button
              onClick={handleAddWaypoint}
              className="flex items-center justify-center gap-2 py-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium transition-colors border border-dashed border-blue-300 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <Plus size={16} /> Add Stop
            </button>
          )}

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 flex items-start gap-2"
              >
                <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-rose-600 dark:text-rose-400 text-sm flex-1">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCalculate}
              disabled={loading}
              className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 font-semibold py-3 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <RefreshCw size={18} />
                </motion.div>
              ) : routeData ? (
                <><RefreshCw size={18} /> Recalculate</>
              ) : (
                'Calculate Route'
              )}
            </motion.button>
            
            {routeData && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShareRoute}
                className="px-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors"
                title="Share Route"
              >
                <Share2 size={18} />
              </motion.button>
            )}

            {routeData && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setRouteData(null);
                  setAlternativeRoutes([]);
                  setRiskData(null);
                  setPreviousRouteData(null);
                  setPreviousRiskData(null);
                  setIncidentsData(null);
                  setStartLoc(null);
                  setEndLoc(null);
                  setStartQuery('');
                  setEndQuery('');
                  setWaypoints([]);
                  setVoiceNavActive(false);
                  setCurrentStepIndex(0);
                  stopSpeaking();
                }}
                className="px-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold rounded-xl hover:bg-rose-500/20 transition-colors"
                title="Clear Route"
              >
                Clear
              </motion.button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onOpenTripHistory}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              <Clock size={14} /> Trip History
            </button>
            {routeData && (
              <button
                onClick={handleVoiceNav}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm border rounded-xl transition-colors font-medium ${
                  voiceNavActive
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
                title={voiceNavActive ? 'Stop voice navigation' : 'Start voice navigation'}
              >
                {voiceNavActive ? <MicOff size={14} /> : <Mic size={14} />}
                {voiceNavActive ? 'Stop Audio' : 'Voice Nav'}
              </button>
            )}
            {routeData && startLoc && (
              <button
                onClick={() => onOpenIncidentReport?.(startLoc)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium"
              >
                <AlertTriangle size={14} /> Report
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2">
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`flex items-center justify-between p-3 border rounded-xl transition-colors text-sm ${
                showIncidents 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400' 
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Incidents</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${showIncidents ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${showIncidents ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </button>
            
            {routeData && (
              <button
                onClick={() => setShowRoutePlayback(!showRoutePlayback)}
                className={`flex items-center justify-between p-3 border rounded-xl transition-colors text-sm ${
                  showRoutePlayback 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">Route Playback</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${showRoutePlayback ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${showRoutePlayback ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </button>
            )}
            
            {showRoutePlayback && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Playback Speed</span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{playbackSpeed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="5" step="0.5" 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Section */}
        <AnimatePresence>
          {routeData && riskData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
            >
              {/* Alternative Routes */}
              {/* @ts-ignore */}
              {alternativeRoutes && alternativeRoutes.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                    <ArrowUpDown size={16} /> Alternative Routes
                  </h3>
                  <div className="space-y-2">
                    {/* @ts-ignore */}
                    {alternativeRoutes.map((altRoute: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const weatherCondition = weather?.weather?.[0]?.main || 'Clear';
                            const timeOfDay = new Date().getHours();
                            const analysis = await analyzeRoute(altRoute.geometry.coordinates, weatherCondition, timeOfDay, vehicleType);
                            
                            // Only update state if analysis succeeds
                            const currentMain = routeData;
                            setRouteData(altRoute);
                            
                            const newAlts = alternativeRoutes.filter((_: any, i: number) => i !== idx);
                            if (currentMain) {
                              newAlts.unshift(currentMain);
                            }
                            setAlternativeRoutes(newAlts);
                            
                            setRiskData(analysis.segments);
                            setIncidentsData(analysis.incidents);
                          } catch (err) {
                            console.error('Failed to recalculate risk for alternative route', err);
                            setError('Failed to analyze alternative route. Please try again.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Route {idx + 1}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(altRoute.duration / 60)} min • {(altRoute.distance / 1000).toFixed(1)} km
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded">Select</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                    <Navigation size={16} />
                    <span className="text-xs font-medium uppercase">Distance</span>
                  </div>
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {(routeData.distance / 1000).toFixed(1)} <span className="text-sm text-zinc-500">km</span>
                  </p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                    <Clock size={16} />
                    <span className="text-xs font-medium uppercase">Est. Time</span>
                  </div>
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {Math.round(routeData.duration / 60)} <span className="text-sm text-zinc-500">min</span>
                  </p>
                </div>
              </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <ShieldCheck size={18} />
                    <span className="text-sm font-medium uppercase">Safety Score</span>
                    <button 
                      onClick={() => setShowSafetyDetails(!showSafetyDetails)}
                      className="ml-2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      title="Why this score?"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                  <span className={`text-2xl font-bold ${
                    riskLevel === 'low' ? 'text-emerald-500' : 
                    riskLevel === 'moderate' ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {safePercentage}%
                  </span>
                </div>
                
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative z-10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${safePercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      riskLevel === 'low' ? 'bg-emerald-500' : 
                      riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
                
                <div className="mt-4 relative z-10">
                  {riskLevel === 'low' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-sm font-medium">Low Risk / Safe Route</p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-7">This route is safe and suitable for travel.</p>
                    </div>
                  ) : riskLevel === 'moderate' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm font-medium">Moderate Risk / Medium Incident</p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-7">This route has moderate risk. Stay alert while traveling.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <p className="text-sm font-medium">High Risk / Severe Incident</p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-7">This route has high risk. Proceed with caution.</p>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showSafetyDetails && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm space-y-2 relative z-10 overflow-hidden"
                    >
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Risk Analysis:</h4>
                      <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                        <li className="flex justify-between">
                          <span>Overall Risk:</span>
                          <span className={`font-medium ${
                            riskLevel === 'low' ? 'text-emerald-500' : 
                            riskLevel === 'moderate' ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {(overallRisk * 100).toFixed(0)}%
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Base Route Risk:</span>
                          <span>{(baseRisk * 100).toFixed(0)}%</span>
                        </li>
                        {incidentPenalty > 0 && (
                          <li className="flex justify-between">
                            <span>Incident Penalty:</span>
                            <span>+{(incidentPenalty * 100).toFixed(0)}%</span>
                          </li>
                        )}
                        <li className="flex justify-between">
                          <span>High Risk Segments:</span>
                          <span>{highRiskSegments}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Moderate Risk Segments:</span>
                          <span>{moderateRiskSegments}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Weather:</span>
                          <span>{weather?.weather?.[0]?.main || 'Clear'}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Time:</span>
                          <span>{new Date().getHours() >= 22 || new Date().getHours() <= 4 ? 'Night' : 'Day'}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Vehicle:</span>
                          <span>{vehicleType === 'cycling' ? 'Bicycle' : 'Car'}</span>
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Background glow */}
                <div className={`absolute -right-10 -bottom-10 w-32 h-32 blur-3xl opacity-20 dark:opacity-20 rounded-full ${
                  riskLevel === 'low' ? 'bg-emerald-500' : 
                  riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
              </div>

              {/* Map Legend */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                  <Map size={16} /> Map Legend
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-zinc-600 dark:text-zinc-400">Low Risk / Safe Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-zinc-600 dark:text-zinc-400">Moderate Risk / Medium Incident</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-zinc-600 dark:text-zinc-400">High Risk / Severe Incident</span>
                  </div>
                </div>
              </div>

              {weather && (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CloudRain className="text-zinc-500 dark:text-zinc-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{weather.weather?.[0]?.main || 'Clear'}</p>
                      <p className="text-xs text-zinc-500">Current Weather</p>
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {Math.round((weather.main?.temp || 298) - 273.15)}°C
                  </div>
                </div>
              )}

              {loading && <DirectionsLoadingSkeleton />}

              {!loading && routeData?.legs?.[0]?.steps && (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <ListOrdered size={16} /> Turn-by-Turn Directions
                      {voiceNavActive && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
                          Voice Active
                        </span>
                      )}
                    </h3>
                    {voiceNavActive && (
                      <button
                        onClick={() => { stopSpeaking(); setVoiceNavActive(false); }}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {routeData.legs[0].steps.map((step: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 text-sm border-b border-zinc-200 dark:border-zinc-800 pb-2 last:border-0 transition-all cursor-pointer rounded-lg p-1 -m-1 ${
                          idx === currentStepIndex && voiceNavActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        onClick={() => {
                          if (routeData?.legs?.[0]?.steps) {
                            setCurrentStepIndex(idx);
                            speakDirection(step);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Step ${idx + 1}: ${step.maneuver?.instruction || step.maneuver?.type}. Press to hear.`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCurrentStepIndex(idx);
                            speakDirection(step);
                          }
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {idx === currentStepIndex && voiceNavActive ? (
                            <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                              <Volume2 size={12} />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${idx === currentStepIndex && voiceNavActive ? 'font-semibold' : ''}`}>
                            {step.maneuver.instruction || `${step.maneuver.type} ${step.maneuver.modifier || ''} ${step.name ? 'onto ' + step.name : ''}`}
                          </p>
                          {step.distance > 0 && <p className="text-xs mt-0.5 opacity-70">{(step.distance).toFixed(0)}m</p>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); speakDirection(step); announceToScreenReader(step.maneuver?.instruction || step.maneuver?.type); }}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all shrink-0"
                          title="Speak this direction"
                          aria-label="Speak this direction"
                        >
                          <Volume2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
