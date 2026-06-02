import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { OraAulas } from '../../core/models/ora-aulas.model';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { Card } from "primeng/card";

type Opcion = { label: string; value: string };

const OPCIONES_ESTADO: Opcion[] = [
  { label: 'Todos', value: '' },
  { label: 'Disponible', value: 'Disponible' },
  { label: 'Ocupado', value: 'Ocupado' },
  { label: 'Mantenimiento', value: 'Mantenimiento' }
];
const OPCIONES_TIPO: Opcion[] = [
  { label: 'Todos', value: '' },
  { label: 'Servicio', value: 'Servicio' },
  { label: 'Clases', value: 'Clases' },
  { label: 'Laboratorio', value: 'Laboratorio' }
];
const OPCIONES_SEDE: Opcion[] = [
  { label: 'Todas', value: '' },
  { label: 'Sede Alvernia', value: 'Sede Alvernia' },
  { label: 'Sede Central', value: 'Sede Central' }
];

const OPCIONES_BLOQUE: Opcion[] = [
    { label: 'Maria Inmaculada', value: 'Maria Inmaculada' },
    { label: 'San José', value: 'San José' },
    { label: 'San Francisco', value: 'San Francisco' },
    { label: 'Alvernia', value: 'Alvernia' }  
];

@Component({
  selector: 'app-lista-laboratorio',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressSpinnerModule,
    InputComponent,
    SelectComponent,
    RouterModule,
    Card
],
  providers: [ConfirmationService, MessageService, DatePipe],
  templateUrl: './lista-laboratorio.component.html'
})
export class ListaLaboratorioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private labsSrv = inject(LaboratoriosService);
  private oraAulasSrv = inject(OraAulasService);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);
  private toast = inject(MessageService);
  private datePipe = inject(DatePipe);
  private destruir$ = new Subject<void>();

  cargando = false;

  laboratorios: Laboratorio[] = [];
  filtrados: Laboratorio[] = [];

  opcionesEstado = OPCIONES_ESTADO;
  opcionesTipo   = OPCIONES_TIPO;
  opcionesSede   = OPCIONES_SEDE;
  opcionesBloque = OPCIONES_BLOQUE;

  filtroForm!: FormGroup;

  ngOnInit(): void {
    this.filtroForm = this.fb.group({ texto: [''], estado: [''], tipo: [''], sede: [''], bloque: [''] });
    this.filtroForm.valueChanges.pipe(debounceTime(150), takeUntil(this.destruir$)).subscribe(() => this.aplicarFiltros());
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.oraAulasSrv.getAll().pipe(takeUntil(this.destruir$)).subscribe({
      next: (data) => { 
        // Filtrar solo las aulas que son laboratorios y omitir las virtuales
        const laboratorios = (data ?? [])
          .filter(aula => {
            const esLaboratorio = aula.tipoAula?.toLowerCase().includes('laboratorio');
            const noEsVirtual = aula.nomAula?.toLowerCase() !== 'virtual';
            return esLaboratorio && noEsVirtual;
          })
          .map(aula => this.mapearOraAulaALaboratorio(aula));
        
        this.laboratorios = laboratorios;
        this.aplicarFiltros(); 
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los laboratorios desde Oracle.' }),
      complete: () => this.cargando = false
    });
  }

  /**
   * Mapea un registro de OraAulas a Laboratorio
   */
  private mapearOraAulaALaboratorio(aula: OraAulas): Laboratorio {
    return {
      id: aula.codAula,
      nombre: aula.nomAula,
      capacidad: aula.numCapacidad,
      descripcion: aula.nomAula,
      estado: 'Disponible', // Estado por defecto, puede ajustarse según lógica de negocio
      ubicacion: aula.nomBloque,
      tipo: aula.tipoAula,
      bloque: aula.nomBloque,
      ocupados: 0
    };
  }

  aplicarFiltros(): void {
    const { texto, estado, tipo, sede, bloque } = this.filtroForm.getRawValue();
    const t = (texto || '').toLowerCase();
    const est = (estado || '').toLowerCase();
    const tip = (tipo || '').toLowerCase();
    const sed = (sede || '').toLowerCase();
    const bl = (bloque || '').toLowerCase();

    this.filtrados = this.laboratorios.filter(l => {
      const coincideTexto = !t || l.nombre?.toLowerCase().includes(t) || l.descripcion?.toLowerCase().includes(t) || l.ubicacion?.toLowerCase().includes(t) || l.bloque?.toLowerCase().includes(t) || l.id?.toLowerCase().includes(t);
      const coincideEstado = !est || (l.estado || '').toLowerCase() === est;
      const coincideTipo = !tip || (l.tipo || '').toLowerCase() === tip;
      const coincideSede = !sed || (l.ubicacion || '').toLowerCase() === sed;
      const coincideBloque = !bl || (l.bloque || '').toLowerCase() === bl;
      return coincideTexto && coincideEstado && coincideTipo && coincideSede && coincideBloque;
    });
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({ texto: '', estado: '', tipo: '', sede: '', bloque: '' });
  }

  crear(): void {
    this.router.navigate(['/app/registroLaboratorio']);
  }
  
  editar(lab: Laboratorio): void { 
    if (lab?.nombre) {
      const nombreCodificado = encodeURIComponent(lab.nombre);
      this.router.navigate(['/app/editarLaboratorio', nombreCodificado]);
    }
  }

  eliminar(lab: Laboratorio): void {
    if (!lab?.id) return;
    this.confirm.confirm({
      message: `¿Eliminar el laboratorio <b>${lab.nombre}</b>?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cargando = true;
        this.labsSrv.delete(lab.id).pipe(takeUntil(this.destruir$)).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Laboratorio eliminado correctamente.' });
            this.laboratorios = this.laboratorios.filter(x => x.id !== lab.id);
            this.aplicarFiltros();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el laboratorio.' }),
          complete: () => this.cargando = false
        });
      }
    });
  }

  colorEstado(estado?: string): 'success' | 'warn' | 'danger' | 'info' {
    const e = (estado || '').toLowerCase();
    if (e === 'disponible') return 'success';
    if (e === 'ocupado') return 'warn';
    if (e === 'mantenimiento') return 'danger';
    return 'info';
  }

  exportarCSV(): void {
    const datos = this.filtrados;
    if (!datos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay laboratorios para exportar.' });
      return;
    }

    const header = ['Nombre', 'Capacidad', 'Estado', 'Tipo', 'Sede', 'Bloque', 'Descripción'];
    const csv = [header.join(','), ...datos.map((lab) => [lab.nombre ?? '', lab.capacidad ?? 0, lab.estado ?? '', lab.tipo ?? '', lab.ubicacion ?? '', lab.bloque ?? '', lab.descripcion ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fecha = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
    a.download = `laboratorios_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.toast.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'El archivo CSV se ha descargado correctamente.' });
  }

  async exportarXLSX(): Promise<void> {
    const datos = this.filtrados;
    if (!datos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay laboratorios para exportar.' });
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const header = ['Nombre', 'Capacidad', 'Estado', 'Tipo', 'Sede', 'Bloque', 'Descripción'];
      const body = datos.map(lab => [lab.nombre ?? '', lab.capacidad ?? 0, lab.estado ?? '', lab.tipo ?? '', lab.ubicacion ?? '', lab.bloque ?? '', lab.descripcion ?? '']);
      const aoa = [header, ...body];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const maxLenByCol = header.map((h, idx) => {
        const headerLen = h.length;
        const dataMax = Math.max(0, ...body.map(row => String(row[idx]).length));
        return Math.min(60, Math.max(10, Math.max(headerLen, dataMax) + 2));
      });
      (ws as Record<string, unknown>)['!cols'] = maxLenByCol.map(wch => ({ wch }));

      XLSX.utils.book_append_sheet(wb, ws, 'Laboratorios');
      const fecha = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      XLSX.writeFile(wb, `laboratorios_${fecha}.xlsx`);

      this.toast.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'El archivo XLSX se ha descargado correctamente.' });
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de exportación', detail: 'Para exportar a Excel instala: npm i xlsx' });
    }
  }

  private async getImageBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async exportarPDF(): Promise<void> {
    const datos = this.filtrados;
    if (!datos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay laboratorios para exportar.' });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('l', 'pt', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let logoBase64: string | null = null;
      try {
        logoBase64 = await this.getImageBase64('assets/images/mariana2.png');
      } catch {
      }

      const head = [["Nombre", "Capacidad", "Estado", "Tipo", "Sede", "Bloque", "Descripción"]];
      const body = datos.map(lab => [lab.nombre ?? '', lab.capacidad?.toString() ?? '', lab.estado ?? '', lab.tipo ?? '', lab.ubicacion ?? '', lab.bloque ?? '', lab.descripcion ?? '']);

      const colWidths: Record<number, { cellWidth: number }> = {};
      const baseWidths = [200, 70, 80, 100, 100, 70, 0];
      baseWidths.forEach((width, index) => { colWidths[index] = { cellWidth: width }; });

      const dateStr = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm');
      let currentPage = 0;

      const colorPrimario: [number, number, number] = [0, 51, 102];
      const colorSecundario: [number, number, number] = [240, 240, 245];

      const addHeader = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 25, 12, 45, 45);
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorPrimario);
        doc.text('UNIVERSIDAD MARIANA', pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Lista de Laboratorios', pageWidth / 2, 40, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha de generación: ${dateStr}`, pageWidth / 2, 55, { align: 'center' });

        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(1);
        doc.line(20, 62, pageWidth - 20, 62);
      };

      const addFooter = (pageNumber: number, totalPages: number) => {
        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Universidad Mariana - Sistema de Gestión de Laboratorios', 25, pageHeight - 18);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
        doc.text(dateStr ?? '', pageWidth - 25, pageHeight - 18, { align: 'right' });
      };

      autoTable(doc, {
        head,
        body,
        startY: 72,
        styles: {
          fontSize: 8,
          cellPadding: 5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: colorPrimario,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        bodyStyles: {
          textColor: [40, 40, 40]
        },
        alternateRowStyles: {
          fillColor: colorSecundario
        },
        columnStyles: colWidths,
        margin: { top: 72, left: 20, right: 20, bottom: 40 },
        theme: 'grid',
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.5,
        didDrawPage: (data: any) => {
          currentPage++;
          addHeader();
        }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      const fecha = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      doc.save(`laboratorios_${fecha}.pdf`);

      this.toast.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'El archivo PDF se ha descargado correctamente.' });
    } catch {
      this.toast.add({ severity: 'error', summary: 'Falta dependencia', detail: 'Instala: npm i jspdf jspdf-autotable' });
    }
  }
}
