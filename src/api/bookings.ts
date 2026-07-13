import { api } from './client';
import type { ApiEnvelope, Booking } from './types';

// Normalize the hm-api { ok, data, error } envelope's error into a string.
function restError(body: ApiEnvelope<unknown> | undefined, fallback: string): string {
  const err = body?.error;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object' && err.message) return err.message;
  return fallback;
}

// List bookings via the generic rest.php endpoint (PostgREST-style JSON spec).
// The admin panel reads the same table the same way. Envelope: { ok, data, error }.
export async function listBookings(limit = 100): Promise<Booking[]> {
  const res = await api.post<ApiEnvelope<Booking[]>>('/rest.php', {
    table: 'bookings',
    action: 'select',
    columns: '*',
    order: [{ col: 'booking_date', ascending: false }],
    limit,
  });
  const body = res.data;
  if (!body?.ok) throw new Error(restError(body, '予約の取得に失敗しました'));
  return Array.isArray(body.data) ? body.data : [];
}

// Fetch a single booking by id. Returns null when not found.
export async function getBooking(id: string): Promise<Booking | null> {
  const res = await api.post<ApiEnvelope<Booking[]>>('/rest.php', {
    table: 'bookings',
    action: 'select',
    columns: '*',
    filters: [{ col: 'id', op: 'eq', val: id }],
    limit: 1,
  });
  const body = res.data;
  if (!body?.ok) throw new Error(restError(body, '予約の取得に失敗しました'));
  return Array.isArray(body.data) && body.data.length > 0 ? body.data[0] : null;
}

// Patch a booking's status. rest.php `update` requires a filter (WHERE id=…) and
// returns SELECT * of the updated row(s). Returns the updated booking.
export async function updateBookingStatus(id: string, status: string): Promise<Booking> {
  const res = await api.post<ApiEnvelope<Booking[]>>('/rest.php', {
    table: 'bookings',
    action: 'update',
    values: { status },
    filters: [{ col: 'id', op: 'eq', val: id }],
  });
  const body = res.data;
  if (!body?.ok) throw new Error(restError(body, 'ステータスの更新に失敗しました'));
  const row = Array.isArray(body.data) ? body.data[0] : null;
  if (!row) throw new Error('更新後の予約が見つかりません');
  return row;
}
