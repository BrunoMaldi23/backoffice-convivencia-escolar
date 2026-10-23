import { describe, expect, it } from 'vitest';
import { normalizeBirthDate, parseCsv, parseStudentsCsv, serializeCsv } from '../src/lib/csv';
import { calendarToDate, dateToCalendar, formatCalendarDate } from '../src/lib/format';

describe('parseCsv', () => {
  it('detecta el separador de Excel en español (;) y respeta las comillas', () => {
    expect(parseCsv('a;b;c\n1;"x;y";3\n')).toEqual([['a', 'b', 'c'], ['1', 'x;y', '3']]);
  });
  it('lee comas, BOM, saltos de línea de Windows y comillas escapadas', () => {
    expect(parseCsv('﻿a,b\r\n"di ""hola""",2\r\n')).toEqual([['a', 'b'], ['di "hola"', '2']]);
  });
  it('ignora las líneas vacías', () => {
    expect(parseCsv('a;b\n\n1;2\n;\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('serializeCsv', () => {
  it('genera CSV compatible con Excel y protege separadores, comillas y saltos de línea', () => {
    expect(serializeCsv([['Nombre', 'Detalle'], ['Caso; uno', 'Dijo "hola"\ny continuó']]))
      .toBe('﻿Nombre;Detalle\r\n"Caso; uno";"Dijo ""hola""\ny continuó"\r\n');
  });
});

describe('normalizeBirthDate', () => {
  it.each([['21-03-2015', '2015-03-21'], ['1/2/2014', '2014-02-01'], ['2015-03-21', '2015-03-21']])('acepta %s', (input, expected) => {
    expect(normalizeBirthDate(input)).toBe(expected);
  });
  it.each(['31-02-2015', '2015/03/21', 'ayer', ''])('rechaza %s', (input) => {
    expect(normalizeBirthDate(input)).toBeNull();
  });
});

describe('parseStudentsCsv', () => {
  const header = 'RUT;Nombres;Apellidos;Fecha de nacimiento;Curso';
  it('lee filas válidas con encabezados flexibles y quita tildes', () => {
    const result = parseStudentsCsv(`${header}\n11.111.111-1;Ana María;Pérez Soto;21-03-2015;1° Básico A\n22.222.222-2;Luis;Rojas;;\n`);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { rut: '11.111.111-1', firstNames: 'Ana María', lastNames: 'Pérez Soto', birthDate: '2015-03-21', courseName: '1° Básico A' },
      { rut: '22.222.222-2', firstNames: 'Luis', lastNames: 'Rojas' }
    ]);
  });
  it('informa las columnas obligatorias que faltan', () => {
    expect(parseStudentsCsv('RUT;Curso\n1;2').missingColumns).toEqual(['Nombres', 'Apellidos']);
  });
  it('señala RUT inválidos, repetidos, nombres vacíos y fechas inválidas con su número de fila', () => {
    const result = parseStudentsCsv(`${header}\n11.111.111-1;Ana;Pérez;;\n11111111-1;Ana;Pérez;;\n12.345.678-9;Luis;Rojas;;\n22.222.222-2;;Mora;;\n33.333.333-3;Eva;Mora;32-01-2015;\n`);
    expect(result.errors).toEqual([
      { row: 2, message: 'RUT repetido en el archivo' }, { row: 3, message: 'RUT no válido' }, { row: 4, message: 'Faltan nombres o apellidos' },
      { row: 5, message: 'Fecha de nacimiento no válida (use dd-mm-aaaa)' }
    ]);
  });
});

describe('fechas de calendario (sin hora)', () => {
  it('no retrocede un día al mostrarse en hora de Chile', () => {
    expect(formatCalendarDate('2015-03-21T00:00:00.000Z')).toBe('21-03-2015');
    expect(formatCalendarDate(null)).toBe('—');
  });
  it('convierte hacia y desde el selector de fecha sin cambiar el día', () => {
    const date = calendarToDate('2015-03-21T00:00:00.000Z')!;
    expect(dateToCalendar(date)).toBe('2015-03-21');
    expect(calendarToDate('basura')).toBeNull();
  });
});
