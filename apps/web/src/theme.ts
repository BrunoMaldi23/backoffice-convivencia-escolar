import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Preset institucional: Aura con azul sky como primario y foco visible de 2 px. */
export const InstitucionalPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}', 100: '{sky.100}', 200: '{sky.200}', 300: '{sky.300}', 400: '{sky.400}', 500: '{sky.500}',
      600: '{sky.600}', 700: '{sky.700}', 800: '{sky.800}', 900: '{sky.900}', 950: '{sky.950}'
    },
    focusRing: { width: '2px', style: 'solid', color: '{sky.700}', offset: '2px' },
    formField: { borderRadius: '8px' },
    colorScheme: {
      light: {
        primary: { color: '{sky.700}', contrastColor: '#ffffff', hoverColor: '{sky.800}', activeColor: '{sky.900}' },
        highlight: { background: '{sky.50}', focusBackground: '{sky.100}', color: '{sky.800}', focusColor: '{sky.900}' },
        formField: { borderColor: '{slate.300}', hoverBorderColor: '{slate.400}', placeholderColor: '{slate.500}' }
      }
    }
  }
});

/** Textos de PrimeVue en español de Chile (calendarios, tablas y filtros). */
export const localeEsCl = {
  accept: 'Aceptar', reject: 'Cancelar', choose: 'Elegir', upload: 'Subir', cancel: 'Cancelar', clear: 'Limpiar', apply: 'Aplicar',
  dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  today: 'Hoy', weekHeader: 'Sem', firstDayOfWeek: 1, dateFormat: 'dd-mm-yy', weak: 'Débil', medium: 'Media', strong: 'Fuerte',
  passwordPrompt: 'Ingrese una contraseña', emptyFilterMessage: 'Sin resultados', emptyMessage: 'Sin opciones disponibles',
  emptySearchMessage: 'Sin resultados', emptySelectionMessage: 'Sin elementos seleccionados', selectionMessage: '{0} elementos seleccionados',
  searchMessage: '{0} resultados disponibles', aria: { close: 'Cerrar', previous: 'Anterior', next: 'Siguiente', navigation: 'Navegación' }
};
