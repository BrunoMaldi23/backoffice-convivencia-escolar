import type { ImportGuardianRow, ImportStudentRow } from '@/types/api';
import { isValidRut } from './rut';

/**
 * Lectura de archivos CSV para la carga masiva de estudiantes. Reconoce `;` o `,` como separador (Excel en español usa `;`),
 * comillas dobles y saltos de línea dentro de campos. Todo ocurre en el navegador: el archivo nunca se envía tal cual.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const semicolons = clean.match(/;/g)?.length ?? 0;
  const commas = clean.match(/,/g)?.length ?? 0;
  const delimiter = semicolons > commas ? ';' : ',';
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
  sex: ['sexo'],
  birthDate: ['fecha de nacimiento', 'fecha_nacimiento', 'fechanacimiento', 'nacimiento', 'fec. nac.'],
  email: ['email estudiante', 'correo estudiante', 'email'],
  courseName: ['curso', 'curso actual'],
  mother: [], father: [], guardian: []
};
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export interface ParsedStudents { rows: ImportStudentRow[]; errors: { row: number; message: string }[]; warnings: { row: number; message: string }[]; skippedRows: number; missingColumns: string[] }

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
  const detectedHeaderRow = table.findIndex((cells) => {
    const values = cells.map(normalize);
    return ALIASES.rut.some((alias) => values.includes(alias)) && ALIASES.firstNames.some((alias) => values.includes(alias)) && ALIASES.lastNames.some((alias) => values.includes(alias));
  });
  const headerRow = detectedHeaderRow < 0 ? 0 : detectedHeaderRow;
  const header = (table[headerRow] ?? []).map(normalize);
  const index = (field: keyof ImportStudentRow) => header.findIndex((name) => ALIASES[field].includes(name));
  const named = (...aliases: string[]) => header.findIndex((name) => aliases.map(normalize).includes(name));
  const columns = { rut: index('rut'), firstNames: index('firstNames'), lastNames: index('lastNames'), sex: index('sex'), birthDate: index('birthDate'), email: index('email'), courseName: index('courseName') };
  const missingColumns = ([['rut', 'RUT'], ['firstNames', 'Nombres'], ['lastNames', 'Apellidos']] as const).filter(([field]) => columns[field] < 0).map(([, label]) => label);
  if (missingColumns.length) return { rows: [], errors: [], warnings: [], skippedRows: 0, missingColumns };

  const rows: ImportStudentRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  let skippedRows = 0;
  const seen = new Set<string>();
  table.slice(headerRow + 1).forEach((cells, offset) => {
    const line = headerRow + offset + 2;
    const cell = (field: keyof typeof columns) => (columns[field] >= 0 ? cells[columns[field]] ?? '' : '');
    const contact = (role: 'Madre' | 'Padre' | 'Apoderado'): ImportGuardianRow | undefined => {
      const field = (base: string) => {
        const compact = base.replace(/\s/g, '');
        const column = named(`${base} ${role}`.toLowerCase(), `${compact} ${role}`.toLowerCase(), `${base}.${role}`.toLowerCase());
        return column >= 0 ? cells[column] ?? '' : '';
      };
      const rut = field('run'); const firstNames = field('nombres'); const lastNames = field('apellidos');
      const rawBirth = field('fec. nac.'); const birthDate = rawBirth ? normalizeBirthDate(rawBirth) : null;
      const phone = field('celular'); const email = field('email'); const address = role === 'Apoderado' ? field('dirección') : '';
      if (![rut, firstNames, lastNames, rawBirth, phone, email, address].some((value) => value.trim())) return undefined;
      if (!firstNames || !lastNames) { warnings.push({ row: line, message: `Datos incompletos de ${role.toLowerCase()}; no se asociará.` }); return undefined; }
      const validRut = rut && isValidRut(rut);
      if (rut && !validRut) warnings.push({ row: line, message: `RUN de ${role.toLowerCase()} no válido; se registrará sin RUN.` });
      if (rawBirth && !birthDate) warnings.push({ row: line, message: `Fecha de nacimiento de ${role.toLowerCase()} no válida; se omitirá.` });
      return { ...(validRut ? { rut } : {}), firstNames, lastNames, ...(birthDate ? { birthDate } : {}), ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(address ? { address } : {}) };
    };
    const rut = cell('rut');
    const key = rut.replace(/[.\s-]/g, '').toUpperCase();
    if (!isValidRut(rut)) { warnings.push({ row: line, message: 'RUN de estudiante no válido; la fila no se importará.' }); skippedRows += 1; return; }
    if (seen.has(key)) { warnings.push({ row: line, message: 'RUN de estudiante repetido; se conservará sólo la primera fila.' }); skippedRows += 1; return; }
    seen.add(key);
    if (!cell('firstNames') || !cell('lastNames')) { warnings.push({ row: line, message: 'Faltan nombres o apellidos del estudiante; la fila no se importará.' }); skippedRows += 1; return; }
    const rawBirth = cell('birthDate');
    const birthDate = rawBirth ? normalizeBirthDate(rawBirth) : null;
    if (rawBirth && !birthDate) warnings.push({ row: line, message: 'Fecha de nacimiento del estudiante no válida; se omitirá.' });
    const mother = contact('Madre'); const father = contact('Padre'); const guardian = contact('Apoderado');
    rows.push({ rut, firstNames: cell('firstNames'), lastNames: cell('lastNames'), ...(cell('sex') ? { sex: cell('sex') } : {}), ...(birthDate ? { birthDate } : {}), ...(cell('email') ? { email: cell('email') } : {}), ...(cell('courseName') ? { courseName: cell('courseName') } : {}), ...(mother ? { mother } : {}), ...(father ? { father } : {}), ...(guardian ? { guardian } : {}) });
  });
  return { rows, errors, warnings, skippedRows, missingColumns };
}

/** Plantilla descargable con una fila de ejemplo ficticia. */
export const STUDENTS_CSV_TEMPLATE = 'RUN;Apellidos;Nombres;Sexo;Fec. Nac.;Curso;Email Estudiante;RUN Madre;Nombres Madre;Apellidos Madre;Fec. Nac. Madre;Celular Madre;Email Madre;RUN Padre;Nombres Padre;Apellidos Padre;Fec. Nac. Padre;Celular Padre;Email Padre;RUN Apoderado;Nombres Apoderado;Apellidos Apoderado;Dirección Apoderado;Fec.Nac. Apoderado;Celular Apoderado;Email Apoderado\n11.111.111-1;Apellido de ejemplo;Nombre de ejemplo;Femenino;21-03-2015;1° Básico A;estudiante@example.test;12.222.222-2;Nombre;Madre;10-02-1980;+56911111111;madre@example.test;13.333.333-3;Nombre;Padre;12-03-1979;+56922222222;padre@example.test;12.222.222-2;Nombre;Madre;Dirección de ejemplo;10-02-1980;+56911111111;madre@example.test\n';

/** Serializa una tabla pequeña para descarga en Excel con separador habitual en Chile. */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  const cell = (value: string) => /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return `\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
}
