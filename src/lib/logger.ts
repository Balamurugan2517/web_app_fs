/**
 * Tiny structured logger. One JSON object per line is easy to read in `pm2 logs`,
 * Vercel logs, or CloudWatch, and easy to search ("code":"INVALID_SIGNATURE").
 * Anything that looks like a secret is replaced before it is written.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const SECRET = /(secret|password|token|signature|authorization|api[-_]?key|card)/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET.test(k) ? '[REDACTED]' : redact(v, depth + 1)]),
  );
}

export function log(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, message, ...(redact(meta) as object) });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => log('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => log('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log('error', m, meta),
};
