import { useQuery } from '@tanstack/react-query';

// La lista de usuarios la consumen dos lugares: la sección Usuarios y el
// badge del sidebar. Comparten la misma queryKey para que React Query
// haga una sola petición y ambos vean el mismo dato.
export function useUsuarios(api, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.request('/api/usuarios').then((d) => (d.ok && Array.isArray(d.usuarios) ? d.usuarios : [])),
    enabled,
  });
}
