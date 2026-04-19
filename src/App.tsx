/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import LeafletMapView from './components/LeafletMapView';
import Sidebar from './components/Sidebar';
import { ThinSidebar } from './components/ThinSidebar';
import { Map, Settings, Info, User, ChevronDown, ChevronUp } from 'lucide-react';

const AIAssistant = lazy(() => import('./components/AIAssistant'));
import { OnboardingModal } from './components/OnboardingModal';
import { TripHistory } from './components/TripHistory';
import { IncidentReportModal } from './components/IncidentReportModal';
import { RouteLoadingSkeleton } from './components/SkeletonLoader';
import { requestNotificationPermission, showRouteAlert } from './lib/notifications';
import { useKeyboardShortcuts } from './hooks';
import AdminDashboard from './pages/AdminDashboard';
import { getCached, setCache, generateRouteCacheKey } from './lib/routeCache';
import { geocode, getRoute } from './lib/api';
import LoginPage from './pages/LoginPage';

function MapTab({ 
  isSidebarOpen,
  routeData, setRouteData, 
  alternativeRoutes, setAlternativeRoutes,
  riskData, setRiskData, 
  previousRouteData, setPreviousRouteData,
  previousRiskData, setPreviousRiskData,
  incidentsData, setIncidentsData, 
  weather, setWeather, 
  startLoc, setStartLoc, 
  endLoc, setEndLoc, 
  startQuery, setStartQuery,
  endQuery, setEndQuery,
  theme, setTheme, 
  vehicleType, setVehicleType, 
  showIncidents, setShowIncidents, 
  showRoutePlayback, setShowRoutePlayback,
  playbackSpeed, setPlaybackSpeed,
  mapStyleType, setMapStyleType,
  activeLayers, setActiveLayers,
  waypoints,
  voiceNavEnabled,
  onOpenIncidentReport,
  onOpenTripHistory,
  onToggleVoiceNav
}: any) {
  return (
    <div className="flex w-full h-full overflow-hidden">
      {isSidebarOpen && (
        <Sidebar 
          setRouteData={setRouteData} 
          setAlternativeRoutes={setAlternativeRoutes}
          alternativeRoutes={alternativeRoutes}
          setRiskData={setRiskData} 
        setPreviousRouteData={setPreviousRouteData}
        setPreviousRiskData={setPreviousRiskData}
        setIncidentsData={setIncidentsData}
        setWeather={setWeather}
        setStartLoc={setStartLoc}
        setEndLoc={setEndLoc}
        startLoc={startLoc}
        endLoc={endLoc}
        startQuery={startQuery}
        setStartQuery={setStartQuery}
        endQuery={endQuery}
        setEndQuery={setEndQuery}
        routeData={routeData}
        riskData={riskData}
        previousRouteData={previousRouteData}
        previousRiskData={previousRiskData}
        incidentsData={incidentsData}
        weather={weather}
        theme={theme}
        setTheme={setTheme}
        vehicleType={vehicleType}
        setVehicleType={setVehicleType}
        showIncidents={showIncidents}
        setShowIncidents={setShowIncidents}
        showRoutePlayback={showRoutePlayback}
        setShowRoutePlayback={setShowRoutePlayback}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        onOpenIncidentReport={onOpenIncidentReport}
        onOpenTripHistory={onOpenTripHistory}
        onToggleVoiceNav={onToggleVoiceNav}
        voiceNavEnabled={voiceNavEnabled}
      />
      )}
      <main className="flex-1 relative">
        <LeafletMapView 
          routeData={routeData} 
          alternativeRoutes={alternativeRoutes}
          riskData={riskData} 
          previousRouteData={previousRouteData}
          previousRiskData={previousRiskData}
          incidentsData={incidentsData}
          startLoc={startLoc}
          endLoc={endLoc}
          setStartLoc={setStartLoc}
          setEndLoc={setEndLoc}
          setStartQuery={setStartQuery}
          setEndQuery={setEndQuery}
          theme={theme}
          showIncidents={showIncidents}
          showRoutePlayback={showRoutePlayback}
          playbackSpeed={playbackSpeed}
          mapStyleType={mapStyleType}
          setMapStyleType={setMapStyleType}
          activeLayers={activeLayers}
          setActiveLayers={setActiveLayers}
          vehicleType={vehicleType}
          waypoints={waypoints}
        />
        <Suspense fallback={null}>
          <AIAssistant 
            routeData={routeData} 
            riskData={riskData} 
            incidentsData={incidentsData}
            weather={weather} 
          />
        </Suspense>
      </main>
    </div>
  );
}

function SettingsTab({ theme, setTheme, vehicleType, setVehicleType, mapStyleType, setMapStyleType, userProfile, onLogout, onUpdateProfile, highContrast, setHighContrast }: any) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(userProfile?.name || '');
  const [profileEmail, setProfileEmail] = useState(userProfile?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photo || '');

  const avatarOptions = [
    { id: 'avataaars', label: 'Avatar', url: (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` },
    { id: 'male', label: 'Male', url: (name: string) => `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4` },
    { id: 'female', label: 'Female', url: (name: string) => `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc` },
    { id: 'children', label: 'Children', url: (name: string) => `https://api.dicebear.com/7.x/croodles/svg?seed=${encodeURIComponent(name)}` },
    { id: 'identicon', label: 'Abstract', url: (name: string) => `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}` },
    { id: 'micah', label: 'Micah', url: (name: string) => `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(name)}` },
    { id: 'miniavs', label: 'Mini', url: (name: string) => `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(name)}` },
    { id: 'pixel-art', label: 'Pixel', url: (name: string) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}` }
  ];

  useEffect(() => {
    setProfileName(userProfile?.name || '');
    setProfileEmail(userProfile?.email || '');
    setSelectedAvatar(userProfile?.photo || '');
  }, [userProfile]);

  const handleSaveProfile = () => {
    if (profileName.trim()) {
      const photo = selectedAvatar || avatarOptions[0].url(profileName);
      onUpdateProfile(profileName, profileEmail, photo);
      setIsEditingProfile(false);
    }
  };

  const handleDeleteProfile = () => {
    if (confirm('Are you sure you want to delete your profile?')) {
      onLogout();
    }
  };

  const handleClearAllData = () => {
    if (confirm('This will clear all saved locations, recent searches, and your profile. Continue?')) {
      localStorage.removeItem('savedLocations');
      localStorage.removeItem('recentSearches');
      localStorage.removeItem('userProfile');
      onLogout();
    }
  };

  const getAvatarUrl = (avatarId: string) => {
    const avatar = avatarOptions.find(a => a.id === avatarId);
    return avatar ? avatar.url(profileName || 'user') : avatarOptions[0].url(profileName || 'user');
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Settings</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Manage your profile and preferences</p>
        </motion.div>

        {/* User Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">User Profile</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-8">Manage your personal information</p>
          </div>
          
          <div className="p-6">
            {userProfile ? (
              <>
                {isEditingProfile ? (
                  <div className="space-y-6">
                    {/* Avatar Selection */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Choose Avatar Style</label>
                      <div className="grid grid-cols-4 gap-3">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar.id}
                            onClick={() => setSelectedAvatar(avatar.url(profileName || 'user'))}
                            className={`p-2 rounded-xl border-2 transition-all ${
                              selectedAvatar === avatar.url(profileName || 'user') || 
                              (selectedAvatar === '' && avatar.id === 'avataaars')
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20'
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-emerald-300'
                            }`}
                          >
                            <img
                              src={avatar.url(profileName || 'user')}
                              alt={avatar.label}
                              className="w-full aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800"
                            />
                            <span className="block text-xs text-center mt-1 text-zinc-600 dark:text-zinc-400">{avatar.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Name Input */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => {
                          setProfileName(e.target.value);
                          // Update avatar preview with new name
                          if (!selectedAvatar || avatarOptions.some(a => selectedAvatar.includes(a.id))) {
                            const currentAvatar = avatarOptions.find(a => selectedAvatar?.includes(a.id));
                            if (currentAvatar) {
                              setSelectedAvatar(currentAvatar.url(e.target.value));
                            }
                          }
                        }}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Enter your name"
                      />
                    </div>
                    
                    {/* Email Input */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    {/* Preview */}
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
                      <img
                        src={selectedAvatar || avatarOptions[0].url(profileName || 'user')}
                        alt="Preview"
                        className="w-20 h-20 rounded-full border-2 border-emerald-500"
                      />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{profileName || 'Your Name'}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{profileEmail || 'your@email.com'}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Preview</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileName(userProfile?.name || '');
                          setProfileEmail(userProfile?.email || '');
                          setSelectedAvatar(userProfile?.photo || '');
                        }}
                        className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 bg-zinc-100 dark:bg-zinc-800">
                        {userProfile.photo ? (
                          <img src={userProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                            {userProfile.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-xl">{userProfile.name}</h3>
                        <p className="text-zinc-500 dark:text-zinc-400">{userProfile.email}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Active Profile</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={handleDeleteProfile}
                        className="px-4 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg font-medium hover:bg-rose-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Create Your Profile</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4 max-w-md mx-auto">Set up a profile to save your preferences, locations, and travel history.</p>
                <div className="flex gap-2 justify-center">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64"
                    placeholder="Enter your name"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={!profileName.trim()}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Create Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Appearance</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-8">Customize how SafeRoute looks</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Theme</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Switch between light and dark mode</p>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-16 h-8 rounded-full transition-colors ${theme === 'dark' ? 'bg-emerald-500' : 'bg-zinc-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">High Contrast Mode</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Increase contrast for better visibility</p>
              </div>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`relative w-16 h-8 rounded-full transition-colors ${highContrast ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                aria-label="Toggle high contrast mode"
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${highContrast ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Voice Navigation</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Enable spoken turn-by-turn directions</p>
              </div>
              <button
                onClick={() => {
                  const newState = !highContrast;
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    requestNotificationPermission();
                  }
                }}
                className={`relative w-16 h-8 rounded-full transition-colors bg-emerald-500`}
                aria-label="Voice navigation is enabled"
              >
                <div className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md translate-x-9" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Preferences</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-8">Set your default travel preferences</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Default Vehicle</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setVehicleType('driving')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    vehicleType === 'driving'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 mx-auto mb-2 ${vehicleType === 'driving' ? 'text-emerald-500' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h8m-4-8v12m-4 0h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <p className={`font-medium ${vehicleType === 'driving' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>Car</p>
                </button>
                <button
                  onClick={() => setVehicleType('cycling')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    vehicleType === 'cycling'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 mx-auto mb-2 ${vehicleType === 'cycling' ? 'text-emerald-500' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className={`font-medium ${vehicleType === 'cycling' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>Bicycle</p>
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Map Style</h3>
              <div className="flex gap-3">
                {[
                  { value: 'default', label: 'Default', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /> },
                  { value: 'satellite', label: 'Satellite', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                  { value: 'navigation', label: 'Navigation', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> }
                ].map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setMapStyleType(style.value)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      mapStyleType === style.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 mx-auto mb-2 ${mapStyleType === style.value ? 'text-emerald-500' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {style.icon}
                    </svg>
                    <p className={`font-medium text-sm ${mapStyleType === style.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{style.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Data Management</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-8">Manage your saved data and history</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Saved Locations</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Your bookmarked places</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                {((): number => {
                  try {
                    return JSON.parse(localStorage.getItem('savedLocations') || '[]').length;
                  } catch {
                    return 0;
                  }
                })()} saved
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Recent Searches</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Your search history</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                {((): number => {
                  try {
                    return JSON.parse(localStorage.getItem('recentSearches') || '[]').length;
                  } catch {
                    return 0;
                  }
                })()} searches
              </span>
            </div>

            <button
              onClick={handleClearAllData}
              className="w-full mt-4 px-4 py-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Data
            </button>
          </div>
        </motion.div>

        {/* Version Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <p className="text-sm text-zinc-400">SafeRoute v1.0.0</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Made-with-Ayush</p>
        </motion.div>
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            About SafeRoute
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            An intelligent traffic safety platform that combines real-time routing, weather analysis, and AI-powered risk prediction to help you travel safer.
          </p>
        </motion.div>

        {/* Problem & Solution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-16"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">The Problem</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Road accidents claim over 1.3 million lives annually. Traditional navigation apps lack real-time safety insights, leaving drivers vulnerable to changing road conditions.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">Our Solution</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              SafeRoute analyzes multiple risk factors including weather, traffic, time of day, and historical data to provide intelligent route recommendations.
            </p>
          </div>
        </motion.div>

        {/* Key Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-8 text-center">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
                title: 'Route Risk Analysis',
                desc: 'Dynamic color-coded routes showing real-time risk levels for each segment'
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
                title: 'Weather Integration',
                desc: 'Real-time weather data affecting route risk calculations automatically'
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'AI Assistant',
                desc: 'Intelligent chatbot providing contextual safety advice and recommendations'
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Route Playback',
                desc: 'Visualize your entire route with animated playback feature'
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: 'Multiple Profiles',
                desc: 'Save locations, view history, and customize preferences'
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Safety Score',
                desc: 'Overall route safety rating based on multiple risk factors'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Enter Route', desc: 'Search for your origin and destination' },
              { step: '02', title: 'Set Vehicle', desc: 'Choose driving or cycling mode' },
              { step: '03', title: 'Analyze Risk', desc: 'Our AI calculates safety scores' },
              { step: '04', title: 'Safe Travel', desc: 'Follow the safest route with live updates' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
                className="relative"
              >
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg text-center">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-4">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">{item.title}</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technology Stack */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-8 text-center">Built With</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: 'React', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16-.1-.18-.19-.36-.3-.51m6.92-.76l.65-1.12a16.2 16.2 0 00-3.18-2.21l-.98 1.67a14.2 14.2 0 013.51 1.66M12 5.73c.91.1 1.92.17 3.02.2l.44-1.82c-1.05-.05-2.08-.15-3.05-.29l-.41 1.91m5.79 2.56l1.12.73c.34.22.71.44 1.1.66-.11-.34-.23-.68-.37-1.02l-1.85-.37m-11.62-.37l-1.85.37c-.14.34-.26.68-.37 1.02.39-.22.76-.44 1.1-.66l1.12-.73M9.93 8.21c.94.13 1.97.23 3.07.29l.44-1.82a46.2 46.2 0 00-3.51-.2v1.73m8.97 3.77c.1.18.19.36.3.51.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.89 1.5v-.99m0 5.74l.88.16c.11-.29.22-.58.29-.86l-.29.51c-.11.15-.2.33-.3.51.27-.05.57-.1.88-.16-.11-.34-.23-.68-.37-1.02l-1.09-.14v1m-4.78 1.78l-.71.36c.3.16.61.3.92.43.27.11.54.22.82.31-.1-.26-.18-.54-.26-.82l-.77-.28m7.73-4.3c-.14.34-.26.68-.37 1.02.39-.22.76-.44 1.1-.66l1.12-.73-.81-1.38-.98 1.67-.06.08M12 3.07v-.99c-1.16.02-2.3.1-3.43.24l.44 1.82c1.1-.07 2.18-.17 3.21-.29l-.22-1.78M7.64 6.31c.27.05.57.1.88.16.1-.18.19-.36.3-.51l-.89-1.5-.29.86v.99m.29 6.18l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16-.1-.18-.19-.36-.3-.51m6.92-.76l.65-1.12a16.2 16.2 0 00-3.18-2.21l-.98 1.67a14.2 14.2 0 013.51 1.66M12 5.73c.91.1 1.92.17 3.02.2l.44-1.82c-1.05-.05-2.08-.15-3.05-.29l-.41 1.91m5.79 2.56l1.12.73c.34.22.71.44 1.1.66-.11-.34-.23-.68-.37-1.02l-1.85-.37m-11.62-.37l-1.85.37c-.14.34-.26.68-.37 1.02.39-.22.76-.44 1.1-.66l1.12-.73M9.93 8.21c.94.13 1.97.23 3.07.29l.44-1.82a46.2 46.2 0 00-3.51-.2v1.73m8.97 3.77c.1.18.19.36.3.51.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.89 1.5v-.99m0 5.74l.88.16c.11-.29.22-.58.29-.86l-.29.51c-.11.15-.2.33-.3.51.27-.05.57-.1.88-.16-.11-.34-.23-.68-.37-1.02l-1.09-.14v1m-4.78 1.78l-.71.36c.3.16.61.3.92.43.27.11.54.22.82.31-.1-.26-.18-.54-.26-.82l-.77-.28m7.73-4.3c-.14.34-.26.68-.37 1.02.39-.22.76-.44 1.1-.66l1.12-.73-.81-1.38-.98 1.67-.06.08M12 3.07v-.99c-1.16.02-2.3.1-3.43.24l.44 1.82c1.1-.07 2.18-.17 3.21-.29l-.22-1.78M7.64 6.31c.27.05.57.1.88.16.1-.18.19-.36.3-.51l-.89-1.5-.29.86v.99Z"/></svg> },
              { name: 'Leaflet', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
              { name: 'OpenStreetMap', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg> },
              { name: 'Express', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
              { name: 'Machine Learning', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2zm7 3a1 1 0 011 1v1a1 1 0 01-1 1 1 1 0 01-1-1V6a1 1 0 011-1zM5 6a1 1 0 011 1v1a1 1 0 01-1 1 1 1 0 01-1-1V7a1 1 0 011-1zM12 18a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2v-1a2 2 0 012-2zm7 3a1 1 0 011 1v1a1 1 0 01-1 1 1 1 0 01-1-1v-1a1 1 0 011-1zM5 19a1 1 0 011 1v1a1 1 0 01-1 1 1 1 0 01-1-1v-1a1 1 0 011-1z"/><path d="M7 12h10M7 8h10M7 16h10"/></svg> },
              { name: 'Generative AI', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
              { name: 'Data Analytics', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
              { name: 'Predictive Modeling', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-3-3"/></svg> },
              { name: 'Real-Time Data', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/></svg> }
            ].map((tech) => (
              <span key={tech.name} className="px-5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-2">
                {tech.icon}
                {tech.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Closing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Made-with-Ayush</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            SafeRoute is designed to help you make informed decisions about your travel routes. Always drive safely and follow local traffic regulations.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function App() {
  const [routeData, setRouteData] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [riskData, setRiskData] = useState(null);
  const [previousRouteData, setPreviousRouteData] = useState(null);
  const [previousRiskData, setPreviousRiskData] = useState(null);
  const [incidentsData, setIncidentsData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [startLoc, setStartLoc] = useState<[number, number] | null>(null);
  const [endLoc, setEndLoc] = useState<[number, number] | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [showRoutePlayback, setShowRoutePlayback] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [vehicleType, setVehicleType] = useState<'driving' | 'cycling'>(() => {
    try {
      const saved = localStorage.getItem('vehicleType');
      return (saved === 'driving' || saved === 'cycling') ? saved : 'driving';
    } catch {
      return 'driving';
    }
  });
  const [showIncidents, setShowIncidents] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [mapStyleType, setMapStyleType] = useState(() => {
    try {
      return localStorage.getItem('mapStyleType') || 'default';
    } catch {
      return 'default';
    }
  });
  const [showHeader, setShowHeader] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('userProfile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('onboardingComplete');
    } catch {
      return true;
    }
  });
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [incidentReportLoc, setIncidentReportLoc] = useState<[number, number] | null>(null);
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(false);
  const [highContrast, setHighContrast] = useState(() => {
    try {
      return localStorage.getItem('highContrast') === 'true';
    } catch {
      return false;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('authToken');
  });

  const handleLogin = (profile: { id: string; name: string; email: string; photo?: string }, _token: string) => {
    const user = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      photo: profile.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name)}`
    };
    setUserProfile(user);
    setIsLoggedIn(true);
    localStorage.setItem('userProfile', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUserProfile(null);
    setIsLoggedIn(false);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('authToken');
  };

  const handleUpdateProfile = (name: string, email: string, photo: string) => {
    const user = {
      name,
      email,
      photo
    };
    setUserProfile(user);
    localStorage.setItem('userProfile', JSON.stringify(user));
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('vehicleType', vehicleType);
  }, [vehicleType]);

  useEffect(() => {
    localStorage.setItem('mapStyleType', mapStyleType);
  }, [mapStyleType]);

  useEffect(() => {
    localStorage.setItem('highContrast', String(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingComplete', 'true');
    requestNotificationPermission();
  };

  useKeyboardShortcuts([
    { key: 'h', ctrl: true, handler: () => setHighContrast(prev => !prev), description: 'Toggle high contrast' },
    { key: 'o', ctrl: true, handler: () => setShowOnboarding(true), description: 'Show onboarding' },
    { key: 't', ctrl: true, handler: () => setShowTripHistory(true), description: 'Trip history' },
  ]);

  return (
    <Router>
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <div className="relative w-full h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex transition-colors duration-300">
          <ThinSidebar 
            userProfile={userProfile} 
            onLogout={handleLogout} 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onSelectLocation={(loc, name) => {
              setEndLoc(loc);
              setEndQuery(name);
            }}
            currentEndLoc={endLoc}
            currentEndQuery={endQuery}
          />
        <div className="flex-1 relative flex flex-col h-full">
          <Routes>
            <Route path="/" element={
              <MapTab 
                isSidebarOpen={isSidebarOpen}
                routeData={routeData} setRouteData={setRouteData}
                alternativeRoutes={alternativeRoutes} setAlternativeRoutes={setAlternativeRoutes}
                riskData={riskData} setRiskData={setRiskData}
                previousRouteData={previousRouteData} setPreviousRouteData={setPreviousRouteData}
                previousRiskData={previousRiskData} setPreviousRiskData={setPreviousRiskData}
                incidentsData={incidentsData} setIncidentsData={setIncidentsData}
                weather={weather} setWeather={setWeather}
                startLoc={startLoc} setStartLoc={setStartLoc}
                endLoc={endLoc} setEndLoc={setEndLoc}
                startQuery={startQuery} setStartQuery={setStartQuery}
                endQuery={endQuery} setEndQuery={setEndQuery}
                theme={theme} setTheme={setTheme}
                vehicleType={vehicleType} setVehicleType={setVehicleType}
                showIncidents={showIncidents} setShowIncidents={setShowIncidents}
                showRoutePlayback={showRoutePlayback} setShowRoutePlayback={setShowRoutePlayback}
                playbackSpeed={playbackSpeed} setPlaybackSpeed={setPlaybackSpeed}
                mapStyleType={mapStyleType} setMapStyleType={setMapStyleType}
                activeLayers={activeLayers} setActiveLayers={setActiveLayers}
                waypoints={[]}
                voiceNavEnabled={voiceNavEnabled}
                onOpenIncidentReport={(loc: [number, number]) => setIncidentReportLoc(loc)}
                onOpenTripHistory={() => setShowTripHistory(true)}
                onToggleVoiceNav={(enabled: boolean) => setVoiceNavEnabled(enabled)}
              />
            } />
            <Route path="/settings" element={
              <SettingsTab 
                theme={theme} setTheme={setTheme}
                vehicleType={vehicleType} setVehicleType={setVehicleType}
                mapStyleType={mapStyleType} setMapStyleType={setMapStyleType}
                userProfile={userProfile} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile}
                highContrast={highContrast} setHighContrast={setHighContrast}
              />
            } />
            <Route path="/about" element={<AboutTab />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>

        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
        {showTripHistory && <TripHistory onClose={() => setShowTripHistory(false)} />}
        {incidentReportLoc && (
          <IncidentReportModal
            location={incidentReportLoc}
            onClose={() => setIncidentReportLoc(null)}
            onSubmit={(report) => {
              console.log('Incident reported:', report);
              setIncidentReportLoc(null);
            }}
          />
        )}
      </div>
      )}
    </Router>
  );
}
