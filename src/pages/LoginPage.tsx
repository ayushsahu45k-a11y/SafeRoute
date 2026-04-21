import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, MapPin, Bell, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string; photo?: string }, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  
  const [locationPermission, setLocationPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ user: any; token: string } | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state as 'default' | 'granted' | 'denied');
        permission.addEventListener('change', () => {
          setLocationPermission(permission.state as 'default' | 'granted' | 'denied');
        });
      } catch {
        setLocationPermission('default');
      }
    }
  };

  const requestLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted');
          setShowLocationPrompt(false);
          if (pendingAuth) {
            onLogin(pendingAuth.user, pendingAuth.token);
            setPendingAuth(null);
          }
        },
        () => {
          setLocationPermission('denied');
          if (pendingAuth) {
            onLogin(pendingAuth.user, pendingAuth.token);
            setPendingAuth(null);
          }
        }
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const url = API_URL ? `${API_URL}/api/auth/login` : '/api/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Login failed (${res.status})`);
      }

      const data = await res.json();

      const user = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        photo: data.user.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.user.name)}`
      };

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userProfile', JSON.stringify(user));

      if (locationPermission === 'granted') {
        onLogin(user, data.token);
      } else {
        setPendingAuth({ user, token: data.token });
        setShowLocationPrompt(true);
      }
    } catch (err: any) {
      const message = err.message || 'Network error. Please check if the server is running.';
      setError(message.includes('Failed to fetch') ? 'Cannot connect to server. Please try again.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const url = API_URL ? `${API_URL}/api/auth/register` : '/api/auth/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Registration failed (${res.status})`);
      }

      const data = await res.json();

      const user = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        photo: data.user.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.user.name)}`
      };

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userProfile', JSON.stringify(user));

      if (locationPermission === 'granted') {
        onLogin(user, data.token);
      } else {
        setPendingAuth({ user, token: data.token });
        setShowLocationPrompt(true);
      }
    } catch (err: any) {
      const message = err.message || 'Network error. Please check if the server is running.';
      setError(message.includes('Failed to fetch') ? 'Cannot connect to server. Please try again.' : message);
    } finally {
      setLoading(false);
    }
  };

  const skipLocation = () => {
    setShowLocationPrompt(false);
    if (pendingAuth) {
      onLogin(pendingAuth.user, pendingAuth.token);
      setPendingAuth(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8 text-center border-b border-zinc-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">SafeRoute</h1>
            <p className="text-zinc-600">Your trusted travel safety companion</p>
          </div>

          <div className="p-8">
            <div className="flex bg-zinc-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                  isLogin 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                  !isLogin 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form 
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 pr-12"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm bg-red-50 p-3 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form 
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 pr-12"
                        placeholder="At least 6 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm bg-red-50 p-3 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="mt-6 text-center text-sm text-zinc-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-white/70 text-sm">
          SafeRoute v1.0.0<br />
          Made-with-Ayush
        </p>
      </motion.div>

      <AnimatePresence>
        {showLocationPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">Enable Location</h3>
              <p className="text-zinc-600 text-center mb-6">
                SafeRoute uses your location to provide accurate routes, nearby safety alerts, and personalized risk assessments.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={skipLocation}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={requestLocationPermission}
                  className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Enable
                </button>
              </div>
              <button
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission();
                  }
                  skipLocation();
                }}
                className="w-full mt-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Also enable notifications
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}