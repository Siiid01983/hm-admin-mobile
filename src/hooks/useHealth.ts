import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '@/api/health';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    staleTime: 10_000,
  });
}
