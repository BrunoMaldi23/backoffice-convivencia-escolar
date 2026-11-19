import { BadRequestException, Injectable } from '@nestjs/common';
// pdfkit se publica como CommonJS; la importación por defecto compila pero falla en el runtime serverless.
import * as PDFDocument from 'pdfkit';

export type SignedInterviewPdf = {
  establishmentName: string; studentName: string; guardianName?: string | null; courseName?: string | null;
  occurredAt: Date; interviewerName: string; requestedBy: string[]; reasonCategories: string[];
  interviewReason?: string | null; summary: string; agreements?: string | null; intervieweeSignature: string; interviewerSignature: string;
};

@Injectable()
export class InterviewPdfService {
  async create(input: SignedInterviewPdf) {
    const intervieweeSignature = this.signature(input.intervieweeSignature);
    const interviewerSignature = this.signature(input.interviewerSignature);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      // Formato oficio del registro institucional: hoja única con los campos y firmas visibles.
      const document = new PDFDocument({ size: [612, 972], margin: 0, info: { Title: 'Registro de entrevista' } });
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      const left = 54;
      const right = 558;
      const width = right - left;
      const ink = '#111111';
      const blue = '#102c72';
      const label = (text: string, x: number, y: number) => document.fillColor(ink).font('Times-Bold').fontSize(10).text(text, x, y);
      const rule = (y: number, from = left, to = right) => document.strokeColor(ink).lineWidth(0.55).moveTo(from, y).lineTo(to, y).stroke();
      const value = (text: string | null | undefined, x: number, y: number, textWidth: number) => {
        const content = text?.trim() || 'Sin registro';
        let size = 10;
        document.font('Times-Roman');
        while (size > 7 && document.fontSize(size).widthOfString(content) > textWidth) size -= 0.5;
        document.fillColor(ink).fontSize(size).text(content, x, y, { width: textWidth, height: 12, lineBreak: false, ellipsis: true });
      };
      const section = (text: string, y: number) => { label(text, left, y); rule(y + 15); };
      const grid = (headers: string[], selected: string[], y: number) => {
        const cell = width / headers.length;
        document.strokeColor(ink).lineWidth(0.55).rect(left, y, width, 42).stroke();
        for (let index = 1; index < headers.length; index += 1) document.moveTo(left + cell * index, y).lineTo(left + cell * index, y + 42).stroke();
        document.moveTo(left, y + 25).lineTo(right, y + 25).stroke();
        headers.forEach((header, index) => {
          document.fillColor(ink).font('Times-Bold').fontSize(8.5).text(header, left + cell * index + 3, y + 3, { width: cell - 6, height: 20, align: 'center' });
          if (selected.includes(header.replace('\n', ' '))) document.font('Times-Bold').fontSize(10).text('X', left + cell * index, y + 28, { width: cell, align: 'center' });
        });
      };
      const ruledText = (text: string | null | undefined, y: number, lines: number) => {
        const lineHeight = 18;
        document.fillColor(ink).font('Times-Roman').fontSize(10).text(text?.trim() || 'Sin registro', left, y + 4, { width, height: lines * lineHeight - 5, lineGap: 2, ellipsis: true });
        for (let index = 1; index <= lines; index += 1) rule(y + lineHeight * index);
      };

      document.fillColor(blue).font('Helvetica-Bold').fontSize(13).text(input.establishmentName.toUpperCase(), left, 43);
      document.font('Times-Bold').fontSize(15).fillColor(ink).text('REGISTRO ENTREVISTA APODERADO/ESTUDIANTE', left, 76, { width, align: 'center' });

      label('Nombre estudiante:', left, 106); value(input.studentName, 145, 106, right - 145); rule(121, 145);
      label('Nombre apoderado(a):', left, 124); value(input.guardianName, 156, 124, right - 156); rule(139, 156);
      label('Curso:', left, 142); value(input.courseName, 88, 142, 72); rule(157, 88, 160);
      label('Fecha:', 170, 142); value(new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeZone: 'America/Santiago' }).format(input.occurredAt), 210, 142, 104); rule(157, 210, 314);
      label('Profesor(a):', 324, 142); value(input.interviewerName, 387, 142, right - 387); rule(157, 387);

      section('Entrevista solicitada por:', 173);
      grid(['Apoderado(a)', 'Profesor(a)', 'Estudiante', 'Coordinación', 'Otro'], input.requestedBy, 190);
      section('Motivo principal de la entrevista', 239);
      grid(['Rendimiento\nacadémico', 'Hábitos\nescolares', 'Convivencia\nescolar', 'Disciplina', 'Situación\nemocional', 'Otro'], input.reasonCategories, 256);
      label('Motivo de la entrevista:', left, 307); value(input.interviewReason, 181, 307, right - 181); rule(322, 181);
      section('Temas tratados (explicar)', 341);
      ruledText(input.summary, 358, 10);
      section('Acuerdos', 550);
      ruledText(input.agreements, 567, 8);

      document.fillColor(ink).font('Times-Bold').fontSize(9).text('* Recuerde que esta información es de carácter confidencial', left, 727);
      const signatureY = 768;
      document.image(intervieweeSignature, 80, signatureY, { fit: [155, 56], align: 'center', valign: 'center' });
      document.image(interviewerSignature, 377, signatureY, { fit: [155, 56], align: 'center', valign: 'center' });
      rule(signatureY + 62, 78, 250); rule(signatureY + 62, 362, 534);
      document.fillColor(ink).font('Times-Bold').fontSize(10).text('Firma entrevistado/a', 78, signatureY + 66, { width: 172, align: 'center' });
      document.text('Firma entrevistador/a', 362, signatureY + 66, { width: 172, align: 'center' });

      document.strokeColor('#444444').lineWidth(3).moveTo(0, 894).lineTo(612, 894).stroke();
      document.fillColor('#333333').font('Helvetica').fontSize(7.5).text('Teléfono: +56 45 2686200\nDirección: Caupolicán 71 - Temuco\nE-Mail: contacto@colegiobautista.cl', left, 908);
      document.font('Helvetica-Bold').fontSize(8.5).text('Cambridge Assessment\nInternational Education', 415, 912, { width: 143, align: 'right' });
      document.end();
    });
  }

  private signature(value: string) {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!match) throw new BadRequestException('La firma debe ser una imagen PNG válida');
    const image = Buffer.from(match[1], 'base64');
    if (image.length < 64 || image.length > 180_000 || !image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new BadRequestException('La firma no es válida');
    return image;
  }
}
