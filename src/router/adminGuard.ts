import { useUserStore } from '../stores/auth';

export async function resolveAdminAccess(): Promise<true | { name: 'login' | 'dashboard' }> {
  const auth = useUserStore();
  if (!auth.isAuthenticated) return { name: 'login' };
  try {
    await auth.ensureCurrentUser(true);
    if (auth.isAdmin) return true;
  } catch {
    // Account loading failed: keep the admin page unavailable until a successful retry.
  }
  return { name: auth.isAuthenticated ? 'dashboard' : 'login' };
}
