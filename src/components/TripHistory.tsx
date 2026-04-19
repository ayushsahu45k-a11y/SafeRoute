import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Clock, MapPin, Navigation, Shield, Trash2, X, Share2, TrendingUp, Route, Loader2 } from 'lucide-react';

interface TripHistoryItem {
  id: string;
  startName: string;
  endName: string;
  startLon: number;
  startLat: number;
  endLon: number;
  endLat: number;
  distanceKm: number;
  durationMin: number;
  safetyScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  vehicleType: 'driving' | 'cycling';
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function TripHistory({ onClose }: { onClose: () => void }) {
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'history' | 'stats'>('history');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Please login to view your trip history');
        setLoading(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/trips`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userProfile');
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error('Failed to fetch trips');
      }

      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err) {
      setError('Failed to load trips');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/trips/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setTrips(trips.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete trip', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all trip history? This cannot be undone.')) {
      return;
    }
    
    for (const trip of trips) {
      await handleDelete(trip.id);
    }
  };

  const totalDistance = trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
  const avgSafety = trips.length > 0 
    ? Math.round(trips.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / trips.length) 
    : 0;
  const totalTime = trips.reduce((sum, t) => sum + (t.durationMin || 0), 0);
  const safeTrips = trips.filter(t => t.riskLevel === 'low').length;

  const stats = [
    { label: 'Total Trips', value: trips.length, icon: <Route size={20} />, color: 'emerald' },
    { label: 'Total Distance', value: `${totalDistance.toFixed(1)} km`, icon: <Navigation size={20} />, color: 'blue' },
    { label: 'Avg Safety Score', value: `${avgSafety}%`, icon: <Shield size={20} />, color: avgSafety >= 70 ? 'emerald' : avgSafety >= 40 ? 'amber' : 'rose' },
    { label: 'Time Traveled', value: formatDuration(totalTime), icon: <Clock size={20} />, color: 'purple' },
    { label: 'Safe Trips', value: `${safeTrips}/${trips.length}`, icon: <TrendingUp size={20} />, color: 'emerald' },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'emerald';
      case 'moderate': return 'amber';
      case 'high': return 'rose';
      default: return 'emerald';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Trip History</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{trips.length} trips recorded</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setSelectedTab('history')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'history'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Trip Log
          </button>
          <button
            onClick={() => setSelectedTab('stats')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'stats'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Statistics
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Route className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-rose-500 font-medium">{error}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your completed routes will appear here after login.</p>
            </div>
          ) : selectedTab === 'stats' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 text-center"
                  >
                    <div className={`w-10 h-10 bg-${stat.color}-100 dark:bg-${stat.color}-500/20 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <span className={`text-${stat.color}-500`}>{stat.icon}</span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {trips.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Safety Distribution</h4>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    {trips.map((trip) => (
                      <div
                        key={trip.id}
                        className={`flex-1 rounded-full ${
                          trip.riskLevel === 'low' ? 'bg-emerald-500' :
                          trip.riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        title={`${trip.startName} → ${trip.endName}: ${trip.safetyScore}%`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> High</span>
                  </div>
                </div>
              )}
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12">
              <Route className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">No trip history yet.</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your completed routes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip, i) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          trip.riskLevel === 'low' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                          trip.riskLevel === 'moderate' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                          'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                        }`}>
                          <Shield size={10} className="mr-1" />
                          {trip.safetyScore}%
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                          <Calendar size={10} /> {formatDate(trip.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{trip.startName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                        <Navigation size={10} /> {trip.endName}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{trip.distanceKm?.toFixed(1)} km</span>
                        <span>{formatDuration(trip.durationMin || 0)}</span>
                        <span>{trip.vehicleType === 'cycling' ? 'Bike' : 'Car'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${trip.startLat},${trip.startLon}&destination=${trip.endLat},${trip.endLon}`;
                          window.open(url, '_blank');
                        }}
                        className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Open in Maps"
                      >
                        <Share2 size={14} className="text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-rose-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {trips.length > 0 && selectedTab === 'history' && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              onClick={handleClearAll}
              className="w-full py-2 text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}