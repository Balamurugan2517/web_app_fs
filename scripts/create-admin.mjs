// Creates (or resets the password of) an admin user.
// Usage: npm run admin:create -- owner@shop.in "A Long Passphrase 123" "Owner Name" owner
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const [email, password, name = 'Owner', role = 'owner'] = process.argv.slice(2);
if (!email || !password || password.length < 12 || !['owner', 'staff'].includes(role)) {
  console.error('Usage: npm run admin:create -- <email> <password (min 12 chars)> [name] [owner|staff]'); process.exit(1);
}
// Same format as src/lib/password.ts:  scrypt$N$salt$hash
const N = 16384, salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64, { N }).toString('hex');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)
   ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, is_active = true`,
  [email, name, role, `scrypt$${N}$${salt}$${hash}`]);
await client.end();
console.log(`Admin ${email} (${role}) saved.`);
