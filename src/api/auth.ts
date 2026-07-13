import { api } from './client';
import { saveSession, clearSession, type StoredSession } from '@/lib/session';
import type { ApiEnvelope, AdminUser } from './types';

interface LoginData {
  token: string;
  exp: number;
  user?: AdminUser;
  mustChange?: boolean;
}

function envelopeError(body: ApiEnvelope<unknown> | undefined, fallback: string): string {
  const err = body?.error;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object' && err.message) return err.message;
  return fallback;
}

// POST admin-login.php { action:'login', email, password }.
// Reuses the EXISTING backend auth: on success the server mints the same HMAC
// admin token the web panel uses; we persist it in SecureStore.
export async function login(email: string, password: string): Promise<StoredSession> {
  const res = await api.post<ApiEnvelope<LoginData>>('/admin-login.php', {
    action: 'login',
    email: email.trim().toLowerCase(),
    password,
  });
  const body = res.data;
  if (!body?.ok || !body.data?.token) {
    throw new Error(envelopeError(body, 'ログインに失敗しました'));
  }
  const d = body.data;
  const session: StoredSession = {
    token: d.token,
    exp: Number(d.exp) || 0,
    user: d.user
      ? { id: d.user.id, email: d.user.email, name: d.user.name, role: d.user.role }
      : null,
  };
  await saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/admin-logout.php', { action: 'logout' });
  } catch {
    // best-effort: clear locally even if the network call fails
  }
  await clearSession();
}
