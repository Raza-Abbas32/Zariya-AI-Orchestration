# Zariya: Service Discovery & Booking Platform

Zariya is a production-grade, AI-orchestrated service booking and discovery platform designed for regional utility markets (e.g. Pakistan). It enables intelligent dispatch routing, real-time agent-driven orchestration, automated notifications, interactive maps, and role-based management dashboards.

---

## Technical Stack
- **Frontend**: React (v19) + Vite (v6), Tailwind CSS (v4), Framer Motion, Leaflet Maps.
- **Backend**: Node.js + Express, JWT authentication, Helmet security, CORS policies, Rate limiting.
- **Database**: MongoDB via Mongoose (with automated fallback to local JSON database files).
- **Email Notifications**: Nodemailer supporting Ethereal testing and production SMTP (SendGrid/AWS SES).

---

## 1. Quick Start Installation

```bash
# Clone the repository and navigate to root directory
cd Zariya-AI-Orchestration

# Install dependencies
npm install
```

---

## 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Security & Authentication
JWT_SECRET=your_production_jwt_secret_key_string
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000

# Database Configuration (Optional - Falls back to local JSON if blank)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/zariya?retryWrites=true&w=majority

# Email Configuration
# Supported providers: ethereal | smtp | sendgrid | gmail | mailgun
EMAIL_PROVIDER=ethereal
SMTP_FROM="Zariya Services" <no-reply@zariya.pk>

# Default/SMTP Settings (For ethereal or smtp provider)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# SendGrid Configuration (Active when EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=SG.your_key_here

# Gmail SMTP Configuration (Active when EMAIL_PROVIDER=gmail)
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_gmail_app_password

# Mailgun Configuration (Active when EMAIL_PROVIDER=mailgun)
MAILGUN_HOST=smtp.mailgun.org
MAILGUN_PORT=587
MAILGUN_SECURE=false
MAILGUN_USER=postmaster@yourdomain.com
MAILGUN_PASS=your_mailgun_password

# AI API Key (Required for autonomous agents processing)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 3. Observability & Monitoring

### Structured JSON Logging
Every request/response cycle is logged to `stdout` in standard JSON format:
```json
{"timestamp":"2026-05-20T05:29:09.123Z","method":"POST","path":"/api/bookings","status":201,"durationMs":124,"ip":"::1","userAgent":"Mozilla/...","userId":"usr_cust_1"}
```

### Health Check Endpoint
- **`GET /health`**
  - Displays database status (MongoDB / Firestore), uptime, memory consumption, and runtime mode.
  - Return Schema:
    ```json
    {
      "status": "OK",
      "timestamp": "2026-05-20T05:29:09.123Z",
      "uptime": 120.45,
      "memoryUsage": { ... },
      "env": "production",
      "database": {
        "mongodb": "CONNECTED",
        "firebase": "INACTIVE",
        "localFallback": "STANDBY"
      }
    }
    ```

---

## 4. Backups and Recovery

A cross-platform Node script is available to back up both local files and MongoDB database records:

```bash
# Execute local database extraction & filesystem backup
node backup.js
```
The script will output collections as timestamped files under the `backups/` directory.

---

## 5. Deployment Steps

### Frontend Deployment (Vercel)
The project includes [vercel.json](file:///C:/Users/PMYLS/.gemini/antigravity/scratch/Zariya-AI-Orchestration/vercel.json) to handle React SPA routing.
1. Connect your repository to **Vercel**.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Configure the environment variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://zariya-api.onrender.com/api`).

### Backend Deployment (Render or Railway)
The project includes [render.yaml](file:///C:/Users/PMYLS/.gemini/antigravity/scratch/Zariya-AI-Orchestration/render.yaml) for Render Blueprint deployments.
1. Link your repo to **Render**.
2. Apply the Blueprint config from `render.yaml` or create a new Web Service:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
3. Add the required environment variables (`JWT_SECRET`, `GEMINI_API_KEY`, etc.).

---

## 6. Docker Instructions

Deploy the stack locally using Docker Compose, which spins up the Express server and a local MongoDB instance.

```bash
# Start the production container suite in background
docker compose up --build -d

# Check service logs
docker compose logs -f

# Shut down the stack
docker compose down -v
```

---

## 7. API Documentation

All protected routes require the header `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Routes
- **`POST /api/auth/register`**
  - Payload: `{ "email": "str", "password": "str", "name": "str", "role": "customer|provider", "specialty": "str (optional)" }`
- **`POST /api/auth/login`**
  - Payload: `{ "email": "str", "password": "str" }`
  - Response: `{ "token": "JWT", "user": { ... } }`

### Booking Routes
- **`POST /api/bookings`** (Protected)
  - Creates a new booking and triggers emails.
  - Payload: `{ "bookingId": "str", "provider": { ... }, "customerContact": "str", "intent": { ... } }`
- **`GET /api/bookings`** (Protected)
  - Returns bookings filtered by user role.
- **`PATCH /api/bookings/:bookingId/status`** (Protected)
  - Update status (`Pending`, `Confirmed`, `Completed`, `Cancelled`).
  - Payload: `{ "status": "Confirmed" }`

---

## 8. Verification Test Accounts

To perform manual integration tests, use the following pre-seeded test accounts:

| Role | Email | Password | Details |
|---|---|---|---|
| **Customer** | `customer@zariya.pk` | `password123` | Can query intents, check trust indicators, and book providers. |
| **Provider** | `provider@zariya.pk` | `password123` | Can toggle availability, view assigned orders, and update statuses. |
| **Admin** | `admin@zariya.pk` | `password123` | Can view all platform bookings and monitor registered users. |
