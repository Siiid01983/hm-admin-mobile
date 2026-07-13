import axios from 'axios';
import { api } from './client';

// Canonical time bands (mirror availability.php / block-slot.php).
export const BANDS = ['am', 'pm', 'ev', 'nt'] as const;
export type Band = (typeof BANDS)[number];

// Raw availability from availability.php.
export type BandAvailability = 'available' | 'reserved';

// Merged UI state: a "reserved" band is either a real customer booking (booked,
// untouchable) or an admin block (blocked, removable) — distinguished by cross-
// referencing block-slot.php's admin_blocked list.
export type BandState = 'available' | 'blocked' | 'booked';

export const BAND_LABELS: Record<Band, string> = {
  am: '午前',
  pm: '午後',
  ev: '夕方',
  nt: '夜間',
};

// Canonical band time windows (mirror hm-api/_slots.php hm_slot_band_label).
export const BAND_TIME_LABELS: Record<Band, string> = {
  am: '9:00〜12:00',
  pm: '12:00〜15:00',
  ev: '15:00〜18:00',
  nt: '18:00〜21:00',
};

// availability.php and block-slot.php use their OWN envelopes (not rest.php's
// { ok, data, error }) — model each precisely.
interface AvailabilityResponse {
  ok: boolean;
  date: string;
  bands: Record<Band, BandAvailability>;
  error?: string;
}
interface BlockListResponse {
  ok: boolean;
  action: string;
  date: string;
  blocked: Band[];
  error?: string;
}
interface BlockActionResponse {
  ok: boolean;
  action: string;
  date: string;
  band: Band;
  error?: string;
}

function serverMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

// GET availability.php?date=… → per-band available|reserved.
export async function getAvailability(date: string): Promise<Record<Band, BandAvailability>> {
  const res = await api.get<AvailabilityResponse>('/availability.php', { params: { date } });
  if (!res.data?.ok) throw new Error(res.data?.error || '空き状況の取得に失敗しました');
  return res.data.bands;
}

// GET block-slot.php?action=list&date=… → bands the admin has manually blocked.
export async function listBlocked(date: string): Promise<Band[]> {
  const res = await api.get<BlockListResponse>('/block-slot.php', {
    params: { action: 'list', date },
  });
  if (!res.data?.ok) throw new Error(res.data?.error || 'ブロック情報の取得に失敗しました');
  return Array.isArray(res.data.blocked) ? res.data.blocked : [];
}

// POST block-slot.php {action:block|unblock}. Blocking a slot held by a REAL
// customer booking returns 409 slot_already_reserved — surfaced in JP.
export async function setBandBlocked(date: string, band: Band, block: boolean): Promise<void> {
  try {
    const res = await api.post<BlockActionResponse>('/block-slot.php', {
      action: block ? 'block' : 'unblock',
      date,
      band,
    });
    if (!res.data?.ok) throw new Error(res.data?.error || '更新に失敗しました');
  } catch (e) {
    const msg = serverMessage(e, '更新に失敗しました');
    if (msg.includes('slot_already_reserved')) {
      throw new Error('実際の予約が入っているためブロックできません');
    }
    throw new Error(msg);
  }
}
