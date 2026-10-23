import type { ImportStudentRow } from '@/types/api';
import { isValidRut } from './rut';

/**
 * Lectura de archivos CSV para la carga masiva de estudiantes. Reconoce `;` o `,` como separador (Excel en español usa `;`),
 * comillas dobles y saltos de línea dentro de campos. Todo ocurre en el navegador: el archivo nunca se envía tal cual.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) && firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index]!;
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') { field += '"'; index += 1; } else if (char === '"') quoted = false; else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows.map((cells) => cells.map((cell) => cell.trim()));
}

const ALIASES: Record<keyof ImportStudentRow, string[]> = {
  rut: ['rut', 'run'],
  firstNames: ['nombres', 'nombre', 'nombres del estudiante'],
  lastNames: ['apellidos', 'apellido'],
  birthDate: ['fecha de nacimiento', 'fecha_nacimiento', 'fechanacimiento', 'nacimiento'],
  courseName: ['curso', 'curso actual']
};
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export interface ParsedStudents { rows: ImportStudentRow[]; errors: { row: number; message: string }[]; missingColumns: string[] }

/** `dd-mm-aaaa`, `dd/mm/aaaa` o `aaaa-mm-dd` a `aaaa-mm-dd`; `null` si no se reconoce. */
export function normalizeBirthDate(value: string): string | null {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  const [year, month, day] = iso ? [iso[1]!, iso[2]!, iso[3]!] : local ? [local[3]!, local[2]!.padStart(2, '0'), local[1]!.padStart(2, '0')] : [];
  if (!year || !month || !day) return null;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}` ? null : `${year}-${month}-${day}`;
}

/** Convierte el texto del CSV en filas listas para la API, validando lo que se puede validar antes de enviarlo. */
export function parseStudentsCsv(text: string): ParsedStudents {
  const table = parseCsv(text);
  const header = (table[0] ?? []).map(normalize);
  const index = (field: keyof ImportStudentRow) => header.findIndex((name) => ALIASES[field].includes(name));
  const columns = { rut: index('rut'), firstNames: index('firstNames'), lastNames: index('lastNames'), birthDate: index('birthDate'), courseName: index('courseName') };
  const missingColumns = ([['rut', 'RUT'], ['firstNames', 'Nombres'], ['lastNames', 'Apellidos']] as const).filter(([field]) => columns[field] < 0).map(([, label]) => label);
  if (missingColumns.length) return { rows: [], errors: [], missingColumns };

  const rows: ImportStudentRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, offset) => {
    const line = offset + 1;
    const cell = (field: keyof typeof columns) => (columns[field] >= 0 ? cells[columns[field]] ?? '' : '');
    const rut = cell('rut');
    const key = rut.replace(/[.\s-]/g, '').toUpperCase();
    if (!isValidRut(rut)) errors.push({ row: line, message: 'RUT no válido' });
    else if (seen.has(key)) errors.push({ row: line, message: 'RUT repetido en el archivo' });
    else seen.add(key);
    if (!cell('firstNames') || !cell('lastNames')) errors.push({ row: line, message: 'Faltan nombres o apellidos' });
    const rawBirth = cell('birthDate');
    const birthDate = rawBirth ? normalizeBirthDate(rawBirth) : null;
    if (rawBirth && !birthDate) errors.push({ row: line, message: 'Fecha de nacimiento no válida (use dd-mm-aaaa)' });
    rows.push({ rut, firstNames: cell('firstNames'), lastNames: cell('lastNames'), ...(birthDate ? { birthDate } : {}), ...(cell('courseName') ? { courseName: cell('courseName') } : {}) });
  });
  return { rows, errors, missingColumns };
}

/** Plantilla descargable con una fila de ejemplo ficticia. */
export const STUDENTS_CSV_TEMPLATE = 'RUT;Nombres;Apellidos;Fecha de nacimiento;Curso\n11.111.111-1;Nombre de ejemplo;Apellido de ejemplo;21-03-2015;1° Básico A\n';
