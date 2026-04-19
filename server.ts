import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDnT-o1Lxw_NcEFA5f2yxI5qnrjEPWzHRQ';

const JWT_SECRET = process.env.JWT_SECRET || 'saferoute-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

// ═══ SECURITY MIDDLEWARE ═══════════════════════════════════════════════════════

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for auth endpoints
  message: { error: 'Too many login attempts, please try again later' },
});

// Helper functions
function generateAccessToken(user: { id: string; email: string; role: string }, sessionId?: string) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
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

// ═══ APP SETUP ═══════════════════════════════════════════════════════════════

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.tile.openstreetmap.org'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://nominatim.openstreetmap.org', 'https://api.openweathermap.org', 'https://generativelanguage.googleapis.com'],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply rate limiting
app.use('/api/', limiter);

// ═══ AUTH ═══════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      token: accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo }
    });
  } catch (e: any) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(403).json({ error: 'Account is temporarily locked. Try again later.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      // Increment login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          loginAttempts: { increment: 1 },
          lockedUntil: user.loginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if banned
    if (user.isBanned) {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    // Reset login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: uuidv4(),
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    const accessToken = generateAccessToken(user, session.id);
    const refreshToken = generateRefreshToken(user);

    res.json({
      token: accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo }
    });
  } catch (e: any) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user || user.isBanned) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user);
    
    res.json({ token: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.sessionId) {
          await prisma.session.delete({ where: { id: decoded.sessionId } }).catch(() => {});
        }
      } catch {}
    }
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id }, 
      select: { id: true, name: true, email: true, role: true, photo: true, createdAt: true, lastLoginAt: true } 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.put('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { name, photo } = req.body;
    const user = await prisma.user.update({ 
      where: { id: decoded.id }, 
      data: { name, photo }, 
      select: { id: true, name: true, email: true, role: true, photo: true } 
    });
    
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Invalid password data' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { passwordHash: await bcrypt.hash(newPassword, 12) } 
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ═══ TRIPS ═══════════════════════════════════════════════════════════════════

app.post('/api/trips', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { startName, endName, startLon, startLat, endLon, endLat, distanceKm, durationMin, vehicleType, safetyScore, riskLevel, routeData } = req.body;
    
    const trip = await prisma.trip.create({ 
      data: { 
        userId: decoded.id, 
        startName, 
        endName, 
        startLon: +startLon, 
        startLat: +startLat, 
        endLon: +endLon, 
        endLat: +endLat, 
        distanceKm: +distanceKm || 0, 
        durationMin: +durationMin || 0, 
        vehicleType: vehicleType || 'driving', 
        safetyScore: +safetyScore || 0, 
        riskLevel: riskLevel || 'low',
        routeData: routeData || null
      } 
    });
    
    res.status(201).json({ trip });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save trip' });
  }
});

app.get('/api/trips', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({ 
        where: { userId: decoded.id }, 
        orderBy: { createdAt: 'desc' }, 
        skip,
        take: limit 
      }),
      prisma.trip.count({ where: { userId: decoded.id } })
    ]);
    
    res.json({ trips, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

app.delete('/api/trips/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (trip.userId !== decoded.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ message: 'Trip deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// ═══ INCIDENTS ═══════════════════════════════════════════════════════════════

app.post('/api/incidents', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const { type, lat, lon, description, severity, images } = req.body;
    
    if (!lat || !lon || !type) {
      return res.status(400).json({ error: 'lat, lon and type are required' });
    }
    
    const incident = await prisma.incident.create({ 
      data: { 
        reportedById: decoded.id, 
        type, 
        lat: +lat, 
        lon: +lon, 
        description, 
        severity: severity || 'medium',
        images: images || []
      }, 
      include: { reportedBy: { select: { name: true } } } 
    });
    
    res.status(201).json({ incident });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const { lat, lon, radius = '10', page = '1', limit = '50' } = req.query;
    let where: any = { status: 'approved' };
    
    if (lat && lon) {
      const d = parseFloat(radius as string) / 111;
      where = { 
        ...where, 
        lat: { gte: +lat - d, lte: +lat + d }, 
        lon: { gte: +lon - d, lte: +lon + d } 
      };
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const incidents = await prisma.incident.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' }, 
      skip,
      take: parseInt(limit as string), 
      select: { id: true, type: true, lat: true, lon: true, description: true, severity: true, upvotes: true, createdAt: true } 
    });
    
    res.json({ incidents });
  } catch {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.post('/api/incidents/:id/upvote', async (req, res) => {
  try {
    const incident = await prisma.incident.update({ 
      where: { id: req.params.id }, 
      data: { upvotes: { increment: 1 } } 
    });
    res.json({ incident });
  } catch {
    res.status(404).json({ error: 'Incident not found' });
  }
});

// ═══ ADMIN ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = '1', limit = '20', search = '' } = req.query;
    const skip = (+page - 1) * +limit;
    
    const where = search ? { 
      OR: [{ name: { contains: search as string, mode: 'insensitive' as const } }, { email: { contains: search as string, mode: 'insensitive' as const } }] 
    } : {};
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({ 
        where, 
        skip, 
        take: +limit, 
        orderBy: { createdAt: 'desc' }, 
        select: { id: true, name: true, email: true, role: true, isBanned: true, photo: true, createdAt: true, lastLoginAt: true, _count: { select: { trips: true, incidents: true } } } 
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({ users, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/users/:id/role', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Super admin only' });
    }

    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await prisma.user.update({ 
      where: { id: req.params.id }, 
      data: { role }, 
      select: { id: true, name: true, role: true } 
    });
    
    res.json({ user });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

app.put('/api/admin/users/:id/ban', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await prisma.user.update({ 
      where: { id: req.params.id }, 
      data: { isBanned: req.body.isBanned }, 
      select: { id: true, name: true, isBanned: true } 
    });
    
    res.json({ user });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Super admin only' });
    }
    
    if (req.params.id === decoded.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/api/admin/incidents', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, page = '1', limit = '20' } = req.query;
    const skip = (+page - 1) * +limit;
    const where = status ? { status: status as any } : {};
    
    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({ 
        where, 
        skip, 
        take: +limit, 
        orderBy: { createdAt: 'desc' }, 
        include: { reportedBy: { select: { name: true, email: true } } } 
      }),
      prisma.incident.count({ where })
    ]);
    
    res.json({ incidents, total, page: +page });
  } catch {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.put('/api/admin/incidents/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, severity } = req.body;
    const incident = await prisma.incident.update({ 
      where: { id: req.params.id }, 
      data: { ...(status && { status }), ...(severity && { severity }) } 
    });
    
    res.json({ incident });
  } catch {
    res.status(404).json({ error: 'Incident not found' });
  }
});

app.delete('/api/admin/incidents/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await prisma.incident.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(404).json({ error: 'Incident not found' });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    
    if (decoded.role !== 'admin' && decoded.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    
    const [totalUsers, totalTrips, totalIncidents, usersToday, tripsToday, incidentsToday, tripsThisWeek, pendingIncidents, highRiskTrips, vehicleStats] = await Promise.all([
      prisma.user.count(), 
      prisma.trip.count(), 
      prisma.incident.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.trip.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.incident.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.trip.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.incident.count({ where: { status: 'pending' } }),
      prisma.trip.count({ where: { riskLevel: 'high' } }),
      prisma.trip.groupBy({ by: ['vehicleType'], _count: true })
    ]);
    
    res.json({ 
      totalUsers, 
      totalTrips, 
      totalIncidents, 
      usersToday, 
      tripsToday, 
      incidentsToday, 
      tripsThisWeek, 
      pendingIncidents, 
      highRiskTrips, 
      vehicleStats 
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ═══ EXTERNAL API PROXY ═══════════════════════════════════════════════════════

app.get('/api/geocode', async (req, res) => {
  try {
    const { q, lat, lon } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    
    try {
      const params: any = { q, format: 'json', limit: 8, addressdetails: 1 };
      if (lat && lon) { 
        params.viewbox = `${+lon - 0.5},${+lat - 0.5},${+lon + 0.5},${+lat + 0.5}`; 
        params.bounded = 1; 
      }
      const r = await axios.get('https://nominatim.openstreetmap.org/search', { 
        params, 
        headers: { 'User-Agent': 'SafeRoute/1.0 (https://saferoute.app)' }, 
        timeout: 8000 
      });
      if (r.data?.length > 0) return res.json(r.data);
    } catch {}
    
    res.json(geocodeFallback(q));
  } catch {
    res.json(geocodeFallback(String(req.query.q || '')));
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } });
    
    const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    res.json(r.data);
  } catch {
    res.json({ weather: [{ main: 'Clear' }], main: { temp: 298 } });
  }
});

app.post('/api/predict', (req, res) => {
  const { weather_condition, time_of_day, traffic_level } = req.body;
  let risk = 0.15;
  
  if (weather_condition === 'Rain') risk += 0.15; 
  else if (weather_condition === 'Snow') risk += 0.25; 
  else if (weather_condition === 'Thunderstorm') risk += 0.3; 
  else if (weather_condition === 'Fog') risk += 0.2;
  
  if (time_of_day >= 22 || time_of_day <= 4) risk += 0.1; 
  else if ((time_of_day >= 7 && time_of_day <= 9) || (time_of_day >= 16 && time_of_day <= 18)) risk += 0.08;
  
  risk += traffic_level * 0.15;
  res.json({ risk_probability: Math.min(Math.max(risk, 0.1), 0.95) });
});

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await geminiChat(message, context || '');
    res.json(response ? { response } : { response: null, fallback: true });
  } catch {
    res.json({ response: null, fallback: true });
  }
});

app.post('/api/route-analysis', (req, res) => {
  const { coordinates, weather_condition, time_of_day, vehicle_type } = req.body;
  
  if (!coordinates || !Array.isArray(coordinates)) {
    return res.status(400).json({ error: 'Coordinates required' });
  }
  
  const pr = (s: number) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
  
  const segments = coordinates.slice(0, -1).map((coord: number[], i: number) => {
    const s = coord[0] * 1000 + coord[1];
    const tl = Math.max(0, Math.min(1, pr(s) + pr(s + 1) * 0.1 - 0.05));
    let risk = 0.2, routeType = 'street', riskLevel = 'low'; 
    const exp: string[] = [];
    
    if (tl > 0.75 && pr(s + 5) > 0.6) { 
      routeType = 'highway'; 
      risk += 0.2; 
      exp.push('Highway'); 
    }
    else if (tl < 0.35 && pr(s + 6) > 0.5) { 
      routeType = 'small_road'; 
      risk += 0.1; 
      exp.push('Small road'); 
    }
    else exp.push('City road');
    
    if (weather_condition === 'Rain') { risk += 0.15; exp.push('Rain'); } 
    else if (weather_condition === 'Snow') { risk += 0.3; exp.push('Snow'); } 
    else if (weather_condition === 'Thunderstorm') { risk += 0.35; exp.push('Storm'); } 
    else if (weather_condition === 'Fog') { risk += 0.2; exp.push('Fog'); }
    
    if (time_of_day >= 22 || time_of_day <= 4) { risk += 0.1; exp.push('Night'); }
    if (vehicle_type === 'cycling') risk += 0.1;
    
    risk += tl * 0.1; 
    if (pr(s + 2) > 0.9) { risk += 0.12; exp.push('Accident zone'); }
    
    risk = Math.min(Math.max(risk, 0.1), 0.95);
    if (risk >= 0.6) riskLevel = 'high'; 
    else if (risk >= 0.35) riskLevel = 'moderate';
    
    return { start: coord, end: coordinates[i + 1], risk_probability: risk, traffic_level: tl, explanation: exp.slice(0, 3).join(', '), routeType, riskLevel };
  });
  
  const avg = segments.reduce((a: number, s: any) => a + s.risk_probability, 0) / segments.length;
  let riskLevel = 'low', riskMessage = 'Safe route.';
  
  if (avg >= 0.6) { riskLevel = 'high'; riskMessage = 'High risk. Proceed with caution.'; }
  else if (avg >= 0.35) { riskLevel = 'moderate'; riskMessage = 'Moderate risk. Stay alert.'; }
  
  res.json({ 
    segments, 
    incidents: [], 
    overallRisk: avg, 
    riskLevel, 
    riskMessage, 
    routeStats: { 
      highwaySegments: segments.filter((s: any) => s.routeType === 'highway').length, 
      smallRoadSegments: segments.filter((s: any) => s.routeType === 'small_road').length, 
      totalSegments: segments.length 
    } 
  });
});

// ═══ HEALTH CHECK ═══════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ═══ STATIC FILES & SPA ═══════════════════════════════════════════════════════════

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