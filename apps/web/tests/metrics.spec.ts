import { describe, expect, it } from 'vitest';
import { casesByMonth, collectDeadlines, computeCaseMetrics, isOverdueMeasure, isOverdueTask } from '../src/lib/metrics';
import { transitionLabel, transitionNeedsReason, TRANSITIONS } from '../src/lib/catalogs';
import type { CaseMeasure, CaseRecord, CaseTask } from '../src/types/api';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();
let seq = 0;
const make = (over: Partial<CaseRecord> = {}): CaseRecord => ({
  id: `c${++seq}`, establishmentId: 'e', folio: seq, title: 'Caso', initialDescription: '', receivedAt: day(-5), categoryCode: 'CONVIVENCIA', priority: 'MEDIA', status: 'ABIERTO',
  currentStageId: null, responsibleUserId: null, createdByUserId: 'u', closedAt: null, closureReason: null, nextAction: null, nextActionDueAt: null, version: 1, createdAt: day(-5), updatedAt: day(-1), ...over
});

describe('indicadores de expedientes', () => {
  const cases = [
    make({ status: 'ABIERTO', priority: 'CRITICA', receivedAt: day(-2), updatedAt: day(-1) }),
    make({ status: 'EN_PROCESO', priority: 'ALTA', nextAction: 'Llamar', nextActionDueAt: day(-3), receivedAt: day(-60), updatedAt: day(-2) }),
    make({ status: 'PAUSADO', priority: 'BAJA', receivedAt: day(-250), updatedAt: day(-30) }),
    make({ status: 'CERRADO', priority: 'CRITICA', receivedAt: day(-40), nextActionDueAt: day(-10), updatedAt: day(-3) })
  ];
  const m = computeCaseMetrics(cases, NOW);

  it('cuenta activos, cerrados y por estado sin inventar valores', () => {
    expect(m.total).toBe(4);
    expect(m.active).toHaveLength(3);
    expect(m.closed).toBe(1);
    expect(m.byStatus).toMatchObject({ ABIERTO: 1, EN_EVALUACION: 0, EN_PROCESO: 1, PAUSADO: 1, RESUELTO: 0, CERRADO: 1 });
  });

  it('cuenta como nuevos solo los recibidos en los últimos 30 días', () => {
    expect(m.recentlyReceived).toBe(1);
  });

  it('un caso cerrado no cuenta como crítico ni como acción vencida', () => {
    expect(m.critical.map((c) => c.id)).toEqual([cases[0]!.id]);
    expect(m.overdueActions.map((c) => c.id)).toEqual([cases[1]!.id]);
  });

  it('ordena los casos que requieren atención por prioridad y excluye los de baja prioridad al día', () => {
    expect(m.attention.map((c) => c.priority)).toEqual(['CRITICA', 'ALTA']);
    expect(m.recent[0]!.id).toBe(cases[0]!.id);
  });

  it('agrupa los casos por mes de recepción en los últimos seis meses', () => {
    const buckets = casesByMonth(cases, NOW, 6);
    expect(buckets).toHaveLength(6);
    expect(buckets.reduce((sum, b) => sum + b.value, 0)).toBe(3); // el de hace 250 días queda fuera de la ventana
  });
});

describe('plazos', () => {
  const task = (over: Partial<CaseTask>): CaseTask => ({ id: 't', caseId: 'c1', createdByUserId: 'u', assignedToUserId: null, title: 'Tarea', dueAt: null, status: 'PENDIENTE', completedAt: null, createdAt: day(-9), updatedAt: day(-9), ...over });
  const measure = (over: Partial<CaseMeasure>): CaseMeasure => ({ id: 'm', caseId: 'c1', createdByUserId: 'u', title: 'Medida', description: null, dueAt: null, status: 'PENDIENTE', version: 1, completedAt: null, createdAt: day(-9), updatedAt: day(-9), responsibles: [], ...over });

  it('solo las tareas y medidas pendientes pueden estar vencidas', () => {
    expect(isOverdueTask(task({ dueAt: day(-1) }), NOW)).toBe(true);
    expect(isOverdueTask(task({ dueAt: day(-1), status: 'COMPLETADA' }), NOW)).toBe(false);
    expect(isOverdueTask(task({ dueAt: null }), NOW)).toBe(false);
    expect(isOverdueMeasure(measure({ dueAt: day(-1) }), NOW)).toBe(true);
    expect(isOverdueMeasure(measure({ dueAt: day(2) }), NOW)).toBe(false);
  });

  it('reúne los plazos de todas las fuentes reales y los ordena por fecha', () => {
    const open = make({ nextAction: 'Revisar', nextActionDueAt: day(4) });
    const closed = make({ status: 'CERRADO', nextActionDueAt: day(1) });
    const list = collectDeadlines({
      cases: [open, closed],
      tasks: [{ caseId: open.id, item: task({ id: 't1', dueAt: day(2) }) }, { caseId: open.id, item: task({ id: 't2', dueAt: day(1), status: 'COMPLETADA' }) }],
      measures: [{ caseId: open.id, item: measure({ id: 'm1', dueAt: day(-2) }) }],
      followUps: [{ caseId: open.id, item: { id: 'f1', caseId: open.id, createdByUserId: 'u', occurredAt: day(-1), note: 'n', nextAction: 'Llamar', nextActionDueAt: day(3), createdAt: day(-1) } }]
    }, NOW);
    expect(list.map((d) => d.id)).toEqual(['measure-m1', 'task-t1', 'follow-up-f1', `case-${open.id}`]);
    expect(list[0]!.overdue).toBe(true);
    expect(list.some((d) => d.id === `case-${closed.id}`)).toBe(false);
  });
});

describe('máquina de estados en la interfaz', () => {
  it('replica las transiciones documentadas', () => {
    expect(TRANSITIONS.ABIERTO).toEqual(['EN_EVALUACION', 'PAUSADO']);
    expect(TRANSITIONS.RESUELTO).toEqual(['CERRADO', 'EN_PROCESO']);
    expect(TRANSITIONS.CERRADO).toEqual(['EN_EVALUACION']);
  });

  it('exige motivo al pausar, resolver, cerrar, reanudar, devolver o reabrir', () => {
    expect(transitionNeedsReason('ABIERTO', 'EN_EVALUACION')).toBe(false);
    expect(transitionNeedsReason('EN_EVALUACION', 'EN_PROCESO')).toBe(false);
    for (const [from, to] of [['ABIERTO', 'PAUSADO'], ['EN_PROCESO', 'RESUELTO'], ['RESUELTO', 'CERRADO'], ['PAUSADO', 'EN_PROCESO'], ['RESUELTO', 'EN_PROCESO'], ['CERRADO', 'EN_EVALUACION']] as const) {
      expect(transitionNeedsReason(from, to), `${from}→${to}`).toBe(true);
    }
  });

  it('nombra la acción según el cambio', () => {
    expect(transitionLabel('RESUELTO', 'CERRADO')).toBe('Cerrar caso');
    expect(transitionLabel('CERRADO', 'EN_EVALUACION')).toBe('Reabrir caso');
    expect(transitionLabel('EN_PROCESO', 'PAUSADO')).toBe('Pausar');
  });
});
