import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/bruno/Downloads/Datos estudiantes, padres y apoderados 2026.xlsx';
const outputDir = 'C:/Bruno/Proyectos/backoffice-convivencia-escolar/outputs/20261113-planilla-estudiantes-corregida';
const outputPath = `${outputDir}/Datos estudiantes, padres y apoderados 2026 - RUN corregidos.xlsx`;

function rutWithCorrectVerifier(value) {
  const cleaned = String(value ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) throw new Error('El valor no tiene la estructura de un RUN chileno.');
  const body = cleaned.slice(0, -1);
  let sum = 0;
  let factor = 2;
  for (const digit of body.split('').reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const verifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return `${body}-${verifier}`;
}

function isValidRut(value) {
  const cleaned = String(value ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  return rutWithCorrectVerifier(cleaned) === `${cleaned.slice(0, -1)}-${cleaned.at(-1)}`;
}

const changes = [
  'H21', 'T21', 'N29', 'H125', 'T125', 'H362', 'T362',
  'H477', 'T477', 'H636'
];
const unresolvedCells = ['A650', 'A929'];
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheet = workbook.worksheets.getItem('Hoja 1');

for (const address of changes) {
  const cell = sheet.getRange(address);
  const current = cell.values[0]?.[0];
  const corrected = rutWithCorrectVerifier(current);
  if (isValidRut(current)) throw new Error(`El RUN de ${address} ya era válido; se detuvo la corrección.`);
  cell.values = [[corrected]];
}

workbook.recalculate();
for (const address of changes) {
  const value = sheet.getRange(address).values[0]?.[0];
  if (!isValidRut(value)) throw new Error(`No se pudo validar el RUN corregido en ${address}.`);
}

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: 'Hoja 1', range: 'A18:Z30', scale: 1, format: 'png' });
await fs.writeFile('C:/Bruno/Proyectos/backoffice-convivencia-escolar/tmp/sheet-fix/corrected-preview.png', new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, correctedCells: changes, correctedCount: changes.length, unresolvedCells }));
