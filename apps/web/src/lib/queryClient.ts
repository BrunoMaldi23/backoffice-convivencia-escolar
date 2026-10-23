import { QueryClient } from '@tanstack/vue-query';

/** Cliente compartido entre la app y la guardia de rutas. */
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
