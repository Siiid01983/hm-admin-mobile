import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/session';

// Session as a query so Settings can pull-to-refresh and so logout can drop it
// from the cache cleanly.
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
  });
}
