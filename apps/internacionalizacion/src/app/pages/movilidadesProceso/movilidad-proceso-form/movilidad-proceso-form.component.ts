import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SliderModule } from 'primeng/slider';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { lastValueFrom } from 'rxjs';
import { MovilidadService } from '../../../core/services/movilidad.service';
import { FileAttachmentComponent, FileAttachmentConfig, FileInfoS, SelectComponent, InfoTableComponent, TableColumn } from '@microfrontends/shared-ui';
import { ArchivoService } from '../../../core/services/archivo.service';
import { ActividadesAsignadasService } from '../../../core/services/actividades-asignadas.service';
import { FileAttachmentService as SharedFileAttachmentService } from '@microfrontends/shared-services';
import { HttpClient } from '@angular/common/http';
import { ActividadAsignada } from '../../../core/models/actividades-asignadas.model';
import { ProductosCompromisos } from '../../../core/models/productos-compromisos.model';
import { ProductosCompromisosService } from '../../../core/services/productos-compromisos.service';
import { MovilidadProceso } from '../../../core/models/movilidad-proceso.model';
import { Subject, takeUntil, catchError, of, EMPTY } from 'rxjs';
import { MovilidadProcesoService } from '../../../core/services/movilidad-proceso.service';
import { MovilidadConArchivos } from '../../../core/models/movilidad-proceso.model';
import { AuthService } from '@microfrontends/shared-services';
import { AutorizacionService } from '../../../core/services/autorizacion.service';
import { Autorizacion } from '../../../core/models/autorizacion.model';
import { ApoyoEconomicoService } from '../../../core/services/apoyo-economico.service';
import { ApoyoEconomico } from '../../../core/models/apoyo-economico.model';
import { Movilidad } from '../../../core/models/movilidad.model';

// Configuración base para archivos de movilidades
const MOVILIDAD_FILE_ATTACHMENT_CONFIG: FileAttachmentConfig = {
  moduleType: 'movilidad_proceso',
  multiple: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  accept: '.pdf,.doc,.docx,.xls,.xlsx',
  autoUpload: false,
  showPreview: true,
  showDownload: true,
  showDelete: true,
  renameFiles: false,
  recordId: undefined
};

@Component({
  selector: 'app-movilidad-proceso-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    TagModule,
    ToastModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ProgressBarModule,
    SliderModule,
    MessageModule,
    DatePickerModule,
    TooltipModule,
    FileAttachmentComponent,
    SelectComponent,
    InfoTableComponent
  ],
  providers: [MessageService, ConfirmationService, DatePipe, { provide: SharedFileAttachmentService, useClass: ArchivoService }],
  templateUrl: './movilidad-proceso-form.component.html',
  styles: [`
    .readonly-mode ::ng-deep .upload-area {
      display: none !important;
    }
  `]
})
export class MovilidadProcesoFormComponent implements OnInit, OnDestroy {
  private readonly movilidadService = inject(MovilidadService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly archivoService = inject(ArchivoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly movilidadProcesoService = inject(MovilidadProcesoService);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly apoyoEconomicoService = inject(ApoyoEconomicoService);
  private readonly actividadesService = inject(ActividadesAsignadasService);
  private readonly productosCompromisosService = inject(ProductosCompromisosService);
  private readonly destroy$ = new Subject<void>();
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  movilidad = signal<MovilidadConArchivos | null>(null);
  cargando = signal(false);
  guardando = signal(false);
  apoyosEconomicos = signal<ApoyoEconomico[]>([]);

  actividadesAsignadas = signal<ActividadAsignada[]>([]);
  procesosMovilidad = signal<MovilidadProceso[]>([]);
  productosCompromisos = signal<ProductosCompromisos[]>([]);


  columnsApoyos: TableColumn[] = [
    { field: 'tipoApoyoEconomico.nombre', header: 'Tipo de Apoyo', sortable: true, type: 'custom' },
    { field: 'descripcion', header: 'Descripción', sortable: false },
    { field: 'centroCostos', header: 'Centro de Costos', sortable: false },
    { field: 'presupuestoDisponible', header: 'Presupuesto Disponible', sortable: false, type: 'custom' },
    { field: 'aprobadoNivel6', header: 'Aprobación Rector(a)', sortable: false, align: 'center', type: 'custom' },
    { field: 'aprobadoNivel7', header: 'Vicerrectoría Financiera', sortable: false, align: 'center', type: 'custom' }
  ];

  columnsActividades: TableColumn[] = [
    { field: 'nombre', header: 'Labores Sustantivas', sortable: true },
    { field: 'compromiso', header: 'Compromiso', sortable: false },
    { field: 'verificacion', header: 'Verificación de Cumplimiento', sortable: false },
    { field: 'estado', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
        getSeverity: (v:any)=> this.obtenerSeveridadEstado(v),
        getLabel: (v:any)=> this.obtenerTextoEstado(v)
      }},
    { field: 'revisado', header: 'Revisado', sortable: false, type: 'custom', align: 'center' },
    { field: 'observaciones', header: 'Observaciones', sortable: false }
  ];

  columnsProcesos: TableColumn[] = [
    { field: 'compromiso', header: 'Proceso / Compromiso', sortable: true },
    { field: 'fechaEntrega', header: 'Fecha de Entrega', sortable: false },
    { field: 'estado', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
        getSeverity: (v:any)=> this.obtenerSeveridadEstado(v),
        getLabel: (v:any)=> this.obtenerTextoEstado(v)
      }},
    { field: 'revisado', header: 'Revisado', sortable: false, type: 'custom', align: 'center' },
    { field: 'observaciones', header: 'Observaciones', sortable: false }
  ];

  modoFormulario: 'ver' | 'editar' = 'ver';

  private _estadoSeguimientoTemp: string = 'PENDIENTE';

  progresoSeguimientoTemp: number = 0;
  objetoTemp: string = '';
  fechaAprobacionTemp: Date | null = null;
  procesoActual: any = null;

  get estadoSeguimientoTemp(): string {
    return this._estadoSeguimientoTemp;
  }

  set estadoSeguimientoTemp(value: string) {
    this._estadoSeguimientoTemp = value;
  }
  personaId: string = '';
  errorMessage: string = '';
  fileAttachmentConfig: FileAttachmentConfig = { ...MOVILIDAD_FILE_ATTACHMENT_CONFIG };
  existingFiles: FileInfoS[] = [];
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;

  // Variables para soft-delete de archivos
  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;

  opcionesEstadoSeguimiento = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'Negado', value: 'NEGADO' },
  ];

  constructor() {}

  ngOnInit(): void {    
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.personaId = user?.identificacion || user?.id || '';
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const movilidadId = params['id'];
      const modo = params['modo'] || 'ver';
      this.modoFormulario = modo === 'editar' ? 'editar' : 'ver';
      
      if (movilidadId) {
        this.cargarMovilidad(movilidadId);
      } else {
      }
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 
  irAMovilidad(): void {
    const current = this.movilidad();
    const id = current?.id;
    if (id) {
      this.router.navigate(['/app/movilidad'], { queryParams: { id } });
    }
  }

  irAListaMovilidades(): void {
    this.router.navigate(['/app/movilidades-proceso']);
  }

  async cargarMovilidad(movilidadId: string): Promise<void> {
    this.cargando.set(true);
    try {
      const [movilidadData, estadoGlobal, procesos] = await Promise.all([
        lastValueFrom(this.movilidadService.getById(movilidadId)),
        lastValueFrom(this.autorizacionService.obtenerEstadoGlobalMovilidad(movilidadId)).catch(() => 'PENDIENTE'),
        lastValueFrom(this.movilidadProcesoService.getByMovilidadId(movilidadId)).catch(() => [] as any[])
      ]);

      this.cargarApoyosEconomicos(movilidadId);
      this.actividadesService.getActividadesByMovilidad(movilidadId).pipe(takeUntil(this.destroy$))
        .subscribe({ next: acts => this.actividadesAsignadas.set(acts || []), error: () => this.actividadesAsignadas.set([]) });
      this.productosCompromisosService.getProductosByMovilidad(movilidadId).pipe(takeUntil(this.destroy$))
        .subscribe({ next: p => this.productosCompromisos.set(p || []), error: () => this.productosCompromisos.set([]) });

      this.procesosMovilidad.set(procesos as any);

      const proceso = procesos[0] ?? null;
      const procesoId = proceso?.id;
      const estadoProceso = (proceso?.fechaProceso && proceso?.estadoAprobacion)
        ? proceso.estadoAprobacion
        : 'PENDIENTE';

      const movilidadConArchivos: MovilidadConArchivos = {
        ...movilidadData, aprobado: estadoProceso, estadoGlobal, archivos: [], procesoId
      };
      this.movilidad.set(movilidadConArchivos);

      const estadoActual = await this.cargarDetallesProceso(procesoId, movilidadData.objeto, estadoProceso);

      this.configurarArchivos();
      await this.loadExistingFiles(movilidadConArchivos);
      this.actualizarProgreso();

      setTimeout(() => { this._estadoSeguimientoTemp = estadoActual; this.cdr.detectChanges(); }, 100);

    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la movilidad' });
      this.router.navigate(['/app/movilidades-proceso']);
    } finally {
      this.cargando.set(false);
    }
  }

  private cargarApoyosEconomicos(movilidadId: string): void {
    this.autorizacionService.getAutorizacionesPorMovilidad(movilidadId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (aut: Autorizacion | null) => {
        const aprobados6 = this.parsearJsonSeguro(aut?.apoyosEconomicosAprobadosNivel6);
        const aprobados7 = this.parsearJsonSeguro(aut?.apoyosEconomicos);
        this.apoyoEconomicoService.getByMovilidadId(movilidadId).pipe(takeUntil(this.destroy$)).subscribe({
          next: apoyos => this.apoyosEconomicos.set(
            (apoyos || []).map(a => ({
              ...a,
              aprobadoNivel6: aprobados6.includes(a.id || ''),
              aprobadoNivel7: aprobados7.includes(a.id || '')
            })) as any
          ),
          error: () => this.apoyosEconomicos.set([])
        });
      },
      error: () => {
        this.apoyoEconomicoService.getByMovilidadId(movilidadId).pipe(takeUntil(this.destroy$))
          .subscribe({ next: a => this.apoyosEconomicos.set(a || []), error: () => this.apoyosEconomicos.set([]) });
      }
    });
  }

  private async cargarDetallesProceso(procesoId: string | undefined, objetoOriginal: string, estadoDefault: string): Promise<string> {
    if (!procesoId) return estadoDefault;
    try {
      this.procesoActual = await lastValueFrom(this.movilidadProcesoService.getById(procesoId));
      this.fechaAprobacionTemp = this.procesoActual.fechaProceso ? new Date(this.procesoActual.fechaProceso) : null;
      if (this.procesoActual.objeto && this.procesoActual.objeto !== objetoOriginal) this.objetoTemp = this.procesoActual.objeto;
      return this.procesoActual.estadoAprobacion ?? estadoDefault;
    } catch {
      this.fechaAprobacionTemp = null;
      return estadoDefault;
    }
  }

  private configurarArchivos(): void {
    const mov = this.movilidad();
    const procesoId = mov?.procesoId;



    if (this.modoFormulario === 'ver') {
      this.fileAttachmentConfig = {
        ...MOVILIDAD_FILE_ATTACHMENT_CONFIG,
        accept: '',
        autoUpload: false,
        showPreview: true,
        showDownload: true,
        showDelete: false,
        renameFiles: false,
        recordId: procesoId
      };
    } else {
      this.fileAttachmentConfig = {
        ...MOVILIDAD_FILE_ATTACHMENT_CONFIG,
        accept: '.pdf,.doc,.docx,.xls,.xlsx',
        autoUpload: false,
        showPreview: true,
        showDownload: true,
        showDelete: true,
        renameFiles: false,
        recordId: procesoId
      };
    }
    if (this.fileAttachment) {
      this.fileAttachment.config = { ...this.fileAttachmentConfig };
    }
  }

  private async loadExistingFiles(movilidad: MovilidadConArchivos): Promise<void> {
    let procesoId = movilidad.procesoId;
    // si no hay id, intentar recuperarlo
    if (!procesoId) {
      const procesos = await lastValueFrom(
        this.movilidadProcesoService.getByMovilidadId(movilidad.id).pipe(
          takeUntil(this.destroy$),
          catchError(() => of([]))
        )
      );
      if (procesos.length > 0) {
        procesoId = procesos[0].id;
      }
    }

    if (procesoId) {
      this.fileAttachmentConfig = { ...this.fileAttachmentConfig, recordId: procesoId };

      const files = await lastValueFrom(
        this.archivoService.getFilesByRecord(procesoId, 'movilidad_proceso').pipe(
          takeUntil(this.destroy$),
          catchError(() => of([]))
        )
      );
      this.existingFiles = this.archivoService.convertToFileInfoList(files);

      // Actualizar la configuración del componente FileAttachment
      if (this.fileAttachment) {
        this.fileAttachment.config = { ...this.fileAttachmentConfig };
      }
    } else {
      this.existingFiles = [];
      this.fileAttachmentConfig = { ...this.fileAttachmentConfig, recordId: undefined };

      if (this.fileAttachment) {
        this.fileAttachment.config = { ...this.fileAttachmentConfig };
      }
    }
  }

  descargarPdf(): void {
    const mov = this.movilidad();
    if (!mov || !mov.id) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No hay movilidad seleccionada' });
      return;
    }

    this.cargando.set(true);
    this.movilidadService.generatePdf(mov.id).subscribe({
      next: (pdfBlob: Blob) => {
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidad-${mov.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el PDF. Intente nuevamente.' });
      },
      complete: () => {
        this.cargando.set(false);
      }
    });
  }

  descargarExcel(): void {
    const mov = this.movilidad();
    if (!mov || !mov.id) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No hay movilidad seleccionada' });
      return;
    }

    this.cargando.set(true);
    this.movilidadService.generateExcel(mov.id).subscribe({
      next: (excelBlob: Blob) => {
        const url = window.URL.createObjectURL(excelBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidad-${mov.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generando Excel:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el Excel. Intente nuevamente.' });
      },
      complete: () => {
        this.cargando.set(false);
      }
    });
  }

  obtenerSeveridadEstado(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const estadoUpper = estado?.toUpperCase();
    switch (estadoUpper) {
      case 'APROBADO': return 'success';
      case 'NEGADO':
      case 'RECHAZADO': return 'danger';
      case 'PENDIENTE': return 'warn';
      case 'CERRADA': return 'info';
      default: return 'secondary';
    }
  }

  obtenerTextoEstado(estado: string | undefined): string {
    switch (estado) {
      case 'APROBADO': return 'Aprobado';
      case 'NEGADO': return 'Negado';
      case 'PENDIENTE': return 'Pendiente';
      case 'CERRADA': return 'Cerrada';
      default: return 'Sin Estado';
    }
  }

  actualizarEstadoSeguimiento(estado: any): void {
    // el componente puede devolver el valor directamente o un objeto {label,value}
    let valor: string;
    if (estado && typeof estado === 'object') {
      valor = estado.value ?? estado.label ?? this._estadoSeguimientoTemp;
    } else {
      valor = estado;
    }
    this._estadoSeguimientoTemp = valor;
    this.actualizarProgreso();
  }

  private calcularProgreso(): number {
    const mov = this.movilidad();
    if (!mov) return 0;

    const archivosTotales = this.existingFiles.length;
    if (
      this.estadoGeneralActividades === 'APROBADO' &&
      this.estadoGeneralProcesos === 'APROBADO' &&
      archivosTotales > 0 &&
      this._estadoSeguimientoTemp === 'APROBADO'
    ) {
      return 100;
    }

    let progreso = 0;
    progreso +=
      this.estadoGeneralActividades === 'APROBADO'
        ? 20
        : this.estadoGeneralActividades === 'NEGADO'
        ? 10
        : 0;
    progreso +=
      this.estadoGeneralProcesos === 'APROBADO'
        ? 20
        : this.estadoGeneralProcesos === 'NEGADO'
        ? 10
        : 0;
    if (archivosTotales > 0) progreso += 20;
    progreso +=
      this._estadoSeguimientoTemp === 'APROBADO'
        ? 40
        : this._estadoSeguimientoTemp === 'NEGADO'
        ? 20
        : 0;

    return Math.min(progreso, 100);
  }

  private actualizarProgreso(): void {
    if (this.modoFormulario === 'editar') {
      this.progresoSeguimientoTemp = this.calcularProgreso();
    }
  }

  async guardarCambios(): Promise<void> {
    const mov = this.movilidad();
    if (!mov) return;

    this.guardando.set(true);
    const estadoFinal = this._estadoSeguimientoTemp;

    try {
      const procesoId = await this.getProcesoId(mov);

      await Promise.all([
        this.actualizarProcesoYObjeto(procesoId, estadoFinal, mov),
        this.movilidadService.updateAprobacion(mov.id, estadoFinal).toPromise(),
        Promise.all(
          this.actividadesAsignadas()
            .filter(act => !!act.id)
            .map(act => lastValueFrom(this.actividadesService.update(act.id!, act)).catch(() => null))
        ),
        lastValueFrom(this.productosCompromisosService.saveProductos(mov.id, this.productosCompromisos()))
          .catch(err => console.warn('No se pudo actualizar procesos/compromisos', err))
      ]);

      mov.aprobado = estadoFinal;
      mov.estadoAprobacion = estadoFinal;

      if (procesoId) await this.manejarArchivos(procesoId);

      this.movilidad.set({ ...mov });
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: `El seguimiento de la movilidad "${mov.nombreMovilidad}" ha sido actualizado.` });

    } catch (error) {
      console.error('Error en guardarCambios', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar los cambios' });
    } finally {
      this.guardando.set(false);
    }
  }

  private async actualizarProcesoYObjeto(procesoId: string | undefined, estadoFinal: string, mov: MovilidadConArchivos): Promise<void> {
    if (!procesoId) return;

    const proceso = await lastValueFrom(this.movilidadProcesoService.getById(procesoId));
    const objetoTrimmed = this.objetoTemp?.trim() || '';
    const procesoActualizado = await lastValueFrom(this.movilidadProcesoService.update(procesoId, {
      id: procesoId,
      estadoAprobacion: estadoFinal,
      objeto: objetoTrimmed || proceso.objeto
    }));

    if (procesoActualizado.fechaProceso) this.fechaAprobacionTemp = new Date(procesoActualizado.fechaProceso);
    if (objetoTrimmed && objetoTrimmed !== mov.objeto) mov.objeto = objetoTrimmed;
  }

  private async getProcesoId(movilidad: MovilidadConArchivos): Promise<string | undefined> {
    if (movilidad.procesoId) {
      return movilidad.procesoId;
    }

    const procesos = await lastValueFrom(this.movilidadProcesoService.getByMovilidadId(movilidad.id));
    return procesos.length > 0 ? procesos[0].id : undefined;
  }

  private async manejarArchivos(procesoId: string): Promise<void> {
    if (!this.fileAttachment) {
      return;
    }

    const recordIdWasSet = !!this.fileAttachment.config.recordId;

    if (this.fileAttachment.config.recordId !== procesoId) {
      this.fileAttachmentConfig = { ...this.fileAttachmentConfig, recordId: procesoId };
      this.fileAttachment.config = { ...this.fileAttachmentConfig };
    }

    if (this.archivoPendienteEliminacion && !this.fileAttachment.attachedFiles?.length) {
      await this.archivoService.deleteUploadedFile(this.archivoOriginalId!).toPromise();
      this.archivoPendienteEliminacion = false;
      this.archivoOriginalId = null;
    }

    await this.subirArchivos();
    
    // Only associate files if the FileAttachmentComponent didn't handle association
    if (!recordIdWasSet) {
      await this.asociarArchivos(procesoId);
    }
  }

  private async subirArchivos(): Promise<void> {
    if (!this.fileAttachment?.selectedFiles?.length) {
      return;
    }

    await new Promise<void>((resolve) => {
      const sub = this.fileAttachment.operationComplete.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          resolve();
        },
        error: () => {
          resolve();
        }
      });
      this.fileAttachment.uploadFiles();
    });
  }

  private async asociarArchivos(procesoId: string): Promise<void> {
    if (!this.fileAttachment?.attachedFiles?.length) return;

    const archivosParaAsociar = this.fileAttachment.attachedFiles.filter(file => {
      const esArchivoExistente = this.existingFiles.some(existingFile => existingFile.id === file.id);
      return !esArchivoExistente;
    });

    if (archivosParaAsociar.length === 0) return;

    await Promise.all(archivosParaAsociar.map(async (file) => {
      return this.archivoService.associateFileWithRecord(file.id, procesoId, 'movilidad_proceso').toPromise();
    }));
  }

  onFilesUploaded(files: FileInfoS[]): void {
    const mov = this.movilidad();
    if (!mov) return;

    (mov.archivos ??= []).push(...files);
    this.existingFiles = [...this.existingFiles, ...files];
    this.errorMessage = '';
    this.actualizarProgreso();
  }

  onUploadError(error: any): void {
    this.errorMessage = 'Error al subir el archivo. Por favor, inténtelo de nuevo.';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir el archivo' });
  }

  onFileDeleted(file: FileInfoS | string): void {
    const fileId = typeof file === 'string' ? file : file.id;

    this.archivoService.deleteUploadedFile(fileId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const mov = this.movilidad();
        if (mov?.archivos) {
          mov.archivos = mov.archivos.filter((f: any) => f.id !== fileId);
        }
        this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
      },
      error: () => {}
    });
  }

  onFilePreview(file: FileInfoS): void {
    if (!file.url) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'No se puede previsualizar el archivo' });
      return;
    }
    this.http.get(file.url, { responseType: 'blob' }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al descargar archivo' });
        return EMPTY;
      })
    ).subscribe(blob => window.open(URL.createObjectURL(blob), '_blank'));
  }

  onOperationComplete(operation: any): void {
    // Actualizar si es necesario
  }

  onFileSelected(files: File[]): void {
    if (this.archivoPendienteEliminacion) {
      this.errorMessage = '';
      return;
    }

    const existingFileNames = this.existingFiles.map((f: FileInfoS) => f.name);

    for (const file of files) {
      if (existingFileNames.includes(file.name)) {
        this.errorMessage = `Ya existe un archivo con el nombre "${file.name}". Por favor, renombre el archivo antes de subirlo.`;
        if (this.fileAttachment) {
          this.fileAttachment.selectedFiles = [];
        }
        return;
      }
    }
    this.errorMessage = '';
  }

  cambiarModo(): void {
    if (this.modoFormulario === 'ver') {
      this.modoFormulario = 'editar';
      this.configurarArchivos();
    } else {
      this.modoFormulario = 'ver';
      this.configurarArchivos();
    }
  }

  volver(): void {
    this.router.navigate(['/app/movilidades-proceso']);
  }

  puedeSerCerrada(): boolean {
    const mov = this.movilidad();
    return mov?.aprobado === 'APROBADO' || mov?.aprobado === 'NEGADO';
  }

  estaCerrada(): boolean {
    const mov = this.movilidad();
    return mov?.aprobado === 'CERRADA';
  }

  confirmarCerrarMovilidad(): void {
    const mov = this.movilidad();
    if (!mov) return;

    if (mov.aprobado !== 'APROBADO' && mov.aprobado !== 'NEGADO') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Solo se pueden cerrar movilidades que estén en estado APROBADO o NEGADO'
      });
      return;
    }

    this.confirmationService.confirm({
      key: 'proceso-form-confirm',
      message: `¿Está seguro de cerrar la movilidad "${mov.nombreMovilidad}"? Una vez cerrada, los postulantes podrán ser inscritos en nuevas movilidades.`,
      header: 'Confirmar Cierre de Movilidad',
      icon: 'pi pi-lock',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      accept: () => this.cerrarMovilidad()
    });
  }

  async cerrarMovilidad(): Promise<void> {
    const mov = this.movilidad();
    if (!mov) return;

    try {
      const procesoId = await this.getProcesoId(mov);
      if (procesoId) {
        await lastValueFrom(
          this.movilidadProcesoService.update(procesoId, { id: procesoId, estadoAprobacion: 'CERRADA' })
        );
      }

      await this.movilidadService.updateAprobacion(mov.id, 'CERRADA').toPromise();
      Object.assign(mov, { aprobado: 'CERRADA', estadoAprobacion: 'CERRADA' });
      this.movilidad.set({ ...mov });

      this.messageService.add({
        severity: 'success',
        summary: 'Movilidad Cerrada',
        detail: `La movilidad "${mov.nombreMovilidad}" ha sido cerrada exitosamente. Los postulantes pueden ser inscritos en nuevas movilidades.`
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cerrar la movilidad'
      });
    }
  }

  getTipoActividadDisplay(): string {
    const tipoActividad = this.movilidad()?.tipoActividad;
    if (!tipoActividad) return 'No especificado';

    // Si es un objeto con propiedad display, usar esa
    if (typeof tipoActividad === 'object' && (tipoActividad as any).display) {
      return (tipoActividad as any).display;
    }

    // Si es un string, usar directamente
    if (typeof tipoActividad === 'string') {
      return tipoActividad;
    }

    // Caso por defecto
    return 'No especificado';
  }

  private calcularEstadoGeneral(items: ActividadAsignada[]): string {
    if (!items?.length) return 'SIN ACTIVIDADES';

    const allApproved = items.every(
      a => a.revisado === true || a.estado?.toUpperCase() === 'APROBADO'
    );
    if (allApproved) return 'APROBADO';

    const anyDenied = items.some(
      a => a.revisado !== true && ['NEGADO', 'RECHAZADO'].includes(a.estado?.toUpperCase() || '')
    );
    return anyDenied ? 'NEGADO' : 'PENDIENTE';
  }

  get estadoGeneralActividades(): string {
    return this.calcularEstadoGeneral(this.actividadesAsignadas());
  }

  get todasActividadesAprobadas(): boolean {
    return this.estadoGeneralActividades === 'APROBADO';
  }

  get estadoGeneralProcesos(): string {
    return this.calcularEstadoGeneralProductos(this.productosCompromisos());
  }

  get todosProcesosAprobados(): boolean {
    return this.estadoGeneralProcesos === 'APROBADO';
  }

  private calcularEstadoGeneralProductos(items: ProductosCompromisos[]): string {
    if (!items || items.length === 0) {
      return 'SIN PROCESOS';
    }
    const todosApproved = items.every(a => a.revisado === true || a.estado?.toUpperCase() === 'APROBADO');
    if (todosApproved) {
      return 'APROBADO';
    }
    const algunoNegado = items.some(a =>
      a.revisado !== true && ['NEGADO', 'RECHAZADO'].includes(a.estado?.toUpperCase() || '')
    );
    if (algunoNegado) {
      return 'NEGADO';
    }
    return 'PENDIENTE';
  }


  private parsearJsonSeguro(json: string | undefined | null): string[] {
    try {
      if (!json) return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
}
