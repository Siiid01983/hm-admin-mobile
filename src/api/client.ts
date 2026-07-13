import axios from 'axios';
import { router } from 'expo-router';
import { API_BASE, API_KEY } from './config';
import { getToken, clearSession } from '@/lib/session';

// Shared axios instance against the existing hm-api backend. Every request gets
// the public X-API-KEY; admin requests additionally get the X-ADMIN-TOKEN from
// the stored session (mirrors the website's js/core/auth.js header behaviour).
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['X-ADMIN-TOKEN'] = token;
  }
  return config;
});

// Auth endpoints must NOT trigger the global auto-logout (a bad-credentials 401
// on login would otherwise bounce the user mid-attempt).
const AUTH_PATHS = ['/admin-login.php', '/admin-logout.php'];

// Global session-expiry handler. The backend answers 401 with error.code
// 'admin_required' when the admin token is invalid/expired/revoked (server-side
// token invalidation the client-side expiry check can't catch). Drop the stale
// session and send the user to login. A 401 'api_key' is a config problem, not a
// session issue, so it is intentionally left alone.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
      const isAuthCall = AUTH_PATHS.some((p) => url.includes(p));
      if (status === 401 && code !== 'api_key' && !isAuthCall) {
        await clearSession();
        router.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);
