import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(process.cwd(), 'bookings.json');
const SESSIONS_FILE = path.join(process.cwd(), 'sessions.json');

// Initialize local DB files if they don't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}));
}

// Optional Firebase Firestore Configuration
let db = null;
let useFirestore = false;

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
    console.log("Firebase Firestore integration active.");
  } catch (error) {
    console.warn("Firebase Admin failed to initialize. Falling back to local JSON database:", error.message);
  }
} else {
  console.log("No FIREBASE_PROJECT_ID detected. Using local JSON database (bookings.json & sessions.json).");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER || 'placeholder@example.com',
    pass: process.env.SMTP_PASS || 'placeholder',
  },
});

app.post('/api/bookings', async (req, res) => {
  const { bookingId, provider, customerContact, intent } = req.body;

  try {
    const newBooking = {
      id: bookingId,
      provider,
      customerContact,
      intent,
      status: 'Pending',
      timestamp: new Date().toISOString(),
    };

    // 1. Save to local DB (Always saved locally as fallback)
    const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    bookings.push(newBooking);
    fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));

    // 2. Save to Firestore if active
    if (useFirestore && db) {
      try {
        await db.collection('bookings').doc(bookingId).set(newBooking);
      } catch (dbError) {
        console.warn("Firestore booking write failed, local copy preserved:", dbError.message);
      }
    }

    // 3. Send Email to Customer
    const customerMailOptions = {
      from: '"Zariya /" <no-reply@zariya.pk>',
      to: 'customer@example.com', 
      subject: `Booking Confirmed: ${bookingId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
          <h2 style="color: #6366f1;">Zariya / Confirmation</h2>
          <p>Your booking <b>${bookingId}</b> for <b>${provider.specialty}</b> has been confirmed.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p><b>Service:</b> ${provider.specialty}</p>
            <p><b>Provider:</b> ${provider.name}</p>
            <p><b>ETA:</b> ${provider.eta}</p>
            <p><b>Total Fee:</b> PKR ${provider.pricing.total}</p>
          </div>
          <p>The expert is on their way to <b>${intent.location}</b>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">Need help? Contact us at support@zariya.pk</p>
        </div>
      `,
    };

    // 4. Send Email to Admin
    const adminMailOptions = {
      from: '"Zariya / System" <system@zariya.pk>',
      to: 'admin@zariya.pk',
      subject: `New Booking Alert: ${bookingId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #6366f1;">New Dispatch Order</h2>
          <p><b>Booking ID:</b> ${bookingId}</p>
          <p><b>Customer Contact:</b> ${customerContact}</p>
          <p><b>Target Location:</b> ${intent.location}</p>
          <p><b>Service Type:</b> ${intent.service}</p>
          <p><b>Assigned Node:</b> ${provider.name}</p>
          <p><b>Transaction Value:</b> PKR ${provider.pricing.total}</p>
        </div>
      `,
    };

    // Safe Mail dispatch
    try {
      if (process.env.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
         const info = await transporter.sendMail(customerMailOptions);
         console.log('Customer Email Preview URL: %s', nodemailer.getTestMessageUrl(info));
         await transporter.sendMail(adminMailOptions);
      } else {
         await transporter.sendMail(customerMailOptions);
         await transporter.sendMail(adminMailOptions);
      }
    } catch (mailError) {
      console.warn("Mail dispatch skipped or failed (check SMTP settings):", mailError.message);
    }

    res.status(201).json({ success: true, booking: newBooking });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    if (useFirestore && db) {
      const snapshot = await db.collection('bookings').orderBy('timestamp', 'desc').get();
      const bookings = snapshot.docs.map(doc => doc.data());
      res.json(bookings);
    } else {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      res.json(bookings);
    }
  } catch (e) {
    console.warn("Database read error, falling back to local files:", e.message);
    try {
      const bookings = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      res.json(bookings);
    } catch (readError) {
      res.status(500).json({ error: "Failed to read bookings" });
    }
  }
});

// Session Context Persistence Endpoints
app.get('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    if (useFirestore && db) {
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

app.post('/api/sessions', async (req, res) => {
  const { sessionId, messages } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    // 1. Save to local JSON
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    sessions[sessionId] = messages;
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

    // 2. Save to Firestore if active
    if (useFirestore && db) {
      await db.collection('sessions').doc(sessionId).set({
        messages,
        updatedAt: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Session sync error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
