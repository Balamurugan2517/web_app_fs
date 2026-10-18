import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, parseSessionValue, type AdminRole } from './admin-session';
import { adminConfig } from './env';
import { findAdminById } from './repos/admin';

export interface AdminIdentity { id: string; email: string; name: string; role: AdminRole }

/** The signed-in admin, or null. The cookie is verified AND the user is re-loaded, so a disabled account is locked out at once. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  let secret: string;
  try { secret = adminConfig().sessionSecret; } catch { return null; }
  const session = parseSessionValue((await cookies()).get(ADMIN_COOKIE)?.value, secret);
  if (!session) return null;
  const user = await findAdminById(session.userId);
  return user && user.isActive ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
}

/** Call at the top of every admin page AND every admin server action. Hiding a button is not security; this check is. */
export async function requireAdmin(role?: AdminRole): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  if (role === 'owner' && admin.role !== 'owner') redirect('/admin?denied=1');
  return admin;
}
