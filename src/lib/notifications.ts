export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options
  });

  setTimeout(() => notification.close(), 5000);

  return notification;
}

export function showWeatherAlert(weather: string, temp: number): void {
  const badWeather = ['Rain', 'Drizzle', 'Snow', 'Thunderstorm', 'Fog', 'Mist'];
  if (!badWeather.includes(weather)) return;

  showNotification('Weather Alert', {
    body: `${weather} detected! Temperature: ${Math.round(temp - 273.15)}°C. Drive safely!`,
    tag: 'weather-alert',
    requireInteraction: false
  });
}

export function showRouteAlert(distance: string, duration: string, safetyScore: number): void {
  const emoji = safetyScore >= 70 ? '✅' : safetyScore >= 40 ? '⚠️' : '🚨';
  showNotification('Route Ready', {
    body: `${emoji} ${distance} • ${duration} • Safety: ${safetyScore}%`,
    tag: 'route-ready'
  });
}

export function showIncidentAlert(incidentType: string, severity: string): void {
  showNotification('Incident Nearby', {
    body: `${incidentType} reported - ${severity} severity. Please drive carefully.`,
    tag: 'incident-alert',
    requireInteraction: true
  });
}
