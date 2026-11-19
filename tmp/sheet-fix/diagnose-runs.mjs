import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load('C:/Users/bruno/Downloads/Datos estudiantes, padres y apoderados 2026.xlsx'));
const sheet = workbook.worksheets.getItem('Hoja 1');
const changes = ['H21', 'T21', 'N29', 'H125', 'T125', 'H362', 'T362', 'H477', 'T477', 'H636', 'A650', 'A929'];
const report = changes.map((address) => {
  const value = String(sheet.getRange(address).values[0]?.[0] ?? '');
  const cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase();
  return { address, charactersAfterNormalization: cleaned.length, hasExpectedStructure: /^\d{7,8}[0-9K]$/.test(cleaned) };
});
console.log(JSON.stringify(report));
