<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import InstitutionLogo from '@/components/InstitutionLogo.vue';
import { useSession } from '@/composables/useSession';
import { NAVIGATION, type NavItem } from '@/router/navigation';

/** `rail` muestra solo íconos (tablet plegada). En móvil el mismo componente vive dentro de un Drawer. */
const props = withDefaults(defineProps<{ rail?: boolean }>(), { rail: false });
const emit = defineEmits<{ navigate: [] }>();
const route = useRoute();
const { can, isPreview } = useSession();

/** En previsualización se muestran los ítems restringidos con candado; con sesión real, solo los permitidos. */
const groups = computed(() =>
  NAVIGATION.map((g) => ({ ...g, items: g.items.filter((i) => isPreview || can(i.permission)) })).filter((g) => g.items.length)
);
const isActive = (item: NavItem) => (item.to === '/' ? route.path === '/' : route.path === item.to || route.path.startsWith(`${item.to}/`));
const restricted = (item: NavItem) => Boolean(item.permission) && !can(item.permission);
const linkClass = (item: NavItem) => [
  'group flex items-center gap-3 rounded-lg text-sm transition-colors',
  props.rail ? 'h-10 w-10 justify-center' : 'px-3 py-2',
  isActive(item) ? 'bg-sky-50 font-semibold text-sky-800' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
];
</script>

<template>
  <div class="flex h-full flex-col">
    <RouterLink to="/" :class="['flex items-center gap-3 border-b border-slate-200', rail ? 'justify-center px-2 py-4' : 'px-5 py-4']" @click="emit('navigate')">
      <InstitutionLogo variant="emblem" :size="rail ? 32 : 44" />
      <span v-if="!rail" class="min-w-0 leading-tight">
        <span class="block text-sm font-semibold text-slate-900">Convivencia Escolar</span>
        <span class="block text-xs text-slate-500">Panel institucional</span>
      </span>
    </RouterLink>

    <nav aria-label="Navegación principal" :class="['flex-1 overflow-y-auto', rail ? 'px-2 py-3' : 'px-3 py-4']">
      <div v-for="(group, gi) in groups" :key="group.label" :class="gi ? (rail ? 'mt-3 border-t border-slate-100 pt-3' : 'mt-5') : ''">
        <p v-if="!rail" :id="`nav-${gi}`" class="mb-1 px-3 text-xs font-semibold text-slate-500">{{ group.label }}</p>
        <ul :aria-labelledby="rail ? undefined : `nav-${gi}`" :aria-label="rail ? group.label : undefined" :class="['space-y-0.5', rail ? 'flex flex-col items-center' : '']">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to" :class="linkClass(item)" :aria-current="isActive(item) ? 'page' : undefined"
              :aria-label="rail ? item.label : undefined" :title="rail ? item.label : undefined" @click="emit('navigate')"
            >
              <AppIcon :name="item.icon" :size="18" :class="isActive(item) ? 'text-sky-700' : 'text-slate-500 group-hover:text-slate-700'" />
              <template v-if="!rail">
                <span class="flex-1 truncate">{{ item.label }}</span>
                <AppIcon v-if="restricted(item)" name="lock" :size="14" class="text-slate-400" label="Requiere permiso" />
              </template>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <p v-if="!rail && isPreview" class="border-t border-slate-200 px-5 py-3 text-xs leading-relaxed text-slate-500">
      Los ítems con candado requieren permisos que se validarán con el sistema de roles.
    </p>
  </div>
</template>
