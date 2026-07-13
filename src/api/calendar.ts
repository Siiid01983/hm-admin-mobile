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

// Band → [startHour, endHour) — for placing blocks on an hourly grid.
export const BAND_HOURS: Record<Band, { start: number; end: number }> = {
  am: { start: 9, end: 12 },
  pm: { start: 12, end: 15 },
  ev: { start: 15, end: 18 },
  nt: { start: 18, end: 21 },
};

// Client mirror of hm-api/_slots.php hm_slot_band_from_notes: a booking's band
// derived from the packed `time:` line in its notes (keyword or first hour).
export function bandFromNotes(notes: string | null | undefined): Band | null {
  if (!notes) return null;
  const m = notes.match(/^time:\s*(.+)$/m);
  if (!m) return null;
  return bandFromTimeString(m[1].trim());
}

export function bandFromTimeString(t: string): Band | null {
  if (t.includes('午前')) return 'am';
  if (t.includes('午後')) return 'pm';
  if (t.includes('夕方')) return 'ev';
  if (t.includes('夜間')) return 'nt';
  if (t.includes('時間指定なし')) return null;
  const hm = t.match(/(\d{1,2})\s*[:：時]/u);
  if (hm) return bandForHour(parseInt(hm[1], 10));
  return null;
}

// Which band an hour-of-day falls into (grid cell taps). null outside 8–21.
export function bandForHour(h: number): Band | null {
  if (h >= 8 && h < 12) return 'am';
  if (h >= 12 && h < 15) return 'pm';
  if (h >= 15 && h < 18) return 'ev';
  if (h >= 18 && h < 21) return 'nt';
  return null;
}

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
