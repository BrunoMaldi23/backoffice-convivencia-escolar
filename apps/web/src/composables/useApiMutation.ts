import { useMutation, useQueryClient, type QueryKey } from '@tanstack/vue-query';

/**
 * Mutación contra la API. Al terminar bien invalida las consultas indicadas (por prefijo), de modo que las vistas
 * recarguen los datos reales del servidor; nunca se actualizan datos "a ojo" en memoria.
 */
export function useApiMutation<Vars, Data>(fn: (vars: Vars) => Promise<Data>, invalidate: (data: Data, vars: Vars) => QueryKey[] = () => []) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await Promise.all(invalidate(data, vars).map((queryKey) => client.invalidateQueries({ queryKey })));
    }
  });
}

/** Invalida un expediente completo (detalle, línea de tiempo y contenido), los listados y los agregados entre expedientes. */
export const caseScope = (caseId: string): QueryKey[] => [['case', caseId], ['cases'], ['scoped'], ['notifications']];
