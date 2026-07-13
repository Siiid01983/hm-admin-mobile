import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBooking, listBookings, updateBookingStatus } from '@/api/bookings';

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => listBookings(),
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
