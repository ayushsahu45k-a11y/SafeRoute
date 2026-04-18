import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDnT-o1Lxw_NcEFA5f2yxI5qnrjEPWzHRQ';

// ── Helpers ────────────────────────────────────────────────────────────────
function generateToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

function authMiddleware(req: any, res: any, next: any) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminMiddleware(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function strictAdminMiddleware(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Super admin only' });
  next();
}

function geocodeFallback(query: string) {
  const lower = query.toLowerCase();
  const cities: Record<string, [number, number]> = {
    'new delhi': [77.209, 28.6139], 'delhi': [77.209, 28.6139], 'mumbai': [72.8777, 19.076],
    'bangalore': [77.5946, 12.9716], 'bengaluru': [77.5946, 12.9716], 'chennai': [80.2707, 13.0827],
    'kolkata': [88.3639, 22.5726], 'hyderabad': [78.4867, 17.385], 'pune': [73.8567, 18.5204],
    'ahmedabad': [72.5714, 23.0225], 'jaipur': [75.7873, 26.9124], 'lucknow': [80.9462, 26.8467],
    'indore': [75.7873, 22.7196], 'bhopal': [77.4126, 23.2599], 'patna': [85.3131, 25.5941],
    'kochi': [76.3061, 9.9312], 'goa': [74.124, 15.2993], 'nagpur': [79.0882, 21.1458],
    'kanpur': [80.3199, 26.4499], 'india': [78.9629, 20.5937],
  };
  return Object.entries(cities)
    .filter(([city]) => city.includes(lower) || lower.includes(city))
    .slice(0, 5)
    .map(([city, coords], i) => ({ place_id: i + 1, display_name: `${city.charAt(0).toUpperCase() + city.slice(1)}, India`, lon: coords[0], lat: coords[1] }));
}

async function geminiChat(prompt: string, context: string) {
  try {
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: `You are SafeRoute assistant. Keep short. ${context}\nUser: ${prompt}\nResponse:` }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 300 } },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return r.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch { return ''; }
}

// ── App ────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ═══ AUTH ══════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), passwordHash } });
    res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo } });
  } catch (e: any) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'Account banned' });
    res.json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo } });
  } catch (e: any) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true, photo: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/auth/me', authMiddleware, async (req: any, res) => {
  try {
    const { name, photo } = req.body;
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name, photo }, select: { id: true, name: true, email: true, role: true, photo: true } });
    res.json({ user });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/auth/change-password', authMiddleware, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ error: 'Wrong current password' });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    res.json({ message: 'Password changed' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ═══ TRIPS ═════════════════════════════════════════════════════════════════

app.post('/api/trips', authMiddleware, async (req: any, res) => {
  try {
    const { startName, endName, startLon, startLat, endLon, endLat, distanceKm, durationMin, vehicleType, safetyScore, riskLevel } = req.body;
    const trip = await prisma.trip.create({ data: { userId: req.user.id, startName, endName, startLon: +startLon, startLat: +startLat, endLon: +endLon, endLat: +endLat, distanceKm: +distanceKm || 0, durationMin: +durationMin || 0, vehicleType: vehicleType || 'driving', safetyScore: +safetyScore || 0, riskLevel: riskLevel || 'low' } });
    res.status(201).json({ trip });
  } catch (e: any) { console.error(e); res.status(500).json({ error: 'Failed to save trip' }); }
});

app.get('/api/trips', authMiddleware, async (req: any, res) => {
  try {
    const trips = await prisma.trip.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ trips });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/trips/:id', authMiddleware, async (req: any, res) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) return res.status(404).json({ error: 'Not found' });
    if (trip.userId !== req.user.id) return res.status(403).json({ error: 'Not your trip' });
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ═══ INCIDENTS ═════════════════════════════════════════════════════════════

app.post('/api/incidents', authMiddleware, async (req: any, res) => {
  try {
    const { type, lat, lon, description, severity } = req.body;
    if (!lat || !lon || !type) return res.status(400).json({ error: 'lat, lon and type required' });
    const incident = await prisma.incident.create({ data: { reportedById: req.user.id, type, lat: +lat, lon: +lon, description, severity: severity || 'medium' }, include: { reportedBy: { select: { name: true } } } });
    res.status(201).json({ incident });
  } catch (e: any) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const { lat, lon, radius = '10' } = req.query;
    let where: any = { status: 'approved' };
    if (lat && lon) {
      const d = parseFloat(radius as string) / 111;
      where = { ...where, lat: { gte: +lat! - d, lte: +lat! + d }, lon: { gte: +lon! - d, lte: +lon! + d } };
    }
    const incidents = await prisma.incident.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, type: true, lat: true, lon: true, description: true, severity: true, upvotes: true, createdAt: true } });
    res.json({ incidents });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/incidents/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const incident = await prisma.incident.update({ where: { id: req.params.id }, data: { upvotes: { increment: 1 } } });
    res.json({ incident });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// ═══ ADMIN ═════════════════════════════════════════════════════════════════

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req: any, res) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const skip = (+page - 1) * +limit;
    const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: +limit, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, isBanned: true, photo: true, createdAt: true, _count: { select: { trips: true, incidents: true } } } }),
      prisma.user.count({ where })
    ]);
    res.json({ users, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/users/:id/role', authMiddleware, strictAdminMiddleware, async (req: any, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role }, select: { id: true, name: true, role: true } });
    res.json({ user });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.put('/api/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: req.body.isBanned }, select: { id: true, name: true, isBanned: true } });
    res.json({ user });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.delete('/api/admin/users/:id', authMiddleware, strictAdminMiddleware, async (req: any, res) => {
  try {
    if (req.params.id === (req as any).user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.get('/api/admin/incidents', authMiddleware, adminMiddleware, async (req: any, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (+page - 1) * +limit;
    const where = status ? { status: status as any } : {};
    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({ where, skip, take: +limit, orderBy: { createdAt: 'desc' }, include: { reportedBy: { select: { name: true, email: true } } } }),
      prisma.incident.count({ where })
    ]);
    res.json({ incidents, total, page: +page });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/incidents/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, severity } = req.body;
    const incident = await prisma.incident.update({ where: { id: req.params.id }, data: { ...(status && { status }), ...(severity && { severity }) } });
    res.json({ incident });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.delete('/api/admin/incidents/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.incident.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.get('/api/admin/analytics', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const [totalUsers, totalTrips, totalIncidents, usersToday, tripsToday, incidentsToday, tripsThisWeek, pendingIncidents, highRiskTrips, vehicleStats] = await Promise.all([
      prisma.user.count(), prisma.trip.count(), prisma.incident.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.trip.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.incident.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.trip.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.incident.count({ where: { status: 'pending' } }),
      prisma.trip.count({ where: { riskLevel: 'high' } }),
      prisma.trip.groupBy({ by: ['vehicleType'], _count: true })
    ]);
    res.json({ totalUsers, totalTrips, totalIncidents, usersToday, tripsToday, incidentsToday, tripsThisWeek, pendingIncidents, highRiskTrips, vehicleStats });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ═══ EXISTING API ROUTES ═══════════════════════════════════════════════════

app.get('/api/geocode', async (req, res) => {
  try {
    const { q, lat, lon } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    try {
      const params: any = { q, format: 'json', limit: 8, addressdetails: 1 };
      if (lat && lon) { params.viewbox = `${+lon - 0.5},${+lat - 0.5},${+lon + 0.5},${+lat + 0.5}`; params.bounded = 1; }
      const r = await axios.get('https://nominatim.openstreetmap.org/search', { params, headers: { 'User-Agent': 'SafeRoute/1.0' }, timeout: 8000 });
      if (r.data?.length > 0) return res.json(r.data);
    } catch { /* fallback */ }
    res.json(geocodeFallback(q));
  } catch { res.json(geocodeFallback(String(req.query.q || ''))); }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } });
    const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    res.json(r.data);
  } catch { res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } }); }
});

app.post('/api/predict', (req, res) => {
  const { weather_condition, time_of_day, traffic_level } = req.body;
  let risk = 0.15;
  if (weather_condition === 'Rain') risk += 0.15; else if (weather_condition === 'Snow') risk += 0.25; else if (weather_condition === 'Thunderstorm') risk += 0.3; else if (weather_condition === 'Fog') risk += 0.2;
  if (time_of_day >= 22 || time_of_day <= 4) risk += 0.1; else if ((time_of_day >= 7 && time_of_day <= 9) || (time_of_day >= 16 && time_of_day <= 18)) risk += 0.08;
  risk += traffic_level * 0.15;
  res.json({ risk_probability: Math.min(Math.max(risk, 0.1), 0.95) });
});

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await geminiChat(message, context || '');
    res.json(response ? { response } : { response: null, fallback: true });
  } catch { res.json({ response: null, fallback: true }); }
});

app.post('/api/route-analysis', (req, res) => {
  const { coordinates, weather_condition, time_of_day, vehicle_type } = req.body;
  const pr = (s: number) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
  const segments = coordinates.slice(0, -1).map((coord: number[], i: number) => {
    const s = coord[0] * 1000 + coord[1];
    const tl = Math.max(0, Math.min(1, pr(s) + pr(s + 1) * 0.1 - 0.05));
    let risk = 0.2, routeType = 'street', riskLevel = 'low'; const exp: string[] = [];
    if (tl > 0.75 && pr(s + 5) > 0.6) { routeType = 'highway'; risk += 0.2; exp.push('Highway'); }
    else if (tl < 0.35 && pr(s + 6) > 0.5) { routeType = 'small_road'; risk += 0.1; exp.push('Small road'); }
    else exp.push('City road');
    if (weather_condition === 'Rain') { risk += 0.15; exp.push('Rain'); } else if (weather_condition === 'Snow') { risk += 0.3; exp.push('Snow'); } else if (weather_condition === 'Thunderstorm') { risk += 0.35; exp.push('Storm'); } else if (weather_condition === 'Fog') { risk += 0.2; exp.push('Fog'); }
    if (time_of_day >= 22 || time_of_day <= 4) { risk += 0.1; exp.push('Night'); }
    if (vehicle_type === 'cycling') risk += 0.1;
    risk += tl * 0.1; if (pr(s + 2) > 0.9) { risk += 0.12; exp.push('Accident zone'); }
    risk = Math.min(Math.max(risk, 0.1), 0.95);
    if (risk >= 0.6) riskLevel = 'high'; else if (risk >= 0.35) riskLevel = 'moderate';
    return { start: coord, end: coordinates[i + 1], risk_probability: risk, traffic_level: tl, explanation: exp.slice(0, 3).join(', '), routeType, riskLevel };
  });
  const avg = segments.reduce((a: number, s: any) => a + s.risk_probability, 0) / segments.length;
  let riskLevel = 'low', riskMessage = 'Safe route.';
  if (avg >= 0.6) { riskLevel = 'high'; riskMessage = 'High risk. Proceed with caution.'; }
  else if (avg >= 0.35) { riskLevel = 'moderate'; riskMessage = 'Moderate risk. Stay alert.'; }
  res.json({ segments, incidents: [], overallRisk: avg, riskLevel, riskMessage, routeStats: { highwaySegments: segments.filter((s: any) => s.routeType === 'highway').length, smallRoadSegments: segments.filter((s: any) => s.routeType === 'small_road').length, totalSegments: segments.length } });
});

// ─── Static + export ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

export default app;

if (process.env.NODE_ENV !== 'production') {
  (async () => {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    app.listen(3000, '0.0.0.0', () => console.log('SafeRoute on http://localhost:3000'));
  })();
}
