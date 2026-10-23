<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useResourceSubmit } from '@/composables/useResource';
import { formatRut } from '@/lib/rut';
import { email, required, rut, validate, type Rule } from '@/lib/validation';
import type { ResourceName } from '@/types/models';
import FormField from './FormField.vue';
import PendingNotice from './PendingNotice.vue';
import type { FormFieldDef, FormSectionDef } from './types';

/**
 * Formulario declarativo por secciones. Valida en el cliente y envía a través del servicio del recurso;
 * mientras no exista endpoint, informa que no se guardó nada. Los valores viven solo en memoria.
 */
const props = withDefaults(defineProps<{
  sections: FormSectionDef[]; resource: ResourceName; method?: 'POST' | 'PATCH'; submitLabel: string; actionName: string;
  cancelTo: RouteLocationRaw; initial?: Record<string, unknown>; idPrefix?: string;
}>(), { method: 'POST', initial: () => ({}), idPrefix: 'f' });

const fields = computed(() => props.sections.flatMap((s) => s.fields));
const values = reactive<Record<string, unknown>>(Object.fromEntries(fields.value.map((f) => [f.name, props.initial[f.name] ?? (f.type === 'multiselect' ? [] : null)])));
const errors = reactive<Record<string, string | null>>({});
const submitted = ref(false);
const summary = ref<HTMLElement | null>(null);
const mutation = useResourceSubmit(props.resource, props.method);

const rulesFor = (f: FormFieldDef): Rule[] => [
  ...(f.required ? [required()] : []), ...(f.type === 'email' ? [email()] : []), ...(f.type === 'rut' ? [rut()] : [])
];
const errorCount = computed(() => Object.values(errors).filter(Boolean).length);
const fieldId = (name: string) => `${props.idPrefix}-${name}`;

function check(f: FormFieldDef) {
  if (submitted.value) errors[f.name] = validate(values[f.name], rulesFor(f));
}

async function submit() {
  submitted.value = true;
  mutation.reset();
  for (const f of fields.value) errors[f.name] = validate(values[f.name], rulesFor(f));
  if (errorCount.value) {
    await nextTick();
    summary.value?.focus();
    return;
  }
  mutation.mutate();
}
</script>

<template>
  <form novalidate class="space-y-6" @submit.prevent="submit">
    <div v-if="errorCount" ref="summary" tabindex="-1" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p class="font-semibold">Revise {{ errorCount === 1 ? '1 campo' : `${errorCount} campos` }} antes de continuar.</p>
      <ul class="mt-1 list-inside list-disc">
        <li v-for="f in fields.filter((x) => errors[x.name])" :key="f.name"><a :href="`#${fieldId(f.name)}`" class="underline">{{ f.label }}</a>: {{ errors[f.name] }}</li>
      </ul>
    </div>

    <section v-for="section in sections" :key="section.title" class="rounded-xl border border-slate-200 bg-white">
      <header class="border-b border-slate-100 px-5 py-4">
        <h2 class="text-[0.9375rem] font-semibold text-slate-900">{{ section.title }}</h2>
        <p v-if="section.description" class="mt-0.5 text-sm text-slate-600">{{ section.description }}</p>
      </header>
      <div class="grid gap-5 p-5 md:grid-cols-2">
        <FormField
          v-for="f in section.fields" :id="fieldId(f.name)" :key="f.name" :label="f.label" :required="f.required" :help="f.help" :error="errors[f.name]"
          :class="f.full || f.type === 'textarea' ? 'md:col-span-2' : ''"
        >
          <template #default="{ id, invalid, describedby }">
            <Textarea
              v-if="f.type === 'textarea'" :id="id" v-model="values[f.name] as string" :invalid="invalid" :aria-describedby="describedby" :placeholder="f.placeholder"
              rows="4" auto-resize class="w-full" @blur="check(f)"
            />
            <Select
              v-else-if="f.type === 'select'" v-model="values[f.name]" :input-id="id" :options="f.options" option-label="label" option-value="value" option-disabled="disabled"
              :invalid="invalid" :aria-describedby="describedby" :placeholder="f.placeholder ?? 'Seleccione una opción'" class="w-full" @change="check(f)"
            />
            <MultiSelect
              v-else-if="f.type === 'multiselect'" v-model="values[f.name]" :input-id="id" :options="f.options" option-label="label" option-value="value" option-disabled="disabled"
              :invalid="invalid" :aria-describedby="describedby" :placeholder="f.placeholder ?? 'Seleccione una o más opciones'" display="chip" class="w-full" @change="check(f)"
            />
            <DatePicker
              v-else-if="f.type === 'date' || f.type === 'datetime'" v-model="values[f.name] as Date" :input-id="id" :show-time="f.type === 'datetime'" hour-format="24"
              date-format="dd-mm-yy" :invalid="invalid" :aria-describedby="describedby" placeholder="dd-mm-aaaa" show-icon icon-display="input" class="w-full" @date-select="check(f)"
            />
            <InputNumber v-else-if="f.type === 'number'" v-model="values[f.name] as number" :input-id="id" :invalid="invalid" :aria-describedby="describedby" class="w-full" />
            <InputText
              v-else :id="id" v-model="values[f.name] as string" :type="f.type === 'email' ? 'email' : 'text'" :invalid="invalid" :aria-describedby="describedby"
              :placeholder="f.placeholder ?? (f.type === 'rut' ? '12.345.678-5' : undefined)" :autocomplete="f.type === 'email' ? 'off' : undefined" class="w-full"
              @blur="f.type === 'rut' && values[f.name] ? (values[f.name] = formatRut(String(values[f.name]))) : null; check(f)"
            />
          </template>
        </FormField>
      </div>
    </section>

    <PendingNotice :error="mutation.error.value" :action="actionName" />
    <Message v-if="mutation.isSuccess.value" severity="success" :closable="false">El servidor confirmó la operación.</Message>

    <div class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <RouterLink :to="cancelTo" custom>
        <template #default="{ navigate, href }"><Button as="a" :href="href" label="Cancelar" severity="secondary" text @click="navigate" /></template>
      </RouterLink>
      <Button type="submit" :label="submitLabel" :loading="mutation.isPending.value" />
    </div>
  </form>
</template>
