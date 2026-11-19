<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Button from 'primevue/button';

const props = defineProps<{ label: string }>();
const emit = defineEmits<{ change: [value: string | null] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let drawing = false;
let context: CanvasRenderingContext2D | null = null;

function point(event: PointerEvent) { const box = canvas.value!.getBoundingClientRect(); return { x: (event.clientX - box.left) * (canvas.value!.width / box.width), y: (event.clientY - box.top) * (canvas.value!.height / box.height) }; }
function value() { return canvas.value!.toDataURL('image/png'); }
function begin(event: PointerEvent) {
  if (!context || !canvas.value) return;
  drawing = true;
  canvas.value.setPointerCapture(event.pointerId);
  const p = point(event);
  context.beginPath();
  context.moveTo(p.x, p.y);
  // Un toque también constituye una firma válida; antes solo se emitía al arrastrar.
  context.lineTo(p.x + 0.1, p.y + 0.1);
  context.stroke();
  emit('change', value());
}
function draw(event: PointerEvent) { if (!drawing || !context) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); emit('change', value()); }
function end() { drawing = false; }
function clear() { if (!context || !canvas.value) return; context.clearRect(0, 0, canvas.value.width, canvas.value.height); emit('change', null); }
function setup() {
  if (!canvas.value) return;
  // El espacio visual se mantiene amplio con CSS, pero el PNG se acota para que dos firmas
  // viajen holgadamente dentro del límite de la API al cerrar el acta.
  canvas.value.width = 320;
  canvas.value.height = 120;
  context = canvas.value.getContext('2d');
  if (!context) return;
  context.strokeStyle = '#0f172a';
  context.lineWidth = 2.4;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}
onMounted(setup); onBeforeUnmount(() => { context = null; });
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div class="mb-4 flex items-center justify-between gap-3"><p class="text-base font-semibold text-slate-900">{{ props.label }}</p><Button label="Limpiar" size="small" severity="secondary" text @click="clear" /></div>
    <canvas ref="canvas" class="h-56 w-full touch-none rounded-xl border-2 border-dashed border-sky-200 bg-slate-50 sm:h-64" aria-label="Área para firmar con lápiz táctil o mouse" @pointerdown="begin" @pointermove="draw" @pointerup="end" @pointercancel="end" />
    <p class="mt-3 text-sm text-slate-600">Firme con lápiz táctil o mouse dentro del recuadro.</p>
  </section>
</template>
