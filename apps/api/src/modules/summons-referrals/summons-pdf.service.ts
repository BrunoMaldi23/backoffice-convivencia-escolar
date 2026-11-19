import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export type SummonsLetterPdf = {
  establishmentName: string;
  recipientLabel: string;
  scheduledAt: Date;
  location: string;
  reason: string;
  folio: number;
};

/** Carta institucional generada bajo demanda; no expone el expediente ni datos sensibles ajenos a la citación. */
@Injectable()
export class SummonsPdfService {
  async create(input: SummonsLetterPdf) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Citación a entrevista' } });
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      const field = (label: string, value: string) => {
        document.font('Helvetica-Bold').fontSize(10).text(label);
        document.font('Helvetica').fontSize(10).text(value, { align: 'justify' }).moveDown(0.65);
      };

      document.fillColor('#0f3d75').font('Helvetica-Bold').fontSize(12).text(input.establishmentName.toUpperCase());
      document.fillColor('#111827').fontSize(16).text('CITACIÓN A ENTREVISTA', { align: 'center' });
      document.moveDown(1.2);
      document.font('Helvetica').fontSize(11).text(`Estimado/a ${input.recipientLabel}:`, { align: 'left' });
      document.moveDown(0.8);
      document.text('Junto con saludar, se le cita a una entrevista en el marco del acompañamiento institucional. Agradecemos su asistencia y puntualidad.', { align: 'justify', lineGap: 3 });
      document.moveDown(1.1);
      field('Fecha y hora', new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(input.scheduledAt));
      field('Lugar', input.location);
      field('Motivo', input.reason);
      document.moveDown(1.1);
      document.font('Helvetica').fontSize(10).text('Si no puede asistir, comuníquese oportunamente con el establecimiento para coordinar una nueva fecha.', { align: 'justify' });
      document.moveDown(2.8);
      document.moveTo(190, document.y).lineTo(405, document.y).strokeColor('#111827').stroke();
      document.moveDown(0.35).font('Helvetica').fontSize(9).text('Equipo de Convivencia Escolar', { align: 'center' });
      document.moveDown(1.4).fillColor('#4b5563').fontSize(8).text(`Referencia institucional: EXP-${String(input.folio).padStart(4, '0')}`, { align: 'right' });
      document.end();
    });
  }
}
