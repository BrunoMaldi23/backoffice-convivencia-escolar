import type { ResourceMap, ResourceName } from '@/types/models';

/**
 * Cargador de datos sintéticos. Es `null` fuera del modo de previsualización.
 * Se usa `__UI_PREVIEW__` directamente (no una constante importada) para que, en `vite build`,
 * la rama quede como `false ? … : null` y el import dinámico de `demo-data` se elimine del paquete.
 */
export const loadDemo: (<K extends ResourceName>(key: K) => Promise<ResourceMap[K]>) | null = __UI_PREVIEW__
  ? async (key) => {
      const { demo } = await import('./demo-data');
      await new Promise((resolve) => setTimeout(resolve, 300));
      return demo[key];
    }
  : null;
