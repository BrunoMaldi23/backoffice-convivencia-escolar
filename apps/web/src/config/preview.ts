/**
 * Modo de previsualización de interfaz.
 *
 * Solo se activa con `pnpm --filter @backoffice/web dev:preview` (servidor de Vite en modo `ui-preview`).
 * `__UI_PREVIEW__` se reemplaza en compilación (ver `vite.config.ts`): en `vite build` es el literal `false`.
 */
export const isUiPreview: boolean = __UI_PREVIEW__;
