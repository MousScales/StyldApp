import type { User } from '@supabase/supabase-js';

/** Platform admin email — set EXPO_PUBLIC_ADMIN_EMAIL in .env (must match Supabase ADMIN_EMAIL secret). */
export function getPlatformAdminEmail(): string {
  return (process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = getPlatformAdminEmail();
  if (!adminEmail) {
    if (__DEV__) {
      console.warn(
        '[platformAdmin] EXPO_PUBLIC_ADMIN_EMAIL is not set — admin login will not route to the admin dashboard.',
      );
    }
    return false;
  }
  return (email ?? '').trim().toLowerCase() === adminEmail;
}

/** Supabase Auth app_metadata.role — set on the admin user in the dashboard. */
export function isPlatformAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.role === 'platform_admin') return true;
  return isPlatformAdminEmail(user.email);
}
