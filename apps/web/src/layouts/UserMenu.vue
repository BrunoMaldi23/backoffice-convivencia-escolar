<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Popover from 'primevue/popover';
import AppIcon from '@/components/AppIcon.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import { useLogout, useSession } from '@/composables/useSession';
import { initials } from '@/lib/format';
import { roleLabel } from '@/lib/roles';

/**
 * Menú de usuario. Solo muestra datos de la sesión real; en previsualización indica explícitamente
 * que no hay una sesión iniciada en lugar de inventar una persona.
 */
const { user, isPreview } = useSession();
const logout = useLogout();
const router = useRouter();
const panel = ref<InstanceType<typeof Popover> | null>(null);

function signOut() {
  logout.mutate(undefined, { onSuccess: () => router.replace({ name: 'login' }) });
}
</script>

<template>
  <div>
    <button
      type="button" class="flex items-center gap-2 rounded-lg p-1 pr-2 text-left hover:bg-slate-100" aria-haspopup="dialog"
      :aria-label="user ? `Menú de ${user.displayName}` : 'Menú de usuario'" @click="panel?.toggle($event)"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
        <template v-if="user">{{ initials(user.displayName) }}</template>
        <AppIcon v-else name="user" :size="16" />
      </span>
      <span class="hidden min-w-0 leading-tight lg:block">
        <span class="block max-w-40 truncate text-sm font-medium text-slate-900">{{ user?.displayName ?? (isPreview ? 'Sin sesión' : 'Usuario') }}</span>
        <span class="block max-w-40 truncate text-xs text-slate-500">{{ user ? user.roles.map(roleLabel).join(', ') : isPreview ? 'Previsualización' : '' }}</span>
      </span>
      <AppIcon name="chevron-down" :size="15" class="hidden text-slate-500 lg:block" />
    </button>

    <Popover ref="panel" :pt="{ content: { class: 'p-0' } }">
      <div class="w-72">
        <div class="border-b border-slate-100 px-4 py-3">
          <template v-if="user">
            <p class="truncate text-sm font-semibold text-slate-900">{{ user.displayName }}</p>
            <p class="truncate text-xs text-slate-500">{{ user.email }}</p>
          </template>
          <template v-else>
            <p class="text-sm font-semibold text-slate-900">Sin sesión iniciada</p>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">Modo de previsualización: el nombre y los roles aparecerán al conectar la autenticación.</p>
          </template>
        </div>
        <ul class="p-1.5 text-sm">
          <li>
            <RouterLink :to="{ name: 'settings', query: { seccion: 'perfil' } }" class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-700 hover:bg-slate-100" @click="panel?.hide()">
              <AppIcon name="user" :size="16" class="text-slate-500" />Mi perfil
            </RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'settings', query: { seccion: 'seguridad' } }" class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-700 hover:bg-slate-100" @click="panel?.hide()">
              <AppIcon name="lock" :size="16" class="text-slate-500" />Seguridad de la cuenta
            </RouterLink>
          </li>
          <li class="mt-1 border-t border-slate-100 pt-1">
            <button type="button" class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-red-800 hover:bg-red-50 disabled:opacity-60" :disabled="logout.isPending.value" @click="signOut">
              <AppIcon name="log-out" :size="16" />Cerrar sesión
            </button>
          </li>
        </ul>
        <div v-if="logout.error.value" class="px-3 pb-3"><PendingNotice :error="logout.error.value" action="el cierre de sesión" /></div>
      </div>
    </Popover>
  </div>
</template>
