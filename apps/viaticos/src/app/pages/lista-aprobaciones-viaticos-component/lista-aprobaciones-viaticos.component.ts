import { Component, OnInit, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AprobacionViaticoService } from '../../core/services/aprobacion-viatico.service';
import { SolicitudViaticosService, SolicitudViaticos } from '../../core/services/Solicitud-viaticos.service';
import { AprobacionViatico } from '../../core/models/aprobacion-viatico.model';
import { ConceptoLiquidacion } from '../../core/models/aprobacion-viatico.model';
import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ConceptosLiquidacionCatalogoService } from '../../core/services/conceptos-liquidacion-catalogo.service';
import { AuthService } from '@microfrontends/shared-services';
import { ArchivosUsuariosService } from '../../core/services/archivousuarios.service';
import { ArchivosUsuarios } from '../../core/models/archivousuarios.model';
import { SafeResourceUrlPipe } from '../../shared/pipes/safe-resource-url.pipe';
import { CentrosCostoOracleService } from '../../core/services/centros-costo-oracle.service';
import { DistribucionViaticosService } from '../../core/services/distribucion-viaticos.service';
import { ExportacionCsvService } from '../../core/services/exportacion-csv.service';
import { DistribucionViaticos } from '../../core/models/distribucion-viaticos.model';
import { lastValueFrom, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ListaValor } from '../../core/models/lista-valor.model';
import { ViaticosRealtimeService } from '../../core/services/viaticos-realtime.service';

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface SolicitudViaticosExtendida extends SolicitudViaticos {
  municipioDestinoNombre?: string;
  departamentoDestinoNombre?: string;
  municipioSalidaNombre?: string;
  departamentoSalidaNombre?: string;
  horaSalida?: string;
  horaLlegada?: string;
  actividadesRealizar?: string;
}

interface SolicitudAgrupada {
  codigoSolicitud: string;
  aprobaciones: AprobacionViatico[];
  totalNiveles: number;
  nivelesAprobados: number;
  nivelesRechazados: number;
  nivelesPendientes: number;
  estadoGeneral: 'aprobado' | 'rechazado' | 'pendiente' | 'parcial' | 'pagado';
  estadoSolicitud?: 'borrador' | 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'anulado';
  fechaUltimaAccion: string | null;
  fechaCreacion?: string;
  expandida?: boolean;
}

interface DistribucionCentroCosto {
  codigoCentroCosto: string;
  nombreCentroCosto: string;
  fuenteFuncion: string;
  porcentaje: number;
  valorCalculado: number;
}

@Component({
  selector: 'app-lista-aprobaciones-viaticos.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    TooltipModule,
    ConfirmDialogModule,
    SafeResourceUrlPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lista-aprobaciones-viaticos.component.html',
  styleUrl: './lista-aprobaciones-viaticos.component.scss',
})
export class ListaAprobacionesViaticosComponent implements OnInit {
  private aprobacionService = inject(AprobacionViaticoService);
  private solicitudService = inject(SolicitudViaticosService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private listasValoresService = inject(ListasValoresService);
  private conceptosLiquidacionService = inject(ConceptosLiquidacionCatalogoService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);
  private archivosUsuariosService = inject(ArchivosUsuariosService);
  private centrosCostoService = inject(CentrosCostoOracleService);
  private distribucionViaticosService = inject(DistribucionViaticosService);
  private exportacionCsvService = inject(ExportacionCsvService);
  private router = inject(Router);
  private realtimeService = inject(ViaticosRealtimeService);
  solicitudesAgrupadas: SolicitudAgrupada[] = [];
  solicitudesFiltradas: SolicitudAgrupada[] = [];
  solicitudSeleccionada: SolicitudViaticos | null = null;
  aprobacionesSolicitudSeleccionada: AprobacionViatico[] = [];
  cargando = false;
  enviandoVerificacion = false;
  mostrarDialogoDetalle = false;
  mostrarDialogoEdicion = false;
  mostrarDialogoVisualizacionPDF = false;
  mostrarDialogoEnviarCorreo = false;
  mostrarDialogoDistribucionPorcentajes = false;
  emailDestino = '';
  enviandoCorreo = false;
  distribucionesCentrosCosto: DistribucionCentroCosto[] = [];
  archivosSolicitud: ArchivosUsuarios[] = [];
  cargandoArchivos = false;
  mostrarVistaPrevia = false;
  archivoPrevisualizado: ArchivosUsuarios | null = null;
  urlVistaPrevia = '';
  cargandoPrevia = false;
  solicitudParaCSV: SolicitudViaticos | null = null;
  exportarTodas = false;
  centrosCostoOptions: { label: string; value: string }[] = [];
  conceptosLiquidacion: ConceptoLiquidacion[] = [];
  conceptosOriginales: ConceptoLiquidacion[] = [];
  mostrarSeccionConceptos = false;
  fechaActual = new Date();
  ubicacionesMap = new Map<string, string>();
  mostrarDialogoSeleccionSolicitudes = false;
  solicitudesParaSeleccionar: SolicitudAgrupada[] = [];
  solicitudesSeleccionadas: SolicitudAgrupada[] = [];

  filtroForm: FormGroup;

  // Opciones cargadas dinámicamente desde BD (igual que CVIA)
  opcionesEstado: { label: string; value: string }[] = [];

  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  estadisticas = {
    total: 0,
    aprobadas: 0,
    pendientes: 0,
    rechazadas: 0,
    pagadas: 0,
    porcentajeAprobadas: 0,
    porcentajePendientes: 0,
    porcentajeRechazadas: 0,
  };

  constructor() {
    this.filtroForm = this.fb.group({
      texto: [''],
      estado: [''],
    });

    this.filtroForm.valueChanges.subscribe(() => this.aplicarFiltros());

    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          this.messageService.add({
            severity: 'info',
            summary: 'Aprobaciones actualizadas',
            detail: 'Se detectaron cambios, los datos han sido actualizados.',
            life: 3000
          });
          this.realtimeService.resetAll();
          this.cargarAprobaciones();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarOpcionesEstado();
    this.cargarUbicaciones();
    this.cargarCentrosCosto();
    this.cargarAprobaciones();
  }

  /** Carga centros de costo desde Oracle para usar en distribución */
  cargarCentrosCosto(): void {
    this.centrosCostoService.getCentrosCostoActivos().subscribe({
      next: (centros) => {
        this.centrosCostoOptions = centros.map(centro => ({
          label: `${centro.centroCosto} - ${centro.nombreCentroCosto}`,
          value: centro.centroCosto
        }));
      },
      error: () => {
        this.centrosCostoOptions = [];
      }
    });
  }

  /** Carga opciones de estado desde BD (igual que CVIA) */
  private cargarOpcionesEstado(): void {
    // Mapeo de códigos cortos de BD a valores largos que usa el backend
    const mapaEstados: Record<string, string> = {
      'PEND': 'pendiente',
      'APRO': 'aprobado',
      'RECH': 'rechazado',
      'PAGA': 'pagado',
      'BLOQ': 'bloqueado',
      'ANUL': 'anulado'
    };

    this.listasValoresService.obtenerPorTipo('ESTSO').pipe(
      map((response: ListaValor[]) => 
        response
          .filter((item) => item.idPadre !== null)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      )
    ).subscribe({
      next: (estados) => {
        this.opcionesEstado = [{ label: 'Todos', value: '' }, ...estados.map(e => {
          const codigoCorto = e.abreviatura || '';
          return {
            label: e.nombre,
            value: mapaEstados[codigoCorto] || codigoCorto.toLowerCase()
          };
        })];
      },
      
    });
  }

  /** Carga ubicaciones geográficas en el mapa */
  cargarUbicaciones(): void {
    this.ubicacionesService.getAll().subscribe({
      next: (ubicaciones) => {
        ubicaciones.forEach((ubicacion) => {
          this.ubicacionesMap.set(ubicacion.id, ubicacion.nombre);
          });
      },
      error: () => { //
      },
    });
  }

  /** Carga aprobaciones de viáticos desde servicio backend principal */
  cargarAprobaciones(): void {
    this.cargando = true;
    const filtros = this.filtroForm.value;
    
    // Siempre cargar todas las solicitudes para tener estadísticas completas
    this.aprobacionService.obtenerAprobacionesAgrupadas(
      '', // Sin filtro de texto para cargar todas
      '' // Sin filtro de estado para cargar todas
    ).subscribe({
      next: (resultado) => {
        this.solicitudesAgrupadas = resultado.solicitudesAgrupadas;
        
        // Cargar el estado real y fecha de creación de cada solicitud
        this.cargarDatosSolicitudesYFiltrar();
        
        this.cargando = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aprobaciones',
        });
        this.cargando = false;
      },
    });
  }

  /** Carga el estado real y fecha de creación de cada solicitud y aplica filtros locales */
  private cargarDatosSolicitudesYFiltrar(): void {
    this.solicitudService.getAll().subscribe({
      next: (solicitudes) => {
        // Asignar estado real y fecha a cada solicitud agrupada
        this.solicitudesAgrupadas.forEach(agrupada => {
          const solicitud = solicitudes.find(s => s.codigoSolicitud === agrupada.codigoSolicitud);
          if (solicitud) {
            agrupada.estadoSolicitud = solicitud.estado;
            agrupada.fechaCreacion = solicitud.fechaCreacion || solicitud.fechaSolicitud;
          }
        });
        
        // Ordenar por fecha de creación descendente
        this.solicitudesAgrupadas.sort((a, b) => {
          const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
          const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
          return fechaB - fechaA;
        });
        
        this.aplicarFiltrosLocales();
        this.calcularEstadisticas();
      }
    });
  }

  /** Aplica filtros locales sobre las solicitudes cargadas */
  private aplicarFiltrosLocales(): void {
    const filtros = this.filtroForm.value;
    
    this.solicitudesFiltradas = this.solicitudesAgrupadas.filter(solicitud => {
      if (filtros.texto) {
        const textoLower = filtros.texto.toLowerCase();
        const coincideTexto = 
          solicitud.codigoSolicitud?.toLowerCase().includes(textoLower) ||
          solicitud.aprobaciones?.some(aprobar => 
            aprobar.aprobadorNombre?.toLowerCase().includes(textoLower) ||
            aprobar.aprobadorIdentificacion?.toLowerCase().includes(textoLower)
          ) ||
          false;
        
        if (!coincideTexto) return false;
      }
      
      // Filtro por estado
      if (filtros.estado) {
        if (filtros.estado === 'pagado') {
          // Filtrar por estadoSolicitud
          if (solicitud.estadoSolicitud !== 'pagado') return false;
        } else {
          // Filtrar por estadoGeneral de las aprobaciones
          if (solicitud.estadoGeneral !== filtros.estado) return false;
        }
      }
      
      return true;
    });
  }



  /** Aplica filtros sobre las solicitudes ya cargadas */
  aplicarFiltros(): void {
    // Si ya tenemos datos cargados, solo aplicar filtros locales
    if (this.solicitudesAgrupadas.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      // Si no hay datos, cargar todo
      this.cargarAprobaciones();
    }
  }

  /** Verifica si aprobación cumple con criterio filtro texto */
  private cumpleFiltroTexto(aprobacion: AprobacionViatico, texto: string): boolean {
    if (!texto) return true;
    
    const textoLower = texto.toLowerCase();
    return aprobacion.codigoSolicitud?.toLowerCase().includes(textoLower) ||
           aprobacion.aprobadorNombre?.toLowerCase().includes(textoLower) ||
           aprobacion.aprobadorIdentificacion?.toLowerCase().includes(textoLower) ||
           false;
  }

  /** Verifica si aprobación cumple con criterio filtro estado */
  private cumpleFiltroEstado(aprobacion: AprobacionViatico, estado: string): boolean {
    return !estado || aprobacion.estado === estado;
  }

  /** Calcula estadísticas totales de aprobaciones rechazadas pendientes agrupadas */
  calcularEstadisticas(): void {
    this.estadisticas.total = this.solicitudesAgrupadas.length;
    this.estadisticas.aprobadas = this.solicitudesAgrupadas.filter(s => s.estadoGeneral === 'aprobado').length;
    this.estadisticas.pendientes = this.solicitudesAgrupadas.filter(s => s.estadoGeneral === 'pendiente').length;
    this.estadisticas.rechazadas = this.solicitudesAgrupadas.filter(s => s.estadoGeneral === 'rechazado').length;
    this.estadisticas.pagadas = this.solicitudesAgrupadas.filter(s => s.estadoGeneral === 'pagado' || s.estadoSolicitud === 'pagado').length;
    
    this.calcularPorcentajes();
  }

  filtrarPorEstado(estado: string): void {
    this.filtroForm.patchValue({ estado: estado });
  }

  /** Calcula porcentajes relativos de cada estado sobre total */
  private calcularPorcentajes(): void {
    if (this.estadisticas.total > 0) {
      this.estadisticas.porcentajeAprobadas = (this.estadisticas.aprobadas / this.estadisticas.total) * 100;
      this.estadisticas.porcentajePendientes = (this.estadisticas.pendientes / this.estadisticas.total) * 100;
      this.estadisticas.porcentajeRechazadas = (this.estadisticas.rechazadas / this.estadisticas.total) * 100;
    } else {
      this.estadisticas.porcentajeAprobadas = 0;
      this.estadisticas.porcentajePendientes = 0;
      this.estadisticas.porcentajeRechazadas = 0;
    }
  }

  /** Reinicia formulario filtros a valores por defecto vacíos */
  limpiarFiltros(): void {
    this.filtroForm.reset({
      texto: '',
      estado: '',
      nivel: '',
    });
    // Aplicar filtros para recargar todo
    this.cargarAprobaciones();
  }

  /** Muestra diálogo detalle completo solicitud con aprobaciones solo lectura */
  verDetalleSolicitud(aprobacion: AprobacionViatico): void {
    if (!aprobacion.codigoSolicitud) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se encontró el código de la solicitud',
      });
      return;
    }

    this.verDetalleSolicitudAgrupada(aprobacion.codigoSolicitud);
  }

  /** Alterna expansión colapso fila solicitud agrupada en tabla */
  toggleExpandir(solicitud: SolicitudAgrupada): void {
    solicitud.expandida = !solicitud.expandida;
  }

  /** Carga aprobaciones solicitud y muestra diálogo detalle solo lectura */
  verDetalleSolicitudAgrupada(codigoSolicitud: string): void {
    this.cargando = true;
    
    
    this.aprobacionService.obtenerPorSolicitud(codigoSolicitud).subscribe({
      next: (aprobaciones) => {
        this.aprobacionesSolicitudSeleccionada = aprobaciones.sort(
          (a, b) => (a.nivelAprobacion || 0) - (b.nivelAprobacion || 0)
        );
        
        this.buscarSolicitudParaDetalle(codigoSolicitud);
        this.cargarArchivosSolicitud(codigoSolicitud);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aprobaciones',
        });
        this.cargando = false;
      }
    });
  }

  /** Busca solicitud completa y resuelve nombres para mostrar detalle */
  buscarSolicitudParaDetalle(codigoSolicitud: string): void {
    this.solicitudService.getAll().subscribe({
      next: async (solicitudes) => {
        const solicitudEncontrada = solicitudes.find(
          s => s.codigoSolicitud === codigoSolicitud
        );
        
        if (solicitudEncontrada) {
          if (solicitudEncontrada.id) {
            try {
              const solicitudActualizada = await lastValueFrom(this.solicitudService.getById(solicitudEncontrada.id));
              if (solicitudActualizada) {
                Object.assign(solicitudEncontrada, solicitudActualizada);
              }
            } catch (error) {
              //
            }
          }
          this.resolverNombresYMostrar(solicitudEncontrada, 'detalle');
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'No encontrada',
            detail: 'No se encontró la solicitud',
          });
          this.cargando = false;
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al buscar la solicitud',
        });
        this.cargando = false;
      }
    });
  }

  /** Carga solicitud aprobaciones conceptos para edición en diálogo modal */
  editarSolicitudDirecta(codigoSolicitud: string): void {
    this.cargando = true;
    
    
    this.aprobacionService.obtenerPorSolicitud(codigoSolicitud).subscribe({
      next: (aprobaciones) => {
        this.aprobacionesSolicitudSeleccionada = aprobaciones.sort(
          (a, b) => (a.nivelAprobacion || 0) - (b.nivelAprobacion || 0)
        );

        this.buscarSolicitudParaEdicion(codigoSolicitud);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aprobaciones',
        });
        this.cargando = false;
      }
    });
  }

  /** Busca solicitud completa y resuelve nombres para mostrar edición */
  buscarSolicitudParaEdicion(codigoSolicitud: string): void {
    this.solicitudService.getAll().subscribe({
      next: async (solicitudes) => {
        const solicitudEncontrada = solicitudes.find(
          s => s.codigoSolicitud === codigoSolicitud
        );
        
        if (solicitudEncontrada) {
          if (solicitudEncontrada.id) {
            try {
              const solicitudActualizada = await lastValueFrom(this.solicitudService.getById(solicitudEncontrada.id));
              if (solicitudActualizada) {
                Object.assign(solicitudEncontrada, solicitudActualizada);
              }
            } catch (error) {
              //
            }
          }
          this.solicitudSeleccionada = solicitudEncontrada;
          this.cargarConceptosDesdeEnJson();
          this.resolverNombresYMostrar(solicitudEncontrada, 'edicion');
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'No encontrada',
            detail: 'No se encontró la solicitud',
          });
          this.cargando = false;
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al buscar la solicitud',
        });
        this.cargando = false;
      }
    });
  }

  /** Cierra diálogo detalle y limpia selecciones de solo lectura */
  cerrarDialogoDetalle(): void {
    this.mostrarDialogoDetalle = false;
    this.solicitudSeleccionada = null;
    this.aprobacionesSolicitudSeleccionada = [];
    this.archivosSolicitud = [];
  }

  /** Carga archivos de la solicitud seleccionada */
  cargarArchivosSolicitud(codigoSolicitud: string): void {
    this.cargandoArchivos = true;
    this.archivosUsuariosService
      .obtenerPorSolicitud(codigoSolicitud)
      .pipe(
        catchError(() => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Información',
            detail: 'No se pudieron cargar los archivos adjuntos',
            life: 3000,
          });
          return of([]);
        })
      )
      .subscribe((archivos: ArchivosUsuarios[]) => {
        this.archivosSolicitud = archivos;
        this.cargandoArchivos = false;
      });
  }

  /** Obtiene el icono según el tipo de archivo */
  obtenerIconoArchivo(archivo: ArchivosUsuarios): string {
    const tipo = archivo.tipoArchivo?.toLowerCase() || '';
    if (tipo.includes('pdf')) return 'file-pdf';
    if (tipo.includes('image') || tipo.includes('jpg') || tipo.includes('png') || tipo.includes('jpeg')) return 'image';
    if (tipo.includes('word') || tipo.includes('doc')) return 'file-word';
    if (tipo.includes('excel') || tipo.includes('sheet')) return 'file-excel';
    return 'file';
  }

  /** Formatea el tamaño del archivo */
  formatearTamanio(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /** Descarga un archivo específico */
  descargarArchivo(archivo: ArchivosUsuarios): void {
    if (!archivo.id) return;
    
    this.archivosUsuariosService.descargarArchivo(archivo.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.nombreArchivo || 'archivo';
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Descarga Exitosa',
          detail: `Archivo ${archivo.nombreArchivo} descargado`,
          life: 3000,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el archivo',
          life: 3000,
        });
      },
    });
  }

  /** Previsualiza un archivo */
  previsualizarArchivo(archivo: ArchivosUsuarios): void {
    if (!archivo.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo no tiene un ID válido',
      });
      return;
    }

    const tipoArchivo = archivo.tipoArchivo?.toLowerCase() || '';
    
    // Solo permitir vista previa de PDFs e imágenes
    if (!this.esPrevisualizable(tipoArchivo)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No disponible',
        detail: 'Vista previa solo disponible para PDF e imágenes',
      });
      return;
    }

    this.archivoPrevisualizado = archivo;
    this.cargandoPrevia = true;
    this.mostrarVistaPrevia = true;

    this.archivosUsuariosService.descargarArchivo(archivo.id).subscribe({
      next: (blob) => {
        // Crear URL temporal para el blob
        if (this.urlVistaPrevia) {
          URL.revokeObjectURL(this.urlVistaPrevia);
        }
        this.urlVistaPrevia = URL.createObjectURL(blob);
        this.cargandoPrevia = false;
      },
      error: () => {
        this.cargandoPrevia = false;
        this.mostrarVistaPrevia = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la vista previa',
        });
      },
    });
  }

  /** Cierra la vista previa */
  cerrarVistaPrevia(): void {
    if (this.urlVistaPrevia) {
      URL.revokeObjectURL(this.urlVistaPrevia);
      this.urlVistaPrevia = '';
    }
    this.mostrarVistaPrevia = false;
    this.archivoPrevisualizado = null;
  }

  /** Verifica si un archivo es previsualizable */
  esPrevisualizable(tipoArchivo: string): boolean {
    const tipo = tipoArchivo.toLowerCase();
    return tipo.includes('pdf') || 
           tipo.includes('image') || 
           tipo.includes('png') || 
           tipo.includes('jpg') || 
           tipo.includes('jpeg') || 
           tipo.includes('gif') || 
           tipo.includes('webp');
  }

  /** Verifica si es una imagen */
  esImagen(tipoArchivo: string): boolean {
    const tipo = tipoArchivo.toLowerCase();
    return tipo.includes('image') || 
           tipo.includes('png') || 
           tipo.includes('jpg') || 
           tipo.includes('jpeg') || 
           tipo.includes('gif') || 
           tipo.includes('webp');
  }

  /** Verifica si es un PDF */
  esPDF(tipoArchivo: string): boolean {
    return tipoArchivo.toLowerCase().includes('pdf');
  }

  /** Cierra diálogo edición y limpia conceptos selecciones modificables */
  cerrarDialogoEdicion(): void {
    this.mostrarDialogoEdicion = false;
    this.solicitudSeleccionada = null;
    this.aprobacionesSolicitudSeleccionada = [];
    this.conceptosLiquidacion = [];
    this.conceptosOriginales = [];
    this.mostrarSeccionConceptos = false;
  }

  /** Muestra diálogo de visualización PDF resolviendo nombres ubicaciones y conceptos liquidación */
  async descargarPDFDirecto(codigoSolicitud: string): Promise<void> {
    this.cargando = true;
    
    try {
      const solicitudes = await lastValueFrom(this.solicitudService.getAll());
      const solicitud = solicitudes.find(s => s.codigoSolicitud === codigoSolicitud);
      
      if (!solicitud) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se encontró la solicitud'
        });
        return;
      }

      if (solicitud.id) {
        try {
          const solicitudActualizada = await lastValueFrom(this.solicitudService.getById(solicitud.id));
          if (solicitudActualizada) {
            Object.assign(solicitud, solicitudActualizada);
          }
        } catch (error) { //
        }
      }

      await this.cargarConceptosParaPDF(solicitud);
      await this.resolverNombresParaPDF(solicitud);
      const aprobaciones = await lastValueFrom(
        this.aprobacionService.obtenerPorSolicitud(codigoSolicitud)
      );
      
      this.solicitudSeleccionada = solicitud;
      this.aprobacionesSolicitudSeleccionada = aprobaciones;
      this.mostrarDialogoVisualizacionPDF = true;
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la solicitud'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Resuelve nombres ubicaciones geográficas sin mostrar diálogo para PDF */
  private async resolverNombresParaPDF(solicitud: SolicitudViaticos): Promise<void> {
    const solicitudExtendida = solicitud as SolicitudViaticosExtendida;
    
    try {
      if (solicitud.centrosCosto && solicitud.centrosCosto.length > 0) {
        const centrosUnicos = solicitud.centrosCosto.filter((centro, index, self) =>
          index === self.findIndex((c) => c.codigoCentroCosto === centro.codigoCentroCosto)
        );
        solicitud.centrosCosto = centrosUnicos;
      }

      if (solicitud.id) {
        try {
          const response = await lastValueFrom(
            this.solicitudService.obtenerConNombresUbicaciones(solicitud.id)
          );
          
          const nombres = response.nombresUbicaciones;
          if (nombres.municipioDestinoNombre) {
            solicitudExtendida.municipioDestinoNombre = nombres.municipioDestinoNombre;
          }
          if (nombres.departamentoDestinoNombre) {
            solicitudExtendida.departamentoDestinoNombre = nombres.departamentoDestinoNombre;
          }
          if (nombres.municipioSalidaNombre) {
            solicitudExtendida.municipioSalidaNombre = nombres.municipioSalidaNombre;
          }
          if (nombres.departamentoSalidaNombre) {
            solicitudExtendida.departamentoSalidaNombre = nombres.departamentoSalidaNombre;
          }
        } catch (error) {
          await this.resolverNombresLocalmente(solicitud, solicitudExtendida);
        }
      }
    } catch (error) {//
    }
  }

  /** Fallback: Resuelve nombres localmente si el backend falla */
  private async resolverNombresLocalmente(
    solicitud: SolicitudViaticos,
    solicitudExtendida: SolicitudViaticosExtendida
  ): Promise<void> {
    const primerDestino = solicitud.destinos && solicitud.destinos.length > 0 ? solicitud.destinos[0] : null;
    
    if (primerDestino?.municipio && this.esIdValido(primerDestino.municipio)) {
      try {
        const municipio = await lastValueFrom(this.ubicacionesService.getById(primerDestino.municipio));
        solicitudExtendida.municipioDestinoNombre = municipio?.nombre || primerDestino.ciudad || primerDestino.municipio;
      } catch {
        solicitudExtendida.municipioDestinoNombre = primerDestino.ciudad || primerDestino.municipio;
      }
    } else if (primerDestino?.municipio) {
      solicitudExtendida.municipioDestinoNombre = primerDestino.ciudad || primerDestino.municipio;
    }
    
    if (primerDestino?.departamento && this.esIdValido(primerDestino.departamento)) {
      try {
        const depto = await lastValueFrom(this.ubicacionesService.getById(primerDestino.departamento));
        solicitudExtendida.departamentoDestinoNombre = depto?.nombre || primerDestino.departamento;
      } catch {
        solicitudExtendida.departamentoDestinoNombre = primerDestino.departamento;
      }
    } else if (primerDestino?.departamento) {
      solicitudExtendida.departamentoDestinoNombre = primerDestino.departamento;
    }
    
    if (solicitud.municipioSalida && this.esIdValido(solicitud.municipioSalida)) {
      try {
        const municipio = await lastValueFrom(this.ubicacionesService.getById(solicitud.municipioSalida));
        solicitudExtendida.municipioSalidaNombre = municipio?.nombre || solicitud.municipioSalida;
      } catch {
        solicitudExtendida.municipioSalidaNombre = solicitud.municipioSalida;
      }
    } else if (solicitud.municipioSalida) {
      solicitudExtendida.municipioSalidaNombre = solicitud.municipioSalida;
    }
    
    if (solicitud.departamentoSalida && this.esIdValido(solicitud.departamentoSalida)) {
      try {
        const depto = await lastValueFrom(this.ubicacionesService.getById(solicitud.departamentoSalida));
        solicitudExtendida.departamentoSalidaNombre = depto?.nombre || solicitud.departamentoSalida;
      } catch {
        solicitudExtendida.departamentoSalidaNombre = solicitud.departamentoSalida;
      }
    } else if (solicitud.departamentoSalida) {
      solicitudExtendida.departamentoSalidaNombre = solicitud.departamentoSalida;
    }
  }

  /** Carga conceptos liquidación desde servicio sin mostrar diálogo para PDF */
  private async cargarConceptosParaPDF(solicitud: SolicitudViaticos): Promise<void> {
    this.conceptosLiquidacion = [];
    
    if (!solicitud?.id) {
      return;
    }
    
    try {
      // Usar el backend para obtener los conceptos actualizados
      const solicitudId = String(solicitud.id);
      const conceptos = await lastValueFrom(
        this.solicitudService.obtenerConceptosLiquidacion(solicitudId)
      );
      
      this.conceptosLiquidacion = conceptos;
      
    } catch (error) {
      // En caso de error, intentar parsear localmente como fallback
      this.cargarConceptosParaPDFLocal(solicitud);
    }
  }

  /** Fallback: Carga conceptos localmente si falla el backend */
  private cargarConceptosParaPDFLocal(solicitud: SolicitudViaticos): void {
    const liquidacion = solicitud.liquidacion || {};
    const tipoViatico = (solicitud.tipoViaticos || 'ocasional').toUpperCase();
    
    this.conceptosLiquidacionService.getConceptosPorTipo(tipoViatico).subscribe({
      next: (conceptosDisponibles) => {
        let liquidacionMap: Record<string, unknown> = {};
        
        if (typeof liquidacion === 'string') {
          try {
            liquidacionMap = JSON.parse(liquidacion);
          } catch {
            liquidacionMap = {};
          }
        } else if (Array.isArray(liquidacion)) {
          const liquidacionArray = liquidacion as ConceptoLiquidacion[];
          liquidacionArray.forEach((item: ConceptoLiquidacion) => {
            if (item.concepto) {
              liquidacionMap[item.concepto] = item;
            }
          });
        } else if (typeof liquidacion === 'object' && liquidacion !== null) {
          liquidacionMap = liquidacion as Record<string, unknown>;
        }

        this.conceptosLiquidacion = conceptosDisponibles
          .map((concepto: any) => {
            const idConcepto = concepto.id.toString();
            const datosRaw = liquidacionMap[idConcepto] || liquidacionMap[concepto.id];
            const datos = datosRaw as {
              numeroDiasNoches?: number;
              valorUnitario?: number;
              subtotal?: number;
              marcado?: boolean;
              modificadoPorAprobador?: boolean;
              nivelAprobacionModificacion?: number;
            } | undefined;

            if (!datos) {
              return null;
            }

            const dias = datos.numeroDiasNoches || 0;
            const valorUnitario = datos.valorUnitario || 0;
            const subtotal = datos.subtotal || (dias * valorUnitario);

            return {
              concepto: idConcepto,
              conceptoNombre: concepto.nombre,
              numeroDiasNoches: dias,
              valorUnitario: valorUnitario,
              subtotal: subtotal,
              marcado: datos.marcado || false,
              valorAprobado: subtotal,
              modificadoPorAprobador: datos.modificadoPorAprobador || false,
              nivelAprobacionModificacion: datos.nivelAprobacionModificacion || 0
            } as ConceptoLiquidacion;
          })
          .filter((c): c is ConceptoLiquidacion => c !== null);
      },
      error: () => { //
      }
    });
  }

  /** Calcula subtotal multiplicando días noches por valor unitario concepto */
  calcularSubtotal(concepto: ConceptoLiquidacion): void {
    concepto.subtotal = concepto.numeroDiasNoches * concepto.valorUnitario;
  }

  /** Calcula suma total valores aprobados de todos los conceptos */
  calcularTotalViaticos(): number {
    if (this.conceptosLiquidacion && this.conceptosLiquidacion.length > 0) {
      const conceptosMarcados = this.conceptosLiquidacion.filter(c => c.marcado);
      if (conceptosMarcados.length > 0) {
        const totalConceptos = conceptosMarcados
          .reduce((total, c) => total + (c.subtotal || c.valorAprobado || c.valorUnitario || 0), 0);
        return totalConceptos;
      }
    }
    
    // Fallback: valor total de la solicitud
    if (this.solicitudSeleccionada?.valorTotalViaticos) {
      return Number(this.solicitudSeleccionada.valorTotalViaticos);
    }
    
    return 0;
  }

  /** Guarda cambios modificados en conceptos liquidación actualizando en backend */
  guardarCambiosConceptos(): void {
    if (!this.solicitudSeleccionada?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede actualizar: solicitud no válida',
      });
      return;
    }
    
    const conceptosModificados = this.conceptosLiquidacion.filter((concepto) => {
      const original = this.conceptosOriginales.find(o => o.concepto === concepto.concepto);
      if (!original) return true; 
      return JSON.stringify(concepto) !== JSON.stringify(original);
    });
    
    if (conceptosModificados.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin Cambios',
        detail: 'No se detectaron modificaciones en los conceptos',
      });
      return;
    }
    
    this.cargando = true;
    
    const liquidacionArray = this.conceptosLiquidacion.map(concepto => ({
      concepto: concepto.concepto,
      conceptoNombre: concepto.conceptoNombre,
      marcado: concepto.marcado !== undefined ? concepto.marcado : true,
      numeroDiasNoches: concepto.numeroDiasNoches || 0,
      valorUnitario: concepto.valorUnitario || 0,
      subtotal: concepto.subtotal || 0,
      valorAprobado: concepto.subtotal || 0, 
      observaciones: concepto.observaciones,
      modificadoPorAprobador: concepto.modificadoPorAprobador || false,
      nivelAprobacionModificacion: concepto.nivelAprobacionModificacion || 0,
      fechaModificacion: concepto.fechaModificacion || new Date().toISOString()
    }));
    
    const solicitudId = String(this.solicitudSeleccionada.id);
    const valorTotal = this.calcularTotalViaticos();
 
    this.solicitudService
      .actualizarLiquidacion(solicitudId, liquidacionArray, valorTotal)
      .subscribe({
        next: (solicitudActualizada) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Conceptos actualizados correctamente',
          });
          
          if (this.solicitudSeleccionada?.id) {
            this.solicitudService.getById(this.solicitudSeleccionada.id).subscribe({
              next: (solicitudFresca: SolicitudViaticos | null) => {
                if (solicitudFresca) {
                  this.solicitudSeleccionada = solicitudFresca;
                  this.cargarConceptosDesdeEnJson();
                  this.cargando = false;
                } else {
                  this.solicitudSeleccionada = solicitudActualizada;
                  this.cargarConceptosDesdeEnJson();
                  this.cargando = false;
                }
              },
              error: (errorRecarga: any) => {
                this.solicitudSeleccionada = solicitudActualizada;
                this.cargarConceptosDesdeEnJson();
                this.cargando = false;
              }
            });
          } else {
            this.solicitudSeleccionada = solicitudActualizada;
            this.cargarConceptosDesdeEnJson();
            this.cargando = false;
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al actualizar',
            detail: error?.error?.message || error?.message || 'No se pudieron actualizar los conceptos',
          });
          this.cargando = false;
        }
      });
  }

  /** Construye nombre completo concatenando nombres apellidos del solicitante viático */
  obtenerNombreCompleto(solicitud: SolicitudViaticos): string {
    const partes = [
      solicitud.primerNombre,
      solicitud.segundoNombre,
      solicitud.primerApellido,
      solicitud.segundoApellido,
    ].filter(Boolean);
    
    return partes.join(' ');
  }

  /** Convierte código estado interno a texto legible español */
  obtenerTextoEstado(estado: string): string {
    const estados: Record<string, string> = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      pagado: 'Pagado',
      bloqueado: 'Bloqueado',
      parcial: 'En Proceso',
      anulado: 'Anulado',
    };
    return estados[estado] || estado;
  }

  /** Obtiene severidad PrimeNG según estado para componente Tag */
  obtenerSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severidades: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      borrador: 'secondary',
      pendiente: 'warn',
      aprobado: 'success',
      rechazado: 'danger',
      pagado: 'success',
      bloqueado: 'secondary',
      parcial: 'info',
      anulado: 'danger',
    };
    return severidades[estado] || 'secondary';
  }

  /** Retorna texto descriptivo formateado para nivel aprobación numérico */
  getNombreNivel(nivel: number): string {
    return `Nivel ${nivel}`;
  }

  /** Obtiene nombre de ubicación por ID desde el mapa cargado */
  obtenerNombreUbicacion(id: string | undefined): string {
    if (!id) return 'No especificado';
    return this.ubicacionesMap.get(id) || id;
  }

  /** Obtiene destino completo del viaje (municipio, departamento) */
  obtenerDestinoCompleto(solicitud: SolicitudViaticos): string {
    const primerDestino = solicitud.destinos && solicitud.destinos.length > 0 ? solicitud.destinos[0] : null;
    const municipio = primerDestino ? this.obtenerNombreUbicacion(primerDestino.municipio) : '';
    const departamento = primerDestino ? this.obtenerNombreUbicacion(primerDestino.departamento) : '';
    return `${municipio}, ${departamento}`;
  }

  /** Obtiene origen completo del viaje (municipio, departamento) */
  obtenerOrigenCompleto(solicitud: SolicitudViaticos): string {
    const municipio = this.obtenerNombreUbicacion(solicitud.municipioSalida);
    const departamento = this.obtenerNombreUbicacion(solicitud.departamentoSalida);
    return `${municipio}, ${departamento}`;
  }

  /** Extrae solo el concepto del viaje sin información de liquidación */
  obtenerSoloConcepto(conceptoCompleto: string | undefined): string {
    if (!conceptoCompleto) {
      return 'No especificado';
    }
    
    if (conceptoCompleto.includes(' | Liquidación:')) {
      return conceptoCompleto.split(' | Liquidación:')[0].trim();
    }

    if (conceptoCompleto.includes(' | ')) {
      return conceptoCompleto.split(' | ')[0].trim();
    }
    
    return conceptoCompleto;
  }

  /** Valida si un valor parece ser un ID válido (numérico o con formato de código) */
  private esIdValido(id: string | undefined): boolean {
    if (!id || id.trim() === '') return false;
    
    if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(id)) {
      return false;
    }
        return true;
  }

  /** Resuelve IDs ubicaciones conceptos a nombres legibles y muestra diálogo */
  private resolverNombresYMostrar(solicitud: SolicitudViaticos, tipoDialogo: 'detalle' | 'edicion' | 'pdf'): void {
    const solicitudExtendida = solicitud as SolicitudViaticosExtendida;
    if (solicitud.id) {
      this.solicitudService.obtenerConNombresUbicaciones(solicitud.id).subscribe({
        next: (response) => {
          const nombres = response.nombresUbicaciones;
          if (nombres.municipioDestinoNombre) {
            solicitudExtendida.municipioDestinoNombre = nombres.municipioDestinoNombre;
          }
          if (nombres.departamentoDestinoNombre) {
            solicitudExtendida.departamentoDestinoNombre = nombres.departamentoDestinoNombre;
          }
          if (nombres.municipioSalidaNombre) {
            solicitudExtendida.municipioSalidaNombre = nombres.municipioSalidaNombre;
          }
          if (nombres.departamentoSalidaNombre) {
            solicitudExtendida.departamentoSalidaNombre = nombres.departamentoSalidaNombre;
          }
          this.solicitudSeleccionada = solicitud;
          if (tipoDialogo === 'detalle') {
            this.mostrarDialogoDetalle = true;
          } else if (tipoDialogo === 'edicion') {
            this.mostrarDialogoEdicion = true;
            this.mostrarSeccionConceptos = true;
          }
          this.cargando = false;
        },
        error: () => {
          this.solicitudSeleccionada = solicitud;
          if (tipoDialogo === 'detalle') {
            this.mostrarDialogoDetalle = true;
          } else if (tipoDialogo === 'edicion') {
            this.mostrarDialogoEdicion = true;
            this.mostrarSeccionConceptos = true;
          }
          this.cargando = false;
        }
      });
    } else {
      this.solicitudSeleccionada = solicitud;
      if (tipoDialogo === 'detalle') {
        this.mostrarDialogoDetalle = true;
      } else if (tipoDialogo === 'edicion') {
        this.mostrarDialogoEdicion = true;
        this.mostrarSeccionConceptos = true;
      }
      this.cargando = false;
    }
  }


  /** Genera documento PDF completo con información solicitud aprobaciones y liquidación */
  async descargarPDFSolicitud(solicitud: SolicitudViaticos): Promise<void> {
    if (!solicitud.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Solicitud sin ID válido'
      });
      return;
    }

    try {
      this.cargando = true;
      const pdfBlob = await lastValueFrom(
        this.solicitudService.descargarPDF(solicitud.id)
      );
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Solicitud_Viaticos_${solicitud.codigoSolicitud}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'PDF descargado correctamente'
      });
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el PDF'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Formatea fecha ISO a formato local DD MM YYYY */
  private formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  }

  /** Convierte Date o string a string ISO */
  private convertirAString(fecha: string | Date): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha;
    return fecha.toISOString().split('T')[0];
  }

  /** Formatea número a moneda colombiana COP con símbolo */
  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  /** Obtiene los códigos de los centros de costo separados por coma */
  obtenerCodigosCentrosCosto(): string {
    if (!this.solicitudSeleccionada?.centrosCosto || this.solicitudSeleccionada.centrosCosto.length === 0) {
      return 'N/A';
    }
    return this.solicitudSeleccionada.centrosCosto.map(cc => cc.codigoCentroCosto).join(', ');
  }

  /** Obtiene los nombres de los centros de costo separados por pipe */
  obtenerNombresCentrosCosto(): string {
    if (!this.solicitudSeleccionada?.centrosCosto || this.solicitudSeleccionada.centrosCosto.length === 0) {
      return 'No disponible';
    }
    return this.solicitudSeleccionada.centrosCosto.map(cc => cc.nombreCentroCosto).join(' | ');
  }

  /** Formatea número a moneda colombiana COP sin símbolo monetario */
  private formatearMonedaSinSimbolo(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  /** Convierte un Blob a Base64 para insertar imágenes en PDF */
  private convertirBlobABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Error al convertir blob a base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /** Mapea el nivel de aprobación y cargo del aprobador a los nombres estándar del PDF */
  private mapearCargoSegunNivel(nivel: number, cargoAprobador?: string): string {
    if (cargoAprobador && cargoAprobador.trim() !== '') {
      return cargoAprobador.toUpperCase();
    }
    
    const mapeoNivelesFallback: Record<number, string> = {
      1: 'DIRECTOR PROGRAMA', 
      2: 'DECANO O DIRECTOR', 
      3: 'RECTOR', 
      4: 'VICERRECTOR ADM', 
      5: 'RECTOR' 
    };

    return mapeoNivelesFallback[nivel] || `NIVEL ${nivel}`;
  }

  /** Determina la estructura de columnas basada en las aprobaciones reales */
  private determinarEstructuraAprobaciones(aprobaciones: AprobacionViatico[]): { headers: string[] } {
    const headers: string[] = [];
    
    if (!aprobaciones || aprobaciones.length === 0) {
      return { 
        headers: ['DECANO O DIRECTOR', 'RECTOR', 'VICERRECTOR ADM', 'DIRECTOR TALENTO HUMANO'] 
      };
    }

    aprobaciones.forEach(aprobacion => {
      const header = this.mapearCargoSegunNivel(aprobacion.nivelAprobacion, aprobacion.aprobadorCargo);
      headers.push(header);
    });

    const tieneDirectorPrograma = headers.some(h => h.includes('DIRECTOR PROGRAMA'));
    
    if (!tieneDirectorPrograma && aprobaciones.length < 4) {
      const estructuraAdministrativa = [
        'DECANO O DIRECTOR',
        'RECTOR', 
        'VICERRECTOR ADM',
        'DIRECTOR TALENTO HUMANO'
      ];
      
      return { headers: estructuraAdministrativa.slice(0, Math.max(4, aprobaciones.length)) };
    }

    return { headers };
  }

  /** Cierra diálogo de visualización PDF y limpia selecciones */
  cerrarDialogoVisualizacionPDF(): void {
    this.mostrarDialogoVisualizacionPDF = false;
    this.solicitudSeleccionada = null;
    this.aprobacionesSolicitudSeleccionada = [];
    this.conceptosLiquidacion = [];
  }

  /** Descarga el PDF desde el diálogo de visualización */
  async descargarPDFDesdeDialogo(): Promise<void> {
    if (this.solicitudSeleccionada) {
      await this.descargarPDFSolicitud(this.solicitudSeleccionada);
    }
  }

  /** Envía el PDF por correo (funcionalidad pendiente de implementación) */
  enviarPDFPorCorreo(): void {
    if (this.solicitudSeleccionada) {
      if (this.conceptosLiquidacion.length === 0 && this.solicitudSeleccionada.liquidacion) {
        this.cargarConceptosDesdeEnJson();
      }
      this.mostrarDialogoEnviarCorreo = true;
      this.emailDestino = '';
    }
  }

  private cargarConceptosDesdeEnJson(): void {
    if (!this.solicitudSeleccionada?.liquidacion || !this.solicitudSeleccionada?.id) {
      this.conceptosLiquidacion = [];
      return;
    }

    const solicitudId = String(this.solicitudSeleccionada.id);
    this.conceptosLiquidacion = [];
    this.conceptosOriginales = [];

    this.solicitudService.obtenerConceptosLiquidacion(solicitudId).subscribe({
      next: (conceptos) => {
        setTimeout(() => {
          this.conceptosLiquidacion = [...conceptos]; 
          this.conceptosOriginales = JSON.parse(JSON.stringify(conceptos));
        }, 50);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los conceptos de liquidación',
        });
        this.conceptosLiquidacion = [];
      }
    });
  }

  cerrarDialogoEnviarCorreo(): void {
    this.mostrarDialogoEnviarCorreo = false;
    this.emailDestino = '';
    this.enviandoCorreo = false;
  }

  async confirmarEnvioCorreo(): Promise<void> {
    if (!this.solicitudSeleccionada || !this.emailDestino) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor ingrese un correo electrónico válido'
      });
      return;
    }

    this.enviandoCorreo = true;

    try {
      // Obtener identificación del usuario
      const userData = this.authService.getUserInfo();
      const identificacionUsuario = userData?.preferred_username || userData?.identificacion || userData?.sub;
      const resultado = await lastValueFrom(
        this.solicitudService.enviarCorreoAprobacion(
          this.solicitudSeleccionada.id || '',
          this.emailDestino,
          identificacionUsuario
        ).pipe(
          catchError((error: { error?: { error?: string } }) => {
            return of({
              success: false,
              error: error.error?.error || 'Error al enviar el correo electrónico',
              mensaje: undefined,
              cantidadArchivos: undefined
            });
          })
        )
      );

      if (resultado.success) {
        const cantidadArchivos = resultado.cantidadArchivos || 1;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: resultado.mensaje || `Correo con ${cantidadArchivos} archivo(s) adjunto(s) enviado exitosamente a ${this.emailDestino}`
        });
        this.cerrarDialogoEnviarCorreo();
        this.cerrarDialogoVisualizacionPDF();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: resultado.error || 'Error al enviar el correo electrónico'
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error inesperado al enviar el correo electrónico'
      });
    } finally {
      this.enviandoCorreo = false;
    }
  }



  /** Muestra diálogo para distribuir porcentajes entre centros de costo antes de generar CSV */
  async prepararDistribucionCSVSolicitud(codigoSolicitud: string): Promise<void> {
    if (!codigoSolicitud) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Código de solicitud no válido'
      });
      return;
    }

    this.cargando = true;
    
    try {
      const solicitudes = await lastValueFrom(
        this.solicitudService.getAll()
      );
      
      const solicitud = solicitudes.find(
        (s: SolicitudViaticos) => s.codigoSolicitud === codigoSolicitud
      );
      
      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      this.solicitudParaCSV = solicitud;
      this.exportarTodas = false;
      this.mostrarDialogoDistribucion(solicitud);
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la solicitud'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Genera y descarga archivo CSV para una solicitud individual */
  async descargarCSVSolicitud(codigoSolicitud: string): Promise<void> {
    this.cargando = true;
    
    try {
      if (!codigoSolicitud) {
        throw new Error('Código de solicitud no válido');
      }

      this.messageService.add({
        severity: 'info',
        summary: 'Generando CSV',
        detail: 'Procesando solicitud...'
      });
      const blob = await lastValueFrom(
        this.exportacionCsvService.generarCSV([codigoSolicitud])
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solicitud_${codigoSolicitud}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivo CSV descargado exitosamente'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el archivo CSV'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Genera y descarga archivo CSV con todas las solicitudes */
  async descargarCSVTodasSolicitudes(): Promise<void> {
    this.cargando = true;
    
    try {
      const codigosSolicitudes = this.solicitudesFiltradas
        .map(s => s.codigoSolicitud)
        .filter((codigo): codigo is string => codigo !== undefined && codigo !== null);
      
      if (codigosSolicitudes.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No hay solicitudes para exportar'
        });
        return;
      }

      this.messageService.add({
        severity: 'info',
        summary: 'Generando CSV',
        detail: `Procesando ${codigosSolicitudes.length} solicitudes...`
      });

      const blob = await lastValueFrom(
        this.exportacionCsvService.generarCSV(codigosSolicitudes)
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toISOString().split('T')[0];
      link.download = `solicitudes_viaticos_${fecha}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `${codigosSolicitudes.length} solicitudes exportadas exitosamente`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el archivo CSV'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Muestra diálogo de distribución de porcentajes */
  private async mostrarDialogoDistribucion(solicitud: SolicitudViaticos): Promise<void> {
    this.distribucionesCentrosCosto = [];
    
    if (!solicitud.centrosCosto || solicitud.centrosCosto.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'La solicitud no tiene centros de costo asociados'
      });
      return;
    }

    try {
      if (solicitud.codigoSolicitud) {
        const distribucionExistente = await lastValueFrom(
          this.distribucionViaticosService.obtenerPorSolicitud(solicitud.codigoSolicitud)
        );

        if (distribucionExistente && distribucionExistente.length > 0) {
          this.distribucionesCentrosCosto = distribucionExistente.map(d => ({
            codigoCentroCosto: d.codigoCentroCosto,
            nombreCentroCosto: d.nombreCentroCosto,
            fuenteFuncion: d.fuenteFuncion,
            porcentaje: d.porcentaje,
            valorCalculado: d.valorCalculado
          }));
          
          this.mostrarDialogoDistribucionPorcentajes = true;
          return;
        }
      }
    } catch { //
 }

    const valorTotal = Number(solicitud.valorTotalViaticos) || 0;
    const centrosCostoLength = solicitud.centrosCosto?.length || 0;
    const porcentajeInicial = centrosCostoLength > 0 
      ? Math.floor(100 / centrosCostoLength) 
      : 100;

    solicitud.centrosCosto.forEach((cc, index) => {
      const porcentaje = index === 0 
        ? 100 - (porcentajeInicial * (centrosCostoLength - 1))
        : porcentajeInicial;
      
      const centroCostoEncontrado = this.centrosCostoOptions.find(
        (opt: { label: string; value: string }) => opt.value === cc.codigoCentroCosto
      );
      const nombreIndividual = centroCostoEncontrado 
        ? centroCostoEncontrado.label.split(' - ').slice(1).join(' - ')
        : cc.nombreCentroCosto || '';
      
      this.distribucionesCentrosCosto.push({
        codigoCentroCosto: cc.codigoCentroCosto || '',
        nombreCentroCosto: nombreIndividual,
        fuenteFuncion: cc.fuenteFuncion || '',
        porcentaje: porcentaje,
        valorCalculado: (valorTotal * porcentaje) / 100
      });
    });

    this.mostrarDialogoDistribucionPorcentajes = true;
  }

  /** Calcula el valor cuando cambia el porcentaje */
  calcularValorPorcentaje(distribucion: DistribucionCentroCosto): void {
    const valorTotal = Number(this.solicitudParaCSV?.valorTotalViaticos) || 0;
    distribucion.valorCalculado = (valorTotal * distribucion.porcentaje) / 100;
  }

  /** Obtiene el total de porcentajes asignados */
  obtenerTotalPorcentajes(): number {
    return this.distribucionesCentrosCosto.reduce((sum, d) => sum + d.porcentaje, 0);
  }

  /** Valida que los porcentajes sumen 100% usando el backend */
  validarPorcentajes(): boolean {
    const total = this.obtenerTotalPorcentajes();
    return Math.abs(total - 100) < 0.01;
  }

  /** Cierra el diálogo de distribución */
  cerrarDialogoDistribucion(): void {
    this.mostrarDialogoDistribucionPorcentajes = false;
    this.distribucionesCentrosCosto = [];
    this.solicitudParaCSV = null;
    this.exportarTodas = false;
  }

  /** Confirma la distribución, guarda en BD y genera el CSV */
  async confirmarDistribucionYGenerarCSV(): Promise<void> {
    if (!this.validarPorcentajes()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Los porcentajes deben sumar 100%. Actualmente suman ${this.obtenerTotalPorcentajes().toFixed(2)}%`
      });
      return;
    }

    if (!this.solicitudParaCSV?.codigoSolicitud) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontró el código de solicitud'
      });
      return;
    }

    this.cargando = true;
    
    try {
      // Preparar distribución para guardar
      const distribucionParaGuardar: DistribucionViaticos[] = this.distribucionesCentrosCosto.map(d => ({
        codigoSolicitud: this.solicitudParaCSV?.codigoSolicitud ?? '',
        codigoCentroCosto: d.codigoCentroCosto,
        nombreCentroCosto: d.nombreCentroCosto,
        fuenteFuncion: d.fuenteFuncion,
        porcentaje: d.porcentaje,
        valorCalculado: d.valorCalculado
      }));

      // Guardar distribución en BD
      await lastValueFrom(
        this.distribucionViaticosService.guardarDistribucion(distribucionParaGuardar)
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Distribución guardada correctamente'
      });

      // Determinar códigos de solicitudes a exportar
      const codigosSolicitudes: string[] = this.exportarTodas
        ? this.solicitudesFiltradas
            .map(s => s.codigoSolicitud)
            .filter((c): c is string => c !== undefined && c !== null)
        : [this.solicitudParaCSV.codigoSolicitud];

      if (codigosSolicitudes.length === 0) {
        throw new Error('No hay solicitudes para exportar');
      }

      // Generar CSV usando backend
      const blob = await lastValueFrom(
        this.exportacionCsvService.generarCSV(codigosSolicitudes)
      );

      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toISOString().split('T')[0];
      link.download = this.exportarTodas 
        ? `solicitudes_viaticos_${fecha}.csv`
        : `solicitud_${codigosSolicitudes[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivo CSV descargado exitosamente'
      });
      
      this.cerrarDialogoDistribucion();
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'Error al guardar la distribución o generar el archivo CSV'
      });
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Abre diálogo para seleccionar solicitudes a exportar
   */
  async generarArchivoPlanoGeneral(): Promise<void> {
    if (this.solicitudesFiltradas.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Datos',
        detail: 'No hay solicitudes para exportar. Ajusta los filtros.'
      });
      return;
    }

    this.solicitudesParaSeleccionar = [...this.solicitudesFiltradas];
    this.solicitudesSeleccionadas = [...this.solicitudesFiltradas]; 
    this.mostrarDialogoSeleccionSolicitudes = true;
  }

  /**
   * Selecciona todas las solicitudes
   */
  seleccionarTodas(): void {
    this.solicitudesSeleccionadas = [...this.solicitudesParaSeleccionar];
  }

  /**
   * Deselecciona todas las solicitudes
   */
  deseleccionarTodas(): void {
    this.solicitudesSeleccionadas = [];
  }

  /**
   * Cierra el diálogo de selección
   */
  cerrarDialogoSeleccion(): void {
    this.mostrarDialogoSeleccionSolicitudes = false;
    this.solicitudesParaSeleccionar = [];
    this.solicitudesSeleccionadas = [];
  }

  /**
   * Genera archivo plano con las solicitudes seleccionadas usando el backend
   */
  async confirmarYGenerarArchivoPlano(): Promise<void> {
    if (this.solicitudesSeleccionadas.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Selección',
        detail: 'Selecciona al menos una solicitud para exportar.'
      });
      return;
    }

    this.cargando = true;
    this.mostrarDialogoSeleccionSolicitudes = false;
    
    try {
      const codigosSolicitudes = this.solicitudesSeleccionadas
        .map(s => s.codigoSolicitud)
        .filter((c): c is string => c !== undefined && c !== null);
      
      this.messageService.add({
        severity: 'info',
        summary: 'Generando Archivo',
        detail: `Procesando ${codigosSolicitudes.length} solicitudes...`
      });
      
      this.exportacionCsvService.generarCSV(codigosSolicitudes).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          const fecha = new Date().toISOString().split('T')[0];
          link.download = `solicitudes_viaticos_${fecha}.csv`;
          link.click();
          
          window.URL.revokeObjectURL(url);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `${codigosSolicitudes.length} solicitudes exportadas exitosamente`
          });
          
          this.cargando = false;
          this.cerrarDialogoSeleccion();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el archivo CSV'
          });
          this.cargando = false;
        }
      });
      
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el archivo CSV'
      });
      this.cargando = false;
    }
  }

  /** Muestra diálogo para distribuir porcentajes antes de exportar todas las solicitudes */
  async prepararDistribucionCSVTodas(): Promise<void> {
    if (this.solicitudesFiltradas.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay solicitudes para exportar'
      });
      return;
    }

    this.cargando = true;
    
    try {
      const primerCodigoSolicitud = this.solicitudesFiltradas[0]?.codigoSolicitud;
      
      if (!primerCodigoSolicitud) {
        throw new Error('Solicitud no válida');
      }

      const solicitudes = await lastValueFrom(
        this.solicitudService.getAll()
      );
      
      const solicitudCompleta = solicitudes.find(
        (s: SolicitudViaticos) => s.codigoSolicitud === primerCodigoSolicitud
      );
      
      if (!solicitudCompleta) {
        throw new Error('No se pudo cargar la solicitud completa');
      }

      this.solicitudParaCSV = solicitudCompleta;
      this.exportarTodas = true;
      this.mostrarDialogoDistribucion(solicitudCompleta);
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al preparar la distribución'
      });
    } finally {
      this.cargando = false;
    }
  }

  /** Marca viático como pagado (solo para solicitudes aprobadas) */
  marcarComoPagado(codigoSolicitud: string): void {
    this.cargando = true;
    
    // Primero obtener la solicitud completa
    this.solicitudService.getAll().subscribe({
      next: (solicitudes) => {
        const solicitud = solicitudes.find(s => s.codigoSolicitud === codigoSolicitud);
        
        if (!solicitud || !solicitud.id) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'La solicitud no tiene un ID válido',
          });
          this.cargando = false;
          return;
        }

        // Mostrar confirmación directamente (el botón solo aparece si está aprobado)
        this.confirmationService.confirm({
          message: `¿Está seguro que desea marcar como pagado el viático de ${this.obtenerNombreCompleto(solicitud)}?`,
          header: 'Confirmar Pago',
          icon: 'pi pi-money-bill',
          acceptLabel: 'Sí, marcar como pagado',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.procesarPago(solicitud);
          },
          reject: () => {
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la solicitud',
        });
        this.cargando = false;
      }
    });
  }

  /** Procesa el pago de la solicitud — el backend envía email al solicitante vía SMTP service */
  private procesarPago(solicitud: SolicitudViaticos): void {
    if (!solicitud.id) return;

    this.solicitudService.marcarComoPagado(solicitud.id).subscribe({
      next: (solicitudActualizada) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Viático marcado como pagado. Se enviará notificación al solicitante.',
        });
        this.actualizarEstadoEnTabla(solicitudActualizada);
        this.realtimeService.triggerRefresh();
        this.cargando = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo marcar el viático como pagado',
        });
        this.cargando = false;
      },
    });
  }

  /** Actualiza el estado de una solicitud en la tabla localmente */
  private actualizarEstadoEnTabla(solicitudActualizada: SolicitudViaticos): void {
    // Actualizar en solicitudesAgrupadas
    const solicitudAgrupada = this.solicitudesAgrupadas.find(
      s => s.codigoSolicitud === solicitudActualizada.codigoSolicitud
    );
    
    if (solicitudAgrupada) {
      solicitudAgrupada.estadoSolicitud = 'pagado';
      solicitudAgrupada.estadoGeneral = 'pagado';
    }

    // Actualizar en solicitudesFiltradas
    const solicitudFiltrada = this.solicitudesFiltradas.find(
      s => s.codigoSolicitud === solicitudActualizada.codigoSolicitud
    );
    
    if (solicitudFiltrada) {
      solicitudFiltrada.estadoSolicitud = 'pagado';
      solicitudFiltrada.estadoGeneral = 'pagado';
    }

    // Forzar detección de cambios en Angular
    this.solicitudesFiltradas = [...this.solicitudesFiltradas];
    this.solicitudesAgrupadas = [...this.solicitudesAgrupadas];
  }

  /** Anula un viático aprobado (antes de que sea pagado) */
  anularSolicitud(codigoSolicitud: string): void {
    this.cargando = true;
    
    // Primero obtener la solicitud completa
    this.solicitudService.getAll().subscribe({
      next: (solicitudes) => {
        const solicitud = solicitudes.find(s => s.codigoSolicitud === codigoSolicitud);
        
        if (!solicitud || !solicitud.id) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'La solicitud no tiene un ID válido',
          });
          this.cargando = false;
          return;
        }

        // Advertir si está pagada (el backend lo bloqueará)
        if (solicitud.estado === 'pagado') {
          this.messageService.add({
            severity: 'warn',
            summary: 'No Permitido',
            detail: 'No se puede anular un viático que ya fue pagado. Debe realizar una reversión contable.',
            life: 5000
          });
          this.cargando = false;
          return;
        }

        // Advertir si ya está anulada
        if (solicitud.estado === 'anulado') {
          this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'Esta solicitud ya está anulada',
          });
          this.cargando = false;
          return;
        }

        // Mostrar confirmación con campo de observaciones
        this.confirmationService.confirm({
          message: `¿Está seguro que desea anular el viático de ${this.obtenerNombreCompleto(solicitud)}? Esta acción no se puede deshacer.`,
          header: 'Confirmar Anulación',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, anular',
          rejectLabel: 'Cancelar',
          acceptButtonStyleClass: 'p-button-danger',
          accept: () => {
            this.procesarAnulacion(codigoSolicitud, solicitud);
          },
          reject: () => {
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la solicitud',
        });
        this.cargando = false;
      }
    });
  }

  /** Procesa la anulación de la solicitud */
  private procesarAnulacion(codigoSolicitud: string, solicitud: SolicitudViaticos): void {
    const usuarioActual = this.authService.getCurrentUser()?.identificacion || 'Sistema';
    const observaciones = 'Solicitud anulada manualmente';

    console.log('Intentando anular solicitud:', {
      codigoSolicitud,
      observaciones,
      usuarioActual,
      estadoActual: solicitud.estado
    });

    this.solicitudService.anularSolicitud(codigoSolicitud, observaciones, usuarioActual).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Viático anulado exitosamente',
        });
        this.actualizarEstadoEnTablaAnulado(codigoSolicitud);
        this.realtimeService.triggerRefresh();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al anular solicitud:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        
        let mensajeError = 'No se pudo anular el viático';
        
        if (error.error?.message) {
          mensajeError = error.error.message;
        } else if (error.error?.error) {
          mensajeError = error.error.error;
        } else if (error.message) {
          mensajeError = error.message;
        }
        
        if (error.status === 400) {
          mensajeError = `${mensajeError}. Verifica que la solicitud exista y esté en un estado válido.`;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error al Anular',
          detail: mensajeError,
          life: 5000
        });
        this.cargando = false;
      },
    });
  }

  /** Actualiza el estado de una solicitud a anulado en la tabla localmente */
  private actualizarEstadoEnTablaAnulado(codigoSolicitud: string): void {
    // Actualizar en solicitudesAgrupadas
    const solicitudAgrupada = this.solicitudesAgrupadas.find(
      s => s.codigoSolicitud === codigoSolicitud
    );
    
    if (solicitudAgrupada) {
      solicitudAgrupada.estadoSolicitud = 'anulado' as any;
      solicitudAgrupada.estadoGeneral = 'rechazado'; // Mostrar con color de rechazado
    }

    // Actualizar en solicitudesFiltradas
    const solicitudFiltrada = this.solicitudesFiltradas.find(
      s => s.codigoSolicitud === codigoSolicitud
    );
    
    if (solicitudFiltrada) {
      solicitudFiltrada.estadoSolicitud = 'anulado' as any;
      solicitudFiltrada.estadoGeneral = 'rechazado';
    }

    // Forzar detección de cambios en Angular
    this.solicitudesFiltradas = [...this.solicitudesFiltradas];
    this.solicitudesAgrupadas = [...this.solicitudesAgrupadas];
  }

  /** Determina si el botón "Notificar verificación" debe mostrarse en el diálogo de detalle */
  puedeMostrarBotonVerificacion(): boolean {
    if (!this.authService.hasRole('VIATICOS_TALENTO_HUMANO') && !this.authService.hasRole('ADMIN')) {
      return false;
    }
    if (!this.aprobacionesSolicitudSeleccionada?.length) {
      return false;
    }
    const aprobaciones = this.aprobacionesSolicitudSeleccionada;
    const maxNivel = Math.max(...aprobaciones.map(a => a.nivelAprobacion || 0));
    const ultimoNivel = aprobaciones.find(a => a.nivelAprobacion === maxNivel);
    const penultimoNivel = aprobaciones.find(a => a.nivelAprobacion === maxNivel - 1);
    return !!(ultimoNivel?.estado === 'pendiente' && penultimoNivel?.estado === 'aprobado');
  }

  /** Notifica al último aprobador que Talento Humano ha verificado la solicitud */
  notificarVerificacion(codigoSolicitud: string | undefined): void {
    if (!codigoSolicitud) return;

    this.confirmationService.confirm({
      message: '¿Está seguro que desea notificar la verificación al último aprobador?',
      header: 'Confirmar Notificación',
      icon: 'pi pi-bell',
      acceptLabel: 'Sí, notificar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.enviandoVerificacion = true;
        this.aprobacionService.notificarVerificacion(codigoSolicitud).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Se ha notificado al último aprobador sobre la verificación.',
            });
            this.enviandoVerificacion = false;
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo enviar la notificación de verificación.',
            });
            this.enviandoVerificacion = false;
          },
        });
      },
    });
  }
}