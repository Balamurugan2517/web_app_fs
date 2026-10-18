import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number, opts: { N: number }) => Promise<Buffer>;
const N = 16384;

/** Stores passwords as  scrypt$N$salt$hash  – a slow, salted hash. The real password is never saved. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${N}$${salt}$${(await scrypt(password, salt, 64, { N })).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const actual = await scrypt(password, salt, 64, { N: Number(n) || N });
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
