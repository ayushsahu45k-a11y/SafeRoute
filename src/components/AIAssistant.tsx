import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, MapPin, Navigation, Zap, CloudRain, Shield, Car, Navigation2 } from 'lucide-react';

const GREETINGS = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon', 'howdy', 'hi there'];
const THANKS = ['thank', 'thanks', 'thx', 'appreciate'];
const GOODBYE = ['bye', 'goodbye', 'see you', 'later', 'goodnight'];

async function queryGeminiAI(message: string, context: string): Promise<string | null> {
  try {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.response) {
        return data.response;
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error);
  }
  return null;
}

function generateLocalResponse(userMsg: string, routeData: any, riskData: any, weather: any, incidentsData: any): string {
  const lower = userMsg.toLowerCase();
  const hour = new Date().getHours();
  const timeDesc = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : hour >= 17 && hour < 21 ? 'Evening' : 'Night';
  const isNight = hour >= 22 || hour <= 5;

  const avgRisk = riskData?.length > 0 
    ? Math.round((riskData.reduce((a: number, b: any) => a + (b.risk_probability || 0), 0) / riskData.length) * 100)
    : null;
  const safetyScore = avgRisk !== null ? 100 - avgRisk : null;

  if (GREETINGS.some(g => lower.includes(g))) {
    return `Good ${timeDesc}! 👋 Welcome to SafeRoute!\n\nI can help you with:\n• 🗺️ Route planning\n• 🛡️ Safety information\n• 🌤️ Weather updates\n• 📍 Finding places\n• 🚗 Driving tips\n\nWhat would you like to know?`;
  }

  if (THANKS.some(t => lower.includes(t))) {
    return "You're welcome! 😊 Drive safe!";
  }

  if (GOODBYE.some(g => lower.includes(g))) {
    return "Goodbye! 👋 Have a safe journey!";
  }

  if (lower.includes('safe') || lower.includes('risk') || lower.includes('danger')) {
    if (safetyScore !== null) {
      const level = safetyScore >= 70 ? 'Low Risk ✅' : safetyScore >= 40 ? 'Moderate Risk ⚠️' : 'High Risk 🚨';
      let tips = '';
      if (safetyScore < 50) {
        tips = '\n\nTips:\n• Reduce speed\n• Increase following distance\n• Stay alert';
      }
      return `🛡️ **Route Safety: ${safetyScore}%**\nRisk Level: ${level}${tips}`;
    }
    return `🛡️ No route calculated yet.\n\nEnter a start and destination, then I can analyze your route's safety.`;
  }

  if (lower.includes('weather') || lower.includes('rain') || lower.includes('temperature') || lower.includes('sunny')) {
    const weatherDesc = weather?.weather?.[0]?.main || 'Clear';
    const temp = weather?.main?.temp ? Math.round(weather.main.temp - 273.15) : 25;
    let advice = '';
    if (weatherDesc.includes('Rain')) {
      advice = '\n\n🌧️ Drive slowly, use headlights, maintain distance.';
    } else if (weatherDesc.includes('Clear')) {
      advice = '\n\n☀️ Good conditions. Drive safely!';
    } else if (weatherDesc.includes('Fog')) {
      advice = '\n\n🌫️ Use low beams, reduce speed.';
    }
    return `🌤️ **Current Weather: ${weatherDesc}**\nTemperature: ${temp}°C\n\n${timeDesc} time - ${isNight ? 'Drive carefully in the dark' : 'Have good visibility'}${advice}`;
  }

  if (lower.includes('traffic') || lower.includes('congestion') || lower.includes('jam')) {
    const traffic = riskData?.length > 0
      ? Math.round((riskData.reduce((a: number, b: any) => a + (b.traffic_level || 0), 0) / riskData.length) * 100)
      : null;
    if (traffic !== null) {
      const level = traffic >= 70 ? 'Heavy 🚦' : traffic >= 40 ? 'Moderate ⚡' : 'Light ✅';
      return `🚗 **Traffic: ${level}**\nCongestion: ${traffic}%`;
    }
    return '📍 Calculate a route to see traffic information.';
  }

  if (lower.includes('hospital') || lower.includes('doctor') || lower.includes('medical') || lower.includes('clinic')) {
    return '🏥 To find hospitals:\n1. I can search nearby places\n2. Click a result to get directions\n\nTry asking "Find nearby hospitals"';
  }

  if (lower.includes('gas') || lower.includes('petrol') || lower.includes('fuel') || lower.includes('station')) {
    return '⛽ For gas stations:\nCheck the map for nearby fuel stations, or I can help find them if you have a route.';
  }

  if (lower.includes('tip') || lower.includes('advice') || lower.includes('help')) {
    return `💡 **Quick Help:**\n\n• Type a place name to search\n• Click "Calculate Route"\n• Use Voice Navigation (🔊) for audio directions\n• Check weather before traveling\n\nAsk me anything!`;
  }

  if (lower.includes('night') || lower.includes('dark')) {
    if (isNight) {
      return '🌙 **Night Driving Tips:**\n• Use low beams\n• Reduce speed 10-15%\n• Increase following distance\n• Take breaks every 2 hours';
    }
    return `It's currently ${timeDesc}. 🌤️\n\nNight driving tips are available after dark.`;
  }

  if (lower.includes('accident') || lower.includes('incident') || lower.includes('roadblock')) {
    const count = incidentsData?.length || 0;
    if (count > 0) {
      return `⚠️ **${count} incident(s) on your route**\n\nDrive carefully and follow posted warnings.`;
    }
    return '✅ **No incidents detected**\n\nAlways stay alert while driving!';
  }

  if (lower.includes('route') || lower.includes('direction') || lower.includes('navigate')) {
    if (routeData) {
      const dist = (routeData.distance / 1000).toFixed(1);
      const time = Math.round(routeData.duration / 60);
      return `🗺️ **Route Info:**\nDistance: ${dist} km\nTime: ${time} min${safetyScore !== null ? `\nSafety: ${safetyScore}%` : ''}`;
    }
    return '📍 Enter start and destination to calculate a route.';
  }

  if (lower.includes('who') || lower.includes('about') || lower.includes('safe')) {
    return '🤖 **SafeRoute**\n\nAn intelligent traffic safety platform with:\n• Real-time routing\n• Safety analysis\n• Weather updates\n• AI assistance\n\nYour safety is our priority!';
  }

  return `I'm here to help! 😊\n\nTry asking:\n• "Is my route safe?"\n• "What's the weather?"\n• "Traffic conditions"\n• "Driving tips"`;
}

function getRouteContextInfo(routeData: any, riskData: any, weather: any) {
  const avgRisk = riskData && riskData.length > 0 
    ? Math.round((riskData.reduce((a: number, b: any) => a + (b.risk_probability || 0), 0) / riskData.length) * 100)
    : null;
  const avgTraffic = riskData && riskData.length > 0
    ? Math.round((riskData.reduce((a: number, b: any) => a + (b.traffic_level || 0), 0) / riskData.length) * 100)
    : null;
  const weatherDesc = weather ? `${weather.weather?.[0]?.main || 'Clear'}, ${Math.round((weather.main?.temp || 298) - 273.15)}°C` : 'Clear';
  const distDesc = routeData ? `${(routeData.distance / 1000).toFixed(1)} km` : 'Not set';
  const timeDesc = routeData ? `${Math.round(routeData.duration / 60)} mins` : 'Not set';
  return { avgRisk, avgTraffic, weatherDesc, distDesc, timeDesc };
}

export default function AIAssistant({ routeData, riskData, incidentsData, weather }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, places?: any[], suggestions?: string[] }[]>([
    { role: 'ai', text: 'Hello! I\'m your SafeRoute assistant. I can help you with:\n\n🗺️ Route planning & safety\n🌤️ Weather conditions\n📍 Finding nearby places\n⚠️ Traffic incidents\n🚗 Vehicle tips\n\nWhat would you like to know?', suggestions: ['Plan a safe route', 'Weather forecast', 'Find nearby hospitals', 'Traffic updates'] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findNearbyPlaces = async (query: string, lat: number, lon: number) => {
    try {
      const searchQueries: Record<string, string> = {
        hospital: 'hospital',
        doctors: 'doctors|clinic|medical centre',
        pharmacy: 'pharmacy',
        'gas station': 'fuel',
        petrol: 'fuel',
        restaurant: 'restaurant|cafe|food',
        parking: 'parking',
        hotel: 'hotel',
        atm: 'atm',
        police: 'police',
        school: 'school',
        mall: 'mall|supermarket|shopping',
        bank: 'bank',
        clinic: 'clinic|doctors',
        cinema: 'cinema|movie',
        gym: 'gym|fitness',
        park: 'park|playground',
        church: 'church|temple|mosque',
      };

      const lowerQuery = query.toLowerCase();
      let searchTerm = 'amenity=hospital';
      
      for (const [key, value] of Object.entries(searchQueries)) {
        if (lowerQuery.includes(key)) {
          searchTerm = `amenity=${value}`;
          break;
        }
      }

      const radius = 5000;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/nearby?format=json&limit=8&lat=${lat}&lon=${lon}&radius=${radius}&${searchTerm}`,
        { headers: { 'User-Agent': 'SafeRoute App' } }
      );
      const data = await response.json();
      
      if (!data || data.length === 0) {
        const searchResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lowerQuery)}&format=json&limit=5&lat=${lat}&lon=${lon}&addressdetails=1&bounded=1`,
          { headers: { 'User-Agent': 'SafeRoute App' } }
        );
        const searchData = await searchResponse.json();
        return searchData.map((place: any) => ({
          name: place.display_name.split(',')[0],
          address: place.display_name,
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
          type: place.type,
          distance: calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon))
        })).sort((a: any, b: any) => a.distance - b.distance);
      }

      return data.map((place: any) => ({
        name: place.display_name?.split(',')[0] || place.name || 'Unknown Place',
        address: place.display_name || place.name || '',
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type,
        distance: place.dist || 0
      })).sort((a: any, b: any) => a.distance - b.distance).slice(0, 6);
    } catch (error) {
      console.error('Error finding places:', error);
      return [];
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getContextInfo = () => {
    const avgRisk = riskData ? Math.round((riskData.reduce((a: any, b: any) => a + (b.risk_probability || b.risk_score || 0), 0) / riskData.length) * 100) : null;
    const avgTraffic = riskData ? Math.round((riskData.reduce((a: any, b: any) => a + (b.traffic_level || 0), 0) / riskData.length) * 100) : null;
    const weatherDesc = weather ? `${weather.weather?.[0]?.main}, ${Math.round((weather.main?.temp || 298) - 273.15)}°C` : 'Clear';
    const distDesc = routeData ? `${(routeData.distance / 1000).toFixed(1)} km` : 'Not set';
    const timeDesc = routeData ? `${Math.round(routeData.duration / 60)} mins` : 'Not set';
    const isNight = new Date().getHours() >= 22 || new Date().getHours() <= 5;
    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : hour >= 17 && hour < 21 ? 'Evening' : 'Night';
    
    return { avgRisk, avgTraffic, weatherDesc, distDesc, timeDesc, isNight, timeOfDay };
  };

  const generateResponse = (userMsg: string) => {
    const lowerMsg = userMsg.toLowerCase();
    const ctx = getContextInfo();
    const shouldSearchNearby = lowerMsg.includes('find') || lowerMsg.includes('nearby') || 
      lowerMsg.includes('where is') || lowerMsg.includes('search') || lowerMsg.includes('look for') ||
      lowerMsg.includes('hospital') || lowerMsg.includes('pharmacy') || 
      lowerMsg.includes('restaurant') || lowerMsg.includes('gas') || lowerMsg.includes('food') ||
      lowerMsg.includes('parking') || lowerMsg.includes('atm') ||
      lowerMsg.includes('police') || lowerMsg.includes('hotel') || lowerMsg.includes('bank') ||
      lowerMsg.includes('clinic') || lowerMsg.includes('mall') || lowerMsg.includes('cinema') ||
      lowerMsg.includes('gym') || lowerMsg.includes('park') || lowerMsg.includes('church') ||
      lowerMsg.includes('temple') || lowerMsg.includes('school') || lowerMsg.includes('shopping');

    if (GREETINGS.some(g => lowerMsg.includes(g))) {
      return {
        text: `Good ${ctx.timeOfDay}! 👋 How can I help you today?\n\nI can assist with route planning, weather updates, finding nearby places, and safety information. Just let me know what you need!`,
        shouldSearch: false
      };
    }

    if (THANKS.some(t => lowerMsg.includes(t))) {
      return {
        text: "You're welcome! 😊 Is there anything else I can help you with? Feel free to ask about routes, weather, or nearby places!",
        shouldSearch: false
      };
    }

    if (GOODBYE.some(g => lowerMsg.includes(g))) {
      return {
        text: "Goodbye! 👋 Drive safe and have a great day! If you need help again, just open the chat.",
        shouldSearch: false
      };
    }

    if (shouldSearchNearby) {
      return {
        text: "Let me search for those places near you...",
        shouldSearch: true
      };
    }

    if (lowerMsg.includes('safe') || lowerMsg.includes('risk') || lowerMsg.includes('danger')) {
      let response = `🛡️ **Route Safety Analysis**\n\n`;
      
      if (ctx.avgRisk !== null) {
        const safetyScore = 100 - ctx.avgRisk;
        response += `📊 Safety Score: **${safetyScore}%**\n`;
        response += `⚠️ Risk Level: **${ctx.avgRisk > 60 ? 'High' : ctx.avgRisk > 35 ? 'Moderate' : 'Low'}**\n\n`;
        
        if (ctx.avgRisk > 60) {
          response += `⚠️ *This route has elevated risk. Recommendations:*\n`;
          response += `• Reduce speed by 10-15 km/h\n`;
          response += `• Increase following distance\n`;
          response += `• Stay alert for sudden stops\n`;
          response += `• Consider alternative routes\n`;
        } else if (ctx.avgRisk > 35) {
          response += `⚡ *Moderate conditions. Stay attentive:*\n`;
          response += `• Maintain safe distance\n`;
          response += `• Watch for road conditions\n`;
        } else {
          response += `✅ *This route appears safe for travel.*\n`;
        }
      } else {
        response += `📍 No route calculated yet.\n`;
        response += `Enter start and destination locations to get a safety analysis.`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('weather') || lowerMsg.includes('rain') || lowerMsg.includes('sunny') || lowerMsg.includes('temperature')) {
      let response = `🌤️ **Weather Report**\n\n`;
      response += `Current: **${ctx.weatherDesc}**\n`;
      response += `Time: **${ctx.timeOfDay}**\n\n`;
      
      if (weather?.weather?.[0]?.main === 'Rain' || weather?.weather?.[0]?.main === 'Drizzle') {
        response += `🌧️ *Rain detected! Driving tips:*\n`;
        response += `• Reduce speed and increase braking distance\n`;
        response += `• Turn on headlights for visibility\n`;
        response += `• Avoid sudden braking or sharp turns\n`;
        response += `• Watch for hydroplaning on wet roads\n`;
      } else if (weather?.weather?.[0]?.main === 'Clear') {
        response += `☀️ *Clear conditions - Good visibility.*\n`;
      } else if (weather?.weather?.[0]?.main === 'Clouds') {
        response += `☁️ *Overcast skies - Normal driving conditions.*\n`;
      } else if (weather?.weather?.[0]?.main === 'Snow' || weather?.weather?.[0]?.main === 'Fog') {
        response += `⚠️ *Challenging conditions - Drive carefully:*\n`;
        response += `• Use low beams in fog\n`;
        response += `• Reduce speed significantly\n`;
        response += `• Maintain extra distance\n`;
      }
      
      if (weather?.main?.temp && (weather.main.temp - 273.15) < 5) {
        response += `\n❄️ *Cold conditions - Watch for ice on bridges and shaded areas.*`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('traffic') || lowerMsg.includes('congestion') || lowerMsg.includes('delay')) {
      let response = `🚗 **Traffic Information**\n\n`;
      
      if (ctx.avgTraffic !== null) {
        response += `Traffic Level: **${ctx.avgTraffic}%** congestion\n`;
        response += `Estimated Time: **${ctx.timeDesc}**\n`;
        response += `Distance: **${ctx.distDesc}**\n\n`;
        
        if (ctx.avgTraffic > 70) {
          response += `🚦 *Heavy traffic expected. Consider:*\n`;
          response += `• Leaving earlier to avoid delays\n`;
          response += `• Taking alternative routes if available\n`;
          response += `• Planning for extra travel time\n`;
        } else if (ctx.avgTraffic > 40) {
          response += `⚡ *Moderate traffic. Allow some buffer time.*\n`;
        } else {
          response += `✅ *Light traffic - Smooth sailing!*\n`;
        }
      } else {
        response += `📍 Calculate a route to see traffic information.`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('accident') || lowerMsg.includes('incident') || lowerMsg.includes('roadblock') || lowerMsg.includes('construction')) {
      let response = `⚠️ **Incident Report**\n\n`;
      
      if (incidentsData && incidentsData.length > 0) {
        response += `${incidentsData.length} incident(s) detected on your route:\n\n`;
        incidentsData.slice(0, 3).forEach((i: any, idx: number) => {
          const icon = i.type?.toLowerCase().includes('accident') ? '🚨' : i.type?.toLowerCase().includes('construction') ? '🚧' : '⚠️';
          response += `${idx + 1}. ${icon} **${i.severity?.toUpperCase()}** ${i.type}\n`;
        });
        response += `\n*Stay alert and follow any posted warnings.*`;
      } else {
        response += `✅ No incidents detected on your current route.\n`;
        response += `Always drive safely and watch for unexpected hazards!`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('night') || lowerMsg.includes('dark') || lowerMsg.includes('driving at night')) {
      let response = `🌙 **Night Driving Guide**\n\n`;
      
      if (ctx.isNight) {
        response += `Current time: **Night**\n\n`;
        response += `*Night driving tips:*\n`;
        response += `• Use low beams when following other vehicles\n`;
        response += `• Reduce speed by 10-15% for safety\n`;
        response += `• Increase following distance significantly\n`;
        response += `• Take breaks every 2 hours\n`;
        response += `• Watch for pedestrians and cyclists\n`;
        response += `• Keep windshield clean for clear vision\n`;
      } else {
        response += `It's currently **${ctx.timeOfDay}**.\n`;
        response += `\n*General night driving preparation:*\n`;
        response += `• Ensure headlights are properly aligned\n`;
        response += `• Avoid looking directly at oncoming lights\n`;
        response += `• Use high beams on dark roads when safe\n`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('tip') || lowerMsg.includes('advice') || lowerMsg.includes('help') || lowerMsg.includes('how to')) {
      let response = `💡 **SafeRoute Quick Help**\n\n`;
      response += `I can help you with:\n\n`;
      response += `🗺️ **Route Planning**\n`;
      response += `   "Plan a route from A to B"\n\n`;
      response += `📍 **Finding Places**\n`;
      response += `   "Find nearby hospitals"\n`;
      response += `   "Where is the nearest gas station?"\n\n`;
      response += `🛡️ **Safety Info**\n`;
      response += `   "Is this route safe?"\n`;
      response += `   "What is the traffic like?"\n\n`;
      response += `🌤️ **Weather**\n`;
      response += `   "What's the weather forecast?"\n`;
      response += `   "Will it rain today?"\n\n`;
      response += `🚗 **Driving Tips**\n`;
      response += `   "Night driving tips"\n`;
      response += `   "How to drive in rain?"\n\n`;
      response += `Just type your question naturally!`;
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('vehicle') || lowerMsg.includes('car') || lowerMsg.includes('bike') || lowerMsg.includes('cycle')) {
      let response = `🚗 **Vehicle Information**\n\n`;
      response += `SafeRoute supports:\n\n`;
      response += `🚙 **Car** - Standard driving routes\n`;
      response += `🚴 **Bicycle** - Cycling-friendly paths\n\n`;
      response += `Select your vehicle type in the sidebar.\n\n`;
      
      if (lowerMsg.includes('bike') || lowerMsg.includes('cycle') || lowerMsg.includes('bicycle')) {
        response += `*Cycling tips:*\n`;
        response += `• Wear a helmet always\n`;
        response += `• Use bike lanes when available\n`;
        response += `• Be visible with lights/reflectors\n`;
        response += `• Follow traffic signals\n`;
      } else {
        response += `*General driving tips:*\n`;
        response += `• Buckle up and stay focused\n`;
        response += `• Follow speed limits\n`;
        response += `• Avoid distracted driving\n`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('route') || lowerMsg.includes('directions') || lowerMsg.includes('navigate') || lowerMsg.includes('path')) {
      let response = `🗺️ **Route Information**\n\n`;
      
      if (routeData) {
        response += `Distance: **${ctx.distDesc}**\n`;
        response += `Duration: **${ctx.timeDesc}**\n`;
        response += `Safety: **${ctx.avgRisk !== null ? (100 - ctx.avgRisk) + '%' : 'N/A'}**\n\n`;
        
        if (routeData.legs?.[0]?.steps) {
          response += `📍 Route has ${routeData.legs[0].steps.length} direction(s).\n`;
          response += `Check the sidebar for turn-by-turn directions.`;
        }
      } else {
        response += `📍 No route calculated yet.\n\n`;
        response += `To get route information:\n`;
        response += `1. Enter your start location\n`;
        response += `2. Enter your destination\n`;
        response += `3. Click "Calculate Route"\n\n`;
        response += `I'll then show you all the details!`;
      }
      
      return { text: response, shouldSearch: false };
    }

    if (lowerMsg.includes('who') || lowerMsg.includes('about') || lowerMsg.includes('what is') || lowerMsg.includes('tell me about')) {
      let response = `🤖 **About SafeRoute**\n\n`;
      response += `SafeRoute is an intelligent traffic safety platform that combines:\n\n`;
      response += `• 🗺️ Real-time routing\n`;
      response += `• 🌤️ Weather analysis\n`;
      response += `• 📊 Risk prediction\n`;
      response += `• 🤖 AI assistance\n\n`;
      response += `Our mission is to help you travel safer by providing intelligent insights about your routes, road conditions, and potential hazards.`;
      
      return { text: response, shouldSearch: false };
    }

    let response = `I'm not sure I understand that specific query. 🤔\n\n`;
    response += `I can help you with:\n\n`;
    response += `• 📍 Finding nearby places (hospitals, restaurants, etc.)\n`;
    response += `• 🛡️ Route safety and risk information\n`;
    response += `• 🌤️ Weather conditions\n`;
    response += `• 🚗 Traffic and incidents\n`;
    response += `• 💡 Driving tips\n\n`;
    response += `Try asking:\n`;
    response += `"Find nearby hospitals"\n`;
    response += `"Is my route safe?"\n`;
    response += `"What's the weather?"\n\n`;
    response += `Or type "help" for more options!`;
    
    return { text: response, shouldSearch: false };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const context = JSON.stringify(getRouteContextInfo(routeData, riskData, weather));
      const geminiResponse = await queryGeminiAI(userMsg, context);
      
      let response: string;
      if (geminiResponse) {
        response = geminiResponse;
      } else {
        response = generateLocalResponse(userMsg, routeData, riskData, weather, incidentsData);
      }
      
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      console.error('AI Error:', error);
      const fallback = generateLocalResponse(userMsg, routeData, riskData, weather, incidentsData);
      setMessages(prev => [...prev, { role: 'ai', text: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-shadow z-50"
      >
        <MessageSquare size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Bot size={20} className="text-emerald-500" />
                <span className="font-semibold">AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/30 dark:bg-transparent">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Bot size={14} className="text-emerald-500" />
                      <span className="text-xs text-zinc-400">SafeRoute Assistant</span>
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-line ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-sm' 
                      : 'bg-white border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-tl-sm border dark:border-zinc-700 shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.places && msg.places.length > 0 && (
                    <div className="mt-2 max-w-[85%] space-y-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{msg.places.length} places found nearby:</p>
                      {msg.places.map((place: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <MapPin size={14} className="text-emerald-500 mt-1 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{place.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{place.address}</p>
                              </div>
                            </div>
                            {place.distance && (
                              <span className="text-xs bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                                {place.distance < 1000 ? `${Math.round(place.distance)}m` : `${(place.distance / 1000).toFixed(1)}km`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 ml-6">
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1"
                            >
                              <Navigation2 size={12} />
                              Directions
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {messages.length <= 2 && !isLoading && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs text-zinc-400 font-medium">Quick Actions:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { text: 'Find hospitals', icon: MapPin, color: 'rose' },
                      { text: 'Check safety', icon: Shield, color: 'emerald' },
                      { text: 'Weather', icon: CloudRain, color: 'blue' },
                      { text: 'Traffic', icon: Zap, color: 'amber' },
                      { text: 'Gas stations', icon: MapPin, color: 'emerald' },
                      { text: 'Driving tips', icon: Car, color: 'indigo' },
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const inputs: Record<string, string> = {
                            'Find hospitals': 'Find nearby hospitals',
                            'Check safety': 'Is my route safe?',
                            'Weather': 'What is the weather?',
                            'Traffic': 'What is the traffic like?',
                            'Gas stations': 'Find nearby gas stations',
                            'Driving tips': 'Give me driving tips'
                          };
                          setInput(inputs[suggestion.text]);
                        }}
                        className="text-xs bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
                      >
                        <suggestion.icon size={14} className={`text-${suggestion.color}-500`} />
                        <span>{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400 p-3 rounded-2xl rounded-tl-sm border dark:border-zinc-700 flex items-center gap-2 shadow-sm">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full py-3 pl-5 pr-12 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 text-white rounded-full disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
