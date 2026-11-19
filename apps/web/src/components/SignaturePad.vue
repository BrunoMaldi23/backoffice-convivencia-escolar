<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Button from 'primevue/button';

const props = defineProps<{ label: string }>();
const emit = defineEmits<{ change: [value: string | null] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let drawing = false;
let context: CanvasRenderingContext2D | null = null;

function point(event: PointerEvent) { const box = canvas.value!.getBoundingClientRect(); return { x: (event.clientX - box.left) * (canvas.value!.width / box.width), y: (event.clientY - box.top) * (canvas.value!.height / box.height) }; }
function begin(event: PointerEvent) { if (!context || !canvas.value) return; drawing = true; canvas.value.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); }
function draw(event: PointerEvent) { if (!drawing || !context) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); emit('change', canvas.value!.toDataURL('image/png')); }
function end() { drawing = false; }
function clear() { if (!context || !canvas.value) return; context.clearRect(0, 0, canvas.value.width, canvas.value.height); emit('change', null); }
function setup() { if (!canvas.value) return; canvas.value.width = 720; canvas.value.height = 240; context = canvas.value.getContext('2d'); if (!context) return; context.strokeStyle = '#0f172a'; context.lineWidth = 2.4; context.lineCap = 'round'; context.lineJoin = 'round'; }
onMounted(setup); onBeforeUnmount(() => { context = null; });
</script>

<template>
  <section class="rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
    <div class="mb-2 flex items-center justify-between gap-3"><p class="text-sm font-semibold text-slate-800">{{ props.label }}</p><Button label="Limpiar" size="small" severity="secondary" text @click="clear" /></div>
    <canvas ref="canvas" class="h-36 w-full touch-none rounded-lg border border-dashed border-slate-300 bg-slate-50" aria-label="Área para firmar con lápiz táctil o mouse" @pointerdown="begin" @pointermove="draw" @pointerup="end" @pointercancel="end" />
    <p class="mt-2 text-xs text-slate-500">Firme con lápiz táctil o mouse dentro del recuadro.</p>
  </section>
</template>
