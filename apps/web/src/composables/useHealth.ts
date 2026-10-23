import { useQuery } from '@tanstack/vue-query';
import { getHealth } from '@/services/api';
export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: getHealth, retry: false });
