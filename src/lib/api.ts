import { getCached, setCache, generateRouteCacheKey, generateGeocodeCacheKey } from './routeCache';

export async function geocode(query: string) {
  const cacheKey = generateGeocodeCacheKey(query);
  const cached = getCached<any[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    // Use server proxy for geocoding (bypasses CORS)
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const results = data.map((item: any) => ({
          id: item.place_id || Math.random(),
          place_name: item.display_name || item.place_name,
          center: [parseFloat(item.lon || item.center?.[0] || 0), parseFloat(item.lat || item.center?.[1] || 0)]
        }));
        setCache(cacheKey, results);
        return results;
      }
    }
  } catch (error) {
    console.error('Geocode error:', error);
  }

  return [];
}

export async function getRoute(start: [number, number], end: [number, number], profile: string = 'driving') {
  const cacheKey = generateRouteCacheKey(start, end, profile);
  const cached = getCached<any[]>(cacheKey);
  if (cached && cached.length > 0) return cached;
  
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=true&alternatives=true`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const routes = data.routes;
        if (profile === 'cycling' || profile === 'walking') {
          const speedMs = profile === 'cycling' ? 4.16 : 1.38;
          routes.forEach((route: any) => {
            route.duration = route.distance / speedMs;
          });
        }
        setCache(cacheKey, routes);
        return routes;
      }
    }
  } catch (error) {
    console.error('Route error:', error);
  }
  
  return generateMockRoute(start, end);
}

function generateMockRoute(start: [number, number], end: [number, number]) {
  const distance = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
  ) * 111;
  
  const coords: [number, number][] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coords.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t
    ]);
  }

  return [{
    geometry: { coordinates: coords },
    distance: distance * 1000,
    duration: (distance / 40) * 3600,
    legs: [{
      steps: [
        { maneuver: { type: 'depart', instruction: 'Start from your location' }, distance: 500 },
        { maneuver: { type: 'continue', instruction: 'Continue straight' }, distance: distance * 400 },
        { maneuver: { type: 'arrive', instruction: 'Arrive at your destination' }, distance: 500 }
      ]
    }]
  }];
}

export async function getWeather(lat: number, lon: number) {
  try {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (response.ok) {
      return await response.json();
    }
  } catch {}
  return { weather: [{ main: 'Clear' }], main: { temp: 298 } };
}

export async function analyzeRoute(coordinates: [number, number][], weatherCondition: string, timeOfDay: number, vehicleType: string = 'driving') {
  try {
    const response = await fetch('/api/route-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, weather_condition: weatherCondition, time_of_day: timeOfDay, vehicle_type: vehicleType })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {}

  const segments = [];
  const segmentSize = Math.max(1, Math.floor(coordinates.length / 10));
  for (let i = 0; i < coordinates.length - 1; i += segmentSize) {
    const endIdx = Math.min(i + segmentSize, coordinates.length - 1);
    const baseRisk = 0.15 + Math.random() * 0.25;
    const weatherMultiplier = weatherCondition === 'Clear' ? 1 : weatherCondition === 'Rain' ? 1.4 : 1.2;
    const nightMultiplier = (timeOfDay >= 22 || timeOfDay <= 5) ? 1.25 : 1;
    segments.push({
      start: coordinates[i],
      end: coordinates[endIdx],
      risk_probability: Math.min(0.85, baseRisk * weatherMultiplier * nightMultiplier),
      traffic_level: 0.25 + Math.random() * 0.4
    });
  }
  return {
    segments,
    incidents: [],
    overallRisk: segments.length > 0 ? segments.reduce((a, b) => a + (b.risk_probability || 0), 0) / segments.length : 0.25
  };
}
