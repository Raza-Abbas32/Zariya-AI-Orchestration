import type { AgentLog, BookingHistory, ChatMessage, Intent, Provider, OrchestrationState } from '../types';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'provider' | 'admin';
  specialty?: string;
}

export const DEMO_USERS: Record<string, DemoUser> = {
  'admin@zariya.pk': {
    id: 'demo_admin_1',
    email: 'admin@zariya.pk',
    name: 'Zariya Admin',
    role: 'admin'
  },
  'provider@zariya.pk': {
    id: 'demo_provider_1',
    email: 'provider@zariya.pk',
    name: 'Muhammad Ali',
    role: 'provider',
    specialty: 'Plumber'
  },
  'customer@zariya.pk': {
    id: 'demo_customer_1',
    email: 'customer@zariya.pk',
    name: 'Ayesha Khan',
    role: 'customer'
  }
};

export interface DemoBooking {
  id: string;
  timestamp: string;
  intent: Intent;
  provider: Provider;
  customerContact: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
}

export interface DemoSession {
  sessionId: string;
  messages: ChatMessage[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createDemoProviders = (): Provider[] => ([
  {
    id: 'prov_demo_1',
    name: 'Muhammad Ali',
    location: { lat: 31.5204, lng: 74.3587, address: 'Gulberg, Lahore' },
    trustScore: 0.96,
    distance: '1.2 km',
    availability: 'Available Now',
    eta: '12 min',
    rating: 4.9,
    avatar: '',
    pricing: { serviceFee: 650, partsEst: 300, total: 950 },
    metrics: {
      reliability: '98%',
      consistency: '97%',
      cancellationHistory: '1%',
      responseRate: '99%'
    },
    specialty: 'Plumber'
  },
  {
    id: 'prov_demo_2',
    name: 'Ahsan Electric',
    location: { lat: 31.4717, lng: 74.2687, address: 'Johar Town, Lahore' },
    trustScore: 0.91,
    distance: '2.0 km',
    availability: 'Busy',
    eta: '18 min',
    rating: 4.7,
    avatar: '',
    pricing: { serviceFee: 700, partsEst: 450, total: 1150 },
    metrics: {
      reliability: '95%',
      consistency: '94%',
      cancellationHistory: '2%',
      responseRate: '96%'
    },
    specialty: 'Electrician'
  },
  {
    id: 'prov_demo_3',
    name: 'Sami HVAC',
    location: { lat: 24.8607, lng: 67.0011, address: 'Clifton, Karachi' },
    trustScore: 0.88,
    distance: '3.6 km',
    availability: 'Available in 20 min',
    eta: '20 min',
    rating: 4.6,
    avatar: '',
    pricing: { serviceFee: 850, partsEst: 500, total: 1350 },
    metrics: {
      reliability: '92%',
      consistency: '90%',
      cancellationHistory: '3%',
      responseRate: '95%'
    },
    specialty: 'AC Repair'
  }
]);

const createDemoBookings = (): DemoBooking[] => {
  const providers = createDemoProviders();
  return [
    {
      id: 'demo_booking_101',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      intent: {
        service: 'Plumber',
        location: 'Gulberg, Lahore',
        urgency: 'HIGH',
        time: 'ASAP',
        language: 'English'
      },
      provider: providers[0],
      customerContact: '0300-1234567',
      status: 'Completed'
    },
    {
      id: 'demo_booking_102',
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      intent: {
        service: 'AC Repair',
        location: 'Clifton, Karachi',
        urgency: 'NORMAL',
        time: 'Today',
        language: 'English'
      },
      provider: providers[2],
      customerContact: '0311-7654321',
      status: 'Confirmed'
    }
  ];
};

const createDemoMessages = (): ChatMessage[] => ([
  {
    role: 'system',
    content: 'Demo session initialized. Backend calls are bypassed in VITE_DEMO_MODE.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    role: 'assistant',
    content: 'I can help match a verified provider in Pakistan using demo data.',
    timestamp: new Date(Date.now() - 1000 * 60 * 14)
  }
]);

const demoState = {
  bookings: createDemoBookings(),
  users: Object.values(DEMO_USERS),
  sessions: new Map<string, DemoSession>()
};

export function isDemoMode() {
  return DEMO_MODE;
}

export function getDemoApiPrefix() {
  return '/api';
}

export function getDemoUser(email: string) {
  return DEMO_USERS[email.trim().toLowerCase()] || null;
}

export function getDemoToken(user: DemoUser) {
  return `demo-${user.role}-${user.id}`;
}

export function createDemoAuthPayload(email: string) {
  const user = getDemoUser(email);
  if (!user) return null;
  return {
    token: getDemoToken(user),
    user
  };
}

export function getDemoDashboardData(role: DemoUser['role']) {
  const bookings = clone(demoState.bookings);
  const users = clone(demoState.users);
  return {
    bookings: role === 'customer' ? [] : bookings,
    users: role === 'admin' ? users : [],
    allBookings: role === 'admin' ? bookings : [],
    providerBookings: role === 'provider' ? bookings : []
  };
}

export function getDemoSessions(sessionId: string) {
  const existing = demoState.sessions.get(sessionId);
  if (existing) return clone(existing);

  const session: DemoSession = {
    sessionId,
    messages: createDemoMessages()
  };
  demoState.sessions.set(sessionId, session);
  return clone(session);
}

export function saveDemoSession(sessionId: string, messages: ChatMessage[]) {
  const session: DemoSession = {
    sessionId,
    messages: clone(messages)
  };
  demoState.sessions.set(sessionId, session);
  return clone(session);
}

export function getDemoHealth() {
  const bookings = demoState.bookings;
  return {
    status: 'OK',
    uptime: Math.floor(Date.now() / 1000) % 86400,
    env: 'demo',
    memoryUsage: {
      rss: 132000000,
      heapTotal: 98000000,
      heapUsed: 56000000
    },
    database: {
      mongodb: 'CONNECTED',
      firebase: 'INACTIVE',
      localFallback: 'STANDBY'
    },
    traffic: {
      bookings: bookings.length,
      users: demoState.users.length,
      sessions: demoState.sessions.size
    }
  };
}

export function getDemoBookingResponse(booking: DemoBooking) {
  return {
    success: true,
    bookingId: booking.id,
    provider: booking.provider,
    intent: booking.intent,
    customerContact: booking.customerContact,
    status: booking.status
  };
}

export function upsertDemoBookingStatus(bookingId: string, status: DemoBooking['status']) {
  const booking = demoState.bookings.find(item => item.id === bookingId);
  if (booking) {
    booking.status = status;
  }
  return booking ? clone(booking) : null;
}

export function createDemoBookingFromPayload(payload: { bookingId?: string; provider: Provider; customerContact: string; intent: Intent }) {
  const booking: DemoBooking = {
    id: payload.bookingId || `demo_booking_${Date.now()}`,
    timestamp: new Date().toISOString(),
    provider: payload.provider,
    customerContact: payload.customerContact,
    intent: payload.intent,
    status: 'Confirmed'
  };
  demoState.bookings.unshift(booking);
  return clone(booking);
}
