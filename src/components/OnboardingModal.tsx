import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Shield, Bot, X, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: ReactNode;
  highlight?: string;
}

interface OnboardingModalProps {
  onComplete: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Plan Your Route',
    description: 'Enter your start location and destination in the sidebar. You can type an address, city, or use your current location.',
    icon: <MapPin className="w-8 h-8 text-emerald-500" />,
    highlight: 'sidebar'
  },
  {
    title: 'Choose Your Vehicle',
    description: 'Select between Car or Bicycle mode. SafeRoute calculates the safest route based on your vehicle type and road conditions.',
    icon: <Navigation className="w-8 h-8 text-emerald-500" />,
    highlight: 'vehicle'
  },
  {
    title: 'View Safety Score',
    description: 'Every route gets a Safety Score from 0-100%. Green means safe, amber means moderate risk, red means high risk. Plan accordingly!',
    icon: <Shield className="w-8 h-8 text-emerald-500" />,
    highlight: 'safety'
  },
  {
    title: 'Ask the AI Assistant',
    description: 'Click the chat button to get help with route planning, weather updates, finding nearby places, and driving tips.',
    icon: <Bot className="w-8 h-8 text-emerald-500" />,
    highlight: 'assistant'
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Press Ctrl+K to search, Ctrl+R to calculate route, Ctrl+, for settings. Press Esc to close panels. Use Tab to navigate.',
    icon: <Volume2 className="w-8 h-8 text-emerald-500" />,
    highlight: 'shortcuts'
  }
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', bounce: 0.3 }}
        className="w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white text-center">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Skip tutorial"
          >
            <X size={20} />
          </button>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              {step.icon}
            </div>
            <div>
              <h2 id="onboarding-title" className="text-2xl font-bold mb-1">{step.title}</h2>
              <p className="text-emerald-100 text-sm">{step.description}</p>
            </div>
          </motion.div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-8 bg-emerald-500'
                    : i < currentStep
                    ? 'w-2 bg-emerald-500/50'
                    : 'w-2 bg-zinc-300 dark:bg-zinc-700'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={18} /> Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold text-white transition-colors"
            >
              {currentStep < STEPS.length - 1 ? (
                <>Next <ChevronRight size={18} /></>
              ) : (
                "Let's Go!"
              )}
            </button>
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-3">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
