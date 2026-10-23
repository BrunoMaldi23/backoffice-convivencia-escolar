# Sistema de diseño

Interfaz institucional, sobria y legible para personal del establecimiento. Predomina el blanco, el azul sky marca las acciones y el slate ordena la información. No hay gradientes, ilustraciones ni sombras pronunciadas.

## Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| Fondo de aplicación | `slate-50` `#F8FAFC` | Área de contenido |
| Superficie | `white` + borde `slate-200` | Tarjetas, tablas, formularios |
| Texto principal | `slate-900` `#0F172A` | Títulos, valores |
| Texto secundario | `slate-600` `#475569` | Descripciones, celdas |
| Primario | `sky-700` `#0369A1` (hover `sky-800`) | Botones, enlaces, foco |
| Panel institucional | `sky-50` | Columna izquierda del ingreso, avisos de privacidad |
| Éxito / advertencia / peligro | `emerald-800` / `amber-800` / `red-800` sobre fondos `-50` | Insignias y mensajes |

El preset de PrimeVue (`src/theme.ts`) mapea su primario a la escala sky, fija el anillo de foco en 2 px `sky-700` y desactiva el modo oscuro automático (la interfaz es solo clara por ahora). PrimeVue vive en la capa CSS `primevue`, entre `base` y `utilities` de Tailwind, para que las utilidades puedan ajustar componentes.

## Tipografía

- Familia: **Public Sans** (400, 500, 600, 700), sans serif de origen gubernamental, institucional y muy legible. Se carga desde Google Fonts con respaldo a la fuente del sistema. Pendiente: alojarla en el propio servidor antes de producción para no depender de terceros.
- Escala: 12 (metadatos), 14 (tablas, formularios), 15 (descripciones), 16 (cuerpo), 28 (título de vista), 34 (título del ingreso).
- Cifras: `tabular-nums` en folios, fechas y contadores.
- Etiquetas en minúscula de oración; no se usan rótulos en mayúsculas.

## Espaciado, radios y superficies

- Contenido con ancho máximo `max-w-7xl` y márgenes 16/24/32 px según el ancho.
- Separación entre secciones de 24 px; relleno interno de tarjetas de 20 px.
- Radios: 8 px en controles, 12 px en tarjetas y tablas, círculos solo en avatares e íconos de estado.
- Sin sombras en tarjetas: la separación la dan el borde y el fondo.

## Componentes

| Componente | Propósito |
| --- | --- |
| `PageHeader` | Título `h1`, descripción, insignias, acciones y enlace de retorno |
| `SectionCard` | Superficie con título y acciones; `flush` para tablas |
| `StatCard` | Indicador numérico; muestra "—" si no hay dato (nunca un número inventado) |
| `StatusBadge` / `PriorityBadge` | Estado con ícono + texto; prioridad con barras de nivel + texto |
| `QueryState`, `LoadingState`, `ErrorState`, `EmptyState` | Los cuatro estados de datos |
| `SearchToolbar` | Búsqueda y filtros en una sola fila |
| `ResourceTable`, `ResourceListPage` | Tablas con orden, paginación y columnas adaptativas |
| `ResourceForm`, `FormField` | Formularios declarativos con validación y resumen de errores |
| `ResourceDetailShell`, `DetailPanel`, `RelatedTable`, `Timeline` | Fichas de detalle |
| `ConfirmActionDialog`, `PendingNotice` | Confirmaciones y resultado honesto de acciones |
| `BarChart` | Barras de una serie, con tooltip, foco de teclado y vista de tabla |
| `InstitutionLogo`, `AppIcon`, `PreviewBadge` | Identidad, iconografía lineal propia y marca de demostración |

`ModulePlaceholder`, `PaginationControls`, `FilterPanel` y un `ConfirmDialog` propio no se crearon: la paginación y los diálogos los cubre PrimeVue, y los filtros viven en `SearchToolbar`.

## Iconografía

`AppIcon` dibuja trazos lineales de 24 px (geometría estilo Lucide, licencia ISC) sin agregar dependencias. Los íconos son decorativos salvo que reciban `label`.

## Estados

Toda vista con datos presenta: **cargando** (esqueleto), **error** (mensaje accionable y "Reintentar"), **integración pendiente** (servicio previsto, sin datos), **vacío** (qué aparecerá y cómo) y **con datos**. Las acciones sin backend están deshabilitadas con `title` explicativo o, si se ejecutan, informan "No se realizó…".

## Accesibilidad (WCAG 2.2 AA)

- Foco visible de 2 px en todo elemento interactivo y enlace "Saltar al contenido".
- Etiquetas asociadas (`for`/`id`), `aria-describedby` para ayuda y errores, resumen de errores enfocable.
- Estados con ícono + texto, nunca solo color; prioridad con barras de forma.
- Botón mostrar/ocultar contraseña con `aria-pressed` y `aria-controls`.
- Tablas con `aria-label`; gráficos con tabla alternativa; matriz de permisos con `caption`, `scope` y texto para lectores.
- `prefers-reduced-motion` desactiva transiciones.

## Breakpoints

| Ancho | Navegación | Contenido |
| --- | --- | --- |
| < 768 px | Drawer con botón de menú; header compacto | Una columna; tablas ocultan columnas secundarias y se desplazan dentro de su contenedor |
| 768–1279 px | Sidebar plegada a íconos (expandible) | Dos columnas donde corresponde |
| ≥ 1280 px | Sidebar completa de 256 px | Grillas de 3–4 columnas |

El ingreso usa dos columnas desde 1024 px y, por debajo, una franja superior con el logo.
