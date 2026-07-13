import axios from 'axios';
import { api } from './client';

export interface HealthDiag {
  php?: string;
  php_id?: number;
  sapi?: string;
  ext?: Record<string, boolean>;
}

// Normalized health result — checkHealth() never throws, so the UI can render a
// definite state (reachable but degraded vs. fully offline).
export interface HealthResult {
  reachable: boolean; // got any HTTP response at all
  ok: boolean; // server reported ok:true
  db: boolean; // DB reachable
  time?: string;
  diag?: HealthDiag; // admin-only block (present when X-ADMIN-TOKEN is valid)
  error?: string;
}

interface HealthResponse {
  ok?: boolean;
  db?: boolean;
  time?: string;
  diag?: HealthDiag;
  error?: string;
}

// GET index.php — the API health endpoint. A DB-down server still answers JSON
// with HTTP 500, so we read the body on error too; only a missing response
// (network failure) is treated as unreachable.
export async function checkHealth(): Promise<HealthResult> {
  try {
    const res = await api.get<HealthResponse>('/index.php');
    const d = res.data ?? {};
    return { reachable: true, ok: !!d.ok, db: !!d.db, time: d.time, diag: d.diag };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      const d = (e.response.data ?? {}) as HealthResponse;
      return {
        reachable: true,
        ok: false,
        db: !!d.db,
        error: d.error || `HTTP ${e.response.status}`,
      };
    }
    return {
      reachable: false,
      ok: false,
      db: false,
      error: e instanceof Error ? e.message : 'ネットワークエラー',
    };
  }
}
