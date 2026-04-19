import React, { useState } from 'react';
import { Layers, X, Map as MapIcon, Mountain, Bike, Wind, Ruler, Eye, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MapLayersMenu({ 
  mapStyleType, 
  setMapStyleType,
  activeLayers = [],
  setActiveLayers
}: { 
  mapStyleType?: string, 
  setMapStyleType?: (type: string) => void,
  activeLayers?: string[],
  setActiveLayers?: (layers: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  const details = [
    { id: 'traffic', label: 'Traffic', icon: <MapIcon size={20} className="text-rose-500" />, color: 'rose' },
    { id: 'cycling', label: 'Cycling', icon: <Bike size={20} className="text-emerald-500" />, color: 'emerald' },
    { id: 'terrain', label: 'Terrain', icon: <Mountain size={20} className="text-amber-600" />, color: 'amber' },
    { id: 'airquality', label: 'Air Quality', icon: <Wind size={20} className="text-cyan-500" />, color: 'cyan' },
    { id: 'measure', label: 'Measure', icon: <Ruler size={20} className="text-indigo-500" />, color: 'indigo' },
    { id: '3dbuildings', label: '3D Buildings', icon: <Box size={20} className="text-purple-500" />, color: 'purple' },
    { id: 'labels', label: 'Street Labels', icon: <Eye size={20} className="text-orange-500" />, color: 'orange' },
  ];

  const mapTypes = [
    { id: 'default', label: 'Default', icon: <MapIcon size={20} className="text-zinc-500" /> },
    { id: 'satellite', label: 'Satellite', icon: <Eye size={20} className="text-blue-500" /> },
    { id: 'terrain', label: 'Terrain', icon: <Mountain size={20} className="text-amber-600" /> },
    { id: 'cycling', label: 'Cycling', icon: <Bike size={20} className="text-emerald-500" /> },
    { id: 'navigation', label: 'Nav', icon: <MapIcon size={20} className="text-emerald-500" /> },
  ];

  const toggleLayer = (id: string) => {
    if (!setActiveLayers) return;
    if (activeLayers.includes(id)) {
      setActiveLayers(activeLayers.filter(l => l !== id));
    } else {
      setActiveLayers([...activeLayers, id]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        style={{ zIndex: 10001 }}
      >
        <Layers size={22} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 right-0 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            style={{ zIndex: 10002 }}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Map Layers</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Map Type</h4>
              <div className="grid grid-cols-5 gap-2">
                {mapTypes.map((type) => (
                  <button 
                    key={type.id}
                    onClick={() => setMapStyleType && setMapStyleType(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                      mapStyleType === type.id 
                        ? 'bg-emerald-500/10 border-2 border-emerald-500' 
                        : 'bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    {React.cloneElement(type.icon, { className: `${type.icon.props.className} ${mapStyleType === type.id ? 'text-emerald-500' : ''}` })}
                    <span className={`text-[10px] font-medium ${mapStyleType === type.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Overlays</h4>
              <div className="grid grid-cols-4 gap-2">
                {details.map((detail) => {
                  const isActive = activeLayers.includes(detail.id);
                  return (
                    <button 
                      key={detail.id}
                      onClick={() => toggleLayer(detail.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-emerald-500/10 border-2 border-emerald-500' 
                          : 'bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <div className={isActive ? `text-${detail.color}-500` : ''}>
                        {detail.icon}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive ? `text-${detail.color}-600 dark:text-${detail.color}-400` : 'text-zinc-500 dark:text-zinc-500'}`}>
                        {detail.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4">
              <div className="bg-emerald-500/10 rounded-xl p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Active Layers</p>
                <div className="flex flex-wrap gap-1">
                  {activeLayers.length > 0 ? (
                    activeLayers.map(layer => {
                      const detail = details.find(d => d.id === layer);
                      return detail ? (
                        <span key={layer} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-medium">
                          {detail.label}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500">No layers active</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
