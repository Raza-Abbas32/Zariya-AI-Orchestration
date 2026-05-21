import { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Map as MapIcon, 
  Terminal, 
  Activity, 
  User, 
  Mic, 
  Search, 
  CheckCircle2, 
  Timer,
  Globe,
  Settings,
  History,
  LayoutDashboard,
  ShieldCheck,
  Cpu,
  LogOut,
  SlidersHorizontal,
  Coins,
  Users,
  Check,
  X,
  Clock,
  Phone,
  Menu,
  Network,
  Receipt,
  Sliders,
  Shield,
  BarChart3,
  HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MapView from './components/MapView';
import TrustAnalysisPanel from './features/analytics/TrustAnalysisPanel';
import { ZariyaOrchestrator } from './services/orchestrator';
import { OrchestrationState, AgentLog, Provider } from './types';
import Sidebar from './components/Sidebar';
import AgentNodeGraph from './features/dashboard/AgentNodeGraph';
import WorkflowPipeline from './features/dashboard/WorkflowPipeline';
import AntigravityStream from './features/dashboard/AntigravityStream';
import AiAnalyticsPanel from './features/analytics/AiAnalyticsPanel';
import TrustMatrixPanel from './features/analytics/TrustMatrixPanel';
import ParametersPanel from './features/dashboard/ParametersPanel';
import SystemHealthPanel from './features/analytics/SystemHealthPanel';
import TransactionsPanel from './features/transactions/TransactionsPanel';
import * as Logger from './lib/logger';
import {
  DEMO_USERS,
  createDemoAuthPayload,
  getDemoApiPrefix,
  getDemoDashboardData,
  getDemoSessions,
  isDemoMode,
  saveDemoSession,
  upsertDemoBookingStatus
} from './lib/demoApi';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getRegionFromCoords(lat: number, lng: number): string {
  const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  };
  const distKHI = distance(lat, lng, 24.8607, 67.0011);
  const distLHE = distance(lat, lng, 31.5204, 74.3587);
  const distISB = distance(lat, lng, 33.6844, 73.0479);

  const inPak = lat >= 23.6 && lat <= 37.1 && lng >= 60.8 && lng <= 77.1;
  if (!inPak) {
    return "GLOBAL-01";
  }

  if (distKHI < 1.5) return "PK-KHI";
  if (distLHE < 1.5) return "PK-LHE";
  if (distISB < 1.5) return "PK-ISB";
  
  return "PK-01";
}

const INITIAL_STATE: OrchestrationState = {
  isProcessing: false,
  input: '',
  intent: null,
  providers: [],
  selectedProvider: null,
  bookingId: null,
  logs: [],
  currentAgent: null,
  timeline: {},
  userLocation: null,
  history: [],
  isAwaitingSelection: false,
  bookingStage: 'idle',
  userContact: '',
  messages: [],
  sessionId: '',
  regionCode: 'PK-01'
};

const AGENT_SEQUENCE = [
  'Communication',
  'Intent',
  'Planning',
  'Discovery',
  'Trust',
  'Negotiation',
  'Booking',
  'Follow-Up'
];

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'provider' | 'admin';
  specialty?: string;
}

export default function App() {
  const [state, setState] = useState<OrchestrationState>(() => {
    let session = '';
    try {
      session = localStorage.getItem('zariya_session_id') || '';
      if (!session) {
        session = 'sess_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('zariya_session_id', session);
      }
    } catch (e) {
      session = 'sess_' + Date.now();
    }

    try {
      const saved = localStorage.getItem('zariya_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.history) {
          parsed.history = parsed.history.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          }));
        }
        if (parsed.messages) {
          parsed.messages = parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
        return { 
          ...INITIAL_STATE, 
          history: parsed.history || [], 
          messages: parsed.messages || [],
          sessionId: session
        };
      }
    } catch (e) {
      console.error("Failed to load state from local storage", e);
    }
    return { ...INITIAL_STATE, sessionId: session };
  });

  const orchestrator = useRef<ZariyaOrchestrator | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechText, setSpeechText] = useState('');
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [contactInput, setContactInput] = useState('');
  const [dateInput, setDateInput] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() + 30);
    return today.toISOString().slice(0, 16);
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('zariya_token'));
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem('zariya_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Auth Form State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'customer' | 'provider'>('customer');
  const [specialtyInput, setSpecialtyInput] = useState('Plumber');
  const [authError, setAuthError] = useState('');

  // Filtering & Sorting State
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'trust'>('trust');
  const [minRating, setMinRating] = useState<number>(0);

  // Detail Modal State
  const [detailProvider, setDetailProvider] = useState<Provider | null>(null);

  // Provider Board State
  const [providerBookings, setProviderBookings] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Admin Board State
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserData[]>([]);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  // Mobile Menu Navigation Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Admin User Provisioning Form State
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provRole, setProvRole] = useState<'customer' | 'provider' | 'admin'>('customer');
  const [provSpecialty, setProvSpecialty] = useState('Plumber');
  const [provError, setProvError] = useState('');
  const [provSuccess, setProvSuccess] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  const apiPrefix = isDemoMode()
    ? getDemoApiPrefix()
    : import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('your-backend-url')
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.PROD ? window.location.origin + '/api' : 'http://localhost:3001/api');

  // Load Bookings for dashboards
  const fetchDashboardData = async () => {
    if (!token) return;

    if (isDemoMode()) {
      const demoSession = getDemoSessions(state.sessionId || 'demo-session');
      const demoRole = user?.role || 'customer';
      const demoDashboard = getDemoDashboardData(demoRole);

      if (demoRole === 'provider') {
        setProviderBookings(demoDashboard.providerBookings);
      } else if (demoRole === 'admin') {
        setAllBookings(demoDashboard.allBookings);
        setRegisteredUsers(Object.values(DEMO_USERS) as UserData[]);
      }

      setState(s => ({ ...s, messages: demoSession.messages }));
      return;
    }

    try {
      const response = await fetch(`${apiPrefix}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const bookings = await response.json();
        if (user?.role === 'provider') {
          setProviderBookings(bookings);
        } else if (user?.role === 'admin') {
          setAllBookings(bookings);
        }
      }

      if (user?.role === 'admin') {
        try {
          const usersRes = await fetch(`${apiPrefix}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setRegisteredUsers(usersData);
          } else {
            setRegisteredUsers([
              { id: "usr_cust_1", email: "customer@zariya.pk", name: "Ayesha Khan", role: "customer" },
              { id: "usr_prov_1", email: "provider@zariya.pk", name: "Muhammad Ali", role: "provider", specialty: "Plumber" },
              { id: "usr_adm_1", email: "admin@zariya.pk", name: "Zariya Admin", role: "admin" }
            ]);
          }
        } catch (usersErr) {
          console.warn("Failed to dynamically fetch user directory:", usersErr);
          setRegisteredUsers([
            { id: "usr_cust_1", email: "customer@zariya.pk", name: "Ayesha Khan", role: "customer" },
            { id: "usr_prov_1", email: "provider@zariya.pk", name: "Muhammad Ali", role: "provider", specialty: "Plumber" },
            { id: "usr_adm_1", email: "admin@zariya.pk", name: "Zariya Admin", role: "admin" }
          ]);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch dashboard bookings:", e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, user]);

  useEffect(() => {
    if (!token) return;

    if (isDemoMode()) {
      return;
    }

    const events = new EventSource(`${apiPrefix}/events?token=${encodeURIComponent(token)}`);

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'booking.update' || payload?.type === 'booking.create') {
          fetchDashboardData();
        }
        if (payload?.message) {
          setLiveEvents((current) => [payload.message, ...current].slice(0, 6));
        }
      } catch (err) {
        console.warn('Invalid SSE payload received', err);
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => {
      events.close();
    };
  }, [token, apiPrefix]);

  useEffect(() => {
    const syncWithBackend = async () => {
      if (isDemoMode()) {
        const session = getDemoSessions(state.sessionId || 'demo-session');
        saveDemoSession(state.sessionId || 'demo-session', state.messages);
        setState(s => ({ ...s, messages: session.messages }));
        return;
      }

      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const bookingsRes = await fetch(`${apiPrefix}/bookings`, { headers });
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          const parsedBookings = bookings.map((b: any) => ({
            id: b.id,
            timestamp: new Date(b.timestamp),
            service: b.intent?.service || b.provider?.specialty || 'Service',
            location: b.intent?.location || b.provider?.location?.address || 'Location',
            status: b.status === 'Pending' ? 'Processing' as const : 'Completed' as const,
            providerName: b.provider?.name,
            totalAmount: b.provider?.pricing?.total
          }));

          setState(s => {
            const mergedMap = new Map();
            parsedBookings.forEach((b: any) => mergedMap.set(b.id, b));
            s.history.forEach((b: any) => mergedMap.set(b.id, b));
            
            const sortedHistory = Array.from(mergedMap.values()).sort(
              (a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime()
            );

            return { ...s, history: sortedHistory };
          });
        }

        if (state.sessionId) {
          const sessionRes = await fetch(`${apiPrefix}/sessions/${state.sessionId}`);
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData && sessionData.messages) {
              const parsedMessages = sessionData.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }));
              setState(s => ({ ...s, messages: parsedMessages }));
            }
          }
        }
      } catch (e) {
        console.warn("Failed to synchronize state with backend server:", e);
      }
    };

    if (token) {
      syncWithBackend();
    }
  }, [state.sessionId, token]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const region = getRegionFromCoords(latitude, longitude);
          
          let resolvedAddress = "";
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  'User-Agent': 'ZariyaPortal/1.0 (mjan8066m@gmail.com)'
                }
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                // Shorten address to first 3 elements for clean presentation
                const parts = data.display_name.split(',');
                resolvedAddress = parts.slice(0, 3).join(',').trim();
              }
            }
          } catch (err) {
            console.error("Nominatim reverse geocoding failed:", err);
          }

          setState(s => ({ 
            ...s, 
            userLocation: { 
              lat: latitude, 
              lng: longitude, 
              address: resolvedAddress || s.userLocation?.address || "Model Town, Lahore"
            }, 
            regionCode: region 
          }));
          Logger.success('GeoLocation', `Location acquired: ${resolvedAddress || 'Unknown'}`, { lat: latitude, lng: longitude, region });
        },
        (error) => {
          Logger.warn('GeoLocation', 'GPS access denied or unavailable', { code: error.code });
        }
      );
    }
  }, []);

  useEffect(() => {
    orchestrator.current = new ZariyaOrchestrator(state, setState);
  }, [state.userLocation, state.intent, state.selectedProvider, state.messages]);

  useEffect(() => {
    try {
      localStorage.setItem('zariya_state', JSON.stringify({ 
        history: state.history,
        messages: state.messages
      }));
    } catch (e) {
      console.error("Failed to save state to local storage", e);
    }
  }, [state.history, state.messages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  // Adjust active tab when roles change
  useEffect(() => {
    if (user) {
      if (user.role === 'provider') {
        setActiveTab('provider-orders');
      } else if (user.role === 'admin') {
        setActiveTab('admin-bookings');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [user]);

  const handleStart = () => {
    if (input.trim()) {
      Logger.startTrace();
      Logger.logUserAction('Service Request Submitted', { query: input.slice(0, 60) });
      orchestrator.current?.run(input);
    }
  };

  const handleCategoryClick = (categoryText: string) => {
    handleSuggestionClick(categoryText);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    if (state.isProcessing) return;
    
    setInput('');
    let currentText = '';
    let i = 0;
    
    setState(s => ({ ...s, isProcessing: true }));
    
    const timer = setInterval(() => {
      if (i < suggestionText.length) {
        currentText += suggestionText[i];
        setInput(currentText);
        i++;
      } else {
        clearInterval(timer);
        setState(s => ({ ...s, isProcessing: false }));
        orchestrator.current?.run(suggestionText);
      }
    }, 12);
  };

  const toggleVoice = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const warningLog: AgentLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        agent: 'System',
        message: "Speech recognition is not supported in this browser. Fallback to Logical Input.",
        type: 'warning'
      };
      setState(s => ({ ...s, logs: [...s.logs, warningLog] }));
      return;
    }

    if (isVoiceMode) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Speech stop warning:", e);
        }
      }
      setIsVoiceMode(false);
      setSpeechText('');
      return;
    }

    setSpeechText('Requesting microphone permissions...');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      console.warn("Microphone permission denied:", err);
      const errorLog: AgentLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        agent: 'System',
        message: `Microphone access denied: ${err.message || err}. Please enable mic permission in your browser settings.`,
        type: 'warning'
      };
      setState(s => ({ ...s, logs: [...s.logs, errorLog] }));
      setIsVoiceMode(false);
      setSpeechText('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'ur-PK'; 
      recognition.continuous = false;
      recognition.interimResults = true;
      
      let finalTranscriptText = '';

      recognition.onstart = () => {
        setIsVoiceMode(true);
        setSpeechText('Listening... Speak now...');
        const voiceLog: AgentLog = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
          agent: 'System',
          message: "Neural audio capture active. Speak in Urdu or English...",
          type: 'info'
        };
        setState(s => ({ ...s, logs: [...s.logs, voiceLog] }));
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptText += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscriptText || interimTranscript;
        if (currentText) {
          setInput(currentText);
          setSpeechText(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsVoiceMode(false);
        setSpeechText('');
        
        // Handle specific errors like quietness (no-speech)
        const errorMsg = event.error === 'no-speech' 
          ? "No speech detected. Fallback to logical keyboard input."
          : `Neural capture warning: ${event.error}. Fallback to keyboard input.`;

        const errorLog: AgentLog = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
          agent: 'System',
          message: errorMsg,
          type: 'warning'
        };
        setState(s => ({ ...s, logs: [...s.logs, errorLog] }));
      };
      
      recognition.onend = () => {
        setIsVoiceMode(false);
        setSpeechText('');
        if (finalTranscriptText.trim()) {
          const successLog: AgentLog = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            agent: 'System',
            message: `Audio signal captured successfully: "${finalTranscriptText}"`,
            type: 'success'
          };
          setState(s => ({ ...s, logs: [...s.logs, successLog] }));
          orchestrator.current?.run(finalTranscriptText);
        }
      };
      
      recognition.start();
    } catch (e: any) {
      console.error("Failed to start speech recognition:", e);
      setIsVoiceMode(false);
      setSpeechText('');
      const errorLog: AgentLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        agent: 'System',
        message: `Voice Initialization error: ${e.message}. Defaulting to logical keyboard input.`,
        type: 'warning'
      };
      setState(s => ({ ...s, logs: [...s.logs, errorLog] }));
    }
  };

  const handleConfirmBooking = () => {
    if (state.selectedProvider) {
      orchestrator.current?.proceedToForm(state.selectedProvider);
    }
  };

  const handleFinalDispatch = () => {
    const phoneRegex = /^03\d{2}-?\d{7}$/;
    if (!phoneRegex.test(contactInput)) {
      const errorLog: AgentLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        agent: 'Orchestrator',
        message: "Dispatch Error: Invalid contact format. Please enter a valid Pakistani phone number (e.g. 0300-1234567).",
        type: 'warning'
      };
      setState(s => ({ ...s, logs: [...s.logs, errorLog] }));
      return;
    }
    if (state.selectedProvider && contactInput.trim()) {
      orchestrator.current?.confirmSelection(state.selectedProvider, contactInput);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput || !passwordInput || (authTab === 'register' && !nameInput)) {
      setAuthError('Please fill out all required fields.');
      return;
    }

    const demoModeEnabled = isDemoMode();
    const normalizedEmail = emailInput.trim().toLowerCase();

    if (demoModeEnabled) {
      if (authTab !== 'login') {
        setAuthError('Demo mode only supports sign in with approved test accounts.');
        return;
      }

      const authPayload = createDemoAuthPayload(normalizedEmail);
      if (!authPayload || passwordInput !== 'password123') {
        setAuthError('Invalid demo credentials. Use an approved test account with password123.');
        return;
      }

      localStorage.setItem('zariya_token', authPayload.token);
      localStorage.setItem('zariya_user', JSON.stringify(authPayload.user));
      setToken(authPayload.token);
      setUser(authPayload.user);

      setEmailInput('');
      setPasswordInput('');
      setNameInput('');
      return;
    }

    try {
      const endpoint = authTab === 'login' ? 'login' : 'register';
      const body = authTab === 'login' 
        ? { email: emailInput, password: passwordInput }
        : { email: emailInput, password: passwordInput, name: nameInput, role: roleInput, specialty: roleInput === 'provider' ? specialtyInput : undefined };

      const response = await fetch(`${apiPrefix}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      // Store in memory and storage
      localStorage.setItem('zariya_token', data.token);
      localStorage.setItem('zariya_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      // Reset fields
      setEmailInput('');
      setPasswordInput('');
      setNameInput('');
    } catch (e: any) {
      setAuthError('Connection failed: ' + e.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zariya_token');
    localStorage.removeItem('zariya_user');
    setToken(null);
    setUser(null);
    setState(INITIAL_STATE);
  };

  const handleAdminProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvError('');
    setProvSuccess('');
    if (!provName || !provEmail || !provPassword) {
      setProvError('Please fill out all required fields.');
      return;
    }
    setIsProvisioning(true);

    if (isDemoMode()) {
      const demoUser: UserData = {
        id: `demo_${provRole}_${Date.now()}`,
        email: provEmail,
        name: provName,
        role: provRole,
        specialty: provRole === 'provider' ? provSpecialty : undefined
      };

      setProvSuccess(`Account Node for ${provName} successfully provisioned in demo mode!`);
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      setRegisteredUsers((current) => [...current, demoUser]);
      setIsProvisioning(false);
      return;
    }

    try {
      const body = {
        email: provEmail,
        password: provPassword,
        name: provName,
        role: provRole,
        specialty: provRole === 'provider' ? provSpecialty : undefined
      };

      const response = await fetch(`${apiPrefix}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        setProvError(data.error || 'Provisioning failed');
        setIsProvisioning(false);
        return;
      }

      setProvSuccess(`Account Node for ${provName} successfully provisioned!`);
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      
      // Auto-refresh the user list
      fetchDashboardData();
    } catch (err: any) {
      setProvError('Connection failed: ' + err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (isDemoMode()) {
      const updated = upsertDemoBookingStatus(bookingId, newStatus === 'Completed' ? 'Completed' : newStatus === 'Confirmed' ? 'Confirmed' : 'Cancelled');
      if (updated) {
        setState(s => ({
          ...s,
          history: s.history.map(h => h.id === bookingId ? { ...h, status: newStatus === 'Completed' ? 'Completed' as const : 'Processing' as const } : h)
        }));
        fetchDashboardData();
      }
      return;
    }

    try {
      const response = await fetch(`${apiPrefix}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchDashboardData();
        // Update history view
        setState(s => ({
          ...s,
          history: s.history.map(h => h.id === bookingId ? { ...h, status: newStatus === 'Completed' ? 'Completed' as const : 'Processing' as const } : h)
        }));
      }
    } catch (e) {
      console.warn("Failed to update status:", e);
    }
  };

  // Filter and Sort Providers logic
  const getFilteredAndSortedProviders = () => {
    let list = [...state.providers];
    
    // Minimum Rating Filter
    if (minRating > 0) {
      list = list.filter(p => p.rating >= minRating);
    }

    // Sort options
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.pricing.total - b.pricing.total;
      if (sortBy === 'price_desc') return b.pricing.total - a.pricing.total;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.trustScore - a.trustScore; // default 'trust'
    });

    return list;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg-dark text-text-primary font-sans overflow-hidden">
      
      {/* 1. Unauthenticated State / Auth Screen */}
      <AnimatePresence>
        {!token && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-50/95 backdrop-blur-2xl z-[9999] flex items-center justify-center p-4 overflow-y-auto py-8"
          >
            <div className="bg-white/80 border border-slate-200/80 w-full max-w-md rounded-[32px] overflow-y-auto max-h-[90vh] shadow-2xl flex flex-col p-8 backdrop-blur-md">
              <div className="flex flex-col items-center gap-2 mb-8">
                <img 
                  src="/zariya-logo.png" 
                  alt="Zariya" 
                  className="h-20 w-20 object-contain drop-shadow-lg"
                  onError={(e) => { e.currentTarget.style.display='none'; }}
                />
                <div className="text-center">
                  <span className="text-2xl font-black tracking-tighter text-[#5503A5]">ZARIYA</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-mono mt-0.5">Autonomous Home Services</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/50">
                <button 
                  onClick={() => { setAuthTab('login'); setAuthError(''); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all", authTab === 'login' ? "bg-accent text-white shadow-md shadow-accent/20" : "text-text-secondary hover:text-accent")}
                >
                  SIGN IN
                </button>
                <button 
                  onClick={() => { setAuthTab('register'); setAuthError(''); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all", authTab === 'register' ? "bg-accent text-white shadow-md shadow-accent/20" : "text-text-secondary hover:text-accent")}
                >
                  CREATE ACCOUNT
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authTab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-2">Full Name</label>
                    <input 
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Ayesha Khan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-2">Email Address</label>
                  <input 
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="customer@zariya.pk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-2">Password</label>
                  <input 
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                  />
                </div>

                {authTab === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Account Role</label>
                      <select 
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all animate-none"
                      >
                        <option value="customer" className="bg-white">Customer (Find Services)</option>
                        <option value="provider" className="bg-white">Provider (Fulfill Services)</option>
                      </select>
                    </div>

                    {roleInput === 'provider' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Specialty Focus</label>
                        <select 
                          value={specialtyInput}
                          onChange={(e) => setSpecialtyInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all animate-none"
                        >
                          <option value="Plumber" className="bg-white">Plumbing Expert</option>
                          <option value="Electrician" className="bg-white">Electrical Specialist</option>
                          <option value="Carpenter" className="bg-white">Carpentry Node</option>
                          <option value="AC Repair" className="bg-white">AC Climate Systems</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {authError && (
                  <p className="text-red-400 text-xs font-semibold pl-2 pt-1">{authError}</p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-accent text-white font-bold text-sm tracking-widest py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-accent/25 mt-4 cursor-pointer"
                >
                  {authTab === 'login' ? 'VERIFY NODE ACCESS' : 'PROVISION ACCOUNT NODE'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header (Visible only on small screens) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200/80 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          {user && (
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-650 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <img 
              src="/zariya-logo.png" 
              alt="Zariya" 
              className="h-8 w-8 object-contain rounded-lg"
              onError={(e) => { e.currentTarget.style.display='none'; }}
            />
            <span className="text-lg font-black tracking-tighter text-[#5503A5]">Zariya</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-[9px] font-black uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
              {user.role}
            </span>
          )}
          <button onClick={handleLogout} className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[9999] flex md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col z-10"
            >
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  activeTab={activeTab} 
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }} 
                  user={user} 
                  onLogout={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Responsive Sidebar (Hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => setActiveTab(tab)} 
          user={user} 
          onLogout={handleLogout} 
        />
      </div>

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg-dark">
        
        {/* ================== CUSTOMER: DASHBOARD TAB ================== */}
        {activeTab === 'dashboard' && user?.role === 'customer' && (
          <div className="flex-1 flex flex-col p-4 md:p-8 gap-4 md:gap-6 overflow-y-auto pb-24 md:pb-8 bg-slate-50 text-slate-900">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 bg-white/90 border border-slate-200/80 rounded-[28px] p-4 md:p-5 shadow-sm backdrop-blur-md">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  Mission Control
                </h1>
                <p className="text-slate-500 text-sm font-medium">Autonomous Service Orchestration Node</p>
              </div>
              
              <div className="flex w-full md:w-auto bg-white border border-slate-200/80 p-1 rounded-2xl shadow-sm">
                <button 
                  onClick={() => {
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.stop();
                      } catch (e) {}
                    }
                    setIsVoiceMode(false);
                    setSpeechText('');
                  }}
                  className={cn("flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all", !isVoiceMode ? "bg-accent text-white shadow-md shadow-accent/20" : "text-text-secondary hover:text-accent")}
                >
                  Logical Input
                </button>
                <button 
                  onClick={toggleVoice}
                  className={cn("flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-2", isVoiceMode ? "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600" : "text-text-secondary hover:text-accent")}
                >
                  <Mic className="w-3 h-3 animate-pulse" />
                  {isVoiceMode ? "Stop Capture" : "Neural Voice"}
                </button>
              </div>
            </header>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
              <div className={cn("flex flex-col gap-6 order-1 lg:order-1", state.selectedProvider ? "lg:col-span-8" : "lg:col-span-12")}>
                {/* Input Card */}
                <section className="bg-white/80 border border-slate-200/80 rounded-[28px] p-4 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search services... (e.g. 'I need a plumber for water leakage')"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-6 text-sm md:text-base font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[100px] md:min-h-[110px] resize-none"
                      />
                      <AnimatePresence>
                        {isVoiceMode && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-accent/95 backdrop-blur-md rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-3 md:gap-4 text-white text-center p-4 cursor-pointer"
                            onClick={() => {
                              if (recognitionRef.current) {
                                try {
                                  recognitionRef.current.stop();
                                } catch (e) {}
                              }
                              setIsVoiceMode(false);
                              setSpeechText('');
                            }}
                          >
                            <div className="flex gap-1 items-end h-6 md:h-8">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div 
                                  key={i}
                                  animate={{ height: [8, 24, 12, 18, 8] }}
                                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                  className="w-1.5 md:w-2 bg-white rounded-full"
                                />
                              ))}
                            </div>
                            <span className="font-black text-xs md:text-sm uppercase tracking-widest md:tracking-[0.2em] text-white/90">Neural Signal Capture...</span>
                            <div className="max-w-md bg-white/10 px-6 py-3 rounded-2xl border border-white/10 shadow-inner mt-1">
                              <p className="text-sm md:text-base font-extrabold text-white">
                                "{speechText || 'Listening... speak now'}"
                              </p>
                            </div>
                            <span className="text-[9px] text-white/50 uppercase font-bold tracking-widest animate-pulse mt-1">Click anywhere or button to Stop/Cancel</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {state.userLocation?.address && (
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mr-2">Live GPS Address:</span>
                        <button 
                          type="button"
                          onClick={() => {
                            const landmark = state.userLocation?.address || "";
                            setInput(prev => {
                              const base = prev.trim();
                              if (!base) return `I need service near ${landmark}`;
                              if (base.toLowerCase().includes(landmark.toLowerCase())) return prev;
                              return `${base} near ${landmark}`;
                            });
                          }}
                          className="text-[10px] font-bold bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-white px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm shadow-accent/5 cursor-pointer hover:scale-[1.02] active:scale-95"
                        >
                          <span className="animate-pulse">Live</span> Use My Live Location: <span className="underline font-extrabold">{state.userLocation.address}</span>
                        </button>
                      </div>
                    )}

                    {/* Quick Category Selection (Module 2) */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mr-2">Quick Category:</span>
                      <button 
                        onClick={() => handleCategoryClick("I need a plumber for water leak repair in Gulberg Lahore")}
                        className="text-[10px] font-bold bg-slate-100/80 border border-slate-200 hover:border-accent hover:text-accent px-3 py-1.5 rounded-full transition-all text-text-secondary"
                      >
                        Plumber
                      </button>
                      <button 
                        onClick={() => handleCategoryClick("Need an electrician urgent short circuit fault repair")}
                        className="text-[10px] font-bold bg-slate-100/80 border border-slate-200 hover:border-accent hover:text-accent px-3 py-1.5 rounded-full transition-all text-text-secondary"
                      >
                        ⚡ Electrician
                      </button>
                      <button 
                        onClick={() => handleCategoryClick("Looking for a carpenter to fix cabinet door hinges")}
                        className="text-[10px] font-bold bg-slate-100/80 border border-slate-200 hover:border-accent hover:text-accent px-3 py-1.5 rounded-full transition-all text-text-secondary"
                      >
                        🔨 Carpenter
                      </button>
                      <button 
                        onClick={() => handleCategoryClick("Require AC compressor servicing technician in Karachi Sindh Pakistan")}
                        className="text-[10px] font-bold bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-white px-3 py-1.5 rounded-full transition-all"
                      >
                        AC Karachi (Test Location)
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 pt-2 border-t border-slate-200/50">
                      <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                        <Globe className="w-3 h-3 text-accent animate-spin-slow" />
                        Region: <span className="text-slate-800 font-semibold">{state.regionCode}</span>
                      </div>
                      <button 
                        onClick={handleStart}
                        disabled={state.isProcessing || !input.trim()}
                        className="w-full sm:w-auto bg-accent text-white px-8 py-3.5 rounded-xl md:rounded-2xl font-black tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-accent/20 text-xs hover:bg-accent/90"
                      >
                        {state.isProcessing ? 'COMMUNICATING...' : 'INITIALIZE PIPELINE'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Map Section */}
                <section className={cn(
                  "bg-white/80 border border-slate-200/80 rounded-[28px] overflow-hidden shadow-xl relative flex flex-col backdrop-blur-md md:flex-1",
                  state.isAwaitingSelection ? "h-[500px]" : "h-[300px]"
                )}>
                  <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-2">
                    <MapIcon className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-800">Spatial Grid</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MapView 
                      providers={state.providers} 
                      targetLocation={state.userLocation || (state.intent ? { lat: 31.4805, lng: 74.3213 } : null)}
                      selectedProvider={state.selectedProvider}
                    />
                  </div>

                  {/* Provider Selection Panel */}
                  {state.isAwaitingSelection && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-slate-50 border-t border-slate-200/80 p-5 max-h-[300px] overflow-y-auto"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-200/40 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-accent" />
                          <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Autonomous Matches</h2>
                        </div>
                        
                        {/* Filters & Sorting Control */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1 text-[9px] text-text-secondary bg-slate-100 border border-slate-200/60 px-2 py-1 rounded-lg">
                            <SlidersHorizontal className="w-3 h-3 text-accent" />
                            <span>Sort:</span>
                            <select 
                              value={sortBy} 
                              onChange={(e) => setSortBy(e.target.value as any)}
                              className="bg-transparent text-slate-800 font-bold outline-none border-none cursor-pointer"
                            >
                              <option value="trust" className="bg-white text-slate-800">Trust Index</option>
                              <option value="price_asc" className="bg-white text-slate-800">Price: Low to High</option>
                              <option value="price_desc" className="bg-white text-slate-800">Price: High to Low</option>
                              <option value="rating" className="bg-white text-slate-800">Rating</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1 text-[9px] text-text-secondary bg-slate-100 border border-slate-200/60 px-2 py-1 rounded-lg">
                            <span>Rating:</span>
                            <select 
                              value={minRating} 
                              onChange={(e) => setMinRating(Number(e.target.value))}
                              className="bg-transparent text-slate-800 font-bold outline-none border-none cursor-pointer"
                            >
                              <option value={0} className="bg-white text-slate-800">All</option>
                              <option value={4} className="bg-white text-slate-800">4.0+ ★</option>
                              <option value={4.5} className="bg-white text-slate-800">4.5+ ★</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getFilteredAndSortedProviders().map((p) => (
                          <button 
                            key={p.id}
                            onClick={() => {
                              setState(s => ({ ...s, selectedProvider: p }));
                              setDetailProvider(p); // Opens details reviews overlay modal
                            }}
                            className={cn(
                              "p-4 rounded-2xl border transition-all flex items-center justify-between text-left group gap-3 relative overflow-hidden",
                              state.selectedProvider?.id === p.id 
                                ? "bg-accent/5 border-accent shadow-lg shadow-accent/5" 
                                : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-3 relative z-10">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors",
                                state.selectedProvider?.id === p.id ? "bg-accent text-white" : "bg-slate-100 text-text-secondary group-hover:text-accent"
                              )}>
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-accent transition-colors">{p.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-text-secondary">{p.rating} ★</span>
                                  <span className="text-[9px] text-emerald-600 font-bold">{(p.trustScore * 100).toFixed(0)}% TRUST</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right relative z-10">
                              <div className="text-xs font-black text-slate-800">PKR {p.pricing.total}</div>
                              <div className="text-[8px] font-bold text-accent uppercase tracking-wider mt-0.5">{p.eta}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Selection Overlay */}
                  <AnimatePresence>
                    {state.selectedProvider && state.bookingStage === 'selection' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="mt-4 w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-lg md:shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 md:absolute md:bottom-4 md:left-4 md:right-4 md:z-[999]"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-accent/20">
                            {state.selectedProvider.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 leading-tight">{state.selectedProvider.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-text-secondary bg-slate-100 px-2 py-0.5 rounded-md uppercase">{state.selectedProvider.specialty}</span>
                              <span className="text-[10px] font-black text-accent uppercase">{state.selectedProvider.eta} AWAY</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-200/40 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-0.5">EST. FEE</div>
                            <div className="text-lg font-black text-slate-900">PKR {state.selectedProvider.pricing.total}</div>
                          </div>
                          <button 
                            onClick={handleConfirmBooking}
                            className="bg-accent text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl shadow-accent/25 hover:scale-105 active:scale-95 transition-all tracking-wider"
                          >
                            BOOK NOW
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              {/* Right Side: Agent Sequence + Telemetry + Trust Panel */}
              {state.selectedProvider && (
                <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-2">
                  {/* Trust Analysis Panel */}
                  <TrustAnalysisPanel provider={state.selectedProvider} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================== CUSTOMER: HISTORY TAB ================== */}
        {activeTab === 'history' && user?.role === 'customer' && (
          <div className="flex-1 p-4 md:p-8 bg-bg-dark flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/40 pb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Activity Protocol</h1>
                <p className="text-text-secondary font-medium uppercase tracking-widest text-[9px] mt-1">Historical Service Trace Index</p>
              </div>
              <div className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl">
                <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-0.5">Total bookings</div>
                <div className="text-lg font-black text-accent">{state.history.length.toString().padStart(2, '0')}</div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3">
              {state.history.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-text-secondary gap-3 bg-slate-100/50 rounded-3xl border border-slate-200/60">
                  <History className="w-10 h-10 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-[10px]">No historical bookings detected</p>
                </div>
              ) : (
                state.history.map((item) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id} 
                    className={cn(
                      "group bg-white border p-4 rounded-2xl hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                      item.status === 'Processing' ? "border-accent/30 bg-accent/[0.02]" : "border-slate-200/80 hover:border-slate-350"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        item.status === 'Processing' ? "bg-accent/15 text-accent animate-pulse" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {item.status === 'Processing' ? <Activity className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-800 text-sm md:text-base">{item.service}</h4>
                          <span className={cn(
                            "text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight",
                            item.status === 'Processing' ? "bg-accent text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
                          )}>{item.status}</span>
                        </div>
                        <p className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider mt-1">
                          {item.providerName || 'Pending Assignment'} • {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6 pl-14 md:pl-0 border-t md:border-t-0 border-slate-200/40 pt-2 md:pt-0">
                      <div className="text-left md:text-right">
                        <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-0.5">Target Location</div>
                        <div className="text-[10px] font-bold text-slate-700 max-w-[120px] truncate">{item.location}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-0.5">Est. Price</div>
                        <div className="text-sm font-black text-slate-800">
                          {item.totalAmount ? `PKR ${item.totalAmount}` : '---'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'provider-orders' && user?.role === 'provider' && (
          <div className="flex-1 p-4 md:p-8 bg-bg-dark flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 pb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  Provider Terminal <span className="text-accent">/</span> {user.name}
                </h1>
                <p className="text-text-secondary text-sm font-medium uppercase tracking-widest text-[9px] mt-1">{user.specialty} Node Operator</p>
              </div>

              {/* Toggle Availability */}
              <div className="flex items-center gap-3 bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Availability:</span>
                <button 
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={cn(
                    "relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isAvailable ? "bg-accent" : "bg-slate-200"
                  )}
                >
                  <span 
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isAvailable ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
                <span className={cn("text-xs font-bold uppercase", isAvailable ? "text-accent" : "text-text-secondary")}>
                  {isAvailable ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>
            </header>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Active Jobs</span>
                <span className="text-xl font-black text-slate-800 mt-1">
                  {providerBookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Processing').length}
                </span>
              </div>
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Job Specialty</span>
                <span className="text-sm font-black text-accent mt-1 uppercase">{user.specialty || 'General'}</span>
              </div>
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Completed Node Ops</span>
                <span className="text-xl font-black text-slate-800 mt-1">
                  {providerBookings.filter(b => b.status === 'Completed').length}
                </span>
              </div>
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Aggregate Rating</span>
                <span className="text-xl font-black text-slate-800 mt-1">4.8 ★</span>
              </div>
            </div>

            {/* Orders list */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Assigned Dispatch Queue</h2>
              
              {providerBookings.length === 0 ? (
                <div className="py-16 text-center text-text-secondary bg-slate-100/50 rounded-3xl border border-slate-200/60 flex flex-col items-center justify-center gap-2">
                  <Activity className="w-8 h-8 opacity-25 text-accent" />
                  <p className="font-bold text-xs uppercase tracking-widest">No service requests in dispatch queue</p>
                </div>
              ) : (
                providerBookings.map((b: any) => (
                  <div key={b.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/15">{b.id}</span>
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                          b.status === 'Pending' ? "bg-amber-400/10 text-amber-600 border border-amber-200/50" :
                          b.status === 'Confirmed' ? "bg-accent/10 text-accent animate-pulse border border-accent/20" :
                          b.status === 'Completed' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/50" : "bg-red-400/10 text-red-650 border border-red-200/50"
                        )}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 pt-1">Service Request: <span className="text-accent">{b.intent?.service || b.provider?.specialty}</span></p>
                      <p className="text-xs text-text-primary"><b>Location:</b> {b.intent?.location || b.provider?.location?.address}</p>
                      <p className="text-xs text-text-secondary flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <b>Contact:</b> {b.customerContact}</p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-200/40 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Job Fee</p>
                        <p className="text-base font-black text-slate-800">PKR {b.provider?.pricing?.total}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {b.status === 'Pending' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Confirmed')}
                            className="bg-accent text-white font-black text-[10px] tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-md shadow-accent/10"
                          >
                            <Check className="w-3.5 h-3.5" /> ACCEPT DISPATCH
                          </button>
                        )}
                        {b.status === 'Confirmed' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Completed')}
                            className="bg-emerald-600 text-white font-black text-[10px] tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-600/10"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETE JOB
                          </button>
                        )}
                        {(b.status === 'Pending' || b.status === 'Confirmed') && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Cancelled')}
                            className="bg-red-50/80 border border-red-200 text-red-650 font-bold text-[10px] tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1 hover:bg-red-600 hover:text-white transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> REJECT
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================== PROVIDER: EARNINGS TAB ================== */}
        {activeTab === 'provider-earnings' && user?.role === 'provider' && (
          <div className="flex-1 p-4 md:p-8 bg-bg-dark flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="border-b border-slate-200/40 pb-4">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Earnings Registry <span className="text-accent">/</span> {user.name}
              </h1>
              <p className="text-text-secondary text-sm font-medium uppercase tracking-widest text-[9px] mt-1">Financial Node Account</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 p-6 rounded-3xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Total Net Income</span>
                <span className="text-3xl font-black text-accent mt-3">PKR 14,800</span>
                <p className="text-[9px] text-text-secondary mt-2">Available for payout: PKR 11,400</p>
              </div>

              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Fulfillment Rate</span>
                <span className="text-2xl font-black text-slate-800 mt-3">100.0%</span>
                <p className="text-[9px] text-emerald-600 mt-2">Perfect performance score</p>
              </div>

              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Avg Transaction Value</span>
                <span className="text-2xl font-black text-slate-800 mt-3">PKR 1,850</span>
                <p className="text-[9px] text-text-secondary mt-2">Across 8 completed dispatches</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Transaction Record</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-black text-text-secondary uppercase tracking-wider">
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Service Type</th>
                      <th className="p-4">Earnings</th>
                      <th className="p-4">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold">
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-accent">ZAR-X49S382</td>
                      <td className="p-4 text-slate-600">May 19, 2026</td>
                      <td className="p-4 text-slate-800 font-bold">Plumbing Repair</td>
                      <td className="p-4 text-slate-900 font-black">PKR 1,800</td>
                      <td className="p-4"><span className="text-[9px] font-black text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-200/40">Released</span></td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-accent">ZAR-L93M271</td>
                      <td className="p-4 text-slate-600">May 18, 2026</td>
                      <td className="p-4 text-slate-800 font-bold">Drain Unclogging</td>
                      <td className="p-4 text-slate-900 font-black">PKR 2,200</td>
                      <td className="p-4"><span className="text-[9px] font-black text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-200/40">Released</span></td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-accent">ZAR-A04J985</td>
                      <td className="p-4 text-slate-600">May 15, 2026</td>
                      <td className="p-4 text-slate-800 font-bold">Pipe Installation</td>
                      <td className="p-4 text-slate-900 font-black">PKR 3,500</td>
                      <td className="p-4"><span className="text-[9px] font-black text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-200/40">Released</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ================== ADMIN: ALL BOOKINGS TAB ================== */}
        {activeTab === 'admin-bookings' && user?.role === 'admin' && (
          <div className="flex-1 p-4 md:p-8 bg-bg-dark flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 pb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  Admin Control Board <span className="text-accent">/</span> Registry
                </h1>
                <p className="text-text-secondary text-sm font-medium uppercase tracking-widest text-[9px] mt-1">Platform Monitor Node</p>
              </div>

              <div className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex items-center gap-6 shadow-sm">
                <div>
                  <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Active Jobs</span>
                  <p className="text-base font-black text-accent">{allBookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Processing').length}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Completions</span>
                  <p className="text-base font-black text-slate-800">{allBookings.filter(b => b.status === 'Completed').length}</p>
                </div>
              </div>
            </header>

            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">All System Transactions</h2>

              {allBookings.length === 0 ? (
                <div className="py-20 text-center text-text-secondary bg-slate-100/50 rounded-3xl border border-slate-200/60">
                  <p className="font-bold text-xs uppercase tracking-widest">No transactions available on platform</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-black text-text-secondary uppercase tracking-wider">
                        <th className="p-4">Booking ID</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Customer Contact</th>
                        <th className="p-4">Service Type</th>
                        <th className="p-4">Assigned Provider</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-semibold">
                      {allBookings.map((b: any) => (
                        <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-accent">{b.id}</td>
                          <td className="p-4 text-[10px] text-text-secondary">{new Date(b.timestamp).toLocaleString()}</td>
                          <td className="p-4 text-slate-700">{b.customerContact}</td>
                          <td className="p-4 text-slate-800 font-bold">{b.intent?.service || b.provider?.specialty}</td>
                          <td className="p-4 font-bold text-slate-900">{b.provider?.name || 'Unassigned'}</td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase border",
                              b.status === 'Pending' ? "bg-amber-400/10 text-amber-600 border-amber-200/50" :
                              b.status === 'Confirmed' ? "bg-accent/10 text-accent border-accent/20" :
                              b.status === 'Completed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50" : "bg-red-500/10 text-red-600 border-red-200/50"
                            )}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">PKR {b.provider?.pricing?.total || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
             {/* ================== ADMIN: USER DIRECTORY TAB ================== */}
        {activeTab === 'admin-users' && user?.role === 'admin' && (
          <div className="flex-1 p-4 md:p-8 bg-bg-dark flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="border-b border-slate-200/40 pb-4">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                User Management Directory
              </h1>
              <p className="text-text-secondary text-sm font-medium uppercase tracking-widest text-[9px] mt-1">Platform Account Node Index</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Provision Form */}
              <div className="lg:col-span-1">
                <div className="bg-white/80 border border-slate-200/80 rounded-[28px] p-6 shadow-xl backdrop-blur-md sticky top-6">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Provision New Account Node</h2>
                  <form onSubmit={handleAdminProvisionSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Full Name</label>
                      <input 
                        type="text"
                        value={provName}
                        onChange={(e) => setProvName(e.target.value)}
                        placeholder="e.g. Raza Abbas"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Email Address</label>
                      <input 
                        type="email"
                        value={provEmail}
                        onChange={(e) => setProvEmail(e.target.value)}
                        placeholder="e.g. raza@zariya.pk"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Password</label>
                      <input 
                        type="password"
                        value={provPassword}
                        onChange={(e) => setProvPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Account Role</label>
                      <select 
                        value={provRole}
                        onChange={(e) => setProvRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      >
                        <option value="customer">Customer (Find Services)</option>
                        <option value="provider">Provider (Fulfill Services)</option>
                        <option value="admin">Admin (Manage Platform)</option>
                      </select>
                    </div>

                    {provRole === 'provider' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Specialty Focus</label>
                        <select 
                          value={provSpecialty}
                          onChange={(e) => setProvSpecialty(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                        >
                          <option value="Plumber">Plumbing Expert</option>
                          <option value="Electrician">Electrical Specialist</option>
                          <option value="Carpenter">Carpentry Node</option>
                          <option value="AC Repair">AC Climate Systems</option>
                        </select>
                      </div>
                    )}

                    {provError && <p className="text-red-500 text-xs font-bold pl-2 pt-1">{provError}</p>}
                    {provSuccess && <p className="text-emerald-650 text-xs font-bold pl-2 pt-1">{provSuccess}</p>}

                    <button 
                      type="submit"
                      disabled={isProvisioning}
                      className="w-full bg-accent text-white font-bold text-xs tracking-widest py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-accent/25 mt-4 cursor-pointer disabled:opacity-50"
                    >
                      {isProvisioning ? 'PROVISIONING...' : 'PROVISION ACCOUNT NODE'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Registered Users List */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Registered User Nodes</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {registeredUsers.map((u) => (
                    <div key={u.id} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200/60 rounded-2xl flex items-center justify-center font-black text-lg text-accent">
                          {u.name ? u.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base leading-tight">{u.name}</h4>
                          <p className="text-xs text-text-secondary mt-1">{u.email}</p>
                          <p className="text-[9px] font-mono text-slate-500 mt-1 uppercase font-bold">ID: {u.id}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={cn(
                          "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border",
                          u.role === 'customer' ? "bg-purple-500/10 text-purple-200 border-purple-200/50" :
                          u.role === 'provider' ? "bg-accent/10 text-accent border-accent/20" : "bg-purple-500/10 text-purple-650 border-purple-200/50"
                        )}>
                          {u.role}
                        </span>
                        {u.specialty && (
                          <p className="text-[9px] text-text-secondary mt-2 font-bold uppercase tracking-tighter bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-lg inline-block">
                            {u.specialty}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Developer & System Views Tabs */}
        {activeTab === 'agent-nodes' && user?.role === 'admin' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col overflow-hidden pb-28 md:pb-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent animate-pulse" />
                  Autonomous Neural Node Network
                </h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-0.5">
                  Visualizing multi-agent execution paths and node states
                </p>
              </div>
            </div>
            <div className="flex-1 bg-black/45 border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-inner">
              <AgentNodeGraph currentAgent={state.currentAgent} timeline={state.timeline} />
            </div>
          </div>
        )}

        {activeTab === 'transactions' && user?.role === 'admin' && (
          <TransactionsPanel history={state.history} />
        )}

        {activeTab === 'parameters' && user?.role === 'admin' && (
          <ParametersPanel />
        )}

        {activeTab === 'trust-matrix' && user?.role === 'admin' && (
          <TrustMatrixPanel providers={state.providers} />
        )}

        {activeTab === 'ai-analytics' && user?.role === 'admin' && (
          <AiAnalyticsPanel history={state.history} />
        )}

        {activeTab === 'system-health' && user?.role === 'admin' && (
          <SystemHealthPanel />
        )}

        {activeTab === 'live-streams' && user?.role === 'admin' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col overflow-hidden pb-28 md:pb-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-accent animate-pulse" />
                  Telemetry Signals Stream
                </h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-0.5">
                  Real-time pipeline diagnostics logs and agent thought patterns
                </p>
              </div>
            </div>
            <div className="flex-1 bg-black/35 border border-white/5 rounded-3xl p-6 overflow-hidden flex flex-col shadow-inner">
              <AntigravityStream logs={state.logs} isProcessing={state.isProcessing} timeline={state.timeline} />
            </div>
          </div>
        )}

        {/* Mobile Navbar (Visible only on small screens) */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl z-[2000] flex items-center justify-around px-2">
          {user?.role === 'customer' && (
            <>
              <MobileNavItem 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Command" 
              />
              <MobileNavItem 
                active={activeTab === 'history'} 
                onClick={() => setActiveTab('history')} 
                icon={<History className="w-5 h-5" />} 
                label="Activity" 
              />
            </>
          )}

          {user?.role === 'provider' && (
            <>
              <MobileNavItem 
                active={activeTab === 'provider-orders'} 
                onClick={() => setActiveTab('provider-orders')} 
                icon={<Activity className="w-5 h-5" />} 
                label="Orders" 
              />
              <MobileNavItem 
                active={activeTab === 'provider-earnings'} 
                onClick={() => setActiveTab('provider-earnings')} 
                icon={<Coins className="w-5 h-5" />} 
                label="Earnings" 
              />
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <MobileNavItem 
                active={activeTab === 'admin-bookings'} 
                onClick={() => setActiveTab('admin-bookings')} 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Bookings" 
              />
              <MobileNavItem 
                active={activeTab === 'admin-users'} 
                onClick={() => setActiveTab('admin-users')} 
                icon={<Users className="w-5 h-5" />} 
                label="Users" 
              />
            </>
          )}

          <button onClick={handleLogout} className="w-10 h-10 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-605 border border-slate-200/60 rounded-xl flex items-center justify-center transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </nav>


        {/* ================== DETAILED PROVIDER OVERLAY MODAL (Module 4) ================== */}
        <AnimatePresence>
          {detailProvider && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[2500] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white border border-slate-200/80 w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white font-black text-xl">
                      {detailProvider.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{detailProvider.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-text-secondary bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded uppercase">{detailProvider.specialty}</span>
                        <span className="text-[10px] font-black text-accent">{detailProvider.rating} ★</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDetailProvider(null)}
                    className="text-slate-500 hover:text-slate-900 font-bold text-xs bg-slate-100 hover:bg-slate-200/60 border border-slate-200/60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    CLOSE
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Photo Gallery (Mock) */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Recent Node Work Gallery</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="aspect-square bg-slate-50 border border-slate-200/65 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase select-none">
                        📷 job_01.png
                      </div>
                      <div className="aspect-square bg-slate-50 border border-slate-200/65 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase select-none">
                        📷 job_02.png
                      </div>
                      <div className="aspect-square bg-slate-50 border border-slate-200/65 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase select-none">
                        📷 job_03.png
                      </div>
                    </div>
                  </div>

                  {/* Trust Metrics */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Bayesian Trust Score</span>
                      <p className="text-xl font-black text-accent mt-0.5">{(detailProvider.trustScore * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Reliability Index</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{detailProvider.metrics.reliability}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Consistency Rating</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{detailProvider.metrics.consistency}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Response rate</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{detailProvider.metrics.responseRate}</p>
                    </div>
                  </div>

                  {/* Reviews (Mock) */}
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Vouched Customer Reviews</p>
                    
                    <div className="space-y-2.5">
                      <div className="bg-slate-50/50 border border-slate-200/65 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-800">Kamran Lodhi</span>
                          <span className="text-accent">5.0 ★</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-normal italic">"Zabardast kaam kiya. Time par aae aur bohot tameez se pesh aae. Highly recommended!"</p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-200/65 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-800">Zainab Bibi</span>
                          <span className="text-accent">4.5 ★</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-normal italic">"Kaam bohot jald khatam kiya aur rates bhi bilkul theek hain."</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer dispatch action */}
                <div className="p-5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Estimated cost</span>
                    <p className="text-lg font-black text-slate-900">PKR {detailProvider.pricing.total}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setState(s => ({ ...s, selectedProvider: detailProvider }));
                      setDetailProvider(null);
                      orchestrator.current?.proceedToForm(detailProvider);
                    }}
                    className="bg-accent text-white font-black text-xs px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/25 tracking-widest"
                  >
                    DISPATCH AGENT NODE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ================== BOOKING FORM OVERLAY (Module 5) ================== */}
        <AnimatePresence>
          {state.bookingStage === 'form' && (
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-6 overflow-y-auto py-8"
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border border-slate-200/80 w-full max-w-md rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
                >
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" /> Schedule & Verify
                      </h2>
                      <button 
                        onClick={() => setState(s => ({ ...s, bookingStage: 'selection', isAwaitingSelection: true, selectedProvider: null }))}
                        className="text-slate-500 hover:text-accent font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-105 border border-slate-200/50 px-2.5 py-1 rounded"
                      >
                        BACK
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white text-base font-black">
                            {state.selectedProvider?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Assigned Specialist</p>
                            <h4 className="text-sm font-bold text-slate-950 leading-tight">{state.selectedProvider?.name}</h4>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                          <div>
                             <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Estimated Fee</p>
                             <p className="text-sm font-black text-slate-900">PKR {state.selectedProvider?.pricing.total}</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Distance ETA</p>
                             <p className="text-sm font-black text-accent">{state.selectedProvider?.eta}</p>
                          </div>
                       </div>
                    </div>

                    {/* Date/Time Picker */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-2">Schedule Date & Time</label>
                      <input 
                        type="datetime-local"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:bg-white transition-all"
                      />
                    </div>

                    {/* Customer Contact */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-2">Contact Number</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input 
                          type="tel"
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          placeholder="03XX-XXXXXXX"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 focus:outline-none focus:border-accent focus:bg-white transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleFinalDispatch}
                      disabled={!contactInput.trim() || state.isProcessing}
                      className="w-full bg-accent text-white py-3.5 rounded-xl font-black text-xs tracking-wider shadow-2xl shadow-accent/25 hover:scale-[1.02] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {state.isProcessing ? 'CONFIRMING NODE DISPATCH...' : 'CONFIRM SERVICE PROTOCOL'}
                    </button>
                  </div>
                </motion.div>
             </motion.div>
          )}
          
          {/* SUCCESS DISPATCH PANEL */}
          {state.bookingStage === 'success' && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-accent z-[3000] flex items-center justify-center p-6 text-white"
             >
                <div className="max-w-md w-full text-center space-y-6 md:space-y-8">
                   <motion.div 
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-20 h-20 bg-white rounded-[28px] shadow-2xl flex items-center justify-center mx-auto relative overflow-hidden"
                   >
                     <CheckCircle2 className="w-10 h-10 text-accent" />
                     <motion.div 
                        animate={{ y: [35, -70] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute inset-0 bg-accent/5"
                      />
                   </motion.div>

                   <div className="space-y-3 px-4">
                      <h2 className="text-3xl font-black tracking-tight text-white">DISPATCHED</h2>
                      <div className="inline-flex items-center gap-1.5 bg-white/10 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-2 border border-white/10">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        Status: Active Dispatch
                      </div>
                      <p className="text-white/85 font-semibold text-sm leading-relaxed">Assigned service provider has been booked and is currently navigating to your location. A confirmation email with details has been sent to you.</p>
                      <div className="text-[10px] font-mono opacity-65 bg-white/10 px-3 py-1 rounded-lg inline-block text-white/90">ID: {state.bookingId}</div>
                   </div>

                   <div className="bg-white/10 rounded-2xl p-5 border border-white/10 space-y-3.5 mx-4">
                      <div className="flex items-center gap-4 text-left">
                        <div className="p-3 bg-white/10 rounded-xl text-white">
                          <Timer className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-white/70 uppercase tracking-widest">Estimated Arrival ETA</p>
                          <p className="text-xl font-black text-white">{state.selectedProvider?.eta}</p>
                        </div>
                      </div>
                      <div className="h-px bg-white/15" />
                       <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                          Destination: {state.intent?.location}
                       </div>
                       <div className="flex items-center gap-2 text-xs font-bold text-white/75 pt-1.5 border-t border-white/10">
                          <ShieldCheck className="w-4 h-4" />
                          Heartbeat GPS verification active
                       </div>
                    </div>

                   <button 
                    onClick={() => setState(s => ({ ...s, bookingStage: 'idle', selectedProvider: null, providers: [], intent: null, bookingId: null, isProcessing: false }))}
                    className="w-[90%] bg-white text-accent hover:bg-slate-100 py-4 rounded-xl font-black text-xs tracking-wider shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mx-auto font-sans"
                  >
                    BACK TO COMMAND CENTER
                  </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-accent" : "text-text-secondary"
      )}
    >
      <div className={cn("p-1.5 rounded-lg transition-all", active && "bg-accent/10")}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all group w-full text-left",
        active ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-white hover:bg-white/5"
      )}
    >
      <div className={cn("transition-colors", active ? "text-accent" : "text-text-secondary group-hover:text-accent")}>
        {icon}
      </div>
      <span className={cn("text-xs font-black tracking-tight uppercase tracking-wider", active ? "text-white" : "text-text-secondary")}>{label}</span>
      {active && <div className="ml-auto w-1 h-3 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent-glow)]" />}
    </button>
  );
}
