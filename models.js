import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  specialty: { type: String }
}, { timestamps: true });

const ProviderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  specialty: { type: String, required: true, index: true },
  rating: { type: Number, default: 0 },
  trustScore: { type: Number, default: 0 },
  distance: { type: String },
  availability: { type: String, default: 'Available' },
  eta: { type: String },
  avatar: { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  pricing: {
    serviceFee: { type: Number, default: 0 },
    partsEst: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  metrics: {
    reliability: { type: String },
    consistency: { type: String },
    cancellationHistory: { type: String },
    responseRate: { type: String }
  }
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, index: true },
  customerContact: { type: String, required: true, index: true },
  provider: {
    id: { type: String },
    name: { type: String },
    specialty: { type: String },
    pricing: {
      total: { type: Number }
    },
    eta: { type: String }
  },
  intent: {
    service: { type: String },
    location: { type: String },
    urgency: { type: String },
    time: { type: String },
    language: { type: String }
  },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending', index: true },
  isSoftDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  providerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  rating: { type: Number, required: true },
  text: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, index: true },
  recipient: { type: String, required: true },
  channel: { type: String, enum: ['email', 'whatsapp'], required: true },
  status: { type: String, enum: ['sent', 'failed', 'deferred'], default: 'sent' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true, index: true },
  providerId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'released'], default: 'pending' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const ProviderModel = mongoose.model('Provider', ProviderSchema);
export const Booking = mongoose.model('Booking', BookingSchema);
export const Review = mongoose.model('Review', ReviewSchema);
export const NotificationModel = mongoose.model('Notification', NotificationSchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
export const Session = mongoose.model('Session', SessionSchema);
