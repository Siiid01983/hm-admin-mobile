import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBooking,
  listBookings,
  listBookingsByDate,
  updateBooking,
  updateBookingStatus,
  type BookingPatch,
} from '@/api/bookings';

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => listBookings(),
    staleTime: 30_000,
  });
}

export function useBookingsByDate(date: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'date', date],
    queryFn: () => listBookingsByDate(date as string),
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id as string),
    enabled: !!id,
  });
}

// Status mutation — on success, seed the detail cache with the fresh row and
// invalidate the list so the badge updates everywhere.
export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBookingStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData(['booking', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Generic field update (booking_date / notes / status) for the Quick Edit modal.
export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BookingPatch }) => updateBooking(id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(['booking', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
