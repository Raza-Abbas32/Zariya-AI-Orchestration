/**
 * Zariya Types
 */

export type Urgency = 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export interface Provider {
  id: string;
  name: string;
  location: LocationData;
  trustScore: number;
  distance: string;
  availability: string;
  eta: string;
  rating: number;
  avatar: string;
  pricing: {
    serviceFee: number;
    partsEst: number;
    total: number;
  };
  metrics: {
    reliability: string;
    consistency: string;
    cancellationHistory: string;
    responseRate: string;
  };
  specialty: string;
}

export interface Intent {
  service: string;
  location: string;
  urgency: Urgency;
  time: string;
  language: string;
}

export type AgentStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface BookingHistory {
  id: string;
  timestamp: Date;
  service: string;
  location: string;
  status: 'Completed' | 'Processing';
  providerName?: string;
  totalAmount?: number;
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  agent: string;
  message: string;
  reasoning?: string; // Detailed AI reasoning
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface OrchestrationState {
  isProcessing: boolean;
  input: string;
  intent: Intent | null;
  providers: Provider[];
  selectedProvider: Provider | null;
  bookingId: string | null;
  logs: AgentLog[];
  currentAgent: string | null;
  timeline: Record<string, AgentStatus>;
  userLocation: LocationData | null;
  history: BookingHistory[];
  isAwaitingSelection: boolean;
  bookingStage: 'idle' | 'discovery' | 'selection' | 'form' | 'success';
  userContact: string;
  planningSteps?: string[];
  messages: ChatMessage[];
  sessionId: string;
  regionCode: string;
}
