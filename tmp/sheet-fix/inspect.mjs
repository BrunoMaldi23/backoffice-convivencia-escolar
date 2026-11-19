import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/bruno/Downloads/Datos estudiantes, padres y apoderados 2026.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const summary = await workbook.inspect({ kind: 'workbook,sheet,table', maxChars: 4000, tableMaxRows: 3, tableMaxCols: 8, tableMaxCellChars: 40 });
console.log(summary.ndjson);
const preview = await workbook.render({ sheetName: 'Hoja 1', range: 'A1:AA8', scale: 1, format: 'png' });
await fs.writeFile('C:/Bruno/Proyectos/backoffice-convivencia-escolar/tmp/sheet-fix/hoja1-preview.png', new Uint8Array(await preview.arrayBuffer()));
