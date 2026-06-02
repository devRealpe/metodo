import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { HttpClient } from '@angular/common/http';

// Interfaces
export interface ProfesorData {
  id: string;
  documento: string;
  nombres: string;
  apellidos: string;
  estado: string;
  dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO';
  rol: 'Prof' | 'Dir' | 'Ast';
  programa?: string;
  facultad?: string;
  formacion?: string;
  escalafon?: string;
  vinculacion?: string;
}

export interface SeccionPadreData {
  nombre: string;
  hijos: SeccionHijoData[];
  totalHoras: number;
}

export interface SeccionHijoData {
  nombre: string;
  actividades: ActividadData[];
  asignaturas?: AsignaturaData[];
  investigaciones?: InvestigacionData[];
  totalHoras: number;
  tipo: 'actividades' | 'asignaturas' | 'investigacion';
}

export interface ActividadData {
  nombre: string;
  descripcion?: string;
  horas: number;
  asesorias?: {
    id: string;
    titulo: string;
    momento_asesoria: {
      id: string;
      nombre: string;
    };
  }[];
}

export interface AsignaturaData {
  codAsignatura: string;
  grupo: string;
  semestre: string;
  nomAsignatura: string;
  numEstudiantes: number;
  numCreditos: number;
  horasPresenciales: number;
}

export interface InvestigacionData {
  codigo: string;
  nombreProyecto: string;
  grupo: string;
  momento: string;
  productos: string;
  horas: number;
}

export interface PlanDeTrabajoCompleto {
  profesor: ProfesorData;
  secciones: SeccionPadreData[];
  totalHoras: number;
  periodo: string;
  facultad: string;
  programa: string;
  decano: string;
  director: string;
  anio: number;
  periodoAcademico: number;
}

export interface ResumenProfesor {
  profesor: ProfesorData;
  totalesPorSeccion: Map<string, number>;
  totalGeneral: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private logoBase64: string | null = null;
  private readonly MARGIN = 15;
  private readonly PAGE_WIDTH = 210;
  private readonly CONTENT_WIDTH = 180;
  private readonly MAX_Y = 280;

  constructor(private http: HttpClient) { }

  private async cargarLogo(): Promise<string | null> {
    if (this.logoBase64) {
      return this.logoBase64;
    }
    try {
      const response = await this.http.get('/assets/images/Escudo_Unimar.png', { responseType: 'blob' }).toPromise();
      if (response) {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            this.logoBase64 = reader.result as string;
            resolve(this.logoBase64);
          };
          reader.readAsDataURL(response);
        });
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  async exportarPTIndividual(planCompleto: PlanDeTrabajoCompleto): Promise<void> {
    const doc = await this.generarDocumentoPTIndividual(planCompleto);
    const fileName = `PT_${planCompleto.profesor.nombres.replace(/\s+/g, '_')}_${planCompleto.profesor.apellidos.replace(/\s+/g, '_')}_${planCompleto.periodo}.pdf`;
    doc.save(fileName);
  }

  async generarPTIndividualBlob(planCompleto: PlanDeTrabajoCompleto): Promise<Blob> {
    const doc = await this.generarDocumentoPTIndividual(planCompleto);
    return doc.output('blob');
  }

  private async generarDocumentoPTIndividual(planCompleto: PlanDeTrabajoCompleto): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');
    let yPosition = this.MARGIN;
    const pageWidth = this.PAGE_WIDTH;

    const logo = await this.cargarLogo();
    if (logo) {
      const targetWidth = 25;
      const targetHeight = 13;
      doc.addImage(logo, 'PNG', pageWidth - 30, yPosition, targetWidth, targetHeight);
    }

    doc.setFontSize(9);
    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSIDAD MARIANA', pageWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.text('VICERRECTORÍA ACADÉMICA', pageWidth / 2, yPosition + 11, { align: 'center' });

    let tituloPlan = '';
    switch (planCompleto.profesor.rol) {
      case 'Dir':
        tituloPlan = 'DIRECTOR';
        break;
      case 'Ast':
        tituloPlan = 'ASISTENTE ACADÉMICO';
        break;
      case 'Prof':
      default:
        tituloPlan = 'PROFESOR';
        break;
    }
    doc.setFontSize(9);
    doc.text(`PLAN DE TRABAJO ${tituloPlan} PROGRAMA ACADÉMICO`, pageWidth / 2, yPosition + 16, { align: 'center' });
    yPosition += 22;

    const tableAnioX = this.MARGIN;
    const tableAnioY = yPosition;
    const labelWidth = 35;
    const valueWidth = 15;
    const cellHeight = 5;

    doc.setFillColor('#dcdcdc');
    doc.rect(tableAnioX, tableAnioY, labelWidth, cellHeight, 'F');
    doc.setDrawColor('#c8c8c8');
    doc.setLineWidth(0.1);
    doc.rect(tableAnioX, tableAnioY, labelWidth, cellHeight);
    doc.setTextColor('#000000');
    doc.setFontSize(8);
    doc.text('AÑO', tableAnioX + 2, tableAnioY + 3.5);
    doc.setFillColor('#ffffff');
    doc.rect(tableAnioX + labelWidth, tableAnioY, valueWidth, cellHeight, 'F');
    doc.rect(tableAnioX + labelWidth, tableAnioY, valueWidth, cellHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(planCompleto.anio.toString(), tableAnioX + labelWidth + 7.5, tableAnioY + 3.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFillColor('#dcdcdc');
    doc.rect(tableAnioX, yPosition + cellHeight, labelWidth, cellHeight, 'F');
    doc.rect(tableAnioX, yPosition + cellHeight, labelWidth, cellHeight);
    doc.text('PERIODO ACADÉMICO', tableAnioX + 2, yPosition + cellHeight + 3.5);
    doc.setFillColor('#ffffff');
    doc.rect(tableAnioX + labelWidth, yPosition + cellHeight, valueWidth, cellHeight, 'F');
    doc.rect(tableAnioX + labelWidth, yPosition + cellHeight, valueWidth, cellHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(planCompleto.periodoAcademico.toString(), tableAnioX + labelWidth + 7.5, yPosition + cellHeight + 3.5, { align: 'center' });

    const tableInfoX = tableAnioX + labelWidth + valueWidth;
    const tableInfoY = yPosition;
    const infoTableWidth = this.CONTENT_WIDTH - labelWidth - valueWidth;
    const infoLabelWidth = 40;
    const infoValueWidth = infoTableWidth - infoLabelWidth;

    const renderTableRow = (label: string, value: string, yOffset: number) => {
      doc.setFillColor('#dcdcdc');
      doc.rect(tableInfoX, tableInfoY + yOffset, infoLabelWidth, cellHeight, 'F');
      doc.rect(tableInfoX, tableInfoY + yOffset, infoLabelWidth, cellHeight);
      doc.text(label, tableInfoX + 2, tableInfoY + yOffset + 3.5);
      doc.setFillColor('#ffffff');
      doc.rect(tableInfoX + infoLabelWidth, tableInfoY + yOffset, infoValueWidth, cellHeight, 'F');
      doc.rect(tableInfoX + infoLabelWidth, tableInfoY + yOffset, infoValueWidth, cellHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(value, tableInfoX + infoLabelWidth + 2, tableInfoY + yOffset + 3.5);
    };

    renderTableRow('FACULTAD', planCompleto.facultad, 0);
    renderTableRow('NOMBRE DECANO(A)', planCompleto.decano, cellHeight);
    renderTableRow('PROGRAMA', planCompleto.programa, 2 * cellHeight);
    renderTableRow('NOMBRE DIRECTOR(A)', planCompleto.director, 3 * cellHeight);

    yPosition += 4 * cellHeight + 8;

    let tituloSeccion = '';
    switch (planCompleto.profesor.rol) {
      case 'Dir':
        tituloSeccion = 'DIRECTOR DEL PROGRAMA';
        break;
      case 'Ast':
        tituloSeccion = 'ASISTENTE ACADÉMICO DEL PROGRAMA';
        break;
      case 'Prof':
      default:
        tituloSeccion = 'PROFESOR DEL PROGRAMA';
        break;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text(`DATOS DE IDENTIFICACIÓN DEL ${tituloSeccion}`, this.MARGIN, yPosition);
    yPosition += 4;

    const dataX = this.MARGIN;
    const dataY = yPosition;
    const dataWidth = pageWidth - 2 * this.MARGIN;
    const dataRowHeight = 5;
    const colLabel = 40;
    const colValue = dataWidth - colLabel;

    const campos = [
      { label: 'IDENTIFICACIÓN', value: planCompleto.profesor.documento },
      { label: 'TIPO', value: 'C.C.' },
      { label: 'NOMBRES', value: planCompleto.profesor.nombres },
      { label: 'APELLIDOS', value: planCompleto.profesor.apellidos },
      { label: 'NIVEL DE FORMACIÓN', value: planCompleto.profesor.formacion || 'No especificado' },
      { label: 'CATEGORÍA ESCALAFÓN', value: planCompleto.profesor.escalafon || 'No especificado' },
      { label: 'TIPO DE DEDICACIÓN', value: planCompleto.profesor.dedicacion === 'TIEMPO COMPLETO' ? 'TIEMPO COMPLETO' : 'MEDIO TIEMPO' },
      { label: 'TIPO DE VINCULACIÓN', value: planCompleto.profesor.vinculacion || 'No especificado' }
    ];

    for (const campo of campos) {
      if (campo !== campos[0]) {
        doc.setDrawColor('#c8c8c8');
        doc.setLineWidth(0.1);
        doc.line(dataX, yPosition, dataX + dataWidth, yPosition);
      }

      doc.setFillColor('#dcdcdc');
      doc.rect(dataX, yPosition, colLabel, dataRowHeight, 'F');
      doc.setDrawColor('#c8c8c8');
      doc.setLineWidth(0.1);
      doc.rect(dataX, yPosition, colLabel, dataRowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor('#000000');
      doc.text(campo.label, dataX + 2, yPosition + 3.5);

      doc.setFillColor('#ffffff');
      doc.rect(dataX + colLabel, yPosition, colValue, dataRowHeight, 'F');
      doc.rect(dataX + colLabel, yPosition, colValue, dataRowHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(campo.value, dataX + colLabel + 2, yPosition + 3.5);
      yPosition += dataRowHeight;
    }

    doc.setDrawColor('#c8c8c8');
    doc.setLineWidth(0.1);
    doc.line(dataX, yPosition, dataX + dataWidth, yPosition);
    yPosition += 6;

    const seccionesFiltradas = planCompleto.secciones
      .map(seccionPadre => ({
        ...seccionPadre,
        hijos: seccionPadre.hijos.filter(hijo => hijo.totalHoras > 0)
      }))
      .filter(seccionPadre => seccionPadre.hijos.length > 0 && seccionPadre.totalHoras > 0);

    for (let i = 0; i < seccionesFiltradas.length; i++) {
      const seccionPadre = seccionesFiltradas[i];
      if (yPosition > this.MAX_Y - 50) {
        doc.addPage();
        yPosition = this.MARGIN;
      }

      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#000000');
      doc.text(`${i + 1}. ${seccionPadre.nombre.toUpperCase()}`, this.MARGIN, yPosition);
      yPosition += 5;

      for (const seccionHijo of seccionPadre.hijos) {
        if (yPosition > this.MAX_Y - 35) {
          doc.addPage();
          yPosition = this.MARGIN;
        }

        yPosition += 2;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#646464');
        doc.text(seccionHijo.nombre.toUpperCase(), this.MARGIN, yPosition);
        yPosition += 4;

        if (seccionHijo.tipo === 'asignaturas' && seccionHijo.asignaturas) {
          yPosition = this.renderizarTablaAsignaturas(doc, seccionHijo.asignaturas, yPosition);
        } else if (seccionHijo.tipo === 'investigacion' && seccionHijo.investigaciones) {
          yPosition = this.renderizarTablaInvestigaciones(doc, seccionHijo.investigaciones, yPosition);
        } else if (seccionHijo.tipo === 'actividades' && seccionHijo.actividades) {
          yPosition = this.renderizarTablaActividades(doc, seccionHijo.actividades, yPosition);
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        doc.setFillColor('#dcdcdc');
        doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5, 'F');
        doc.setDrawColor('#c8c8c8');
        doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5);
        doc.text(`SUBTOTAL`, this.MARGIN + 5, yPosition + 4);
        doc.text(`${seccionHijo.totalHoras} HORAS`, this.CONTENT_WIDTH - 20, yPosition + 4, { align: 'right' });
        yPosition += 8;
      }

      doc.setFillColor('#dcdcdc');
      doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5, 'F');
      doc.setDrawColor('#c8c8c8');
      doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL ${seccionPadre.nombre.toUpperCase()}`, this.MARGIN + 5, yPosition + 3.5);
      doc.text(`${seccionPadre.totalHoras} HORAS`, this.CONTENT_WIDTH - 5, yPosition + 3.5, { align: 'right' });
      yPosition += 8;
    }

    if (yPosition > this.MAX_Y - 35) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    yPosition += 6;
    doc.setFillColor('#dcdcdc');
    doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5, 'F');
    doc.setDrawColor('#c8c8c8');
    doc.rect(this.MARGIN + 3, yPosition, this.CONTENT_WIDTH - 6, 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL HORAS PLAN DE TRABAJO PROFESOR`, this.MARGIN + 5, yPosition + 3.5);
    doc.text(`${planCompleto.totalHoras} HORAS`, this.CONTENT_WIDTH - 5, yPosition + 3.5, { align: 'right' });

    yPosition += 12;

    yPosition = this.crearSeccionFirmas(doc, planCompleto, yPosition);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.agregarPieDePagina(doc, i, totalPages);
    }

    return doc;
  }

  private renderizarTablaAsignaturas(
    doc: jsPDF,
    asignaturas: AsignaturaData[],
    y: number
  ): number {
    const x = this.MARGIN + 3;
    const tableWidth = this.CONTENT_WIDTH - 6;
    const baseCellHeight = 6;
    const colWidths = [18, 12, 11, 87, 16, 12, 18];
    const headers = ['COD CURSO', 'GRUPO', 'SEM', 'NOMBRE DEL CURSO', 'ESTUD.', 'CRÉD.', 'HRS PRES.'];

    doc.setFillColor('#dcdcdc');
    doc.rect(x, y, tableWidth, baseCellHeight, 'F');
    doc.setDrawColor('#c8c8c8');
    doc.rect(x, y, tableWidth, baseCellHeight);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');

    let currentX = x;
    headers.forEach((header, i) => {
      if (i > 0) doc.line(currentX, y, currentX, y + baseCellHeight);
      doc.text(header, currentX + colWidths[i] / 2, y + 4, { align: 'center' });
      currentX += colWidths[i];
    });
    y += baseCellHeight;

    asignaturas.forEach((asignatura, index) => {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const nombreAsignaturaLines = doc.splitTextToSize(asignatura.nomAsignatura, colWidths[3] - 4);
      const numLineas = nombreAsignaturaLines.length;
      const lineSpacing = 3;
      const cellHeight = Math.max(baseCellHeight, (numLineas * lineSpacing) + 2);

      if (y + cellHeight > this.MAX_Y - 15) {
        doc.addPage();
        y = this.MARGIN;
        doc.setFillColor('#dcdcdc');
        doc.rect(x, y, tableWidth, baseCellHeight, 'F');
        doc.setDrawColor('#c8c8c8');
        doc.rect(x, y, tableWidth, baseCellHeight);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        currentX = x;
        headers.forEach((header, i) => {
          if (i > 0) doc.line(currentX, y, currentX, y + baseCellHeight);
          doc.text(header, currentX + colWidths[i] / 2, y + 4, { align: 'center' });
          currentX += colWidths[i];
        });
        y += baseCellHeight;
        doc.setFont('helvetica', 'normal');
      }

      if (index % 2 !== 0) {
        doc.setFillColor('#f0f0f0');
        doc.rect(x, y, tableWidth, cellHeight, 'F');
      }

      doc.setDrawColor('#c8c8c8');
      doc.rect(x, y, tableWidth, cellHeight);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#000000');
      currentX = x;

      const valores = [
        { text: asignatura.codAsignatura, isArray: false },
        { text: asignatura.grupo, isArray: false },
        { text: asignatura.semestre.toString(), isArray: false },
        { text: nombreAsignaturaLines, isArray: true },
        { text: asignatura.numEstudiantes.toString(), isArray: false },
        { text: asignatura.numCreditos.toString(), isArray: false },
        { text: asignatura.horasPresenciales.toString(), isArray: false }
      ];

      valores.forEach((valor, i) => {
        if (i > 0) {
          doc.line(currentX, y, currentX, y + cellHeight);
        }
        if (valor.isArray) {
          const lines = valor.text as string[];
          const startY = y + ((cellHeight - (lines.length * lineSpacing)) / 2) + 2;
          lines.forEach((line: string, lineIdx: number) => {
            doc.text(line, currentX + 2, startY + (lineIdx * lineSpacing));
          });
        } else {
          const textY = y + (cellHeight / 2) + 1.5;
          doc.text(valor.text as string, currentX + colWidths[i] / 2, textY, { align: 'center' });
        }
        currentX += colWidths[i];
      });
      y += cellHeight;
    });
    return y + 3;
  }

  private renderizarTablaInvestigaciones(
    doc: jsPDF,
    investigaciones: InvestigacionData[],
    y: number
  ): number {
    const x = this.MARGIN + 3;
    const tableWidth = this.CONTENT_WIDTH - 6;
    const baseCellHeight = 6;
    const colWidths = [18, 14, 63, 18, 47, 14];
    const headers = ['GRUPO INV.', 'COD', 'NOMBRE DEL PROYECTO', 'MOMENTO', 'PRODUCTOS ESPERADOS', 'HORAS'];

    doc.setFillColor('#dcdcdc');
    doc.rect(x, y, tableWidth, baseCellHeight, 'F');
    doc.setDrawColor('#c8c8c8');
    doc.rect(x, y, tableWidth, baseCellHeight);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');

    let currentX = x;
    headers.forEach((header, i) => {
      if (i > 0) doc.line(currentX, y, currentX, y + baseCellHeight);
      doc.text(header, currentX + colWidths[i] / 2, y + 4, { align: 'center' });
      currentX += colWidths[i];
    });
    y += baseCellHeight;

    investigaciones.forEach((inv, index) => {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const nombreProyectoLines = doc.splitTextToSize(inv.nombreProyecto, colWidths[2] - 4);
      const productosLines = doc.splitTextToSize(inv.productos, colWidths[4] - 4);
      const maxLineas = Math.max(nombreProyectoLines.length, productosLines.length);
      const lineSpacing = 3;
      const cellHeight = Math.max(baseCellHeight, (maxLineas * lineSpacing) + 2);

      if (y + cellHeight > this.MAX_Y - 15) {
        doc.addPage();
        y = this.MARGIN;
        doc.setFillColor('#dcdcdc');
        doc.rect(x, y, tableWidth, baseCellHeight, 'F');
        doc.setDrawColor('#c8c8c8');
        doc.rect(x, y, tableWidth, baseCellHeight);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        currentX = x;
        headers.forEach((header, i) => {
          if (i > 0) doc.line(currentX, y, currentX, y + baseCellHeight);
          doc.text(header, currentX + colWidths[i] / 2, y + 4, { align: 'center' });
          currentX += colWidths[i];
        });
        y += baseCellHeight;
        doc.setFont('helvetica', 'normal');
      }

      if (index % 2 !== 0) {
        doc.setFillColor('#f0f0f0');
        doc.rect(x, y, tableWidth, cellHeight, 'F');
      }

      doc.setDrawColor('#c8c8c8');
      doc.rect(x, y, tableWidth, cellHeight);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#000000');
      currentX = x;

      const valores = [
        { text: inv.grupo || 'N/A', lines: [inv.grupo || 'N/A'], isMultiline: false },
        { text: inv.codigo, lines: [inv.codigo], isMultiline: false },
        { text: '', lines: nombreProyectoLines, isMultiline: true },
        { text: inv.momento || 'N/A', lines: [inv.momento || 'N/A'], isMultiline: false },
        { text: '', lines: productosLines, isMultiline: true },
        { text: inv.horas.toString(), lines: [inv.horas.toString()], isMultiline: false }
      ];

      valores.forEach((valor, i) => {
        if (i > 0) doc.line(currentX, y, currentX, y + cellHeight);

        if (valor.isMultiline) {
          const lines = valor.lines;
          const startY = y + ((cellHeight - (lines.length * lineSpacing)) / 2) + 2;
          lines.forEach((line: string, lineIdx: number) => {
            doc.text(line, currentX + 2, startY + (lineIdx * lineSpacing));
          });
        } else {
          const textY = y + (cellHeight / 2) + 1.5;
          doc.text(valor.text, currentX + colWidths[i] / 2, textY, { align: 'center' });
        }
        currentX += colWidths[i];
      });
      y += cellHeight;
    });
    return y + 3;
  }

  private renderizarTablaActividades(
    doc: jsPDF,
    actividades: ActividadData[],
    y: number
  ): number {
    const x = this.MARGIN + 3;
    const tableWidth = this.CONTENT_WIDTH - 6;
    const colHoras = 20;
    const colNombre = tableWidth - colHoras;
    const baseCellHeight = 6;

    doc.setFillColor('#dcdcdc');
    doc.rect(x, y, tableWidth, baseCellHeight, 'F');
    doc.setDrawColor('#c8c8c8');
    doc.rect(x, y, tableWidth, baseCellHeight);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text('DENOMINACIÓN DE LA ACTIVIDAD', x + 2, y + 4);
    doc.line(x + colNombre, y, x + colNombre, y + baseCellHeight);
    doc.text('HORAS', x + tableWidth - colHoras / 2, y + 4, { align: 'center' });

    y += baseCellHeight;

    actividades.forEach((actividad, index) => {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const nombreActividadLines = doc.splitTextToSize(actividad.nombre, colNombre - 4);
      const numLineasNombre = nombreActividadLines.length;

      // Asesorías
      let asesoriaLines: string[] = [];
      let numLineasAsesorias = 0;
      if (actividad.asesorias && actividad.asesorias.length > 0) {
        asesoriaLines = actividad.asesorias.map(a => `- ${a.titulo || 'Sin título'}`);
        const asesoriaText = asesoriaLines.join('\n');
        const asesoriaWrapped = doc.splitTextToSize(asesoriaText, colNombre - 4);
        numLineasAsesorias = asesoriaWrapped.length;
      }

      const lineSpacing = 3;
      const totalLineas = numLineasNombre + numLineasAsesorias;
      const cellHeight = Math.max(baseCellHeight, totalLineas * lineSpacing + 2);

      if (y + cellHeight > this.MAX_Y - 15) {
        doc.addPage();
        y = this.MARGIN;
        doc.setFillColor('#dcdcdc');
        doc.rect(x, y, tableWidth, baseCellHeight, 'F');
        doc.setDrawColor('#c8c8c8');
        doc.rect(x, y, tableWidth, baseCellHeight);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DENOMINACIÓN DE LA ACTIVIDAD', x + 2, y + 4);
        doc.line(x + colNombre, y, x + colNombre, y + baseCellHeight);
        doc.text('HORAS', x + tableWidth - colHoras / 2, y + 4, { align: 'center' });
        y += baseCellHeight;
        doc.setFont('helvetica', 'normal');
      }

      if (index % 2 !== 0) {
        doc.setFillColor('#f0f0f0');
        doc.rect(x, y, tableWidth, cellHeight, 'F');
      }

      doc.setDrawColor('#c8c8c8');
      doc.rect(x, y, tableWidth, cellHeight);
      const startYNombre = y + ((cellHeight - (totalLineas * lineSpacing)) / 2) + 2;
      nombreActividadLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, x + 2, startYNombre + lineIdx * lineSpacing);
      });
      if (asesoriaLines.length > 0) {
        const startYAsesorias = startYNombre + numLineasNombre * lineSpacing;
        const asesoriaText = asesoriaLines.join('\n');
        const asesoriaWrapped = doc.splitTextToSize(asesoriaText, colNombre - 4);
        asesoriaWrapped.forEach((line: string, lineIdx: number) => {
          doc.text(line, x + 2, startYAsesorias + lineIdx * lineSpacing);
        });
      }
      doc.line(x + colNombre, y, x + colNombre, y + cellHeight);
      const horasY = y + cellHeight / 2 + 1.5;
      doc.text(actividad.horas.toString(), x + tableWidth - colHoras / 2, horasY, { align: 'center' });

      y += cellHeight;
    });

    return y + 3;
  }

  async exportarPTsAprobados(
    resumenProfesores: ResumenProfesor[],
    programa: string,
    facultad: string,
    periodo: string,
    decano: string,
    director: string,
    seccionesConPadre: Map<string, string> = new Map()
  ): Promise<void> {
    const doc = new jsPDF('l', 'mm', 'a4');
    let yPosition = 10;

    const logo = await this.cargarLogo();
    if (logo) {
      const img = new Image();
      img.src = logo;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const originalWidth = img.width;
          const originalHeight = img.height;
          const targetWidth = 30;
          const targetHeight = (originalHeight / originalWidth) * targetWidth;
          doc.addImage(logo, 'PNG', 20, 20, targetWidth, targetHeight);
          resolve();
        };
      });
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO DE PLAN DE TRABAJO DEL PROFESOR', 148, 16, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const metaX = 230;
    const metaY = 10;
    const metaCellWidth = 30;
    const metaCellHeight = 5;

    doc.setDrawColor('#000000');
    doc.setLineWidth(0.3);
    doc.rect(metaX, metaY, metaCellWidth, metaCellHeight);
    doc.text('Código', metaX + 2, metaY + 3.5);
    doc.rect(metaX + metaCellWidth, metaY, metaCellWidth, metaCellHeight);
    doc.text('DO-FR-011', metaX + metaCellWidth + 2, metaY + 3.5);

    doc.rect(metaX, metaY + metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text('Versión', metaX + 2, metaY + metaCellHeight + 3.5);
    doc.rect(metaX + metaCellWidth, metaY + metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text('01', metaX + metaCellWidth + 2, metaY + metaCellHeight + 3.5);

    doc.rect(metaX, metaY + 2 * metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text('Vigencia', metaX + 2, metaY + 2 * metaCellHeight + 3.5);
    doc.rect(metaX + metaCellWidth, metaY + 2 * metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text('24/11/2025', metaX + metaCellWidth + 2, metaY + 2 * metaCellHeight + 3.5);

    doc.rect(metaX, metaY + 3 * metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text('Página', metaX + 2, metaY + 3 * metaCellHeight + 3.5);
    doc.rect(metaX + metaCellWidth, metaY + 3 * metaCellHeight, metaCellWidth, metaCellHeight);
    doc.text(`1 de 1`, metaX + metaCellWidth + 2, metaY + 3 * metaCellHeight + 3.5);

    yPosition = 22;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN PLANES DE TRABAJO', 148, yPosition, { align: 'center' });
    yPosition += 5;
    doc.setFontSize(9);
    doc.text('PROFESORES CON DEDICACIÓN: COMPLETO Y MEDIO TIEMPO', 148, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text(`PERÍODO ACADÉMICO: ${periodo}`, 148, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFillColor('#dcdcdc');
    doc.rect(10, yPosition, 277, 12, 'F');
    doc.setDrawColor('#000000');
    doc.rect(10, yPosition, 277, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACULTAD: ${facultad}`, 12, yPosition + 4);
    doc.text(`PROGRAMA: ${programa}`, 200, yPosition + 4);
    doc.text(`Nombre Decano(a): ${decano}`, 12, yPosition + 9);
    doc.text(`Nombre Director(a): ${director}`, 200, yPosition + 9);
    yPosition += 16;

    yPosition = this.crearTablaConsolidada(doc, resumenProfesores, yPosition, seccionesConPadre);
    yPosition += 10;

    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const firmaY = yPosition;
    const col1X = 40;
    const col2X = 160;
    doc.text(director, col1X, firmaY);
    doc.text('_________________________________________', col1X, firmaY + 2);
    doc.text('Director(a) del programa', col1X, firmaY + 6);
    doc.text(decano, col2X, firmaY);
    doc.text('_________________________________________', col2X, firmaY + 2);
    doc.text('Vo.Bo Decano(a) Facultad', col2X, firmaY + 6);
    yPosition = firmaY + 20;

    doc.setFillColor('#dcdcdc');
    doc.rect(220, yPosition, 60, 10, 'F');
    doc.setDrawColor('#000000');
    doc.rect(220, yPosition, 60, 10);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha aprobación', 222, yPosition + 4);
    doc.text('(dd/mm/aa):', 222, yPosition + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-CO'), 258, yPosition + 7);
    yPosition += 15;

    yPosition = this.dibujarSeccionAbreviaturas(doc, yPosition, resumenProfesores, seccionesConPadre);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.agregarPieDePagina(doc, i, totalPages);
    }
    doc.setPage(1);
    doc.setFillColor('#ffffff');
    doc.rect(230 + 30, 10 + 3 * 5, 30, 5, 'F');
    doc.setDrawColor('#000000');
    doc.rect(230 + 30, 10 + 3 * 5, 30, 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`1 de ${totalPages}`, 230 + 30 + 2, 10 + 3 * 5 + 3.5);

    const fileName = `Consolidado_PTs_${programa.replace(/\s+/g, '_')}_${periodo.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }

  private dibujarSeccionAbreviaturas(
    doc: jsPDF,
    yPosition: number,
    resumenProfesores: ResumenProfesor[],
    seccionesConPadre: Map<string, string>
  ): number {
    const seccionesUnicas = new Set<string>();
    for (const resumen of resumenProfesores) {
      if (resumen.totalesPorSeccion instanceof Map) {
        resumen.totalesPorSeccion.forEach((_, seccion) => {
          seccionesUnicas.add(seccion);
        });
      }
    }
    const seccionesHijasArray: string[] = Array.from(seccionesUnicas);

    if (seccionesHijasArray.length === 0) {
      return yPosition;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('ABREVIATURAS', 10, yPosition);
    yPosition += 8;

    const tableX = 10;
    const tableY = yPosition;
    const colAbrevWidth = 30;
    const colDescWidth = 277 - 30 - 10;
    const rowHeight = 6;

    doc.setFillColor('#dcdcdc');
    doc.setDrawColor('#000000');
    doc.rect(tableX, tableY, colAbrevWidth, rowHeight, 'FD');
    doc.rect(tableX + colAbrevWidth, tableY, colDescWidth, rowHeight, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text('Abreviatura', tableX + colAbrevWidth / 2, tableY + 4, { align: 'center' });
    doc.text('Descripción', tableX + colAbrevWidth + colDescWidth / 2, tableY + 4, { align: 'center' });
    yPosition += rowHeight;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const roles = [
      { abrev: 'Dir', desc: 'Director(a) del programa' },
      { abrev: 'Ast', desc: 'Asistente académico' },
      { abrev: 'Prof', desc: 'Profesor' }
    ];

    roles.forEach(rol => {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 15;
        doc.setFillColor('#dcdcdc');
        doc.setDrawColor('#000000');
        doc.rect(tableX, yPosition, colAbrevWidth, rowHeight, 'FD');
        doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight, 'FD');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        doc.text('Abreviatura', tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
        doc.text('Descripción', tableX + colAbrevWidth + colDescWidth / 2, yPosition + 4, { align: 'center' });
        yPosition += rowHeight;
      }

      doc.setDrawColor('#c8c8c8');
      doc.setLineWidth(0.1);
      doc.rect(tableX, yPosition, colAbrevWidth, rowHeight);
      doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight);
      doc.text(rol.abrev, tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
      doc.text(rol.desc, tableX + colAbrevWidth + 2, yPosition + 4);
      yPosition += rowHeight;
    });

    seccionesHijasArray.forEach(seccionHija => {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 15;
        doc.setFillColor('#dcdcdc');
        doc.setDrawColor('#000000');
        doc.rect(tableX, yPosition, colAbrevWidth, rowHeight, 'FD');
        doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight, 'FD');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        doc.text('Abreviatura', tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
        doc.text('Descripción', tableX + colAbrevWidth + colDescWidth / 2, yPosition + 4, { align: 'center' });
        yPosition += rowHeight;
      }

      const seccionPadre = seccionesConPadre.get(seccionHija) || '';
      const nombreUsar = (seccionHija.trim() !== '') ? seccionHija : seccionPadre;
      const abreviatura = this.obtenerAbreviatura(seccionHija, seccionPadre);

      doc.setDrawColor('#c8c8c8');
      doc.setLineWidth(0.1);
      doc.rect(tableX, yPosition, colAbrevWidth, rowHeight);
      doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight);
      doc.text(abreviatura, tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
      doc.text(nombreUsar, tableX + colAbrevWidth + 2, yPosition + 4);
      yPosition += rowHeight;
    });

    if (yPosition > 200) {
      doc.addPage();
      yPosition = 15;
      doc.setFillColor('#dcdcdc');
      doc.setDrawColor('#000000');
      doc.rect(tableX, yPosition, colAbrevWidth, rowHeight, 'FD');
      doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight, 'FD');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#000000');
      doc.text('Abreviatura', tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
      doc.text('Descripción', tableX + colAbrevWidth + colDescWidth / 2, yPosition + 4, { align: 'center' });
      yPosition += rowHeight;
    }

    doc.setDrawColor('#c8c8c8');
    doc.setLineWidth(0.1);
    doc.rect(tableX, yPosition, colAbrevWidth, rowHeight);
    doc.rect(tableX + colAbrevWidth, yPosition, colDescWidth, rowHeight);
    doc.text('D.I.', tableX + colAbrevWidth / 2, yPosition + 4, { align: 'center' });
    doc.text('Número de documento de identidad sin puntos', tableX + colAbrevWidth + 2, yPosition + 4);
    yPosition += rowHeight;

    yPosition += 15;

    this.agregarPieDePagina(doc, doc.getNumberOfPages(), doc.getNumberOfPages());

    return yPosition;
  }

  private crearSeccionFirmas(doc: jsPDF, planCompleto: PlanDeTrabajoCompleto, y: number): number {
    if (y > this.MAX_Y - 60) {
      doc.addPage();
      y = this.MARGIN;
    }

    y += 8;
    doc.setFontSize(8);
    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMAS:', this.MARGIN, y);
    y += 5;

    const firmaWidth = (this.CONTENT_WIDTH - 15) / 3;
    const firmaX1 = this.MARGIN;
    const firmaX2 = this.MARGIN + firmaWidth + 10;
    const firmaX3 = this.MARGIN + 2 * (firmaWidth + 10);
    const firmaHeight = 20;

    const firmaPositions = [firmaX1, firmaX2, firmaX3];
    const firmasData = [
      { titulo: 'Firma Profesor(a):', nombre: `${planCompleto.profesor.nombres} ${planCompleto.profesor.apellidos}` },
      { titulo: 'Firma Director(a):', nombre: planCompleto.director },
      { titulo: 'Firma Decano(a):', nombre: planCompleto.decano }
    ];

    doc.setFillColor('#f8f9fa');
    doc.setDrawColor('#cccccc');
    firmaPositions.forEach(x => {
      doc.rect(x, y, firmaWidth, firmaHeight, 'F');
      doc.rect(x, y, firmaWidth, firmaHeight);
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    firmaPositions.forEach((x, i) => {
      doc.text(firmasData[i].titulo, x + 2, y + 5);
    });

    const lineY = y + 8;
    firmaPositions.forEach(x => {
      doc.line(x + 2, lineY, x + firmaWidth - 4, lineY);
    });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    firmaPositions.forEach((x, i) => {
      doc.text(firmasData[i].nombre, x + 2, y + 15);
    });

    y += firmaHeight + 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA:', this.MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-CO'), this.MARGIN + 25, y);
    return y + 10;
  }

  private crearTablaConsolidada(
    doc: jsPDF,
    resumenProfesores: ResumenProfesor[],
    y: number,
    seccionesConPadre: Map<string, string> = new Map()
  ): number {
    const cellHeight = 6;
    const startX = 8;
    const pageWidth = 297;
    const endX = pageWidth - 8;

    const colNo = 8;
    const colRol = 8;
    const colDI = 20;
    const colNombres = 35;
    const colApellidos = 35;
    const colTotal = 14;
    const colTC = 8;
    const colMT = 8;

    const seccionesUnicas = new Set<string>();
    for (const resumen of resumenProfesores) {
      if (resumen.totalesPorSeccion instanceof Map) {
        resumen.totalesPorSeccion.forEach((_, seccion) => {
          seccionesUnicas.add(seccion);
        });
      }
    }
    const seccionesHijasArray: string[] = Array.from(seccionesUnicas);

    const anchoFijo = colNo + colRol + colDI + colNombres + colApellidos + colTotal + colTC + colMT;
    const anchoDisponible = endX - startX - anchoFijo;
    const anchoColumnaSeccion = Math.max(12, Math.floor(anchoDisponible / seccionesHijasArray.length));
    const totalWidth = anchoFijo + (seccionesHijasArray.length * anchoColumnaSeccion);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let currentX = startX;

    const headersFijos = [
      { text: 'No', width: colNo },
      { text: 'Rol', width: colRol },
      { text: 'D.I.', width: colDI },
      { text: 'Nombres', width: colNombres },
      { text: 'Apellidos', width: colApellidos },
    ];

    headersFijos.forEach(header => {
      doc.setFillColor(233, 236, 239);
      doc.setDrawColor(180, 180, 180);
      doc.rect(currentX, y, header.width, cellHeight, 'FD');
      if (header.text) {
        doc.setTextColor(0, 0, 0);
        doc.text(header.text, currentX + header.width / 2, y + 4, { align: 'center' });
      }
      currentX += header.width;
    });

    const totalAnchoSecciones = seccionesHijasArray.length * anchoColumnaSeccion;
    doc.setFillColor(220, 220, 220);
    doc.setDrawColor(180, 180, 180);
    doc.rect(currentX, y, totalAnchoSecciones + colTotal, cellHeight, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.text('Horas asignadas', currentX + (totalAnchoSecciones + colTotal) / 2, y + 4, { align: 'center' });

    doc.setFillColor(220, 220, 220);
    doc.rect(currentX + totalAnchoSecciones + colTotal, y, colTC + colMT, cellHeight, 'FD');
    doc.text('Dedicación', currentX + totalAnchoSecciones + colTotal + (colTC + colMT) / 2, y + 4, { align: 'center' });
    y += cellHeight;

    currentX = startX + colNo + colRol + colDI + colNombres + colApellidos;
    let maxHeightSecondRow = cellHeight;
    const abreviaturasInfo: Array<{ x: number, abrev: string, height: number }> = [];

    seccionesHijasArray.forEach(seccionHija => {
      const seccionPadre = seccionesConPadre.get(seccionHija) || '';
      const abreviatura = this.obtenerAbreviatura(seccionHija, seccionPadre);
      doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(abreviatura, anchoColumnaSeccion - 2);
      const textHeight = lines.length * 2.5 + 2;
      const cellHeightNeeded = Math.max(cellHeight, textHeight);
      maxHeightSecondRow = Math.max(maxHeightSecondRow, cellHeightNeeded);
      abreviaturasInfo.push({ x: currentX, abrev: abreviatura, height: cellHeightNeeded });
      currentX += anchoColumnaSeccion;
    });

    currentX = startX + colNo + colRol + colDI + colNombres + colApellidos;
    abreviaturasInfo.forEach((info) => {
      doc.setFillColor(233, 236, 239);
      doc.setDrawColor(180, 180, 180);
      doc.rect(info.x, y, anchoColumnaSeccion, maxHeightSecondRow, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(info.abrev, anchoColumnaSeccion - 2);
      const startY = y + (maxHeightSecondRow - (lines.length * 2.5)) / 2 + 2.5;
      lines.forEach((line: string, idx: number) => {
        doc.text(line, info.x + anchoColumnaSeccion / 2, startY + (idx * 2.5), { align: 'center' });
      });
    });

    currentX = startX + colNo + colRol + colDI + colNombres + colApellidos + totalAnchoSecciones;
    const dedicacionHeaders = [
      { text: 'Total', width: colTotal },
      { text: 'TC', width: colTC },
      { text: 'MT', width: colMT }
    ];

    dedicacionHeaders.forEach(header => {
      doc.setFillColor(233, 236, 239);
      doc.setDrawColor(180, 180, 180);
      doc.rect(currentX, y, header.width, maxHeightSecondRow, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(header.text, currentX + header.width / 2, y + maxHeightSecondRow / 2 + 2, { align: 'center' });
      currentX += header.width;
    });

    y += maxHeightSecondRow;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    const totales: { [key: string]: number } = {};
    totales['total'] = 0;
    totales['tc'] = 0;
    totales['mt'] = 0;
    seccionesHijasArray.forEach(seccion => { totales[seccion] = 0; });

    resumenProfesores.forEach((resumen, index) => {
      if (y > 175) {
        doc.addPage();
        y = 20;
        this.redibujarEncabezadosConsolidado(doc, startX, y, cellHeight, seccionesHijasArray, anchoColumnaSeccion, endX, seccionesConPadre);
        y += cellHeight + maxHeightSecondRow;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(startX, y, totalWidth, cellHeight, 'F');
      }

      currentX = startX;
      const nombresCorto = resumen.profesor.nombres.length > 30 ? resumen.profesor.nombres.substring(0, 30) : resumen.profesor.nombres;
      const apellidosCorto = resumen.profesor.apellidos.length > 30 ? resumen.profesor.apellidos.substring(0, 30) : resumen.profesor.apellidos;

      const valoresFijos = [
        { val: `${index + 1}`, w: colNo },
        { val: resumen.profesor.rol, w: colRol },
        { val: resumen.profesor.documento, w: colDI },
        { val: nombresCorto, w: colNombres },
        { val: apellidosCorto, w: colApellidos },
      ];

      valoresFijos.forEach(({ val, w }) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(currentX, y, w, cellHeight);
        doc.setTextColor(0, 0, 0);
        doc.text(val, currentX + w / 2, y + 4, { align: 'center' });
        currentX += w;
      });

      seccionesHijasArray.forEach(seccion => {
        let horas = 0;
        if (resumen.totalesPorSeccion instanceof Map) {
          horas = resumen.totalesPorSeccion.get(seccion) || 0;
        } else {
          horas = resumen.totalesPorSeccion[seccion] || 0;
        }
        totales[seccion] += horas;
        doc.setDrawColor(200, 200, 200);
        doc.rect(currentX, y, anchoColumnaSeccion, cellHeight);
        doc.text(horas.toString(), currentX + anchoColumnaSeccion / 2, y + 4, { align: 'center' });
        currentX += anchoColumnaSeccion;
      });

      const totalProfesor = resumen.totalGeneral;
      totales['total'] += totalProfesor;
      doc.rect(currentX, y, colTotal, cellHeight);
      doc.text(totalProfesor.toString(), currentX + colTotal / 2, y + 4, { align: 'center' });
      currentX += colTotal;

      const tcVal = resumen.profesor.dedicacion === 'TIEMPO COMPLETO' ? '1' : '0';
      const mtVal = resumen.profesor.dedicacion === 'MEDIO TIEMPO' ? '1' : '0';
      totales['tc'] += resumen.profesor.dedicacion === 'TIEMPO COMPLETO' ? 1 : 0;
      totales['mt'] += resumen.profesor.dedicacion === 'MEDIO TIEMPO' ? 1 : 0;

      doc.rect(currentX, y, colTC, cellHeight);
      doc.text(tcVal, currentX + colTC / 2, y + 4, { align: 'center' });
      currentX += colTC;
      doc.rect(currentX, y, colMT, cellHeight);
      doc.text(mtVal, currentX + colMT / 2, y + 4, { align: 'center' });
      y += cellHeight;
    });

    doc.setFillColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(180, 180, 180);
    doc.rect(startX, y, totalWidth, cellHeight, 'FD');
    currentX = startX;
    doc.setTextColor(0, 0, 0);
    doc.text('TOTALES', currentX + 2, y + 4);
    currentX += colNo + colRol + colDI + colNombres + colApellidos;
    seccionesHijasArray.forEach(seccion => {
      doc.text(totales[seccion].toString(), currentX + anchoColumnaSeccion / 2, y + 4, { align: 'center' });
      currentX += anchoColumnaSeccion;
    });
    doc.text(totales['total'].toString(), currentX + colTotal / 2, y + 4, { align: 'center' });
    currentX += colTotal;
    doc.text(totales['tc'].toString(), currentX + colTC / 2, y + 4, { align: 'center' });
    currentX += colTC;
    doc.text(totales['mt'].toString(), currentX + colMT / 2, y + 4, { align: 'center' });
    y += cellHeight;

    doc.setFillColor(220, 220, 220);
    doc.rect(startX, y, totalWidth, cellHeight, 'FD');
    currentX = startX;
    doc.text('Porcentajes totales', currentX + 2, y + 4);
    currentX += colNo + colRol + colDI + colNombres + colApellidos;
    seccionesHijasArray.forEach(seccion => {
      const pct = totales['total'] > 0 ? ((totales[seccion] / totales['total']) * 100).toFixed(1) : '0.0';
      doc.text(`${pct}%`, currentX + anchoColumnaSeccion / 2, y + 4, { align: 'center' });
      currentX += anchoColumnaSeccion;
    });
    doc.text('100.0%', currentX + colTotal / 2, y + 4, { align: 'center' });
    currentX += colTotal;
    doc.text('', currentX + colTC / 2, y + 4, { align: 'center' });
    currentX += colTC;
    doc.text('', currentX + colMT / 2, y + 4, { align: 'center' });
    return y + cellHeight;
  }

  private obtenerAbreviatura(nombreSeccionHija: string, nombreSeccionPadre: string): string {
    const nombreAUsar = (nombreSeccionHija && nombreSeccionHija.trim() !== '') ? nombreSeccionHija : nombreSeccionPadre;
    if (!nombreAUsar || nombreAUsar.trim() === '') return 'N/A';
    const palabras = nombreAUsar.split(' ').filter(p => p.length >= 3);
    if (palabras.length === 0) return nombreAUsar.substring(0, 3).toUpperCase();
    let abreviatura = '';
    if (palabras.length === 1) {
      abreviatura = palabras[0].substring(0, 3).toUpperCase();
    } else if (palabras.length === 2) {
      abreviatura = palabras[0].substring(0, 3).toUpperCase() + '.' + palabras[1].substring(0, 3).toUpperCase();
    } else {
      const primera = palabras[0].substring(0, 3).toUpperCase();
      const penultima = palabras[palabras.length - 2].substring(0, 3).toUpperCase();
      const ultima = palabras[palabras.length - 1].substring(0, 3).toUpperCase();
      abreviatura = `${primera}.${penultima}.${ultima}`;
    }
    return abreviatura;
  }

  private redibujarEncabezadosConsolidado(
    doc: jsPDF,
    startX: number,
    y: number,
    cellHeight: number,
    seccionesHijasArray: string[],
    anchoColumnaSeccion: number,
    endX: number,
    seccionesConPadre: Map<string, string>
  ): void {
    const colNo = 8;
    const colRol = 8;
    const colDI = 20;
    const colNombres = 35;
    const colApellidos = 35;
    const colTotal = 14;
    const colTC = 8;
    const colMT = 8;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let currentX = startX;

    const headersFijos = [
      { text: 'No', width: colNo },
      { text: 'D.I.', width: colDI },
      { text: 'Nombres', width: colNombres },
      { text: 'Apellidos', width: colApellidos },
    ];
    headersFijos.forEach(header => {
      doc.setFillColor('#dcdcdc');
      doc.setDrawColor('#000000');
      doc.rect(currentX, y, header.width, cellHeight, 'FD');
      doc.setTextColor('#000000');
      doc.text(header.text, currentX + header.width / 2, y + 4, { align: 'center' });
      currentX += header.width;
    });

    const anchoHorasAsignadas = seccionesHijasArray.length * anchoColumnaSeccion;
    doc.setFillColor('#dcdcdc');
    doc.rect(currentX, y, anchoHorasAsignadas, cellHeight, 'FD');
    doc.setTextColor('#000000');
    doc.text('Horas asignadas', currentX + anchoHorasAsignadas / 2, y + 4, { align: 'center' });
    currentX += anchoHorasAsignadas;

    const anchoDedicacion = colTC + colMT;
    doc.setFillColor('#dcdcdc');
    doc.rect(currentX, y, anchoDedicacion, cellHeight, 'FD');
    doc.setTextColor('#000000');
    doc.text('Dedicación', currentX + anchoDedicacion / 2, y + 4, { align: 'center' });
    y += cellHeight;

    currentX = startX + colNo + colDI + colNombres + colApellidos;
    let maxHeight = cellHeight;
    const abrevInfo: Array<{ x: number, abrev: string }> = [];
    seccionesHijasArray.forEach(seccionHija => {
      const seccionPadre = seccionesConPadre.get(seccionHija) || '';
      const abreviatura = this.obtenerAbreviatura(seccionHija, seccionPadre);
      doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(abreviatura, anchoColumnaSeccion - 2);
      const textHeight = lines.length * 2.5 + 2;
      maxHeight = Math.max(maxHeight, textHeight);
      abrevInfo.push({ x: currentX, abrev: abreviatura });
      currentX += anchoColumnaSeccion;
    });

    currentX = startX + colNo + colDI + colNombres + colApellidos;
    abrevInfo.forEach(info => {
      doc.setFillColor('#dcdcdc');
      doc.setDrawColor('#000000');
      doc.rect(info.x, y, anchoColumnaSeccion, maxHeight, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#000000');
      const lines = doc.splitTextToSize(info.abrev, anchoColumnaSeccion - 2);
      const startY = y + (maxHeight - (lines.length * 2.5)) / 2 + 2.5;
      lines.forEach((line: string, idx: number) => {
        doc.text(line, info.x + anchoColumnaSeccion / 2, startY + (idx * 2.5), { align: 'center' });
      });
    });

    currentX = startX + colNo + colDI + colNombres + colApellidos + anchoHorasAsignadas;
    const dedicacionHeaders = [
      { text: 'TC', width: colTC },
      { text: 'MT', width: colMT }
    ];
    dedicacionHeaders.forEach(header => {
      doc.setFillColor('#dcdcdc');
      doc.setDrawColor('#000000');
      doc.rect(currentX, y, header.width, maxHeight, 'FD');
      doc.setTextColor('#000000');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(header.text, currentX + header.width / 2, y + maxHeight / 2 + 2, { align: 'center' });
      currentX += header.width;
    });
  }

  private ajustarTexto(doc: jsPDF, texto: string, anchoMaximo: number, fontSize: number = 7): string {
    if (!texto) return '';
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(texto.toString(), anchoMaximo);
    if (lines.length === 1) {
      return texto;
    }
    if (lines[0].length > 0) {
      return lines[0].substring(0, Math.floor(anchoMaximo / 2)) + '...';
    }
    return texto.substring(0, 20) + '...';
  }

  private agregarPieDePagina(doc: jsPDF, paginaActual: number, totalPaginas: number): void {
    doc.setFontSize(7);
    doc.setTextColor('#000000');
    doc.text('Universidad Mariana - Sistema de Planes de Trabajo', this.PAGE_WIDTH / 2, 285, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')} - Página ${paginaActual} de ${totalPaginas}`, this.PAGE_WIDTH / 2, 290, { align: 'center' });
  }
}