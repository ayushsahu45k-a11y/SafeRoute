import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isBanned: boolean;
  };
  message?: string;
}

interface LoginPageProps {
  onLogin?: (user: { id: string; name: string; email: string; photo?: string }, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const body = isSignUp 
        ? { email, password, name }
        : { email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: LoginResponse = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        
        if (onLogin && data.user) {
          onLogin({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            photo: undefined
          }, data.token);
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithPhone = () => {
    setError('Phone authentication coming soon');
  };

  const handleContinueWithApple = () => {
    setError('Apple authentication coming soon');
  };

  const handleEmailLink = () => {
    setError('Email link authentication coming soon');
  };

  return (
    <div className="min-h-screen bg-[#DAE0E6] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Sign Up' : 'Log In'}
        </h1>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleContinueWithPhone}
            className="w-full bg-[#FF4500] text-white py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
          >
            Continue With Phone Number
          </button>

          <button
            type="button"
            onClick={handleContinueWithApple}
            className="w-full bg-black text-white py-3 rounded-full font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.5-6.2-3.8-11.8-8.8-14.9-6.4-4-14.4-5.2-21.2-2.8-3.6-1.2-7.6-1.1-10.3.3-6.1 3.4-13.6 4.4-20.1 2.4-11.7-3.7-22.4-12.6-26.1-22.9-2.7-7.5.4-14.8 6.2-20.6 8.5-3.6 7.4-5.3 8.1-10.1.9-6.1-1.3-12.3-5.6-16.6-4.8-4.8-10.8-7.1-17.2-7.1-2.3 0-4.6.3-6.9.9-4.5 1.2-8.5 3.8-11.4 7.7-4.3 5.7-5.6 13.3-4.1 20.1 1.7 7.7 7.2 14.4 14.7 17.1 6.8 2.5 14.2.8 18.5-4.6 2.6-3.2 3.6-7.3 3.1-11.1-.7-5.2-5.1-9.4-10.4-10.4-3.2-.6-6.5-.2-9.4 1.1-2.8 1.3-5.1 3.6-6.5 6.3-1.1 2.1-1.3 4.6-.5 6.7 1.5 4 5.6 6.5 9.8 6.1 7.2-.7 12.9-6.2 14.4-13.3.7-3.3.5-6.8-.5-10-.7-2.4-2.1-4.6-4.1-6.3-3.1-2.6-7.5-3.9-11.7-3.5-5.6.5-10.6 3.9-13.4 9.1-2.2 4.1-2.3 8.6-.3 12.6 2.4 4.8 7 7.9 12.1 8.2 9.3.6 17.6-6.2 18.2-15.5.3-4.3-.4-8.7-2.1-12.7 8.8-1.9 14.7-9.9 13.9-19.5-.7-7.9-7.4-14.2-15.2-17-5.9-2.1-12.3-1.7-18.1 1.1-5.1 2.5-8.9 7-10.6 12.3-2.1 6.5-1.2 13.5 2.5 19.5 3.1 5 7.8 8.7 13.2 10.1 6.8 1.8 14.1.6 20.4-3.2 5.7-3.4 10.1-8.9 12-14.9z"/>
            </svg>
            Continue with Apple
          </button>

          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4500] focus:border-transparent outline-none"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isSignUp ? 'Email' : 'Email or username'}
            </label>
            <input
              type={isSignUp ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4500] focus:border-transparent outline-none"
              placeholder={isSignUp ? 'email@example.com' : 'Email or username'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4500] focus:border-transparent outline-none"
              placeholder="Password"
              required
              minLength={6}
            />
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setError('Password reset coming soon')}
                className="text-[#FF4500] text-sm hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4500] text-white py-3 rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy.
        </p>

        <div className="text-center mt-4">
          {isSignUp ? (
            <p className="text-sm">
              Already a redditor?{' '}
              <button
                onClick={() => setIsSignUp(false)}
                className="text-[#FF4500] font-bold hover:underline"
              >
                Log In
              </button>
            </p>
          ) : (
            <p className="text-sm">
              New to Reddit?{' '}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-[#FF4500] font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}