import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAvailability,
  listBlocked,
  setBandBlocked,
  BANDS,
  type Band,
  type BandState,
} from '@/api/calendar';

// Merge raw availability with the admin-block list into a single per-band state:
//   reserved + admin-blocked → 'blocked' (removable)
//   reserved + not blocked   → 'booked'  (real customer reservation)
//   available                → 'available'
export function useDayAvailability(date: string | undefined) {
  return useQuery({
    queryKey: ['availability', date],
    enabled: !!date,
    staleTime: 15_000,
    queryFn: async (): Promise<Record<Band, BandState>> => {
      const [bands, blocked] = await Promise.all([
        getAvailability(date as string),
        listBlocked(date as string),
      ]);
      const blockedSet = new Set<Band>(blocked);
      const out = {} as Record<Band, BandState>;
      for (const b of BANDS) {
        if (bands[b] === 'reserved') out[b] = blockedSet.has(b) ? 'blocked' : 'booked';
        else out[b] = 'available';
      }
      return out;
    },
  });
}

export function useToggleBlock(date: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ band, block }: { band: Band; block: boolean }) =>
      setBandBlocked(date as string, band, block),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', date] });
    },
  });
}
