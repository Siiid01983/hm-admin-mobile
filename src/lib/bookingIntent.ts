import type { Band } from '@/api/calendar';

// Lightweight, heuristic "chat-to-booking" parser. It recognises an admin
// command that STARTS with a booking verb (Book / Reserve / 予約 …) and carries
// a date or a time, then extracts a YYYY-MM-DD date and a time band. It is
// intentionally conservative (start-anchored + requires a date/time) so normal
// replies like "予約ありがとうございます" don't trigger it. The Confirm modal is
// the safety net — the admin always verifies before anything is booked.

export interface BookingIntent {
  isBooking: boolean;
  date?: string; // YYYY-MM-DD
  band?: Band;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Command must begin with a booking verb (EN or JP).
const INTENT_START = /^\s*(book|reserve|booking|schedule|予約|ブック|スケジュール)/i;

function bandFromHour(h: number): Band | undefined {
  if (h >= 8 && h < 12) return 'am';
  if (h >= 12 && h < 15) return 'pm';
  if (h >= 15 && h < 18) return 'ev';
  if (h >= 18 && h < 21) return 'nt';
  return undefined;
}

// A date this-or-next month for a bare day; next occurrence for a month+day.
function dayThisOrNextMonth(day: number, base: Date): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), day);
  return d < startOfDay(base) ? new Date(base.getFullYear(), base.getMonth() + 1, day) : d;
}
function nextOccurrence(month1: number, day: number, base: Date): Date {
  const d = new Date(base.getFullYear(), month1 - 1, day);
  return d < startOfDay(base) ? new Date(base.getFullYear() + 1, month1 - 1, day) : d;
}

function extractBand(text: string): Band | undefined {
  const t = text.toLowerCase();
  if (/午前|morning/.test(t)) return 'am';
  if (/午後|afternoon/.test(t)) return 'pm';
  if (/夕方|evening/.test(t)) return 'ev';
  if (/夜間|夜|night/.test(t)) return 'nt';

  // JP hour: 9時 / 13時
  let m = t.match(/(\d{1,2})\s*時/);
  if (m) return bandFromHour(parseInt(m[1], 10));

  // clock or "at H": 13:00, at 9, 9am, 3pm
  m = t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/) || t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    const ap = m[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return bandFromHour(h);
  }

  // Number attached to am/pm: 9am / 3pm
  m = t.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[2] === 'pm' && h < 12) h += 12;
    if (m[2] === 'am' && h === 12) h = 0;
    return bandFromHour(h);
  }
  return undefined;
}

function extractDate(text: string): string | undefined {
  const now = new Date();
  const t = text.toLowerCase();

  if (/明後日|day after tomorrow/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return iso(d);
  }
  if (/明日|tomorrow/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  if (/今日|today/.test(t)) return iso(now);

  // ISO 2026-07-20 or 2026/07/20
  let m = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d.getTime())) return iso(d);
  }
  // JP 7月20日
  m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) return iso(nextOccurrence(+m[1], +m[2], now));
  // M/D e.g. 7/20
  m = text.match(/\b(\d{1,2})[/](\d{1,2})\b/);
  if (m) return iso(nextOccurrence(+m[1], +m[2], now));
  // Bare 20日
  m = text.match(/(\d{1,2})\s*日/);
  if (m) return iso(dayThisOrNextMonth(+m[1], now));

  return undefined;
}

export function parseBookingIntent(text: string): BookingIntent {
  if (!text || !INTENT_START.test(text)) return { isBooking: false };
  const date = extractDate(text);
  const band = extractBand(text);
  // Need at least a concrete date or time to act on.
  if (!date && !band) return { isBooking: false };
  return { isBooking: true, date, band };
}
