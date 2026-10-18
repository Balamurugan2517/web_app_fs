import { hmacSha256Hex, safeEqual } from './crypto';

/**
 * Signed-cookie session for admin users.
 * Cookie value = "<userId>.<role>.<expiry-ms>.<HMAC of the first three parts>". It cannot be forged or extended without SESSION_SECRET.
 */
export const ADMIN_COOKIE = 'lt_admin';
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
export type AdminRole = 'owner' | 'staff';
export interface AdminSession { userId: string; role: AdminRole }

export function createSessionValue(secret: string, user: AdminSession, now = Date.now()): string {
  const body = `${user.userId}.${user.role}.${now + ADMIN_SESSION_MS}`;
  return `${body}.${hmacSha256Hex(secret, body)}`;
}

export function parseSessionValue(value: string | undefined, secret: string, now = Date.now()): AdminSession | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [userId, role, expires, mac] = parts;
  if (!/^\d+$/.test(expires) || (role !== 'owner' && role !== 'staff')) return null;
  if (!safeEqual(hmacSha256Hex(secret, `${userId}.${role}.${expires}`), mac)) return null;
  return Number(expires) > now ? { userId, role } : null;
}
