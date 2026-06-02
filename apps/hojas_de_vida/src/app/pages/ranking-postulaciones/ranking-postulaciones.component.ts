import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable, from, timer } from 'rxjs';
import { catchError, switchMap, toArray, mergeMap, retryWhen, mergeMap as mergeMapRetry, take, delay } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

import * as XLSX from 'xlsx';
import { RankingService } from '../../core/services/ranking.service';
import { PdfService } from '../../core/services/pdf.service';
import { InformacionAcademicaService } from '../../core/services/info-academica.service';
import { InformacionAcademica } from '../../core/models/informacion-academica.model';
import { InfoLaboralService } from '../../core/services/info-laboral.service';
import { InfoLaboral } from '../../core/models/info-laboral.model';
import { PersonasService } from '../../core/services/personas.service';
import { Persona } from '../../core/models/persona.model';
import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';
import { EstadisticasOferta, EvaluacionDetalleDTO } from '../../core/models/ranking.model';
import { HistorialPostulacion } from '../../core/models/historial-postulacion.model';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { environment } from '@shared/shared-environments';
import { ImageViewerComponent, FotoCacheService, InfoTableComponent, TableColumn, TableAction, InputComponent } from '@microfrontends/shared-ui';
import { DateFormatterUtil, CalculationUtil, NotificationUtil } from '../../core/utils';
import { AuthService, EmailNotificationService, NotificationManagementService } from '@microfrontends/shared-services';
import { NotificationType, NotificationPriority } from '@microfrontends/shared-models';

@Component({
  selector: 'app-ranking-postulaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    SelectModule,
    ProgressSpinnerModule,
    TagModule,
    DialogModule,
    ProgressBarModule,
    AvatarModule,
    TooltipModule,
    CheckboxModule,
    BreadcrumbModule,
    ImageViewerComponent,
    InfoTableComponent,
    InputComponent
  ],
  providers: [MessageService],
  templateUrl: './ranking-postulaciones.component.html',
  styleUrls: ['./ranking-postulaciones.component.scss']
})
export class RankingPostulacionesComponent implements OnInit, OnDestroy {
  
  ofertaId: string = '';
  oferta: OfertaLaboral | null = null;
  postulaciones: HistorialPostulacion[] = [];
  postulacionesFiltradas: any[] = [];
  estadisticas: EstadisticasOferta | null = null;
  loading = false;
  
  detalleEvaluacionVisible = false;
  detalleEvaluacion: EvaluacionDetalleDTO | null = null;
  loadingDetalle = false;
  evaluandoIndividual = false;
  
  filtroTexto = '';
  filtroAprobacion = 'todos';
  
  first = 0;
  rows = 10;

  opcionesFiltro = [
    { label: 'Todos los candidatos', value: 'todos' },
    { label: 'Solo aprobados', value: 'aprobados' },
    { label: 'Solo no aprobados', value: 'rechazados' }
  ];

  columns: TableColumn[] = [];
  actions: TableAction[] = [];

  modoGenerarPDF = false;
  modoExcel = false;
  modoSeleccion = false;
  candidatosSeleccionados: Set<string> = new Set();
  candidatosParaPDF: Set<string> = new Set(); 
  candidatosParaExcel: Set<string> = new Set();
  seleccionarTodos = false;
  seleccionarTodosPDF = false;
  seleccionarTodosExcel = false;
  candidatosYaSeleccionadosEnBD: Set<string> = new Set(); 
  generandoZipPDF = false;
  descargandoExcel = false;
  
  mostrarDialogSeleccion = false;
  candidatoActual: HistorialPostulacion | null = null;
  motivoSeleccion = '';

  dialogPdfVisible = false;
  dialogPdfNombre = '';
  dialogPdfBlobUrl: SafeResourceUrl = '';
  dialogPdfBlob: Blob | null = null;
  cargandoPdf = false;

  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/administrador-convocatorias' };
  breadcrumbItems: MenuItem[] = [
    { label: 'Evaluación y Ranking', routerLink: '/app/ranking-ofertas' },
    { label: 'Ranking de Candidatos' }
  ];

  private fotosCache = new Map<string, string>();
  private blobUrls: string[] = [];

  constructor(
    public rankingService: RankingService,
    private pdfService: PdfService,
    private authService: AuthService,
    private ofertaLaboralService: OfertaLaboralService,
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private infoAcademicaService: InformacionAcademicaService,
    private infoLaboralService: InfoLaboralService,
    private personasService: PersonasService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private http: HttpClient,
    private fotoCacheService: FotoCacheService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private emailService: EmailNotificationService,
    private notificationService: NotificationManagementService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ofertaId = params['id'];
      if (this.ofertaId) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation?.extras.state) {
          this.oferta = navigation.extras.state['oferta'];
        }

        this.inicializarTabla();

        this.cargarDatosIniciales();
      }
    });
  }

  private cargarDatosIniciales(): void {
    this.loading = true;

    const cargasParalelas = [
      this.cargarOfertaSiNecesario(),
      this.cargarRanking(),
      this.cargarSeleccionadosExistentes()
    ];

    Promise.all(cargasParalelas).then(() => {
      this.aplicarFiltros(); 
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }).finally(() => {
      setTimeout(() => {
        if (this.loading) {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }, 10000); 
    });
  }

  private cargarOfertaSiNecesario(): Promise<void> {
    return new Promise((resolve) => {
      if (this.oferta) {
        resolve();
        return;
      }

      this.ofertaLaboralService.getById(this.ofertaId).subscribe({
        next: (oferta) => {
          this.oferta = oferta;
          resolve();
        },
        error: () => {
          resolve(); 
        }
      });
    });
  }

  private inicializarTabla(): void {
    this.columns = [];
    
    if (this.modoGenerarPDF || this.modoExcel) {
      this.columns.push({
        field: 'seleccionar',
        header: '',
        sortable: false,
        align: 'center',
        type: 'custom',
        width: '50px'
      });
    }
    
    this.columns.push(
      {
        field: 'posicion',
        header: '#',
        sortable: false,
        align: 'center',
        type: 'custom'
      },
      {
        field: 'candidato',
        header: 'Candidato',
        sortable: false,
        align: 'center',
        type: 'custom'
      },
      {
        field: 'documento',
        header: 'Documento',
        sortable: false,
        align: 'center'
      },
      {
        field: 'puntaje',
        header: 'Puntaje Obtenido',
        sortable: false,
        align: 'center',
        type: 'custom'
      },
      {
        field: 'estado',
        header: 'Estado',
        sortable: false,
        type: 'badge',
        align: 'center',
        badgeConfig: {
          getSeverity: (value: string) => value === 'APROBADO' ? 'success' : 'danger',
          getLabel: (value: string) => value
        }
      }
    );

    this.actions = [
      {
        icon: (row: any) => this.candidatosYaSeleccionadosEnBD.has(row.id || '') ? 'pi pi-check-circle' : 'pi pi-check-square',
        label: '',
        tooltip: (row: any) => this.candidatosYaSeleccionadosEnBD.has(row.id || '') ? 'Ya seleccionado' : 'Seleccionar para Fase 2',
        severity: 'success',
        visible: (row: any) => !this.oferta?.activo && row.estado === 'APROBADO' && !this.modoGenerarPDF,
        disabled: (row: any) => this.candidatosYaSeleccionadosEnBD.has(row.id || ''),
        onClick: (row: HistorialPostulacion) => this.handleSeleccionClick(row)
      },
      {
        icon: 'pi pi-eye',
        label: '',
        tooltip: 'Ver Detalle',
        severity: 'info',
        visible: (row: any) => !this.modoGenerarPDF,
        onClick: (row: HistorialPostulacion) => this.verDetalleEvaluacion(row)
      },
      {
        icon: 'pi pi-file-pdf',
        label: '',
        tooltip: 'Ver Hoja de Vida',
        severity: 'help',
        visible: (row: any) => !this.modoGenerarPDF,
        onClick: (row: HistorialPostulacion) => this.verResumenPDF(row)
      }
    ];
  }

  cargarOferta(): Promise<void> {
    return new Promise((resolve) => {
      this.ofertaLaboralService.getById(this.ofertaId).subscribe({
        next: (oferta) => {
          this.oferta = oferta;
          resolve();
        },
        error: () => {
          resolve();
        }
      });
    });
  }

  private cargarSeleccionadosExistentes(): Promise<void> {
    return new Promise((resolve) => {
      this.postulacionesSeleccionadasService.listarPorOferta(this.ofertaId).subscribe({
        next: (seleccionados) => {
          this.candidatosYaSeleccionadosEnBD.clear();
          seleccionados.forEach(sel => {
            if (sel.postulacion?.id) {
              this.candidatosYaSeleccionadosEnBD.add(sel.postulacion.id);
            }
          });
          resolve();
        },
        error: (error) => {
          resolve();
        }
      });
    });
  }

  cargarRanking(): Promise<void> {
    return new Promise((resolve) => {
      this.rankingService.getRankingPostulaciones(this.ofertaId).subscribe({
        next: (postulaciones) => {
          this.postulaciones = postulaciones || [];
          this.cargarEstadisticas();
          resolve();
        },
        error: () => {
          NotificationUtil.errorCargar(this.messageService, 'las postulaciones');
          resolve();
        }
      });
    });
  }

  cargarEstadisticas(): void {
    if (!this.postulaciones?.length) {
      this.estadisticas = {
        totalPostulaciones: 0,
        totalAprobados: 0,
        totalNoAprobados: 0,
        porcentajeAprobacion: 0,
        puntajePromedio: 0,
        puntajeMaximo: 0,
        puntajeMinimo: 0
      };
      return;
    }

    const totalPostulaciones = this.postulaciones.length;
    const totalAprobados = this.postulaciones.filter(p => p.aprueba).length;
    const puntajes = this.postulaciones.map(p => p.puntajeFinal || 0);
    
    this.estadisticas = {
      totalPostulaciones,
      totalAprobados,
      totalNoAprobados: totalPostulaciones - totalAprobados,
      porcentajeAprobacion: (totalAprobados / totalPostulaciones) * 100,
      puntajePromedio: puntajes.reduce((sum, p) => sum + p, 0) / puntajes.length,
      puntajeMaximo: Math.max(...puntajes),
      puntajeMinimo: Math.min(...puntajes)
    };
  }

  aplicarFiltros(): void {
    let resultado = [...this.postulaciones];

    if (this.filtroTexto.trim()) {
      const texto = this.filtroTexto.toLowerCase().trim();
      resultado = resultado.filter(postulacion =>
        postulacion.nombreCompleto?.toLowerCase().includes(texto) ||
        postulacion.nombres?.toLowerCase().includes(texto) ||
        postulacion.apellidos?.toLowerCase().includes(texto) ||
        postulacion.identificacion?.toLowerCase().includes(texto) ||
        postulacion.numeroDocumento?.toLowerCase().includes(texto)
      );
    }

    if (this.filtroAprobacion !== 'todos') {
      const aprueba = this.filtroAprobacion === 'aprobados';
      resultado = resultado.filter(postulacion => postulacion.aprueba === aprueba);
    }

    this.postulacionesFiltradas = resultado.map((item, index) => ({
      ...item,
      posicion: index + 1,
      candidato: this.rankingService.getNombreCompleto(item),
      documento: `${item.persona?.identificacion || 'N/A'} (${item.persona?.tipoDocumento || ''})`,
      puntaje: item.puntajeFinal,
      estado: this.rankingService.getAprobacionTexto(item)
    }));
    this.cdr.detectChanges();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
    this.first = 0;
  }

  verResumenPDF(postulacion: HistorialPostulacion): void {
    if (!postulacion.personaId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se encontró el ID de la persona',
        life: 3000
      });
      return;
    }
    
    this.cargandoPdf = true;
    this.dialogPdfNombre = postulacion.nombreCompleto || 'Hoja de Vida';
    this.dialogPdfBlobUrl = '';
    this.dialogPdfBlob = null;
    this.dialogPdfVisible = true;

    this.pdfService.downloadPdfByPersonaId(postulacion.personaId).subscribe({
      next: (blob: Blob) => {
        if (this.dialogPdfBlobUrl) URL.revokeObjectURL(this.dialogPdfBlobUrl as string);
        this.dialogPdfBlob = blob;
        const rawUrl = URL.createObjectURL(blob);
        this.dialogPdfBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
        this.cargandoPdf = false;
      },
      error: () => {
        this.cargandoPdf = false;
        this.dialogPdfVisible = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la hoja de vida',
          life: 5000
        });
      }
    });
  }

  volverAOfertas(): void {
    this.router.navigate(['/app/ranking-ofertas']);
  }

  recalcularPuntajes(): void {
    if (!this.postulaciones || this.postulaciones.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Postulaciones',
        detail: 'No hay postulaciones para recalcular. Debe haber al menos una postulación antes de usar esta función.',
        life: 5000
      });
      return;
    }
    
    if (!this.ofertaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la oferta actual',
        life: 5000
      });
      return;
    }
    
    this.messageService.add({
      severity: 'info',
      summary: 'Recalculando...',
      detail: `Se recalcularán las evaluaciones de esta oferta. Por favor espere...`,
      life: 3000
    });
    
    this.loading = true;
    
    this.rankingService.recalcularEvaluacionesOferta(this.ofertaId).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Recálculo Exitoso',
          detail: response?.mensaje || 'Las evaluaciones de esta oferta han sido recalculadas correctamente',
          life: 6000
        });
        
        this.cargarRanking().then(() => {
          this.aplicarFiltros(); 
          this.loading = false;
        }).catch(() => {
          this.loading = false; 
        }); 
      },
      error: (error) => {
        this.loading = false;
        
        let errorMsg = 'No se pudieron recalcular las evaluaciones';
        
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.error?.error) {
          errorMsg = error.error.error;
        } else if (error?.message) {
          errorMsg = error.message;
        } else if (error?.error && typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        if (error?.status) {
          errorMsg += ` (HTTP ${error.status})`;
        }
        
        if (error?.status === 500) {
          errorMsg += '. Revise los logs del servidor para más detalles.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error al Recalcular',
          detail: errorMsg,
          life: 10000
        });
      }
    });
  }

  getPosicion(index: number): number {
    return this.first + index + 1;
  }

  getSeverityAprobacion = CalculationUtil.booleanToSeverity;
  formatFecha = DateFormatterUtil.formatShort;
  getInitials = CalculationUtil.getInitials;

  getPorcentaje(postulacion: HistorialPostulacion): number {
    return CalculationUtil.calcularPorcentaje(
      postulacion.puntajeFinal, 
      postulacion.totalRequisitos || 0
    );
  }

  getPorcentajeDetalle(detalle: EvaluacionDetalleDTO): number {
    const totalRequisitos = (detalle.totalRequisitos && detalle.totalRequisitos > 0) ? detalle.totalRequisitos : 100;
    const porcentaje = CalculationUtil.calcularPorcentaje(
      detalle.puntajeFinal || 0,
      totalRequisitos
    );
    return porcentaje;
  }

  getProgressBarClass(puntaje: number, totalRequisitos: number): string {
    const porcentaje = CalculationUtil.calcularPorcentaje(puntaje, totalRequisitos);
    return CalculationUtil.getSeverityByPercentage(porcentaje);
  }

  getProgressValue(puntaje: number, totalRequisitos: number): number {
    return CalculationUtil.clamp(
      CalculationUtil.calcularPorcentaje(puntaje, totalRequisitos),
      0,
      100
    );
  }

  getTotalRequisitos(oferta: OfertaLaboral | null): number {
    if (!oferta?.requisitos || !Array.isArray(oferta.requisitos)) return 0;
    return oferta.requisitos.reduce((total, req) => total + (req.valor || 0), 0);
  }

  verDetalleEvaluacion(postulacion: HistorialPostulacion): void {
    this.loadingDetalle = true;
    this.evaluandoIndividual = false; 
    this.detalleEvaluacionVisible = true;
    
    this.rankingService.getDetalleEvaluacionAutomatica(postulacion.id).subscribe({
      next: (detalle: any) => {
        this.detalleEvaluacion = detalle.data; 
        this.loadingDetalle = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el detalle de la evaluación automática',
          life: 5000
        });
        this.loadingDetalle = false;
        this.detalleEvaluacionVisible = false;
      }
    });
  }

  cerrarDetalleEvaluacion(): void {
    this.detalleEvaluacionVisible = false;
    this.detalleEvaluacion = null;
    this.evaluandoIndividual = false;
  }

  getDiferenciaClass(diferencia: number): string {
    const abs = Math.abs(diferencia);
    return abs > 30 ? 'text-red-600 font-bold' 
         : abs > 15 ? 'text-orange-500 font-semibold' 
         : 'text-green-600';
  }

  getDiferenciaIcon(diferencia: number): string {
    return diferencia > 15 ? 'pi-arrow-up'
         : diferencia < -15 ? 'pi-arrow-down'
         : 'pi-minus';
  }

  evaluarPostulacionIndividual(postulacionId: string | undefined): void {
    if (!postulacionId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: 'El ID de la postulación no es válido o no está disponible',
        life: 5000
      });
      this.evaluandoIndividual = false;
      return;
    }
    
    this.evaluandoIndividual = true;
    
    this.messageService.add({
      severity: 'info',
      summary: 'Evaluando...',
      detail: 'Ejecutando evaluación automática de la postulación',
      life: 3000
    });

    this.http.post(`${environment.apiHojasDeVida}/hojas-de-vida/evaluaciones/postulacion/${postulacionId}/evaluar`, {})
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Evaluación Completada',
            detail: response?.message || 'La evaluación automática se ejecutó correctamente',
            life: 5000
          });

          setTimeout(() => {
            this.verDetalleEvaluacion({ id: postulacionId } as HistorialPostulacion);
          }, 1000);
        },
        error: (error) => {
          this.evaluandoIndividual = false;
          
          let errorMsg = 'No se pudo ejecutar la evaluación automática';
          
          if (error?.error?.message) {
            errorMsg = error.error.message;
          } else if (error?.error?.error) {
            errorMsg = error.error.error;
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error en Evaluación',
            detail: errorMsg,
            life: 8000
          });
        }
      });
  }

  getFotoUrl(postulacion: HistorialPostulacion): string | null {
    if (!postulacion.personaId) return null;
    
    const personaId = postulacion.personaId;
    
    const cached = this.fotosCache.get(personaId);
    if (cached) return cached;
    
    const fotoDelServicio = this.fotoCacheService.obtenerFotoSync(personaId);
    if (fotoDelServicio) {
      this.fotosCache.set(personaId, fotoDelServicio);
      return fotoDelServicio;
    }
    
    const fotoUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas/${personaId}/foto`;
    
    if (this.fotoCacheService.debeCargarFoto(personaId)) {
      this.fotoCacheService
        .obtenerFoto(personaId, fotoUrl)
        .subscribe(url => {
          if (url) {
            this.fotosCache.set(personaId, url);
          }
        });
    }
    
    return null;
  }

  toggleModoGenerarPDF(): void {
    this.modoGenerarPDF = !this.modoGenerarPDF;
    
    if (!this.modoGenerarPDF) {
      this.candidatosParaPDF.clear();
      this.seleccionarTodosPDF = false;
    } else {
      if (this.modoExcel) {
        this.modoExcel = false;
        this.candidatosParaExcel.clear();
        this.seleccionarTodosExcel = false;
      }
      this.messageService.add({
        severity: 'info',
        summary: 'Modo PDF Activado',
        detail: 'Seleccione los candidatos y presione "Generar ZIP" para descargar múltiples hojas de vida',
        life: 4000
      });
    }

    this.inicializarTabla();
    this.cdr.detectChanges();
  }

  toggleSeleccionPDF(candidatoId: string): void {
    if (this.candidatosParaPDF.has(candidatoId)) {
      this.candidatosParaPDF.delete(candidatoId);
    } else {
      this.candidatosParaPDF.add(candidatoId);
    }
    this.actualizarSeleccionarTodosPDF();
  }

  seleccionarTodosPDFChange(event: any): void {
    if (event.checked) {
      this.postulacionesFiltradas.forEach(p => {
        if (p.personaId) {
          this.candidatosParaPDF.add(p.personaId);
        }
      });
    } else {
      this.candidatosParaPDF.clear();
    }
  }

  private actualizarSeleccionarTodosPDF(): void {
    const totalFiltrados = this.postulacionesFiltradas.filter(p => p.personaId).length;
    this.seleccionarTodosPDF = totalFiltrados > 0 && this.candidatosParaPDF.size === totalFiltrados;
  }

  private limpiarNombreArchivo(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^a-zA-Z0-9\s]/g, '') 
      .replace(/\s+/g, '_') 
      .substring(0, 50); 
  }

  async generarZipPDFs(): Promise<void> {
    if (this.candidatosParaPDF.size === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin selección',
        detail: 'Debe seleccionar al menos un candidato para generar el ZIP',
        life: 3000
      });
      return;
    }

    this.generandoZipPDF = true;

    const candidatosSeleccionados = this.postulacionesFiltradas
      .filter(p => this.candidatosParaPDF.has(p.personaId))
      .map(p => ({
        personaId: p.personaId,
        identificacion: p.persona?.identificacion || p.identificacion || 'sin_doc',
        nombreCompleto: this.rankingService.getNombreCompleto(p)
      }));

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando ZIP',
        detail: `Generando ${candidatosSeleccionados.length} hojas de vida...`,
        life: 3000
      });

      this.pdfService.downloadMultiplePdfsAsZip(candidatosSeleccionados).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'convocatoria';
          const cargo = this.limpiarNombreArchivo(this.oferta?.cargoRequerido || 'cargo');
          a.download = `${numeroConvocatoria}-${cargo}.zip`;
          
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          this.messageService.add({
            severity: 'success',
            summary: 'ZIP Generado',
            detail: `Se descargaron ${candidatosSeleccionados.length} hojas de vida correctamente`,
            life: 5000
          });

          this.candidatosParaPDF.clear();
          this.seleccionarTodosPDF = false;
          this.generandoZipPDF = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el archivo ZIP',
            life: 5000
          });
          this.generandoZipPDF = false;
        }
      });
    } catch (error) {
      this.generandoZipPDF = false;
    }
  }

  toggleModoSeleccion(): void {
    this.modoSeleccion = !this.modoSeleccion;
    if (!this.modoSeleccion) {
      this.candidatosSeleccionados.clear();
    }
    this.cdr.detectChanges();
  }

  abrirDialogSeleccion(candidato: HistorialPostulacion): void {
    this.candidatoActual = candidato;
    this.motivoSeleccion = '';
    this.mostrarDialogSeleccion = true;
  }

  cerrarDialogSeleccion(): void {
    this.mostrarDialogSeleccion = false;
    this.candidatoActual = null;
    this.motivoSeleccion = '';
  }

  async confirmarSeleccionIndividual(): Promise<void> {
    if (!this.candidatoActual?.id || !this.ofertaId) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const seleccionadoPor = currentUser?.username || 'Sistema';

    this.loading = true;
    
    try {
      await this.postulacionesSeleccionadasService.crearSeleccion({
        historialPostulacionId: this.candidatoActual.id,
        ofertaLaboralId: this.ofertaId,
        observaciones: this.motivoSeleccion || undefined
      }, seleccionadoPor).toPromise();

      this.candidatosSeleccionados.add(this.candidatoActual.id);
      this.candidatosYaSeleccionadosEnBD.add(this.candidatoActual.id);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Candidato seleccionado para entrevista',
        life: 3000
      });

      this.cerrarDialogSeleccion();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.mensaje || 'No se pudo seleccionar el candidato',
        life: 5000
      });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  deseleccionarCandidato(candidato: HistorialPostulacion): void {
    if (candidato.id) {
      this.candidatosSeleccionados.delete(candidato.id);
      this.messageService.add({
        severity: 'info',
        summary: 'Deseleccionado',
        detail: 'Candidato eliminado de la selección',
        life: 2000
      });
      this.cdr.detectChanges();
    }
  }


  handleSeleccionClick(row: HistorialPostulacion): void {
    const yaEnBD = this.candidatosYaSeleccionadosEnBD.has(row.id || '');
    
    if (yaEnBD) return; 
    
    this.abrirDialogSeleccion(row);
  }

  private enviarNotificacionSeleccionFase1(candidato: HistorialPostulacion): void {
    const email = candidato.persona?.correo || candidato.persona?.correoPersonal;
    
    if (!email || !email.trim()) {
      return;
    }

    const nombreCompleto = this.rankingService.getNombreCompleto(candidato);
    const ofertaTitulo = this.oferta?.cargoRequerido || 'Convocatoria Laboral';
    const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'N/A';
    const fechaSeleccion = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.emailService.notificarSeleccionFase1(
      email,
      nombreCompleto,
      ofertaTitulo,
      numeroConvocatoria,
      fechaSeleccion
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Notificación Enviada',
          detail: `Se ha notificado al candidato por correo electrónico`,
          life: 3000
        });
      },
      error: (error) => {
      }
    });
  }

  private enviarNotificacionMongoDBFase1(candidato: HistorialPostulacion): void {
    const email = candidato.persona?.correo || candidato.persona?.correoPersonal;
    
    if (!email || !email.trim()) {
      return;
    }

    const nombreCompleto = this.rankingService.getNombreCompleto(candidato);
    const ofertaTitulo = this.oferta?.cargoRequerido || 'Convocatoria Laboral';
    const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'N/A';

    this.notificationService.createNotification({
      title: ' ¡Felicitaciones! Has sido preseleccionado',
      message: `Has sido preseleccionado para la convocatoria: ${ofertaTitulo} (${numeroConvocatoria}). En breve nos pondremos en contacto contigo para la entrevista.`,
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      userEmail: email,
      projectContext: 'hojas_de_vida',
      link: `/app/mis-postulaciones`,
      icon: 'pi pi-check-circle',
      metadata: {
        ofertaId: this.ofertaId,
        postulacionId: candidato.id,
        ofertaTitulo: ofertaTitulo,
        numeroConvocatoria: numeroConvocatoria,
        candidatoNombre: nombreCompleto,
        fechaSeleccion: new Date().toISOString(),
        fase: 'FASE_1_PRESELECCION'
      }
    }).subscribe({
      next: () => {
      },
      error: (error) => {
      }
    });
  }

  toggleModoExcel(): void {
    this.modoExcel = !this.modoExcel;

    if (!this.modoExcel) {
      this.candidatosParaExcel.clear();
      this.seleccionarTodosExcel = false;
    } else {
      if (this.modoGenerarPDF) {
        this.modoGenerarPDF = false;
        this.candidatosParaPDF.clear();
        this.seleccionarTodosPDF = false;
      }
      this.messageService.add({
        severity: 'info',
        summary: 'Modo Excel Activado',
        detail: 'Seleccione los candidatos y presione "Descargar Excel" para exportar',
        life: 4000
      });
    }

    this.inicializarTabla();
    this.cdr.detectChanges();
  }

  toggleSeleccionExcel(postulacionId: string): void {
    if (this.candidatosParaExcel.has(postulacionId)) {
      this.candidatosParaExcel.delete(postulacionId);
    } else {
      this.candidatosParaExcel.add(postulacionId);
    }
    this.actualizarSeleccionarTodosExcel();
  }

  seleccionarTodosExcelChange(event: any): void {
    if (event.checked) {
      this.postulacionesFiltradas.forEach(p => {
        if (p.id) {
          this.candidatosParaExcel.add(p.id);
        }
      });
    } else {
      this.candidatosParaExcel.clear();
    }
  }

  private actualizarSeleccionarTodosExcel(): void {
    const totalFiltrados = this.postulacionesFiltradas.filter(p => p.id).length;
    this.seleccionarTodosExcel = totalFiltrados > 0 && this.candidatosParaExcel.size === totalFiltrados;
  }

  descargarExcel(): void {
    if (this.candidatosParaExcel.size === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin selección',
        detail: 'Debe seleccionar al menos un candidato para exportar',
        life: 3000
      });
      return;
    }

    this.descargandoExcel = true;

    const candidatosSeleccionados = this.postulacionesFiltradas
      .filter(p => this.candidatosParaExcel.has(p.id));

    // Extrae el personaId de TODAS las formas posibles, incluyendo cuando
    // @JsonIdentityInfo de Jackson serializa Persona como UUID string en vez de objeto.
    const resolverPid = (p: any): string | null => {
      // personaIdDirecto: campo de columna directa en Java, siempre disponible sin lazy loading
      if (p.personaIdDirecto && typeof p.personaIdDirecto === 'string' && p.personaIdDirecto.length > 10) return p.personaIdDirecto;
      if (p.personaId && typeof p.personaId === 'string' && p.personaId.length > 10) return p.personaId;
      if (p.persona && typeof p.persona === 'object' && p.persona.id) return p.persona.id;
      if (p.persona && typeof p.persona === 'string' && p.persona.length > 10) return p.persona;
      return null;
    };

    // Llamadas dedicadas por candidato con concurrencia limitada a 3 para evitar HTTP 429.
    // Reintenta automáticamente hasta 3 veces con backoff en caso de rate limit.
    const MAX_CONCURRENCIA = 3;
    const conReintento = <T>(obs: Observable<T>, pid: string, tipo: string): Observable<T> =>
      obs.pipe(
        retryWhen(errors =>
          errors.pipe(
            mergeMapRetry((err, i) => {
              if (err?.status === 429 && i < 3) {
                const espera = (i + 1) * 1000;
                console.warn(`[descargarExcel] 429 en ${tipo} para ${pid}, reintentando en ${espera}ms...`);
                return timer(espera);
              }
              throw err;
            })
          )
        )
      );

    from(candidatosSeleccionados).pipe(
      mergeMap((p, idx) => {
        const pid = resolverPid(p);
        if (!pid) {
          console.warn(`[descargarExcel] No se pudo resolver personaId para postulación`, p?.id, p);
          return of({ idx, p, academica: [] as InformacionAcademica[], laboral: [] as InfoLaboral[] });
        }
        return forkJoin({
          academica: conReintento(
            this.infoAcademicaService.obtenerRegistros(pid),
            pid, 'info_academica'
          ).pipe(
            catchError((err) => {
              console.error(`[descargarExcel] Error cargando info académica para persona ID ${pid}:`, err);
              return of([] as InformacionAcademica[]);
            })
          ),
          laboral: conReintento(
            this.infoLaboralService.getAll(pid),
            pid, 'info_laboral'
          ).pipe(
            catchError((err) => {
              console.error(`[descargarExcel] Error cargando info laboral para persona ID ${pid}:`, err);
              return of([] as InfoLaboral[]);
            })
          )
        }).pipe(
          switchMap(({ academica, laboral }) => of({
            idx,
            p,
            academica: academica as InformacionAcademica[],
            laboral:   laboral as InfoLaboral[]
          }))
        );
      }, MAX_CONCURRENCIA),
      toArray()
    ).subscribe({
      next: (resultados) => {
        resultados.sort((a, b) => a.idx - b.idx);
        const dataAcademica = resultados.map(r => r.academica);
        const dataLaboral   = resultados.map(r => r.laboral);
        const candidatosOrdenados = resultados.map(r => r.p);
        this.generarArchivoExcelIndexado(candidatosOrdenados, dataAcademica, dataLaboral);
      },
      error: () => {
        const vacios   = candidatosSeleccionados.map(() => [] as InfoLaboral[]);
        const vaciosAc = candidatosSeleccionados.map(() => [] as InformacionAcademica[]);
        this.generarArchivoExcelIndexado(candidatosSeleccionados, vaciosAc, vacios);
      }
    });
  }


  private formatearExperienciaLaboral(laborales: InfoLaboral[]): string {
    if (!laborales || laborales.length === 0) return '';
    return laborales.map(l => {
      const inicio = l.fechaInicio ? new Date(l.fechaInicio) : null;
      const fin = l.vigente ? new Date() : (l.fechaFin ? new Date(l.fechaFin) : null);
      let meses = 0;
      if (inicio && fin) {
        meses = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      }
      const fechaInicioStr = inicio ? inicio.toLocaleDateString('es-CO') : 'N/A';
      const fechaFinStr = l.vigente ? 'Vigente' : (fin ? fin.toLocaleDateString('es-CO') : 'N/A');
      return `• CARGO: ${l.cargoDesempenado || 'N/A'} | MESES EN EL CARGO: ${meses} | FECHA DE INICIO: ${fechaInicioStr} | FECHA FINAL: ${fechaFinStr} | EMPRESA: ${l.nombreEmpresa || 'N/A'}`;
    }).join('\n');
  }

  private formatearSoportesLaboral(laborales: InfoLaboral[]): string {
    if (!laborales || laborales.length === 0) return '';
    const soportes: string[] = [];
    laborales.forEach(l => {
      (l.archivos || []).forEach(a => {
        const url = a.rutaArchivo || '';
        soportes.push(`Soporte: ${a.nombre} --> ${url}`);
      });
    });
    return soportes.join('\n');
  }

  private clasificarTitulo(tipoTitulo: string): 'PREGRADO' | 'POSGRADO' | 'OTRO' {
    const t = (tipoTitulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const esPosgrado = ['especiali', 'maestr', 'magist', 'doctorad', 'phd', 'postdoc'].some(k => t.includes(k));
    if (esPosgrado) return 'POSGRADO';
    const esPregrado = ['pregrado', 'profesional', 'universitario', 'licenciatura', 'tecnolog', 'tecnico',
                        'ingenieria', 'administracion', 'medicina', 'derecho', 'contaduria', 'enfermeria',
                        'psicologia', 'arquitectura'].some(k => t.includes(k));
    if (esPregrado) return 'PREGRADO';
    return 'PREGRADO'; // por defecto en PREGRADO si no se reconoce
  }

  private formatearTitulos(titulos: InformacionAcademica[]): string {
    if (!titulos || titulos.length === 0) return '';
    return titulos.map(t => {
      const fechaInicio = t.fechaInicio ? new Date(t.fechaInicio).toLocaleDateString('es-CO') : 'N/A';
      const fechaFin = t.enCurso
        ? 'En curso'
        : (t.fechaGrado ? new Date(t.fechaGrado).toLocaleDateString('es-CO') : 'N/A');
      const tituloTexto = t.enCurso ? `${t.titulo || 'N/A'} (en curso)` : (t.titulo || 'N/A');
      const partes = [
        `TIPO: ${t.tipoTitulo || 'N/A'}`,
        `TÍTULO: ${tituloTexto}`,
        `INSTITUCIÓN: ${t.institucion || 'N/A'}`,
        `FECHA INICIO: ${fechaInicio}`,
        `FECHA GRADO: ${fechaFin}`,
      ];
      if (t.modalidad) partes.push(`MODALIDAD: ${t.modalidad}`);
      if (t.tarjetaProfesional) partes.push(`TARJETA PROFESIONAL: SÍ`);
      return `• ${partes.join(' | ')}`;
    }).join('\n');
  }

  private generarArchivoExcelIndexado(
    candidatos: any[],
    dataAcademica: InformacionAcademica[][],
    dataLaboral: InfoLaboral[][]
  ): void {
    const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'N/A';
    const cargo = this.oferta?.cargoRequerido || 'N/A';
    const departamento = this.oferta?.departamentoSolicitante || 'N/A';
    const periodo = this.oferta?.periodo || 'N/A';
    const dedicacion = this.oferta?.dedicacion || 'N/A';
    const tipoContrato = this.oferta?.tipoContrato || 'N/A';
    const tipoConvocatoria = this.oferta?.tipoConvocatoria || 'N/A';

    const encabezado = [
      'No. Convocatoria',
      'Tipo Convocatoria',
      'Cargo Requerido',
      'Departamento Solicitante',
      'Período',
      'Dedicación',
      'Tipo de Contrato',
      'Nombre Completo',
      'Número de Documento',
      'Tipo de Documento',
      'Correo',
      'Teléfono',
      'Puntaje Obtenido',
      '% del Total',
      'Estado',
      'Fecha de Postulación',
      'TÍTULOS ACADÉMICOS',
      'EXPERIENCIA LABORAL',
      'SOPORTES_URL'
    ];

    const filas: any[][] = candidatos.map((p, idx) => {
      const porcentaje = this.getPorcentaje(p);
      const infoAcademica: InformacionAcademica[] = dataAcademica[idx] || [];
      const infoLaboral: InfoLaboral[] = dataLaboral[idx] || [];

      return [
        numeroConvocatoria,
        tipoConvocatoria,
        cargo,
        departamento,
        periodo,
        dedicacion,
        tipoContrato,
        p.candidato || this.rankingService.getNombreCompleto(p),
        p.persona?.identificacion || p.identificacion || 'N/A',
        p.persona?.tipoDocumento || p.tipoDocumento || 'N/A',
        p.persona?.correo || p.persona?.correoPersonal || 'N/A',
        p.persona?.celular1 || p.persona?.telefono || 'N/A',
        p.puntaje ?? p.puntajeFinal ?? 0,
        `${porcentaje.toFixed(1)}%`,
        p.estado || (p.aprueba ? 'APROBADO' : 'NO APROBADO'),
        p.fechaPostulacion ? new Date(p.fechaPostulacion).toLocaleDateString('es-CO') : 'N/A',
        this.formatearTitulos(infoAcademica),
        this.formatearExperienciaLaboral(infoLaboral),
        this.formatearSoportesLaboral(infoLaboral)
      ];
    });

    const wsData: any[][] = [encabezado, ...filas];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Activar wrap text para las celdas de pregrado, posgrado, observaciones y soportes
    const rango = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 1; R <= rango.e.r; R++) {
      [16, 17, 18].forEach(col => {
        const celda = XLSX.utils.encode_cell({ r: R, c: col });
        if (ws[celda]) ws[celda].s = { alignment: { wrapText: true, vertical: 'top' } };
      });
    }

    ws['!cols'] = [
      { wch: 20 }, // No. Convocatoria
      { wch: 20 }, // Tipo Convocatoria
      { wch: 30 }, // Cargo Requerido
      { wch: 28 }, // Departamento
      { wch: 12 }, // Período
      { wch: 15 }, // Dedicación
      { wch: 18 }, // Tipo Contrato
      { wch: 38 }, // Nombre Completo
      { wch: 22 }, // Número Documento
      { wch: 22 }, // Tipo Documento
      { wch: 30 }, // Correo
      { wch: 15 }, // Teléfono
      { wch: 18 }, // Puntaje
      { wch: 12 }, // %
      { wch: 15 }, // Estado
      { wch: 22 }, // Fecha Postulación
      { wch: 80 }, // TÍTULOS ACADÉMICOS
      { wch: 80 }, // EXPERIENCIA LABORAL
      { wch: 60 }  // SOPORTES_URL
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');

    const hoy = new Date();
    const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const nombreOferta = this.limpiarNombreArchivo(this.oferta?.cargoRequerido || 'oferta');
    const nombreArchivo = `reporte_${nombreOferta}_${fechaStr}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);

    this.messageService.add({
      severity: 'success',
      summary: 'Excel Descargado',
      detail: `Se exportaron ${candidatos.length} postulante(s) correctamente`,
      life: 4000
    });

    this.descargandoExcel = false;
  }

  cerrarDialogPdf(): void {
    this.dialogPdfVisible = false;
    if (this.dialogPdfBlobUrl) {
      URL.revokeObjectURL(this.dialogPdfBlobUrl as string);
      this.dialogPdfBlobUrl = '';
    }
    this.dialogPdfBlob = null;
  }

  descargarPdfActual(): void {
    if (!this.dialogPdfBlob) return;
    const nombre = this.dialogPdfNombre.replace(/\s+/g, '_');
    this.pdfService.downloadPdf(this.dialogPdfBlob, `hoja_de_vida_${nombre}.pdf`);
  }

  ngOnDestroy(): void {
    if (this.dialogPdfBlobUrl) URL.revokeObjectURL(this.dialogPdfBlobUrl as string);
    this.blobUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.blobUrls = [];
    this.fotosCache.clear();
  }
}