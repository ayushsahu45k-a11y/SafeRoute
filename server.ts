import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const GEMINI_API_KEY = 'AIzaSyDnT-o1Lxw_NcEFA5f2yxI5qnrjEPWzHRQ';

async function generateGeminiResponse(prompt: string, context: string): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await axios.post(
      url,
      {
        contents: [{
          parts: [{
            text: `You are a helpful SafeRoute assistant. Keep responses short and friendly. ${context}\n\nUser: ${prompt}\n\nResponse:`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      }
    );
    
    if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }
    if (response.data.promptFeedback?.blockReason) {
      console.error('Content blocked:', response.data.promptFeedback.blockReason);
    }
    return '';
  } catch (error: any) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    return '';
  }
}

const FALLBACK_GEOCODE_DATA: Record<string, any[]> = {
  'bhopal': [
    { place_name: 'Bhopal, Madhya Pradesh, India', center: [77.4126, 23.2599] },
    { place_name: 'Bhopal Junction Railway Station', center: [77.4349, 23.2326] },
  ],
  'delhi': [
    { place_name: 'New Delhi, Delhi, India', center: [77.2090, 28.6139] },
    { place_name: 'Connaught Place, New Delhi', center: [77.2167, 28.6315] },
  ],
  'mumbai': [
    { place_name: 'Mumbai, Maharashtra, India', center: [72.8777, 19.0760] },
    { place_name: 'Bandra, Mumbai', center: [72.8403, 19.0596] },
  ],
  'bangalore': [
    { place_name: 'Bangalore, Karnataka, India', center: [77.5946, 12.9716] },
    { place_name: 'MG Road, Bangalore', center: [77.6088, 12.9753] },
  ],
};

function geocodeFallback(query: string) {
  const lower = query.toLowerCase();
  const results: any[] = [];
  
  const cities: Record<string, [number, number]> = {
    'new delhi': [77.2090, 28.6139], 'delhi': [77.2090, 28.6139],
    'mumbai': [72.8777, 19.0760], 'bombay': [72.8777, 19.0760],
    'bangalore': [77.5946, 12.9716], 'bengaluru': [77.5946, 12.9716],
    'chennai': [80.2707, 13.0827],
    'kolkata': [88.3639, 22.5726], 'calcutta': [88.3639, 22.5726],
    'hyderabad': [78.4867, 17.3850],
    'pune': [73.8567, 18.5204],
    'ahmedabad': [72.5714, 23.0225],
    'jaipur': [75.7873, 26.9124],
    'lucknow': [80.9462, 26.8467],
    'indore': [75.7873, 22.7196],
    'bhopal': [77.4126, 23.2599],
    'patna': [85.3131, 25.5941],
    'kochi': [76.3061, 9.9312],
    'goa': [74.1240, 15.2993],
    'chandigarh': [76.7794, 30.7333],
    'raipur': [81.6290, 21.2514],
    'jabalpur': [79.9550, 23.1815],
    'nagpur': [79.0882, 21.1458],
    'kanpur': [80.3199, 26.4499],
    'vadodara': [73.1812, 22.3106],
    'ranchi': [85.3096, 23.3441],
    'dehradun': [78.0438, 30.3165],
    'rajasthan': [75.7873, 26.9124],
    'madhya pradesh': [77.4126, 23.2599],
    'maharashtra': [72.8777, 19.0760],
    'karnataka': [77.5946, 12.9716],
    'tamil nadu': [80.2707, 13.0827],
    'gujarat': [72.5714, 23.0225],
    'india': [78.9629, 20.5937],
  };

  for (const [city, coords] of Object.entries(cities)) {
    if (city.includes(lower) || lower.includes(city) || lower.includes(city.split(' ')[0])) {
      results.push({
        place_id: results.length + 1,
        display_name: `${city.charAt(0).toUpperCase() + city.slice(1)}, India`,
        lon: coords[0],
        lat: coords[1]
      });
      if (results.length >= 5) break;
    }
  }

  return results;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API Endpoints ---

  // 0. Geocoding API (with POI support)
  app.get('/api/geocode', async (req, res) => {
    try {
      const { q, lat, lon } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      // POI keywords that need location context
      const poiKeywords = ['atm', 'hospital', 'petrol', 'parking', 'police', 'restaurant', 'hotel', 'school', 'bank'];
      const isPOI = poiKeywords.some(kw => q.toLowerCase().includes(kw));

      // Try Nominatim first with location context for POIs
      try {
        let params: any = { q, format: 'json', limit: 8, addressdetails: 1 };
        
        if (isPOI && lat && lon) {
          // Add location context for POI searches
          params.viewbox = `${Number(lon) - 0.5},${Number(lat) - 0.5},${Number(lon) + 0.5},${Number(lat) + 0.5}`;
          params.bounded = 1;
        }
        
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params,
          headers: { 'User-Agent': 'SafeRoute-Server/1.0' },
          timeout: 8000
        });
        if (response.data && response.data.length > 0) {
          return res.json(response.data);
        }
      } catch (nomError) {
        console.error('Nominatim error:', nomError);
      }

      // Fallback to local database
      const fallbackResults = geocodeFallback(q);
      return res.json(fallbackResults);
    } catch (error: any) {
      console.error('Geocode Error:', error.message);
      const fallbackResults = geocodeFallback(String(req.query.q || ''));
      res.json(fallbackResults);
    }
  });

  // 1. Weather API
  app.get('/api/weather', async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } });
      }
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
      res.json(response.data);
    } catch (error: any) {
      console.error('Weather API Error:', error.response?.data || error.message);
      res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } });
    }
  });

  // 2. Predict API
  app.post('/api/predict', (req, res) => {
    const { weather_condition, time_of_day, traffic_level } = req.body;
    let risk = 0.15;

    // Weather factor
    if (weather_condition === 'Rain' || weather_condition === 'Drizzle') risk += 0.15;
    else if (weather_condition === 'Snow') risk += 0.25;
    else if (weather_condition === 'Thunderstorm') risk += 0.3;
    else if (weather_condition === 'Fog' || weather_condition === 'Mist') risk += 0.2;

    // Time of day factor
    if (time_of_day >= 22 || time_of_day <= 4) risk += 0.1;
    else if ((time_of_day >= 7 && time_of_day <= 9) || (time_of_day >= 16 && time_of_day <= 18)) risk += 0.08;

    // Traffic level factor
    risk += traffic_level * 0.15;

    risk = Math.min(Math.max(risk, 0.1), 0.95);

    res.json({ risk_probability: risk });
  });

  // 3. AI Chat API
  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      const response = await generateGeminiResponse(message, context || '');
      if (response) {
        res.json({ response });
      } else {
        res.json({ response: null, fallback: true });
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error.response?.data || error.message);
      res.json({ response: null, fallback: true });
    }
  });

  // 4. Route Analysis API
  app.post('/api/route-analysis', (req, res) => {
    const { coordinates, weather_condition, time_of_day, vehicle_type } = req.body;
    
    function pseudoRandom(seed: number) {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    const segments = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const seed = coordinates[i][0] * 1000 + coordinates[i][1];
      const baseTraffic = pseudoRandom(seed);
      const traffic_level = Math.max(0, Math.min(1, baseTraffic + (pseudoRandom(seed + 1) * 0.1 - 0.05)));
      
      let risk = 0.2;
      let explanation: string[] = [];
      let routeType = 'street';
      let riskLevel = 'low';
      
      // Determine route type based on traffic patterns
      const highwayChance = pseudoRandom(seed + 5);
      const smallRoadChance = pseudoRandom(seed + 6);
      
      if (traffic_level > 0.75 && highwayChance > 0.6) {
        routeType = 'highway';
        risk += 0.2;
        riskLevel = 'high';
        explanation.push('Highway route');
      } else if (traffic_level < 0.35 && smallRoadChance > 0.5) {
        routeType = 'small_road';
        risk += 0.1;
        riskLevel = 'moderate';
        explanation.push('Local/small road');
      } else {
        routeType = 'street';
        riskLevel = 'low';
        explanation.push('City streets');
      }
      
      // Weather impact
      if (weather_condition === 'Rain' || weather_condition === 'Drizzle') { 
        risk += 0.15; 
        explanation.push('Rain');
        if (routeType === 'highway') risk += 0.1;
      }
      else if (weather_condition === 'Snow') { 
        risk += 0.3; 
        explanation.push('Snow');
        if (routeType === 'highway') risk += 0.15;
      }
      else if (weather_condition === 'Thunderstorm') { 
        risk += 0.35; 
        explanation.push('Thunderstorm');
      }
      else if (weather_condition === 'Fog' || weather_condition === 'Mist') { 
        risk += 0.2; 
        explanation.push('Fog');
      }

      // Time of day
      if (time_of_day >= 22 || time_of_day <= 4) { 
        risk += 0.1; 
        explanation.push('Night');
      }
      else if ((time_of_day >= 7 && time_of_day <= 9) || (time_of_day >= 16 && time_of_day <= 18)) { 
        risk += 0.05; 
        explanation.push('Rush hour');
      }

      // Vehicle specific
      if (vehicle_type === 'cycling') {
        risk += 0.1;
        explanation.push('Cycling');
      }

      // Traffic impact
      risk += traffic_level * 0.1;
      if (traffic_level > 0.8) {
        explanation.push('Heavy traffic');
        if (routeType === 'highway') risk += 0.1;
      }
      
      // Accident hotspots
      const accidentChance = pseudoRandom(seed + 2);
      if (accidentChance > 0.9) {
        if (routeType === 'highway') {
          risk += 0.25;
          riskLevel = 'high';
          explanation.push('High accident zone');
        } else if (routeType === 'small_road') {
          risk += 0.12;
          riskLevel = 'moderate';
          explanation.push('Accident history');
        } else {
          risk += 0.08;
        }
      }

      // Update risk level based on final risk
      if (risk >= 0.6) riskLevel = 'high';
      else if (risk >= 0.35) riskLevel = 'moderate';
      else riskLevel = 'low';

      risk = Math.min(Math.max(risk, 0.1), 0.95);

      segments.push({
        start: coordinates[i],
        end: coordinates[i+1],
        risk_probability: risk,
        traffic_level,
        explanation: explanation.slice(0, 3).join(', '),
        routeType,
        riskLevel
      });
    }

    // Calculate overall route risk
    const avgRisk = segments.reduce((sum, seg) => sum + seg.risk_probability, 0) / segments.length;
    
    // Determine overall risk level for the route
    const highwayCount = segments.filter(s => s.routeType === 'highway').length;
    const smallRoadCount = segments.filter(s => s.routeType === 'small_road').length;
    const highRiskCount = segments.filter(s => s.riskLevel === 'high').length;
    
    let overallRiskLevel = 'low';
    let overallRiskMessage = 'This route is safe and suitable for travel.';
    
    if (avgRisk >= 0.6 || highRiskCount > segments.length * 0.3) {
      overallRiskLevel = 'high';
      overallRiskMessage = 'This route has high risk. Proceed with caution.';
    } else if (avgRisk >= 0.35 || smallRoadCount > segments.length * 0.4) {
      overallRiskLevel = 'moderate';
      overallRiskMessage = 'This route has moderate risk. Stay alert while traveling.';
    }

    // Generate incidents based on route characteristics
    const incidents = [];
    const routeSeed = Math.abs(coordinates[0][0] + coordinates[coordinates.length - 1][1]);
    const incidentChance = pseudoRandom(routeSeed);
    
    if (incidentChance > 0.85 && coordinates.length > 10) {
      const numIncidents = overallRiskLevel === 'high' ? 3 : (overallRiskLevel === 'moderate' ? 2 : 1);
      for(let i = 0; i < numIncidents; i++) {
        const idx = Math.floor(pseudoRandom(routeSeed + i + 1) * (coordinates.length - 1));
        const isAccident = pseudoRandom(routeSeed + i + 2) > 0.6;
        incidents.push({
          location: coordinates[idx],
          type: isAccident ? 'Accident' : 'Roadwork',
          severity: overallRiskLevel === 'high' ? 'High' : (overallRiskLevel === 'moderate' ? 'Medium' : 'Low')
        });
      }
    }

    res.json({ 
      segments, 
      incidents,
      overallRisk: avgRisk,
      riskLevel: overallRiskLevel,
      riskMessage: overallRiskMessage,
      routeStats: {
        highwaySegments: highwayCount,
        smallRoadSegments: smallRoadCount,
        totalSegments: segments.length
      }
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
