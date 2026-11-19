import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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
      const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Registro de entrevista' } });
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      const line = (label: string, value?: string | null) => document.font('Helvetica').fontSize(10).text(`${label}: ${value?.trim() || 'Sin registro'}`, { width: 500 });
      const section = (title: string) => { document.moveDown(0.8).font('Helvetica-Bold').fontSize(12).text(title); document.moveTo(48, document.y + 3).lineTo(547, document.y + 3).strokeColor('#1e3a5f').stroke(); document.moveDown(0.35); };
      document.fillColor('#0f3d75').font('Helvetica-Bold').fontSize(12).text(input.establishmentName.toUpperCase());
      document.fillColor('#111827').fontSize(17).text('REGISTRO ENTREVISTA APODERADO/ESTUDIANTE', { align: 'center' });
      document.moveDown(0.8);
      line('Nombre estudiante', input.studentName); line('Nombre apoderado(a)', input.guardianName); line('Curso', input.courseName);
      line('Fecha', new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(input.occurredAt));
      line('Entrevistador(a)', input.interviewerName);
      section('Entrevista solicitada por'); document.font('Helvetica').fontSize(10).text(input.requestedBy.length ? input.requestedBy.join(' · ') : 'Sin registro');
      section('Motivo principal de la entrevista'); document.font('Helvetica').fontSize(10).text(input.reasonCategories.length ? input.reasonCategories.join(' · ') : 'Sin registro');
      line('Motivo de la entrevista', input.interviewReason);
      section('Temas tratados'); document.font('Helvetica').fontSize(10).text(input.summary, { align: 'justify' });
      section('Acuerdos'); document.font('Helvetica').fontSize(10).text(input.agreements?.trim() || 'Sin acuerdos registrados.', { align: 'justify' });
      document.moveDown(1).font('Helvetica-Oblique').fontSize(9).text('Recuerde que esta información es de carácter confidencial.');
      const signatureY = Math.max(document.y + 24, 620);
      document.image(intervieweeSignature, 65, signatureY, { fit: [180, 72] });
      document.image(interviewerSignature, 350, signatureY, { fit: [180, 72] });
      document.moveTo(65, signatureY + 76).lineTo(245, signatureY + 76).strokeColor('#111827').stroke();
      document.moveTo(350, signatureY + 76).lineTo(530, signatureY + 76).stroke();
      document.font('Helvetica-Bold').fontSize(10).text('Firma entrevistado/a', 92, signatureY + 82, { width: 126, align: 'center' });
      document.text('Firma entrevistador/a', 377, signatureY + 82, { width: 126, align: 'center' });
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
