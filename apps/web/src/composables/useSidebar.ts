import { ref } from 'vue';

/** Estado de interfaz de la navegación lateral, compartido entre header y sidebar. No contiene datos personales. */
const collapsed = ref(false);
const mobileOpen = ref(false);

export function useSidebar() {
  return {
    collapsed,
    mobileOpen,
    toggleCollapsed: () => (collapsed.value = !collapsed.value),
    openMobile: () => (mobileOpen.value = true),
    closeMobile: () => (mobileOpen.value = false)
  };
}
