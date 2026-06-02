import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { DialogModule } from 'primeng/dialog';
import { InputComponent, SelectComponent, TextareaComponent,DatepickerComponent } from '@microfrontends/shared-ui';
import { EquipoService } from '../../core/services/equipo.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { map } from 'rxjs';
import { Equipo } from '../../core/models/equipo.model';
import { Laboratorio } from '../../core/models/laboratorio.model';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lista-maquinaria-laboratorios.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TooltipModule,
    RippleModule,
    DialogModule,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    DatepickerComponent
],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lista-maquinaria-laboratorios.component.html',
  styleUrl: './lista-maquinaria-laboratorios.component.scss',
})
export class ListaMaquinariaLaboratoriosComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private equipoService = inject(EquipoService);
  private laboratoriosService = inject(LaboratoriosService);
  private listasValoresService = inject(ListasValoresService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  equipos: Equipo[] = [];
  filtrados: Equipo[] = [];
  laboratorios = signal<Laboratorio[]>([]);
  cargando = false;

  mostrarDialogoEdicion = false;
  equipoEnEdicion: Equipo | null = null;
  guardandoEdicion = false;

  filtroForm: FormGroup = this.formBuilder.group({
    texto: [''],
    tipo: [''],
    marca: ['']
  });

  formularioEdicion: FormGroup = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    tipo: ['', Validators.required],
    marca: ['', [Validators.required, Validators.minLength(2)]],
    modelo: ['', [Validators.required, Validators.minLength(1)]],
    serial: [''],
    placa: [''],
    codigoInterno: [''],
    ubicacion: [''],
    fechaAdq: [''],
    otrosAccesorios: [''],
    observaciones: ['']
  });

  opcionesTipo: OpcionSelect[] = [{ label: 'Todos los tipos', value: '' }];
  opcionesTipoCompletas: OpcionSelect[] = [];
  cargandoTipos = false;

  opcionesMarca: OpcionSelect[] = [
    { label: 'Todas las marcas', value: '' }
  ];

  ubicacionesEquipo = computed<OpcionSelect[]>(() => {
    const labs = this.laboratorios();
    const opcionesLabs = labs.map(lab => ({
      label: lab.nombre,
      value: lab.nombre
    }));
    return opcionesLabs;
  });

  ngOnInit(): void {
    this.cargarTipos().catch(() => {});

    this.cargarEquipos();
    this.cargarLaboratorios();
    this.configurarFiltros();
  }

  cargarLaboratorios(): void {
    this.laboratoriosService.getAll().subscribe({
      next: (laboratorios) => { this.laboratorios.set(laboratorios); },
      error: () => {
        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar los laboratorios' });
      }
    });
  }

  cargarTipos(): Promise<void> {
    this.cargandoTipos = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService
        .getDropdownByTipo('MAQ') 
        .pipe(
          map((response: any[]) =>
            response
              .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'maquinaria de laboratorio')
              .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id }))
          )
        )
        .subscribe({
          next: (options) => {
            this.opcionesTipo = [{ label: 'Todos los tipos', value: '' }, ...options];
            this.opcionesTipoCompletas = options;
            this.cargandoTipos = false;
            resolve();
          },
          error: (err) => {
            this.cargandoTipos = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tipos de equipo' });
            reject(err);
          }
        });
    });
  }

  async cargarEquipos(): Promise<void> {
    try {
      this.cargando = true;
      const equiposRaw = await this.equipoService.getAll().toPromise() || [];
      this.equipos = equiposRaw.map(e => {
        const fecha = this.parsearFechaLocal(e.fechaAdq);
        return { ...e, fechaAdq: fecha ? fecha : null } as Equipo;
      });
      this.actualizarOpcionesMarca();
      this.aplicarFiltros();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
    } finally {
      this.cargando = false;
    }
  }

  private actualizarOpcionesMarca(): void {
    const marcasUnicas = [...new Set(this.equipos.map(e => e.marca).filter(marca => marca && marca.trim()))] as string[];
    this.opcionesMarca = [{ label: 'Todas las marcas', value: '' }, ...marcasUnicas.map(marca => ({ label: marca, value: marca }))];
  }

  private configurarFiltros(): void {
    this.filtroForm.valueChanges.subscribe(() => { this.aplicarFiltros(); });
  }

  private aplicarFiltros(): void {
    const filtros = this.filtroForm.value;
    this.filtrados = this.equipos.filter(equipo => {
      const coincideTexto = !filtros.texto || equipo.nombre.toLowerCase().includes(filtros.texto.toLowerCase()) || (equipo.marca && equipo.marca.toLowerCase().includes(filtros.texto.toLowerCase())) || (equipo.modelo && equipo.modelo.toLowerCase().includes(filtros.texto.toLowerCase()));
      const coincideTipo = !filtros.tipo || equipo.tipo === filtros.tipo;
      const coincideMarca = !filtros.marca || equipo.marca === filtros.marca;
      return coincideTexto && coincideTipo && coincideMarca;
    });
  }

  crear(): void {
    this.router.navigate(['/app/equipo']);
  }

  editar(equipo: Equipo): void {
    this.equipoEnEdicion = { ...equipo };
    const fechaAdqDate = equipo.fechaAdq ? this.parsearFechaLocal(equipo.fechaAdq) : '';

    this.formularioEdicion.patchValue({
      nombre: equipo.nombre, tipo: equipo.tipo, marca: equipo.marca, modelo: equipo.modelo,
      serial: equipo.serial || '', placa: equipo.placa || '', codigoInterno: equipo.codigoInterno || '',
      ubicacion: equipo.ubicacion || '', fechaAdq: fechaAdqDate, otrosAccesorios: equipo.otrosAccesorios || '',
      observaciones: equipo.observaciones || ''
    });
    this.mostrarDialogoEdicion = true;
  }

  eliminar(equipo: Equipo): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el equipo "${equipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminarEquipo(equipo.id)
    });
  }

  private async eliminarEquipo(id: string): Promise<void> {
    try {
      await this.equipoService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Equipo eliminado', detail: 'El equipo ha sido eliminado correctamente' });
      await this.cargarEquipos();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el equipo' });
    }
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({ texto: '', tipo: '', marca: '' });
  }

  exportarXLSX(): void {
    const datosExportar = this.filtrados.map(equipo => {
      const fechaAdq = equipo.fechaAdq ? this.parsearFechaLocal(equipo.fechaAdq) : null;
      const fechaAdqStr = fechaAdq ? fechaAdq.toLocaleDateString('es-ES') : 'No disponible';
      const fechaCreacionStr = equipo.creadoEn ? new Date(equipo.creadoEn).toLocaleDateString() : 'No disponible';
      return {
        'Nombre': equipo.nombre, 'Tipo': equipo.tipo, 'Marca': equipo.marca || 'No especificada',
        'Modelo': equipo.modelo || 'No especificado', 'Serial': equipo.serial || 'No especificado',
        'Placa': equipo.placa || 'No especificada', 'Código Interno': equipo.codigoInterno || 'No especificado',
        'Ubicación': equipo.ubicacion || 'No especificada',
        'Fecha Adquisición': fechaAdqStr,
        'Otros Accesorios': equipo.otrosAccesorios || 'Sin accesorios',
        'Observaciones': equipo.observaciones || 'Sin observaciones',
        'Fecha Creación': fechaCreacionStr
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
    XLSX.writeFile(wb, `equipos_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'Archivo Excel generado correctamente' });
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

  private convertirFechaAISO(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';

    try {
      if (typeof fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
        fecha = new Date(fecha);
      }

      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';

      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  private parsearFechaLocal(fecha: string | Date | null | undefined): Date | '' {
    if (!fecha) return '';

    if (fecha instanceof Date) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }

    const s = String(fecha || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d);
    }

    const tMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (tMatch) {
      const parts = tMatch[1].split('-');
      const y = Number(parts[0]);
      const mo = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      return new Date(y, mo, d);
    }

    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async exportarPDF(): Promise<void> {
    const equipos = this.filtrados;
    if (!equipos.length) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay equipos para exportar.' });
      return;
    }

    try {
      const doc = new jsPDF('l', 'pt', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let logoBase64: string | null = null;
      try {
        logoBase64 = await this.getImageBase64('assets/images/mariana2.png');
      } catch {
      
      }

      const head = [['Nombre', 'Tipo', 'Marca', 'Modelo', 'Serial', 'Ubicación', 'Fecha Adq.']];
      const body = equipos.map(e => {
        const fechaAdq = e.fechaAdq ? this.parsearFechaLocal(e.fechaAdq) : null;
        return [
          e.nombre || '—',
          e.tipo || '—',
          e.marca || 'No especificada',
          e.modelo || 'No especificado',
          e.serial || 'No especificado',
          e.ubicacion || 'No especificada',
          fechaAdq ? fechaAdq.toLocaleDateString('es-ES') : 'No disponible'
        ];
      });

      const colWidths: Record<number, { cellWidth: number }> = {};
      const baseWidths = [140, 80, 90, 90, 120, 132, 100];
      
      baseWidths.forEach((width, index) => {
        colWidths[index] = { cellWidth: width };
      });

      const dateStr = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
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
        doc.text('Lista de Maquinaria de Laboratorios', pageWidth / 2, 40, { align: 'center' });
        
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

      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      doc.save(`maquinaria_laboratorios_${date}_${time}.pdf`);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF' });
    }
  }

  exportarCSV(): void {
    const datosExportar = this.filtrados.map(equipo => {
      const fechaAdq = equipo.fechaAdq ? this.parsearFechaLocal(equipo.fechaAdq) : null;
      const fechaAdqStr = fechaAdq ? fechaAdq.toLocaleDateString('es-ES') : 'No disponible';
      const fechaCreacionStr = equipo.creadoEn ? new Date(equipo.creadoEn).toLocaleDateString() : 'No disponible';
      return {
        'Nombre': equipo.nombre, 'Tipo': equipo.tipo, 'Marca': equipo.marca || 'No especificada',
        'Modelo': equipo.modelo || 'No especificado', 'Serial': equipo.serial || 'No especificado',
        'Placa': equipo.placa || 'No especificada', 'Código Interno': equipo.codigoInterno || 'No especificado',
        'Ubicación': equipo.ubicacion || 'No especificada',
        'Fecha Adquisición': fechaAdqStr,
        'Otros Accesorios': equipo.otrosAccesorios || 'Sin accesorios',
        'Observaciones': equipo.observaciones || 'Sin observaciones',
        'Fecha Creación': fechaCreacionStr
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `equipos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: 'Archivo CSV generado correctamente' });
  }

  cerrarDialogoEdicion(): void {
    this.mostrarDialogoEdicion = false;
    this.equipoEnEdicion = null;
    this.formularioEdicion.reset();
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.equipoEnEdicion) {
      this.messageService.add({ severity: 'warn', summary: 'Formulario incompleto', detail: 'Por favor complete todos los campos requeridos' });
      return;
    }

    try {
      this.guardandoEdicion = true;
      const datosEditados = this.formularioEdicion.value;
      const fechaAdqISO = datosEditados.fechaAdq ? this.convertirFechaAISO(datosEditados.fechaAdq) : '';

      const equipoActualizado: Equipo = {
        ...this.equipoEnEdicion,
        nombre: datosEditados.nombre, tipo: datosEditados.tipo, marca: datosEditados.marca, modelo: datosEditados.modelo,
        serial: datosEditados.serial || undefined, placa: datosEditados.placa || undefined,
        codigoInterno: datosEditados.codigoInterno || undefined, ubicacion: datosEditados.ubicacion || undefined,
        fechaAdq: fechaAdqISO, otrosAccesorios: datosEditados.otrosAccesorios || undefined,
        observaciones: datosEditados.observaciones || undefined
      };

      await this.equipoService.update(equipoActualizado.id, equipoActualizado).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Equipo actualizado', detail: 'Los cambios han sido guardados correctamente' });
      this.cerrarDialogoEdicion();
      await this.cargarEquipos();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los cambios' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  colorTipo(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const colores: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' } = {
      'microscopio': 'info', 'balanza': 'success', 'centrifuga': 'warn', 'espectrofotometro': 'info',
      'ph_metro': 'success', 'autoclave': 'danger', 'incubadora': 'warn', 'agitador_magnetico': 'info',
      'micropipeta': 'success', 'termometro': 'secondary', 'computador': 'info', 'impresora': 'secondary',
      'proyector': 'warn', 'otros': 'secondary'
    };
    return colores[tipo] || 'secondary';
  }
}
