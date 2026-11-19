import { QueryClient } from '@tanstack/vue-query';

/**
 * Cliente compartido entre la app y la guardia de rutas.
 *
 * Los datos del panel no cambian entre clics consecutivos. Mantenerlos frescos
 * por dos minutos evita volver a esperar la misma consulta al navegar entre
 * vistas. Cada mutación
 * invalida de inmediato sus consultas relacionadas.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000
    }
  }
});
