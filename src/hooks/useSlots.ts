import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reserveBookingSlot, reserveBookingInterval, releaseBookingSlot } from '@/api/slots';

// Reserve/reschedule a booking's band slot. Invalidates that day's availability
// and the bookings list so the UI reflects the new hold.
export function useReserveSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { bookingId: string; date: string; band: string }) =>
      reserveBookingSlot(v.bookingId, v.date, v.band),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ['availability', v.date] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', v.bookingId] });
    },
  });
}

// HOURLY: reserve a booking to a specific [start,end) interval (admin-defined).
export function useReserveInterval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { bookingId: string; start: string; end: string }) =>
      reserveBookingInterval(v.bookingId, v.start, v.end),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ['booking', v.bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useReleaseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => releaseBookingSlot(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
