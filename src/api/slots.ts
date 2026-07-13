import axios from 'axios';
import { api } from './client';

interface SlotResponse {
  ok: boolean;
  error?: string;
  band?: string;
  date?: string;
  released?: number;
}

// Thrown when the target band is already held by another booking / admin block
// (server answers HTTP 409 slot_taken). The UI shows "Time Slot Occupied".
export class SlotConflictError extends Error {
  constructor(message = 'この時間帯は既に予約されています') {
    super(message);
    this.name = 'SlotConflictError';
  }
}

function handleSlotError(e: unknown, fallback: string): never {
  if (e instanceof SlotConflictError) throw e;
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as SlotResponse | undefined;
    if (e.response?.status === 409 || data?.error === 'slot_taken') throw new SlotConflictError();
    if (data?.error) throw new Error(data.error);
  }
  throw new Error(e instanceof Error ? e.message : fallback);
}

// Reserve (or reschedule) a booking's band slot via booking-slot.php. The server
// does an ATOMIC release+reserve+date-sync; a band held by another booking →
// SlotConflictError. Used for both confirm and reschedule.
export async function reserveBookingSlot(bookingId: string, date: string, band: string): Promise<void> {
  try {
    const res = await api.post<SlotResponse>('/booking-slot.php', {
      action: 'reserve',
      booking_id: bookingId,
      date,
      band,
    });
    if (!res.data?.ok) {
      if (res.data?.error === 'slot_taken') throw new SlotConflictError();
      throw new Error(res.data?.error || '予約に失敗しました');
    }
  } catch (e) {
    handleSlotError(e, '予約に失敗しました');
  }
}

// Free every slot a booking holds (reject / cancel).
export async function releaseBookingSlot(bookingId: string): Promise<void> {
  try {
    const res = await api.post<SlotResponse>('/booking-slot.php', {
      action: 'release',
      booking_id: bookingId,
    });
    if (!res.data?.ok) throw new Error(res.data?.error || '解放に失敗しました');
  } catch (e) {
    handleSlotError(e, '解放に失敗しました');
  }
}
