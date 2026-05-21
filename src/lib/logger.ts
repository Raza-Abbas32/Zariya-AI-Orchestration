/**
 * Zariya — Application Logger & Trace Service
 * Provides structured console logging with trace IDs, log levels,
 * and optional remote telemetry (admin-only).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace' | 'success';

export interface TraceEntry {
  traceId: string;
  timestamp: string;
  level: LogLevel;
  agent: string;
  message: string;
  data?: unknown;
  durationMs?: number;
}

// In-memory log store (capped at 500 entries)
const MAX_LOGS = 500;
let traceStore: TraceEntry[] = [];
let _traceId: string = generateTraceId();

function generateTraceId(): string {
  return `ZAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/** Start a new trace session (call at app init or on new service request) */
export function startTrace(): string {
  _traceId = generateTraceId();
  info('Orchestrator', `🔍 New trace session started`, { traceId: _traceId });
  return _traceId;
}

/** Get the current active trace ID */
export function getTraceId(): string {
  return _traceId;
}

/** Get all stored trace entries (for admin telemetry panel) */
export function getTraceStore(): TraceEntry[] {
  return [...traceStore];
}

/** Clear all stored traces */
export function clearTraces(): void {
  traceStore = [];
}

// ─── Core Logging Functions ──────────────────────────────────────────────────

function writeLog(level: LogLevel, agent: string, message: string, data?: unknown, durationMs?: number) {
  const entry: TraceEntry = {
    traceId: _traceId,
    timestamp: new Date().toISOString(),
    level,
    agent,
    message,
    data,
    durationMs
  };

  // Store in memory (cap at MAX_LOGS)
  traceStore.push(entry);
  if (traceStore.length > MAX_LOGS) {
    traceStore.shift();
  }

  // Styled console output
  const icons: Record<LogLevel, string> = {
    debug:   '🔧',
    info:    'ℹ️ ',
    warn:    '⚠️ ',
    error:   '❌',
    trace:   '🔍',
    success: '✅'
  };

  const colors: Record<LogLevel, string> = {
    debug:   '#94a3b8',
    info:    '#60a5fa',
    warn:    '#fbbf24',
    error:   '#f87171',
    trace:   '#a78bfa',
    success: '#34d399'
  };

  const durationStr = durationMs !== undefined ? ` (+${durationMs}ms)` : '';

  console.groupCollapsed(
    `%c${icons[level]} [${entry.timestamp.slice(11, 23)}] [${agent}] ${message}${durationStr}`,
    `color: ${colors[level]}; font-weight: 600;`
  );
  console.log('%cTrace ID:', 'color: #a78bfa; font-weight: bold;', _traceId);
  if (data !== undefined) {
    console.log('%cPayload:', 'color: #94a3b8;', data);
  }
  console.groupEnd();
}

export const debug   = (agent: string, msg: string, data?: unknown) => writeLog('debug',   agent, msg, data);
export const info    = (agent: string, msg: string, data?: unknown) => writeLog('info',    agent, msg, data);
export const warn    = (agent: string, msg: string, data?: unknown) => writeLog('warn',    agent, msg, data);
export const error   = (agent: string, msg: string, data?: unknown) => writeLog('error',   agent, msg, data);
export const trace   = (agent: string, msg: string, data?: unknown) => writeLog('trace',   agent, msg, data);
export const success = (agent: string, msg: string, data?: unknown) => writeLog('success', agent, msg, data);

/**
 * Time a function call and log duration
 * Usage: const result = await timed('DiscoveryAgent', 'search', () => agent.search(...))
 */
export async function timed<T>(agent: string, label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  trace(agent, `⏱ Starting: ${label}`);
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    success(agent, `⏱ Completed: ${label}`, { durationMs: ms });
    return result;
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    error(agent, `⏱ Failed: ${label}`, { durationMs: ms, error: e });
    throw e;
  }
}

/** Log a user action event */
export function logUserAction(action: string, detail?: Record<string, unknown>) {
  info('UserEvent', `👤 ${action}`, detail);
}

/** Log API call metadata */
export function logApiCall(method: string, url: string, statusCode?: number, ms?: number) {
  const level: LogLevel = statusCode && statusCode >= 400 ? 'error' : 'info';
  writeLog(level, 'API', `${method} ${url} → ${statusCode ?? 'pending'}`, undefined, ms);
}
