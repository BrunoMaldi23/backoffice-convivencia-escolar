<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useCreateProtocol, useProtocols, usePublishProtocolVersion } from '@/composables/useAdmin';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { formatDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { ProtocolTemplate, ProtocolVersion } from '@/types/api';

/**
 * Catálogo institucional de protocolos. La API lista solo las versiones PUBLICADAS; un protocolo nuevo nace como borrador y debe
 * publicarse para poder aplicarse a expedientes. Como los borradores no se pueden listar, la publicación se ofrece justo al crearlo.
 * El contenido es JSON libre; la interfaz lo guarda como `{ descripcion, etapas: [...] }` y muestra cualquier otra estructura tal cual.
 */
const { can } = useSession();
const establishment = useEstablishmentContext();
const query = useProtocols(establishment.currentId);
const create = useCreateProtocol();
const publish = usePublishProtocolVersion();

const createOpen = ref(false);
const form = reactive({ code: '', name: '', title: 'Versión 1', description: '', stages: '' });
const errors = ref<Record<string, string>>({});
const draft = ref<{ template: ProtocolTemplate; version: ProtocolVersion } | null>(null);
const viewing = ref<{ template: ProtocolTemplate; version: ProtocolVersion } | null>(null);
const viewOpen = computed({ get: () => Boolean(viewing.value), set: (v: boolean) => { if (!v) viewing.value = null; } });
const publishOpen = ref(false);

const stagesOf = (content: unknown): string[] | null => (content && typeof content === 'object' && Array.isArray((content as { etapas?: unknown }).etapas) ? ((content as { etapas: unknown[] }).etapas.map(String)) : null);
const descriptionOf = (content: unknown): string | null => (content && typeof content === 'object' && typeof (content as { descripcion?: unknown }).descripcion === 'string' ? (content as { descripcion: string }).descripcion : null);

function openCreate() { Object.assign(form, { code: '', name: '', title: 'Versión 1', description: '', stages: '' }); errors.value = {}; draft.value = null; create.reset(); createOpen.value = true; }
async function submit() {
  errors.value = validateAll(form, { code: [required('Escriba el código.'), minLength(2), maxLength(40)], name: [required('Escriba el nombre.'), minLength(3), maxLength(180)], title: [required('Escriba el título de la versión.'), minLength(3), maxLength(180)], description: [maxLength(4000)], stages: [required('Indique al menos una etapa (una por línea).'), maxLength(8000)] }) as Record<string, string>;
  if (Object.keys(errors.value).length || !establishment.currentId.value) return;
  const etapas = form.stages.split('\n').map((s) => s.trim()).filter(Boolean);
  try {
    const template = await create.mutateAsync({ establishmentId: establishment.currentId.value, code: form.code.trim(), name: form.name.trim(), title: form.title.trim(), content: { descripcion: form.description.trim(), etapas } });
    draft.value = { template, version: template.versions[0]! };
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <div>
    <PageHeader title="Protocolos" description="Catálogo institucional de protocolos de actuación. Se aplican a cada expediente desde su pestaña Protocolos.">
      <template #actions>
        <Select v-if="establishment.options.value.length > 1" :model-value="establishment.currentId.value" :options="establishment.options.value" option-label="label" option-value="value" aria-label="Establecimiento" @update:model-value="establishment.select" />
        <Button v-if="can('protocols.manage')" label="Nuevo protocolo" :disabled="!establishment.currentId.value" @click="openCreate"><template #icon><AppIcon name="plus" :size="16" /></template></Button>
      </template>
    </PageHeader>

    <div v-if="!establishment.currentId.value && !establishment.isPending.value" class="rounded-xl border border-slate-200 bg-white">
      <EmptyState icon="building" title="No se pudo determinar el establecimiento" description="Su rol no puede consultar los establecimientos y todavía no tiene expedientes a los que deducirlo." />
    </div>
    <div v-else :class="query.data.value?.length ? '' : 'rounded-xl border border-slate-200 bg-white'">
      <QueryState :data="query.data.value" :is-pending="query.isPending.value || establishment.isPending.value" :error="query.error.value" empty-icon="list-checks" empty-title="No hay protocolos publicados" empty-description="Cree un protocolo y publíquelo para poder aplicarlo a los expedientes." subject="los protocolos" @retry="query.refetch()">
        <template #default="{ data }">
          <ul class="grid gap-4 lg:grid-cols-2">
            <li v-for="template in data" :key="template.id">
              <SectionCard dense :title="template.name" :description="`Código ${template.code}`" class="h-full">
                <ul class="space-y-2">
                  <li v-for="version in template.versions" :key="version.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                    <span class="text-sm text-slate-700">Versión {{ version.version }}: {{ version.title }} <span class="block text-xs text-slate-500">Publicada el {{ formatDate(version.publishedAt) }}</span></span>
                    <span class="flex items-center gap-2"><StatusBadge :status="version.status" /><Button label="Ver" size="small" severity="secondary" text @click="viewing = { template, version }" /></span>
                  </li>
                </ul>
              </SectionCard>
            </li>
          </ul>
        </template>
      </QueryState>
    </div>

    <MutationDialog v-model:visible="createOpen" :header="draft ? 'Protocolo creado' : 'Nuevo protocolo'" submit-label="Crear borrador" width="38rem" :pending="create.isPending.value" :error="draft ? null : create.error.value" @submit="submit">
      <template v-if="draft">
        <Message severity="warn" :closable="false">
          «{{ draft.template.name }}» se creó como <strong>borrador</strong>. Mientras no se publique no aparece en el catálogo ni puede aplicarse. La API no permite listar borradores: publíquelo ahora o pida a quien administre la API que lo publique.
        </Message>
        <ApiErrorMessage :error="publish.error.value" />
        <div class="flex justify-end gap-2"><Button type="button" label="Cerrar sin publicar" severity="secondary" text @click="createOpen = false" /><Button type="button" label="Publicar ahora" :loading="publish.isPending.value" @click="publishOpen = true" /></div>
      </template>
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField id="pr-code" label="Código" required :error="errors.code"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.code" maxlength="40" :invalid="invalid" class="w-full uppercase" /></template></FormField>
          <FormField id="pr-title" label="Título de la versión" required :error="errors.title"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.title" maxlength="180" :invalid="invalid" class="w-full" /></template></FormField>
        </div>
        <FormField id="pr-name" label="Nombre" required :error="errors.name"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.name" maxlength="180" :invalid="invalid" class="w-full" /></template></FormField>
        <FormField id="pr-desc" label="Descripción" :error="errors.description"><template #default="{ id, invalid }"><Textarea :id="id" v-model="form.description" rows="3" auto-resize maxlength="4000" :invalid="invalid" class="w-full" /></template></FormField>
        <FormField id="pr-stages" label="Etapas" required help="Una etapa por línea, en orden. Los plazos y responsables los define el reglamento interno." :error="errors.stages">
          <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.stages" rows="5" auto-resize :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
        </FormField>
      </template>
    </MutationDialog>

    <ConfirmActionDialog
      v-model:visible="publishOpen" header="Publicar protocolo" confirm-label="Publicar"
      message="Al publicar, la versión queda disponible en el catálogo y puede aplicarse a expedientes. Verifique su contenido antes de continuar."
      :action="() => publish.mutateAsync({ versionId: draft!.version.id, establishmentId: establishment.currentId.value! }).then(() => { createOpen = false; })"
    />

    <Dialog v-model:visible="viewOpen" :header="viewing?.template.name" modal :draggable="false" :style="{ width: '34rem' }" :breakpoints="{ '640px': 'calc(100vw - 2rem)' }">
      <template v-if="viewing">
        <p class="text-xs text-slate-500">Versión {{ viewing.version.version }}: {{ viewing.version.title }}</p>
        <p v-if="descriptionOf(viewing.version.content)" class="mt-3 whitespace-pre-line text-sm text-slate-700">{{ descriptionOf(viewing.version.content) }}</p>
        <ol v-if="stagesOf(viewing.version.content)" class="mt-4 space-y-2">
          <li v-for="(stage, index) in stagesOf(viewing.version.content)" :key="index" class="flex gap-3 text-sm text-slate-800"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold tabular-nums text-slate-700">{{ index + 1 }}</span>{{ stage }}</li>
        </ol>
        <pre v-else class="mt-4 max-h-80 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">{{ JSON.stringify(viewing.version.content, null, 2) }}</pre>
      </template>
    </Dialog>
  </div>
</template>
