import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ChangeDetectorRef, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SliderModule } from 'primeng/slider';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { lastValueFrom } from 'rxjs';
import { MovilidadService } from '../../core/services/movilidad.service';
import { Movilidad } from '../../core/models/movilidad.model';
import { ApoyoEconomico } from '../../core/models/apoyo-economico.model';
import { EstudianteService } from '../../core/services/estudiante.service';
import { PostulanteService } from '../../core/services/postulante.service';
import { FileAttachmentComponent, FileAttachmentConfig, FileInfoS, SelectComponent, InputComponent, TextareaComponent, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { ESTADOS_APROBACION, TIPOS_MOVILIDAD } from '../../core/models/autorizacion.model';
import { ArchivoService, ArchivoSubido } from '../../core/services/archivo.service';
import { FileAttachmentService as SharedFileAttachmentService } from '@microfrontends/shared-services';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, catchError, of, EMPTY } from 'rxjs';
import { MovilidadProcesoService } from '../../core/services/movilidad-proceso.service';
import { MovilidadConArchivos } from '../../core/models/movilidad-proceso.model';
import { AuthService } from '@microfrontends/shared-services';
import { MovilidadEstadoService } from '../../core/services/movilidad-estado.service';
import { AutorizacionService } from '../../core/services/autorizacion.service';
import { InternacionalizacionRealtimeService } from '../../core/services/internacionalizacion-realtime.service';
import { ApoyoEconomicoService } from '../../core/services/apoyo-economico.service';
import { ActividadesAsignadasService } from '../../core/services/actividades-asignadas.service';
import { ProductosCompromisosService } from '../../core/services/productos-compromisos.service';
import { ModalidadService } from '../../core/services/modalidad.service';
import { Modalidad } from '../../core/models/modalidad.model';

// Configuración base para archivos de movilidades (usando movilidad_proceso para consistencia)
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
  selector: 'app-movilidades-proceso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ProgressBarModule,
    SliderModule,
    MessageModule,
    DatePickerModule,
    FileAttachmentComponent,
    SelectComponent,
    InputComponent,
    TextareaComponent,
    InfoTableComponent
  ],
  providers: [MessageService, ConfirmationService, DatePipe, { provide: SharedFileAttachmentService, useClass: ArchivoService }],
  templateUrl: './movilidadesProceso.component.html',
  styles: [`
    .readonly-mode ::ng-deep .upload-area {
      display: none !important;
    }
    .seguimiento-dialog ::ng-deep .p-dialog-header {
      background: linear-gradient(90deg,#0071bc 0%,#005a8a 100%);
      color: var(--p-text-color-0);
      border-left: 6px solid #003f63;
    }
    .detalle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .detalle-label {
      font-size: 0.9rem;
      color: var(--p-text-muted);
    }
    .detalle-value {
      font-weight: 600;
      color: var(--p-text-color);
    }
    .rotate-180 {
      transform: rotate(180deg);
    }
  `]
})
export class MovilidadesProcesoComponent implements OnInit, OnDestroy {
  private readonly movilidadService = inject(MovilidadService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly archivoService = inject(ArchivoService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly movilidadProcesoService = inject(MovilidadProcesoService);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly realtimeService = inject(InternacionalizacionRealtimeService);
  private readonly apoyoEconomicoService = inject(ApoyoEconomicoService);
  private readonly actividadesService = inject(ActividadesAsignadasService);
  private readonly productosService = inject(ProductosCompromisosService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly estudianteService = inject(EstudianteService);
  private readonly postulanteService = inject(PostulanteService);
  private readonly destroy$ = new Subject<void>();
  private readonly http = inject(HttpClient);

  movilidadesAprobadas = signal<MovilidadConArchivos[]>([]);
  movilidadesFiltradas = signal<MovilidadConArchivos[]>([]);
  apoyosEconomicos = signal<ApoyoEconomico[]>([]);
  movilidadSeleccionada = signal<MovilidadConArchivos | null>(null);
  cargando = signal(false);
  filtroForm: FormGroup;
  mostrarDialogoSeguimiento = signal(false);
  modoDialogo: 'ver' | 'editar' = 'ver';
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

  // Configuración de archivos igual que en convenios
  fileAttachmentConfig: FileAttachmentConfig = { ...MOVILIDAD_FILE_ATTACHMENT_CONFIG };
  existingFiles: FileInfoS[] = [];
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;
  // Variables para soft-delete de archivos
  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;
  private pendingConfirmation = false;

  opcionesEstadoSeguimiento = ESTADOS_APROBACION;

  opcionesTipoMovilidad = TIPOS_MOVILIDAD;

  // Column configuration for the main table of movilidades en proceso
  columnsMovilidades: TableColumn[] = [
    { field: 'nombreMovilidad', header: 'Nombre Movilidad', sortable: true },
    { field: 'tipoMovilidad', header: 'Tipo', sortable: true, type: 'custom' },
    // se añade columna Modalidad que muestra el nombre de la modalidad asociada
    { field: 'modalidad', header: 'Modalidad', sortable: true, type: 'custom' },
    { field: 'aprobado', header: 'Estado Aprobación', sortable: true, type: 'badge', badgeConfig: {
        getSeverity: (value: any) => this.obtenerSeveridadEstadoSeguimiento(value),
        getLabel: (value: any) => this.obtenerTextoEstadoSeguimiento(value)
      }
    }
  ];

  actionsMovilidades: TableAction[] = [
    { icon: 'pi pi-pencil', tooltip: 'Editar seguimiento', severity: 'success', styleClass: 'text-green-600', onClick: (row: any) => this.editarSeguimiento(row) },
    { icon: 'pi pi-file-pdf', tooltip: 'Generar reporte', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.generarReporte(row) },
    { icon: 'pi pi-trash', tooltip: 'Eliminar movilidad', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminarMovilidad(row) }
  ];

  // Estadísticas
  estadisticas = {
    total: 0,
    aprobado: 0,
    negado: 0,
    pendiente: 0,
    cerrada: 0
  };

  mostrarFiltros = false;
  filtroEstado: string = 'total';
  viewMode: 'aprobadas' | 'cerradas' = 'aprobadas';

  // nuevos filtros
  filtroModalidad: string = '';
  opcionesModalidad: Modalidad[] = [];

  constructor(private cdr: ChangeDetectorRef) {
    this.filtroForm = this.fb.group({
      texto: [''],
      tipoMovilidad: [''],
      estadoAprobacion: ['']
    });

    this.filtroForm.valueChanges.subscribe(() => this.aplicarFiltros());

    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const proceso = this.realtimeService.procesoActualizado();
          if (proceso) {
            this.messageService.add({
              severity: 'info',
              summary: 'Proceso actualizado',
              detail: proceso.message || 'Se ha detectado un cambio en procesos de movilidad',
              life: 4000
            });
            this.realtimeService.resetSignal('proceso');
          }
          this.cargarMovilidadesProceso();
        });
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.personaId = user?.identificacion || user?.id || '';
    });

    this.cargarMovilidadesProceso();
    this.cargarModalidades();

    this.movilidadEstadoService.movilidadActualizada$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(movilidadId => {
      if (movilidadId) {
        this.cargarMovilidadesProceso();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async cargarMovilidadesProceso(): Promise<void> {
    if (this.pendingConfirmation) return;
    this.cargando.set(true);

    const todosProcesos = await lastValueFrom(
      this.movilidadProcesoService.getAll().pipe(
        catchError(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los procesos de movilidad'
          });
          return of([]);
        })
      )
    );

    if (todosProcesos.length === 0) {
      this.finalizarCargaMovilidades([]);
      return;
    }

    const movilidadesProcesadas = todosProcesos
      .filter((proceso: any) => !!proceso.movilidad)
      .map((proceso: any) => this.procesarMovilidadDesdeProceso(proceso));

    this.finalizarCargaMovilidades(movilidadesProcesadas);
  }

  private procesarMovilidadDesdeProceso(proceso: any): MovilidadConArchivos {
    const movilidad: Movilidad = proceso.movilidad;

    let estadoProceso = 'PENDIENTE';
    if (proceso.fechaProceso && proceso.estadoAprobacion) {
      estadoProceso = proceso.estadoAprobacion;
    }

    return {
      ...movilidad,
      aprobado: estadoProceso,
      estadoGlobal: 'APROBADO', // si tiene proceso registrado, ya fue aprobada
      archivos: [],
      procesoId: proceso.id
    };
  }

  private finalizarCargaMovilidades(movilidadesProcesadas: MovilidadConArchivos[]): void {
    this.movilidadesAprobadas.set(movilidadesProcesadas);
    this.movilidadesFiltradas.set([...movilidadesProcesadas]);
    this.aplicarFiltros();
    this.calcularEstadisticas();
    this.cargando.set(false);
  }

  calcularEstadisticas(): void {
    const movilidades = this.movilidadesAprobadas();
    this.estadisticas.total = movilidades.length;
    this.estadisticas.aprobado = movilidades.filter(m => m.aprobado === 'APROBADO').length;
    this.estadisticas.negado = movilidades.filter(m => m.aprobado === 'NEGADO').length;
    this.estadisticas.pendiente = movilidades.filter(m => m.aprobado === 'PENDIENTE').length;
    this.estadisticas.cerrada = movilidades.filter(m => m.aprobado === 'CERRADA').length;
  }

  obtenerSeveridadEstadoSeguimiento(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  obtenerTextoEstadoSeguimiento(estado: string | undefined): string {
    switch (estado) {
      case 'APROBADO': return 'Aprobado';
      // terminología adaptada: NEGADO se presenta como "Rechazado" para mayor claridad
      case 'NEGADO': return 'Rechazado';
      case 'PENDIENTE': return 'Pendiente';
      case 'CERRADA': return 'Cerrada';
      default: return 'Sin Estado';
    }
  }


  editarSeguimiento(movilidad: MovilidadConArchivos): void {
    this.router.navigate(['/app/movilidad-proceso', movilidad.id, 'editar']);
  }


  cerrarDialogoSeguimiento(): void {
    this.mostrarDialogoSeguimiento.set(false);
    this.movilidadSeleccionada.set(null);
    this.existingFiles = [];
    this.errorMessage = '';
    this.procesoActual = null; 
    this.fileAttachmentConfig = { ...MOVILIDAD_FILE_ATTACHMENT_CONFIG };
    this.archivoOriginalId = null;     // Resetear variables de soft-delete
    this.archivoPendienteEliminacion = false;
  }

  actualizarEstadoSeguimiento(estado: string): void {
    this.estadoSeguimientoTemp = estado;
    this.actualizarProgreso();
  }

  setProgresoManual(progreso: number): void {
    this.progresoSeguimientoTemp = progreso;
  }

  private async loadExistingFilesForSeguimiento(movilidad: MovilidadConArchivos): Promise<void> {
    let procesoId: string | undefined;

    if (movilidad.procesoId) {
      procesoId = movilidad.procesoId;
    } else {
      const procesos = await lastValueFrom(this.movilidadProcesoService.getByMovilidadId(movilidad.id));
      if (procesos.length > 0) {
        procesoId = procesos[0].id;
      }
    }

    if (procesoId) {
      this.fileAttachmentConfig = { ...this.fileAttachmentConfig, recordId: procesoId };

      const files = await lastValueFrom(this.archivoService.getFilesByRecord(procesoId, 'movilidad_proceso').pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          return of([]);
        })
      ));
      this.existingFiles = this.archivoService.convertToFileInfoList(files);
    } else {
      this.existingFiles = [];
      this.fileAttachmentConfig = { ...this.fileAttachmentConfig, recordId: undefined };
    }
  }

  async guardarCambiosSeguimiento(): Promise<void> {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) return;

    const estadoFinal = this.estadoSeguimientoTemp;
    const procesoId = await this.getProcesoId(movilidad);

    try {
      if (procesoId) {
        await this.actualizarProceso(procesoId, estadoFinal);
      }

      // cambia estado y actualiza señales
      await this.cambiarEstadoA(estadoFinal, movilidad);

      if (procesoId) {
        await this.manejarArchivos(procesoId);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `El seguimiento de la movilidad "${movilidad.nombreMovilidad}" ha sido actualizado.`
      });

      this.cerrarDialogoSeguimiento();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el seguimiento de la movilidad.'
      });
    }
  }

  private async actualizarProceso(procesoId: string, estadoFinal: string): Promise<void> {
    const proceso = await lastValueFrom(this.movilidadProcesoService.getById(procesoId));
    // aseguramos que nunca sea undefined
    const objeto = (this.objetoTemp?.trim() || proceso.objeto || '') as string;
    const actualizado = await lastValueFrom(
      this.movilidadProcesoService.update(procesoId, { id: procesoId, estadoAprobacion: estadoFinal, objeto })
    );

    if (actualizado.fechaProceso) {
      this.fechaAprobacionTemp = new Date(actualizado.fechaProceso);
    }

    const mov = this.movilidadSeleccionada();
    if (mov && objeto !== mov.objeto) {
      mov.objeto = objeto;
    }
  }

  private async getProcesoId(movilidad: MovilidadConArchivos): Promise<string | undefined> {
    if (movilidad.procesoId) {
      return movilidad.procesoId;
    }

    const procesos = await lastValueFrom(this.movilidadProcesoService.getByMovilidadId(movilidad.id));
    return procesos.length > 0 ? procesos[0].id : undefined;
  }

  private async manejarArchivos(procesoId: string): Promise<void> {
    if (!this.fileAttachment) return;

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
    await this.asociarArchivos(procesoId);
  }

  private async subirArchivos(): Promise<void> {
    if (!this.fileAttachment?.selectedFiles?.length) return;

    await new Promise<void>((resolve) => {
      const sub = this.fileAttachment.operationComplete.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => resolve(),
        error: () => resolve()
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

  private calcularProgreso(): number {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) return 0;
    let progreso = 0;
    progreso += 20;
    const archivosTotales = this.existingFiles.length;
    if (archivosTotales > 0) {
      progreso += 10;
      const progresoArchivos = Math.min(archivosTotales * 10, 30);
      progreso += progresoArchivos;
    }
    if (this._estadoSeguimientoTemp === 'APROBADO') {
      progreso += 40; // Completar el progreso al aprobar
    } else if (this._estadoSeguimientoTemp === 'NEGADO') {
      progreso += 20; // Progreso parcial si está negado
    }
    return Math.min(progreso, 100); 
  }

  private actualizarProgreso(): void {
    if (this.modoDialogo === 'editar') {
      this.progresoSeguimientoTemp = this.calcularProgreso();
    }
  }

  onFilesUploaded(files: FileInfoS[]): void {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) {
      return;
    }
    (movilidad.archivos ??= []).push(...files);
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
        const movilidad = this.movilidadSeleccionada();
        if (movilidad?.archivos) {
          movilidad.archivos = movilidad.archivos.filter((f: any) => f.id !== fileId);
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
    this.http.get(file.url, { responseType: 'blob' }).pipe(takeUntil(this.destroy$), catchError(error => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al descargar archivo' });
      return EMPTY;
    })).subscribe(blob => window.open(URL.createObjectURL(blob), '_blank'));
  }

  onOperationComplete(operation: any): void {
    if (operation && operation.type === 'upload') {
    }
  }

  generarReporte(movilidad: MovilidadConArchivos): void {
    if (!movilidad || !movilidad.id) return;

    this.cargando.set(true);
    this.movilidadService.generatePdf(movilidad.id).subscribe({
      next: (pdfBlob: Blob) => {
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidad-${movilidad.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el reporte. Intente nuevamente.'
        });
      },
      complete: () => this.cargando.set(false)
    });
  }

 
  confirmarCerrarMovilidad(movilidad: MovilidadConArchivos): void {
    const estado = movilidad.aprobado;
    if (estado !== 'APROBADO' && estado !== 'NEGADO') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Solo se pueden cerrar movilidades aprobadas o negadas'
      });
      return;
    }

    this.pendingConfirmation = true;
    this.confirmationService.confirm({
      key: 'proceso-confirm',
      message: `¿Está seguro de cerrar la movilidad "${movilidad.nombreMovilidad}"? Una vez cerrada, los postulantes podrán ser inscritos en nuevas movilidades.`,
      header: 'Confirmar Cierre de Movilidad',
      icon: 'pi pi-lock',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      reject: () => { this.pendingConfirmation = false; },
      accept: () => { this.pendingConfirmation = false; this.cerrarMovilidad(movilidad); }
    });
  }

  /**
   * Cierra la movilidad y actualiza servicios/estado local.
   */
  async cerrarMovilidad(movilidad: MovilidadConArchivos): Promise<void> {
    try {
      await this.cambiarEstadoA('CERRADA', movilidad);
      this.messageService.add({
        severity: 'success',
        summary: 'Movilidad Cerrada',
        detail: `La movilidad "${movilidad.nombreMovilidad}" ha sido cerrada exitosamente. Los postulantes pueden ser inscritos en nuevas movilidades.`
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cerrar la movilidad'
      });
    }
  }

 
  private async cambiarEstadoA(nuevoEstado: string, movilidad: MovilidadConArchivos): Promise<void> {
    const procesoId = await this.getProcesoId(movilidad);
    if (procesoId) {
      await lastValueFrom(
        this.movilidadProcesoService.update(procesoId, { id: procesoId, estadoAprobacion: nuevoEstado })
      );
    }

    await this.movilidadService.updateAprobacion(movilidad.id, nuevoEstado).toPromise();

    movilidad.aprobado = nuevoEstado;
    movilidad.estadoAprobacion = nuevoEstado;
    this.actualizarMovilidadEnSignal(movilidad);
  }

  private actualizarMovilidadEnSignal(movilidad: MovilidadConArchivos): void {
    const lista = this.movilidadesAprobadas();
    const idx = lista.findIndex(m => m.id === movilidad.id);
    if (idx < 0) return;
    lista[idx] = { ...movilidad };
    this.movilidadesAprobadas.set([...lista]);
    this.movilidadesFiltradas.set([...lista]);
    this.calcularEstadisticas();
  }

  puedeSerCerrada(movilidad: MovilidadConArchivos): boolean {
    return ['APROBADO', 'NEGADO'].includes(movilidad.aprobado || '');
  }

  estaCerrada(movilidad: MovilidadConArchivos): boolean {
    return movilidad.aprobado === 'CERRADA';
  }

  confirmarEliminarMovilidad(movilidad: MovilidadConArchivos): void {
    this.pendingConfirmation = true;
    this.confirmationService.confirm({
      key: 'proceso-confirm',
      message: `¿Está seguro de eliminar el proceso de seguimiento de la movilidad "${movilidad.nombreMovilidad}"?`,

      header: 'Confirmar Eliminación de Proceso',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar proceso',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      reject: () => { this.pendingConfirmation = false; },
      accept: () => { this.pendingConfirmation = false; this.eliminarProceso(movilidad); }
    });
  }

  
  private cargarModalidades(): void {
    this.modalidadService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => this.opcionesModalidad = list || [],
      error: () => {
        // fallar silenciosamente, no es crítico para la tabla
      }
    });
  }

  async eliminarProceso(movilidad: MovilidadConArchivos): Promise<void> {
    this.cargando.set(true);
    try {
      const procesoId = await this.getProcesoId(movilidad);
      if (!procesoId) {
        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se encontró un proceso de seguimiento para esta movilidad.' });
        return;
      }
      const archivos = await lastValueFrom(
        this.archivoService.getFilesByRecord(procesoId, 'movilidad_proceso').pipe(catchError(() => of([])))
      );
      if (archivos.length) {
        await Promise.all(
          archivos.map(a =>
            lastValueFrom(this.archivoService.deleteUploadedFile(a.id)).catch(() => {})
          )
        );
      }
      await lastValueFrom(
        this.archivoService.deleteFileAssociationsByRecord(procesoId, 'movilidad_proceso').pipe(catchError(() => of(null)))
      ).catch(() => {});

      await lastValueFrom(this.movilidadProcesoService.delete(procesoId));
      await lastValueFrom(this.movilidadProcesoService.deleteByMovilidadId(movilidad.id)).catch(() => {});

      await lastValueFrom(this.actividadesService.deleteByMovilidadId(movilidad.id)).catch(() => {});

      await lastValueFrom(this.productosService.deleteByMovilidadId(movilidad.id)).catch(() => {});

      const restantes = this.movilidadesAprobadas().filter(m => m.id !== movilidad.id);
      this.movilidadesAprobadas.set(restantes);
      this.movilidadesFiltradas.set([...restantes]);
      this.calcularEstadisticas();

    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el proceso de seguimiento (se intentará nuevamente al recargar).' });
    } finally {
      this.cargando.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/app']);
  }

  exportExcel(): void {
    this.cargando.set(true);
    this.movilidadService.generateExcelSalientes().subscribe({
      next: (excelBlob: Blob) => {
        const url = window.URL.createObjectURL(excelBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidades-salientes.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Excel generado correctamente' });
      },
      error: (error) => {
        console.error('Error generando Excel salientes:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el Excel. Intente nuevamente.' });
      },
      complete: () => this.cargando.set(false)
    });
  }

  volverAlFormulario(): void {
    this.router.navigate(['/app/movilidad']);
  }



  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.filtroModalidad = '';
    this.filtroEstado = 'total';
    this.viewMode = 'aprobadas';
    this.movilidadesFiltradas.set([...this.movilidadesAprobadas()]);
  }

  clearTextFilter(): void {
    this.filtroForm.patchValue({ texto: '' });
    this.aplicarFiltros();
  }

  clearModalidadFilter(): void {
    this.filtroModalidad = '';
    this.aplicarFiltros();
  }

  async resetearProcesos(): Promise<void> {
    this.confirmationService.confirm({
      key: 'proceso-confirm',
      message: '¿Está seguro de resetear todos los procesos a estado PENDIENTE? Esta acción no se puede deshacer.',
      header: 'Confirmar Reseteo',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, resetear',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.cargando.set(true);
        try {
          const resultado = await lastValueFrom(this.movilidadProcesoService.resetToPendiente());
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: resultado });
          await this.cargarMovilidadesProceso();
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron resetear los procesos' });
        } finally {
          this.cargando.set(false);
        }
      }
    });
  }

  filtrarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.viewMode = estado === 'cerrada' ? 'cerradas' : 'aprobadas';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const filtros = this.filtroForm.value;
    const texto = filtros.texto?.toLowerCase();

    const modalidadId = this.filtroModalidad;

    let filtradas = this.movilidadesAprobadas().filter(m =>
      (!texto || m.nombreMovilidad?.toLowerCase().includes(texto) || m.objeto?.toLowerCase().includes(texto)) &&
      (!filtros.tipoMovilidad || m.tipoMovilidad === filtros.tipoMovilidad) &&
      (!filtros.estadoAprobacion || m.aprobado === filtros.estadoAprobacion) &&
      (!modalidadId || m.modalidad?.id === modalidadId) &&
      (!this.filtroEstado || this.filtroEstado === 'total' || m.aprobado === this.filtroEstado.toUpperCase())
    );

    this.movilidadesFiltradas.set(filtradas);
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
}