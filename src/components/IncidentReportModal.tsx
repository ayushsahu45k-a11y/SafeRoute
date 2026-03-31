import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, MapPin, CheckCircle } from 'lucide-react';

interface IncidentReportModalProps {
  onClose: () => void;
  onSubmit: (report: { type: string; severity: string; location: [number, number]; description: string }) => void;
  location: [number, number];
}

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Accident', icon: '🚨', color: 'rose' },
  { id: 'roadwork', label: 'Road Work', icon: '🚧', color: 'amber' },
  { id: 'hazard', label: 'Road Hazard', icon: '⚠️', color: 'orange' },
  { id: 'closure', label: 'Road Closure', icon: '🚫', color: 'red' },
  { id: 'weather', label: 'Weather Hazard', icon: '🌧️', color: 'blue' },
  { id: 'debris', label: 'Debris on Road', icon: '🪨', color: 'yellow' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', desc: 'Minor, no major impact', color: 'emerald' },
  { id: 'medium', label: 'Medium', desc: 'Moderate delays expected', color: 'amber' },
  { id: 'high', label: 'High', desc: 'Significant impact, avoid', color: 'rose' },
];

export function IncidentReportModal({ onClose, onSubmit, location }: IncidentReportModalProps) {
  const [selectedType, setSelectedType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!selectedType || !selectedSeverity) return;
    onSubmit({
      type: selectedType,
      severity: selectedSeverity,
      location,
      description
    });
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 text-center max-w-sm mx-4"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Report Submitted!</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Thank you for helping keep roads safer for everyone.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 id="report-title" className="font-bold text-zinc-900 dark:text-zinc-100">Report an Incident</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <MapPin size={12} />
                {location[1].toFixed(4)}, {location[0].toFixed(4)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Incident Type</label>
            <div className="grid grid-cols-3 gap-2">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selectedType === type.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                  }`}
                >
                  <span className="text-2xl mb-1 block">{type.icon}</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Severity</label>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedSeverity(level.id)}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    selectedSeverity === level.id
                      ? `border-${level.color}-500 bg-${level.color}-50 dark:bg-${level.color}-500/20`
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{level.label}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedType || !selectedSeverity}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors"
          >
            Submit Report
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
