import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, initials } from '../src/lib/format';
import { cleanRut, formatRut, isValidRut, rutCheckDigit } from '../src/lib/rut';

describe('formato de fechas', () => {
  it('muestra dd-mm-aaaa en hora de Chile', () => {
    // 2026-03-15 03:00 UTC equivale al 15-03-2026 en Santiago (UTC-3 en horario de verano).
    expect(formatDate('2026-03-15T03:00:00Z')).toBe('15-03-2026');
    // 02:00 UTC aún es el día anterior en Santiago.
    expect(formatDate('2026-03-15T02:00:00Z')).toBe('14-03-2026');
  });

  it('usa reloj de 24 horas', () => {
    expect(formatDateTime('2026-07-01T20:30:00Z')).toBe('01-07-2026 16:30');
  });

  it('devuelve guion ante valores vacíos o inválidos', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('no-es-fecha')).toBe('—');
  });

  it('calcula iniciales', () => {
    expect(initials('Usuario demo 01')).toBe('UD');
  });
});

describe('RUT', () => {
  it('calcula el dígito verificador con módulo 11', () => {
    expect(rutCheckDigit('12345678')).toBe('5');
    expect(rutCheckDigit('11111111')).toBe('1');
    expect(rutCheckDigit('10000013')).toBe('K');
  });

  it('valida y rechaza RUT', () => {
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('12345678-5')).toBe(true);
    expect(isValidRut('12.345.678-4')).toBe(false);
    expect(isValidRut('1')).toBe(false);
    expect(isValidRut('abc')).toBe(false);
  });

  it('formatea con puntos y guion', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('10000013k')).toBe('10.000.013-K');
    expect(cleanRut('12.345.678-k')).toBe('12345678K');
  });
});
