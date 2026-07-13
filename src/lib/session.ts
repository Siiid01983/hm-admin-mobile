import * as SecureStore from 'expo-secure-store';
import type { AdminUser } from '@/api/types';

const TOKEN_KEY = 'hm_admin_token';
const EXP_KEY = 'hm_admin_token_exp';
const USER_KEY = 'hm_admin_user';

export interface StoredSession {
  token: string;
  exp: number; // epoch seconds
  user: AdminUser | null;
}

export async function saveSession(s: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, s.token);
  await SecureStore.setItemAsync(EXP_KEY, String(s.exp));
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(s.user ?? null));
}

// Returns a live (non-expired) token, or null. Clears the session on expiry so
// the app falls back to the login screen.
export async function getToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;
  const expRaw = await SecureStore.getItemAsync(EXP_KEY);
  const exp = expRaw ? parseInt(expRaw, 10) : 0;
  if (exp && exp * 1000 < Date.now()) {
    await clearSession();
    return null;
  }
  return token;
}

export async function getSession(): Promise<StoredSession | null> {
  const token = await getToken();
  if (!token) return null;
  const expRaw = await SecureStore.getItemAsync(EXP_KEY);
  const userRaw = await SecureStore.getItemAsync(USER_KEY);
  return {
    token,
    exp: expRaw ? parseInt(expRaw, 10) : 0,
    user: userRaw ? (JSON.parse(userRaw) as AdminUser) : null,
  };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(EXP_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
