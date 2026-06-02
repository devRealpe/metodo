import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EquiposComputoService } from '../../core/services/equipos-computo.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { EquiposComputo } from '../../core/models/equipos-computo.model';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { SelectComponent, InputComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { Router } from '@angular/router';
import { map } from 'rxjs';

interface OpcionSelect {
  label: string;
  value: string;
}


@Component({
  selector: 'app-lista-equipos-computo.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    SelectModule,
    ProgressSpinnerModule,
    ToastModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    SelectComponent,
    InputComponent,
    DatepickerComponent
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  templateUrl: './lista-equipos-computo.component.html',
  styleUrl: './lista-equipos-computo.component.scss'
})
export class ListaEquiposComputoComponent implements OnInit {
  private readonly equiposService = inject(EquiposComputoService);
  private readonly laboratoriosService = inject(LaboratoriosService);
  private readonly listasValoresService = inject(ListasValoresService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly datePipe = inject(DatePipe);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    busqueda: [''],
    tipo: [''],
    marca: [''],
    ubicacion: ['']
  });

  loading = signal(false);
  data = signal<EquiposComputo[]>([]);
  laboratorios = signal<Laboratorio[]>([]);
  mostrarDialogo = signal(false);
  editando = signal(false);
  equipoSeleccionado = signal<EquiposComputo>(this.crearEquipoVacio());

  tiposEquipo: OpcionSelect[] = [{ label: 'Todos los tipos', value: '' }];
  cargandoTipos = false;
  cargandoMarcas = false;
  marcasEquipo: OpcionSelect[] = [{ label: 'Todas las marcas', value: '' }];
  ubicacionesEquipo = computed<OpcionSelect[]>(() => {
    const labs = this.laboratorios() || [];
    const opcionesLabs = labs.map(lab => ({ label: lab.nombre, value: lab.nombre }));
    return [{ label: 'Todas las ubicaciones', value: '' }, ...opcionesLabs];
  });

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const s = String(value).trim();
    const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const y = Number(isoDateMatch[1]);
      const mo = Number(isoDateMatch[2]) - 1;
      const d = Number(isoDateMatch[3]);
      return new Date(y, mo, d);
    }
    const dateTimeMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (dateTimeMatch) {
      const parts = dateTimeMatch[1].split('-');
      const y = Number(parts[0]);
      const mo = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      return new Date(y, mo, d);
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private toISODate(value: string | Date | null | undefined): string {
    const d = this.toDate(value);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  equiposFiltrados(): EquiposComputo[] {
    const equipos = this.data();
    const filtros = this.form.value;

    if (!filtros.busqueda && !filtros.tipo && !filtros.marca && !filtros.ubicacion) {
      return equipos;
    }

    return equipos.filter((equipo) => {
      const busqueda = filtros.busqueda?.toLowerCase().trim() || '';
      const cumpleBusqueda =
        !busqueda ||
        (equipo.nombre || '').toLowerCase().includes(busqueda) ||
        (equipo.serial || '').toLowerCase().includes(busqueda) ||
        (equipo.marca && (equipo.marca || '').toLowerCase().includes(busqueda)) ||
        (equipo.modelo && (equipo.modelo || '').toLowerCase().includes(busqueda)) ||
        (equipo.ubicacion && (equipo.ubicacion || '').toLowerCase().includes(busqueda));

      const cumpleTipo = !filtros.tipo || equipo.tipo === filtros.tipo;
      const cumpleMarca = !filtros.marca || equipo.marca === filtros.marca;
      const cumpleUbicacion = !filtros.ubicacion || equipo.ubicacion === filtros.ubicacion;

      return cumpleBusqueda && cumpleTipo && cumpleMarca && cumpleUbicacion;
    });
  }

  ngOnInit(): void {
    Promise.all([this.cargarTiposDesdeBD().catch(() => {}), this.cargarMarcasDesdeBD().catch(() => {})])
      .then(() => this.cargarEquipos())
      .catch(() => this.cargarEquipos());

    this.cargarLaboratorios();
  }

  cargarEquipos(): void {
    this.loading.set(true);
    this.equiposService.getAll().subscribe({
      next: (response) => {
        const contenido = (response as unknown as { content?: EquiposComputo[] })?.content ?? (response as unknown as EquiposComputo[]) ?? [];
        this.data.set(contenido);
        this.cargarOpcionesUnicas();
        this.loading.set(false);
      },
      error: () => {
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los equipos de cómputo'
        });
        this.loading.set(false);
      }
    });
  }

  cargarLaboratorios(): void {
    this.laboratoriosService.getAll().subscribe({
      next: (laboratorios) => {
        this.laboratorios.set(laboratorios);
      },
      error: () => {
        this.toast.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los laboratorios'
        });
      }
    });
  }

  cargarMarcasDesdeBD(): Promise<void> {
    this.cargandoMarcas = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('MAR')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'marca equipo de computo')
          .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id })))
        )
        .subscribe({
          next: (options: OpcionSelect[]) => {
            if (options && options.length) {
              this.marcasEquipo = [{ label: 'Todas las marcas', value: '' }, ...options];
            }
            this.cargandoMarcas = false;
            resolve();
          },
          error: (err) => {
            this.cargandoMarcas = false;
            this.toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar las marcas desde la base' });
            resolve();
          }
        });
    });
  }

  cargarTiposDesdeBD(): Promise<void> {
    this.cargandoTipos = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('COM')
        .pipe(
    
          map((response: any[]) => response
            .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'equipos de computo')
            .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id }))
          )
        )
        .subscribe({
          next: (options: OpcionSelect[]) => {
            this.tiposEquipo = [{ label: 'Todos los tipos', value: '' }, ...options];
            this.cargandoTipos = false;
            resolve();
          },
          error: (err) => {
            this.cargandoTipos = false;
            this.toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar los tipos de equipo' });
            reject(err);
          }
        });
    });
  }

  cargarOpcionesUnicas(): void {
    const equipos = this.data();
    const ubicacionesUnicas = [
      ...new Set(
        equipos
          .map((e) => e.ubicacion)
          .filter((u): u is string => !!u && !!u.trim())
      )
    ].sort();

    const marcasUnicas = [...new Set(equipos.map((e) => e.marca).filter((m): m is string => !!m && !!m.trim()))].sort();


    if (!this.cargandoMarcas && this.marcasEquipo.length <= 1) {
      this.marcasEquipo = [{ label: 'Todas las marcas', value: '' }, ...marcasUnicas.map((m) => ({ label: m, value: m }))];
    }
  }

  onBuscar(): void {
    const resultados = this.equiposFiltrados();
    if (resultados.length === 0) {
      this.toast.add({
        severity: 'info',
        summary: 'Búsqueda',
        detail: 'No se encontraron equipos con los criterios especificados'
      });
    }
  }

  onLimpiar(): void {
    this.form.reset({ busqueda: '', tipo: '', marca: '', ubicacion: '' });
  }

  onGlobal(): void {
    this.onLimpiar();
    this.cargarEquipos();
  }

  nuevoEquipo(): void {
    this.router.navigate(['/app/equiposComputo']);
  }

  editarEquipo(equipo: EquiposComputo): void {
    this.editando.set(true);
    const fecha = this.toDate(equipo.fechaAdq as string | Date | null);
    this.equipoSeleccionado.set({ ...equipo, fechaAdq: fecha as unknown as string });
    this.mostrarDialogo.set(true);
  }

  guardarEquipo(): void {
    const equipo = this.equipoSeleccionado();

    if (!this.validarEquipo(equipo)) return;

    this.loading.set(true);

    if (this.editando()) {
      const payload = { ...equipo, fechaAdq: this.toISODate(equipo.fechaAdq as string | Date) };
      this.equiposService.update(equipo.id, payload).subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: 'Equipo actualizado',
            detail: `El equipo "${equipo.nombre}" ha sido actualizado correctamente`
          });
          this.ocultarDialogo();
          this.cargarEquipos();
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el equipo' });
        },
        complete: () => this.loading.set(false)
      });
    } else {
      const { id: _id, creadoEn: _creadoEn, actualizadoEn: _actualizadoEn, ...rest } = equipo;
      const payload = { 
        ...rest, 
        fechaAdq: this.toISODate(rest.fechaAdq as string | Date),
        tipo: rest.tipo,
        nombre: rest.nombre,
        serial: rest.serial
      };
      this.equiposService.create(payload).subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: 'Equipo registrado',
            detail: `El equipo "${equipo.nombre}" ha sido registrado correctamente`
          });
          this.ocultarDialogo();
          this.cargarEquipos();
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar el equipo' });
        },
        complete: () => this.loading.set(false)
      });
    }
  }

  eliminarEquipo(equipo: EquiposComputo): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el equipo "${equipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarEliminar(equipo.id)
    });
  }

  confirmarEliminar(id: string): void {
    this.equiposService.delete(id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Equipo eliminado', detail: 'El equipo ha sido eliminado correctamente' });
        this.cargarEquipos();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el equipo' });
      }
    });
  }

  ocultarDialogo(): void {
    this.mostrarDialogo.set(false);
    this.equipoSeleccionado.set(this.crearEquipoVacio());
  }

  private crearEquipoVacio(): EquiposComputo {
    return {
      id: '',
      nombre: '',
      tipo: '',
      marca: '',
      modelo: '',
      serial: '',
      ubicacion: '',
      fechaAdq: null as unknown as string,
      creadoEn: '',
      actualizadoEn: ''
    };
  }

  private validarEquipo(equipo: EquiposComputo): boolean {
    const fechaOk = !!this.toDate(equipo.fechaAdq as string | Date | null);
    if (!equipo.nombre?.trim() || !equipo.tipo?.trim() || !equipo.serial?.trim() || !fechaOk) {
      this.toast.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Complete nombre, tipo, serial y fecha de adquisición.'
      });
      return false;
    }
    return true;
  }

  getTipoSeverity(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (tipo?.toLowerCase()) {
      case 'computador':
        return 'info';
      case 'switch':
        return 'success';
      case 'ap':
        return 'warn';
      case 'telefono':
        return 'info';
      case 'camara':
      case 'cctv':
        return 'danger';
      case 'ups':
        return 'secondary';
      default:
        return 'info';
    }
  }

  formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '—';
    const d = this.toDate(fecha);
    if (!d) return '—';
    return this.datePipe.transform(d, 'dd/MM/yyyy') ?? '—';
  }

  private valorCelda(equipo: EquiposComputo, key: string): string {
    switch (key) {
      case 'id':
        return equipo.id || '—';
      case 'nombre':
        return equipo.nombre || '—';
      case 'tipo':
        return equipo.tipo || '—';
      case 'marca':
        return equipo.marca || 'No especificado';
      case 'modelo':
        return equipo.modelo || 'No especificado';
      case 'serial':
        return equipo.serial || '—';
      case 'ubicacion':
        return equipo.ubicacion || 'No especificado';
      case 'fechaAdq':
        return this.formatearFecha(equipo.fechaAdq);
      default: {
        const equipoRecord = equipo as unknown as Record<string, unknown>;
        const valor = equipoRecord[key];
        return valor?.toString() ?? '—';
      }
    }
  }

  onExportCSV(): void {
    const equipos = this.equiposFiltrados();
    if (!equipos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay equipos para exportar.' });
      return;
    }

    const header = ['ID', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Serial', 'Ubicación', 'Fecha Adquisición'];
    const csv = [
      header.join(','),
      ...equipos.map((equipo) =>
        [
          equipo.id,
          equipo.nombre,
          equipo.tipo,
          equipo.marca ?? 'No especificado',
          equipo.modelo ?? 'No especificado',
          equipo.serial,
          equipo.ubicacion ?? 'No especificado',
          this.formatearFecha(equipo.fechaAdq as string | Date)
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
    a.download = `equipos_computo_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.toast.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'El archivo CSV se ha descargado correctamente.' });
  }

  async exportarXLSX(): Promise<void> {
    const equipos = this.equiposFiltrados();
    if (!equipos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay equipos para exportar.' });
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const header = ['ID', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Serial', 'Ubicación', 'Fecha Adquisición'];
      const body = equipos.map((e) => [
        this.valorCelda(e, 'id'),
        this.valorCelda(e, 'nombre'),
        this.valorCelda(e, 'tipo'),
        this.valorCelda(e, 'marca'),
        this.valorCelda(e, 'modelo'),
        this.valorCelda(e, 'serial'),
        this.valorCelda(e, 'ubicacion'),
        this.valorCelda(e, 'fechaAdq')
      ]);

      const aoa = [header, ...body];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const maxLenByCol = header.map((h, idx) => {
        const headerLen = h.length;
        const dataMax = Math.max(0, ...body.map((row) => String(row[idx]).length));
        return Math.min(60, Math.max(10, Math.max(headerLen, dataMax) + 2));
      });
      
      interface WorksheetWithCols {
        '!cols'?: Array<{ wch: number }>;
        [key: string]: unknown;
      }
      (ws as WorksheetWithCols)['!cols'] = maxLenByCol.map((wch) => ({ wch }));

      XLSX.utils.book_append_sheet(wb, ws, 'Equipos de Cómputo');
      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      XLSX.writeFile(wb, `equipos_computo_${date}.xlsx`);

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
    const equipos = this.equiposFiltrados();
    if (!equipos.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay equipos para exportar.' });
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

      const head = [['Nombre', 'Tipo', 'Marca', 'Modelo', 'Serial', 'Ubicación', 'Fecha Adq.']];
      const body = equipos.map(e => [
        this.valorCelda(e, 'nombre'),
        this.valorCelda(e, 'tipo'),
        this.valorCelda(e, 'marca'),
        this.valorCelda(e, 'modelo'),
        this.valorCelda(e, 'serial'),
        this.valorCelda(e, 'ubicacion'),
        this.valorCelda(e, 'fechaAdq')
      ]);

      const colWidths: Record<number, { cellWidth: number }> = {};
      const baseWidths = [140, 80, 90, 100, 122, 130, 90];
      
      baseWidths.forEach((width, index) => {
        colWidths[index] = { cellWidth: width };
      });

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
        doc.text('Lista de Equipos de Cómputo', pageWidth / 2, 40, { align: 'center' });
        
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

      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      doc.save(`equipos_computo_${date}.pdf`);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Falta dependencia', detail: 'Instala: npm i jspdf jspdf-autotable' });
    }
  }

  actualizarEquipoSeleccionado(campo: keyof EquiposComputo, valor: string | Date | null): void {
    const prev = this.equipoSeleccionado();
    const next: EquiposComputo = {
      ...prev,
      [campo]: campo === 'fechaAdq' ? (this.toDate(valor) as unknown as string) : valor
    } as EquiposComputo;
    this.equipoSeleccionado.set(next);
  }
}
