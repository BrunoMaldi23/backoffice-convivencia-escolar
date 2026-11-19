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
  it('detecta la cabecera aunque exista un título institucional antes de ella', () => {
    const result = parseStudentsCsv(`Nómina de estudiantes 2026\n${header}\n11.111.111-1;Ana;Pérez;21-03-2015;1° Básico A`);
    expect(result.missingColumns).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ rut: '11.111.111-1', firstNames: 'Ana', lastNames: 'Pérez' });
  });
  it('incorpora madre, padre y apoderado/a desde la plantilla institucional', () => {
    const institutionalHeader = 'RUN;Apellidos;Nombres;Sexo;Fec. Nac.;Curso;Email Estudiante;RUN Madre;Nombres Madre;Apellidos Madre;Fec. Nac. Madre;Celular Madre;Email Madre;RUN Padre;Nombres Padre;Apellidos Padre;Fec. Nac. Padre;Celular Padre;Email Padre;RUN Apoderado;Nombres Apoderado;Apellidos Apoderado;Dirección Apoderado;Fec.Nac. Apoderado;Celular Apoderado;Email Apoderado';
    const row = '11.111.111-1;Pérez Soto;Ana;Femenino;21-03-2015;1° Básico A;ana@example.test;22.222.222-2;Marta;Pérez;10-02-1980;+56911111111;marta@example.test;33.333.333-3;Pablo;Soto;12-03-1979;+56922222222;pablo@example.test;22.222.222-2;Marta;Pérez;Dirección 123;10-02-1980;+56911111111;marta@example.test';
    const result = parseStudentsCsv(`${institutionalHeader}\n${row}`);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ sex: 'Femenino', email: 'ana@example.test', mother: { rut: '22.222.222-2', birthDate: '1980-02-10' }, father: { rut: '33.333.333-3' }, guardian: { rut: '22.222.222-2', address: 'Dirección 123' } });
  });
  it('omite sólo estudiantes no importables y conserva filas válidas con observaciones', () => {
    const result = parseStudentsCsv(`${header}\n11.111.111-1;Ana;Pérez;;\n11111111-1;Ana;Pérez;;\n12.345.678-9;Luis;Rojas;;\n22.222.222-2;;Mora;;\n33.333.333-3;Eva;Mora;32-01-2015;\n`);
    expect(result.errors).toEqual([]);
    expect(result.skippedRows).toBe(3);
    expect(result.rows).toHaveLength(2);
    expect(result.warnings).toEqual([
      { row: 3, message: 'RUN de estudiante repetido; se conservará sólo la primera fila.' }, { row: 4, message: 'RUN de estudiante no válido; la fila no se importará.' }, { row: 5, message: 'Faltan nombres o apellidos del estudiante; la fila no se importará.' },
      { row: 6, message: 'Fecha de nacimiento del estudiante no válida; se omitirá.' }
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
