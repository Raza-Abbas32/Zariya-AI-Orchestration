import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import {
  User,
  ProviderModel,
  Booking,
  Review,
  NotificationModel,
  Transaction,
  Session
} from './models.js';
import { sendCustomerConfirmation, sendAdminAlert } from './email.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// 1. Production Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://h.tile.openstreetmap.org"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://*", "wss://*"]
    }
  }
}));

// 2. Strict CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));

// 3. Structured JSON Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : 'anonymous'
    };
    console.log(JSON.stringify(log));
  });
  next();
});

// 4. Global & Auth Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth requests, please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Database Connection Setup (MongoDB with local fallback)
let useMongoDB = false;
let db = null;
let useFirestore = false;

if (process.env.MONGODB_URI) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    useMongoDB = true;
    console.log("Database Status: Connected to MongoDB.");
  } catch (err) {
    console.warn("Database Status: MongoDB connection failed. Falling back to local/Firestore storage.", err.message);
  }
} else {
  console.log("Database Status: MONGODB_URI not provided. Using local JSON files as fallback.");
}

const DB_FILE = path.join(process.cwd(), 'server', 'data', 'bookings.json');
const SESSIONS_FILE = path.join(process.cwd(), 'server', 'data', 'sessions.json');
const USERS_FILE = path.join(process.cwd(), 'server', 'data', 'users.json');

// Ensure parent data directories exist
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(USERS_FILE)) {
  const seedUsers = [
    {
      id: "usr_cust_1",
      email: "customer@zariya.pk",
      password: bcrypt.hashSync("password123", 10),
      name: "Ayesha Khan",
      role: "customer"
    },
    {
      id: "usr_prov_1",
      email: "provider@zariya.pk",
      password: bcrypt.hashSync("password123", 10),
      name: "Muhammad Ali",
      role: "provider",
      specialty: "Plumber"
    },
    {
      id: "usr_adm_1",
      email: "admin@zariya.pk",
      password: bcrypt.hashSync("password123", 10),
      name: "Zariya Admin",
      role: "admin"
    }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2));
}

if (process.env.FIREBASE_PROJECT_ID) {
  try {
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
    };
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      config.credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }
    admin.initializeApp(config);
    db = admin.firestore();
    useFirestore = true;
    console.log("Database Status: Firebase Firestore active.");
  } catch (error) {
    console.warn("Database Status: Firebase initialization failed:", error.message);
  }
}

// 6. Security & Authorization Middlewares
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access token missing" });

  jwt.verify(token, process.env.JWT_SECRET || 'zariya_secret_token_key', (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// 7. Route Handlers

// Observability Health Check Endpoint
app.get('/health', async (req, res) => {
  const systemInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development',
    database: {
      mongodb: useMongoDB ? 'CONNECTED' : 'DISCONNECTED',
      firebase: useFirestore ? 'ACTIVE' : 'INACTIVE',
      localFallback: (!useMongoDB && !useFirestore) ? 'ACTIVE' : 'STANDBY'
    }
  };
  res.json(systemInfo);
});

// Register endpoint
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  let { email, password, name, role, specialty } = req.body;
  
  email = sanitizeInput(email);
  name = sanitizeInput(name);
  role = sanitizeInput(role);
  specialty = specialty ? sanitizeInput(specialty) : undefined;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email address format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    let userExists = false;
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const hashedPassword = bcrypt.hashSync(password, 10);

    if (useMongoDB) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) userExists = true;
    } else {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      if (users.find(u => u.email === email)) userExists = true;
    }

    if (userExists) {
      return res.status(400).json({ error: "User already exists with this email address" });
    }

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: role || 'customer',
      specialty: specialty || undefined
    };

    if (useMongoDB) {
      await User.create(newUser);
    } else {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      users.push(newUser);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      process.env.JWT_SECRET || 'zariya_secret_token_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, specialty: newUser.specialty }
    });
  } catch (err) {
    next(err);
  }
});

// Login endpoint
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  let { email, password } = req.body;
  email = sanitizeInput(email);

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    let user = null;
    if (useMongoDB) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      user = users.find(u => u.email === email);
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'zariya_secret_token_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, specialty: user.specialty }
    });
  } catch (err) {
    next(err);
  }
});

// Get all registered users (for admin or observability)
app.get('/api/users', authenticateToken, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  try {
    let usersList = [];
    if (useMongoDB) {
      const dbUsers = await User.find({}, '-password');
      usersList = dbUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        specialty: u.specialty
      }));
    } else {
      const fileUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      usersList = fileUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        specialty: u.specialty
      }));
    }
    res.json(usersList);
  } catch (err) {
    next(err);
  }
});

// Booking status update endpoint (for providers or admin)
app.patch('/api/bookings/:bookingId/status', authenticateToken, async (req, res, next) => {
  const { bookingId } = req.params;
  const status = sanitizeInput(req.body.status);

  if (!status || !['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: "Valid status is required" });
  }

  try {
    let updatedBooking = null;

    if (useMongoDB) {
      updatedBooking = await Booking.findOneAndUpdate(
        { id: bookingId },
        { status },
        { new: true }
      );
      if (!updatedBooking) return res.status(404).json({ error: "Booking not found" });
    } else {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      const bookingIndex = bookings.findIndex(b => b.id === bookingId);
      
      if (bookingIndex === -1) {
        return res.status(404).json({ error: "Booking not found" });
      }

      bookings[bookingIndex].status = status;
      fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));
      updatedBooking = bookings[bookingIndex];
    }

    if (useFirestore && db) {
      try {
        await db.collection('bookings').doc(bookingId).update({ status });
      } catch (dbError) {
        console.warn("Firestore status update failed:", dbError.message);
      }
    }

    res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    next(error);
  }
});

// Booking creation endpoint
app.post('/api/bookings', authenticateToken, async (req, res, next) => {
  const { bookingId, provider, customerContact, intent, customerId } = req.body;

  if (!bookingId || !provider || !customerContact || !intent) {
    return res.status(400).json({ error: "Invalid booking request parameters." });
  }

  try {
    // Prevent duplicate booking requests (race-condition check)
    let bookingExists = false;
    if (useMongoDB) {
      const existing = await Booking.findOne({ id: bookingId });
      if (existing) bookingExists = true;
    } else {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (bookings.find(b => b.id === bookingId)) bookingExists = true;
    }

    if (bookingExists) {
      return res.status(400).json({ error: "Booking reference already exists" });
    }

    const newBooking = {
      id: bookingId,
      customerId: customerId || req.user.id,
      customerContact: sanitizeInput(customerContact),
      provider: {
        id: provider.id,
        name: sanitizeInput(provider.name),
        specialty: sanitizeInput(provider.specialty),
        pricing: {
          total: Number(provider.pricing?.total || 0)
        },
        eta: sanitizeInput(provider.eta)
      },
      intent: {
        service: sanitizeInput(intent.service),
        location: sanitizeInput(intent.location),
        urgency: sanitizeInput(intent.urgency),
        time: sanitizeInput(intent.time),
        language: sanitizeInput(intent.language)
      },
      status: 'Pending',
      isSoftDeleted: false
    };

    if (useMongoDB) {
      await Booking.create(newBooking);
    } else {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      bookings.push(newBooking);
      fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));
    }

    if (useFirestore && db) {
      try {
        await db.collection('bookings').doc(bookingId).set(newBooking);
      } catch (dbError) {
        console.warn("Firestore booking write failed, primary copy preserved:", dbError.message);
      }
    }

    // Modularized Email dispatches (Handles SMTP, SendGrid, Gmail, Mailgun, and Ethereal fallback)
    try {
      await sendCustomerConfirmation(newBooking);
      await sendAdminAlert(newBooking);
    } catch (mailError) {
      console.warn("[Server] Notification dispatches failed:", mailError.message);
    }

    res.status(201).json({ success: true, booking: newBooking });
  } catch (error) {
    next(error);
  }
});

// Bookings query endpoint
app.get('/api/bookings', authenticateToken, async (req, res, next) => {
  try {
    let bookings = [];
    if (useMongoDB) {
      bookings = await Booking.find({ isSoftDeleted: false }).sort({ createdAt: -1 }).lean();
    } else if (useFirestore && db) {
      const snapshot = await db.collection('bookings').orderBy('timestamp', 'desc').get();
      bookings = snapshot.docs.map(doc => doc.data());
    } else {
      bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }

    const decoded = req.user;
    if (decoded.role === 'provider') {
      bookings = bookings.filter(b => 
        b.provider && (b.provider.id === decoded.id || b.provider.name.toLowerCase().includes(decoded.name.toLowerCase()))
      );
    } else if (decoded.role === 'customer') {
      bookings = bookings.filter(b => 
        b.customerContact === decoded.email || b.customerId === decoded.id
      );
    }

    res.json(bookings);
  } catch (e) {
    console.warn("Database query failed, processing filesystem fallback:", e.message);
    try {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      const decoded = req.user;
      let filteredBookings = bookings;
      if (decoded.role === 'provider') {
        filteredBookings = bookings.filter(b => 
          b.provider && (b.provider.id === decoded.id || b.provider.name.toLowerCase().includes(decoded.name.toLowerCase()))
        );
      } else if (decoded.role === 'customer') {
        filteredBookings = bookings.filter(b => 
          b.customerContact === decoded.email || b.customerId === decoded.id
        );
      }
      res.json(filteredBookings);
    } catch (readError) {
      next(readError);
    }
  }
});

// Session Context Persistence Endpoints
app.get('/api/sessions/:sessionId', authenticateToken, async (req, res, next) => {
  const { sessionId } = req.params;
  try {
    if (useMongoDB) {
      const sessionDoc = await Session.findOne({ sessionId }).lean();
      return res.json({ messages: sessionDoc ? sessionDoc.messages : [] });
    } else if (useFirestore && db) {
      const doc = await db.collection('sessions').doc(sessionId).get();
      if (doc.exists) {
        res.json(doc.data());
      } else {
        res.json({ messages: [] });
      }
    } else {
      const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      res.json({ messages: sessions[sessionId] || [] });
    }
  } catch (e) {
    res.json({ messages: [] });
  }
});

app.post('/api/sessions', authenticateToken, async (req, res, next) => {
  const { sessionId, messages } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    if (useMongoDB) {
      await Session.findOneAndUpdate(
        { sessionId },
        { messages },
        { upsert: true, new: true }
      );
    } else {
      const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      sessions[sessionId] = messages;
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    }

    if (useFirestore && db) {
      await db.collection('sessions').doc(sessionId).set({
        messages,
        updatedAt: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Serve frontend assets in production mode
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// 8. Centralized Express Error Handling Middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const logError = {
    timestamp: new Date().toISOString(),
    error: err.message || 'Internal Server Error',
    status,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  };
  console.error(JSON.stringify(logError));
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message
  });
});

app.listen(port, () => {
  console.log(`Server active on port ${port} (mode: ${process.env.NODE_ENV || 'development'})`);
});

export default app;
