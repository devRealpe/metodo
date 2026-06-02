import { Component, OnInit, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { Textarea } from 'primeng/textarea';
import { SolicitudViaticosService, SolicitudViaticos, EstadisticasViaticos } from '../../core/services/Solicitud-viaticos.service';
import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { AprobacionViaticoService } from '../../core/services/aprobacion-viatico.service';
import { AprobacionViatico } from '../../core/models/aprobacion-viatico.model';
import { ConceptoLiquidacion } from '../../core/models/aprobacion-viatico.model';
import { ConceptosLiquidacionCatalogoService } from '../../core/services/conceptos-liquidacion-catalogo.service';
import { ArchivosUsuariosService } from '../../core/services/archivousuarios.service';
import { ArchivosUsuarios } from '../../core/models/archivousuarios.model';
import { SafeResourceUrlPipe } from '../../shared/pipes/safe-resource-url.pipe';
import { AuthService } from '@microfrontends/shared-services';
import { lastValueFrom, map } from 'rxjs';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ListaValor } from '../../core/models/lista-valor.model';
import { ViaticosRealtimeService } from '../../core/services/viaticos-realtime.service';

@Component({
  selector: 'app-lista-viaticos.component',
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
    DatePickerModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    TooltipModule,
    Textarea,
    SafeResourceUrlPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lista-viaticos.component.html',
  styleUrl: './lista-viaticos.component.scss',
})
export class ListaViaticosComponent implements OnInit {
  private solicitudService = inject(SolicitudViaticosService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private aprobacionService = inject(AprobacionViaticoService);
  private authService = inject(AuthService);
  private archivosService = inject(ArchivosUsuariosService);
  private conceptosLiquidacionService = inject(ConceptosLiquidacionCatalogoService);
  private listasValoresService = inject(ListasValoresService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private realtimeService = inject(ViaticosRealtimeService);

  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  solicitudes: SolicitudViaticos[] = [];
  filtradas: SolicitudViaticos[] = [];
  solicitudSeleccionada: SolicitudViaticos | null = null;
  cargando = false;
  procesando = false;
  private isRealtimeRefresh = false;
  mostrarDialogoDetalle = false;
  
  estadisticas: EstadisticasViaticos = {
    total: 0,
    aprobadas: 0,
    pendientes: 0,
    rechazadas: 0,
    pagadas: 0,
    porcentajeAprobadas: 0,
    porcentajePendientes: 0,
    porcentajeRechazadas: 0,
  };
  
  ubicacionesMap = new Map<string, string>();
  aprobacionesPorSolicitud: Map<string, AprobacionViatico[]> = new Map();
  
  mostrarDialogoInicializar = false;
  datosAprobadores = {
    directorProgramaId: '',
    directorProgramaNombre: '',
    decanoId: '',
    decanoNombre: '',
    vicerrectorAdministrativoId: '',
    vicerrectorAdministrativoNombre: '',
    directorTalentoHumanoId: '',
    directorTalentoHumanoNombre: ''
  };

  directoresProgramaSugeridos: UsuarioOracle[] = [];
  decanosODirectoresSugeridos: UsuarioOracle[] = [];
  directoresTalentoHumanoSugeridos: UsuarioOracle[] = [];
  vicerrectoresAdministrativosSugeridos: UsuarioOracle[] = [];
  loadingUsuarios = false;

  directorProgramaSeleccionado: UsuarioOracle | null = null;
  decanoSeleccionado: UsuarioOracle | null = null;
  directorTalentoHumanoSeleccionado: UsuarioOracle | null = null;
  vicerrectorAdministrativoSeleccionado: UsuarioOracle | null = null;

  mostrarDialogoNivelesAprobacion = false;
  
  mostrarDialogoAprobarRechazar = false;
  accionDialog: 'aprobar' | 'rechazar' = 'aprobar';
  aprobacionSeleccionada?: AprobacionViatico;
  observaciones = '';

  // Propiedades para manejo de archivos adjuntos
  mostrarDialogoArchivos = false;
  archivosSolicitud: ArchivosUsuarios[] = [];
  cargandoArchivos = false;
  archivosPorSolicitud: Map<string, ArchivosUsuarios[]> = new Map();
  
  // Propiedades para vista previa
  mostrarVistaPrevia = false;
  archivoPrevisualizado: ArchivosUsuarios | null = null;
  urlVistaPrevia: string = '';
  cargandoPrevia = false;

  // Propiedades para conceptos de liquidación
  conceptosLiquidacion: ConceptoLiquidacion[] = [];
  cargandoConceptos = false;

  // Propiedades para validación de usuario autenticado
  usuarioAutenticado: { identificacion: string; nombre: string } | null = null;
  usuarioOracleAutenticado: UsuarioOracle | null = null;
  validandoUsuario = false;

  filtroForm: FormGroup;

  // Opciones cargadas dinámicamente desde BD (igual que CVIA)
  opcionesEstado: { label: string; value: string }[] = [];
  opcionesTipo: { label: string; value: string }[] = [];

  constructor() {
    this.filtroForm = this.fb.group({
      texto: [''],
      estado: [''],
      tipoViaticos: [''],
      fechaDesde: [null],
    });

    this.filtroForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
      this.cargarEstadisticas();
    });

    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          this.messageService.add({
            severity: 'info',
            summary: 'Viáticos actualizados',
            detail: 'Se detectaron cambios, los datos han sido actualizados.',
            life: 3000
          });
          this.realtimeService.resetAll();
          this.isRealtimeRefresh = true;
          this.cargarSolicitudes();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarOpcionesEstado();
    this.cargarOpcionesTipo();
    this.cargarUbicaciones();
    this.cargarSolicitudes();
    this.validarUsuarioAutenticado();
  }

  // Valida que el usuario autenticado coincida con Oracle
  validarUsuarioAutenticado(): void {
    this.validandoUsuario = true;
    
    const userInfo = this.authService.getUserInfo();
    if (!userInfo) {
      this.validandoUsuario = false;
      return;
    }

    this.usuarioAutenticado = {
      identificacion: userInfo.identificacion || userInfo.preferred_username || '',
      nombre: userInfo.name || userInfo.preferred_username || 'Usuario'
    };

    if (this.usuarioAutenticado.identificacion) {
      this.usuariosOracleService.getByCodigo(this.usuarioAutenticado.identificacion).subscribe({
        next: (usuarioOracle) => {
          if (usuarioOracle) {
            this.usuarioOracleAutenticado = usuarioOracle;
          }
          this.validandoUsuario = false;
        },
        error: (error) => {
          this.validandoUsuario = false;
        }
      });
    } else {
      this.validandoUsuario = false;
    }
  }

  // Carga opciones de estado desde BD (igual que CVIA)
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
      error: () => {
        // En caso de error, usar valores por defecto
        this.opcionesEstado = [
          { label: 'Todos', value: '' },
          { label: 'Pendiente', value: 'pendiente' },
          { label: 'Aprobado', value: 'aprobado' },
          { label: 'Rechazado', value: 'rechazado' },
          { label: 'Pagado', value: 'pagado' },
          { label: 'Anulado', value: 'anulado' },
        ];
      }
    });
  }

  // Carga opciones de tipo desde BD (igual que CVIA)
  private cargarOpcionesTipo(): void {
    // Mapeo de códigos cortos de BD a valores largos que usa el backend
    const mapaTipos: Record<string, string> = {
      'PERM': 'permanente',
      'OCAS': 'ocasional'
    };

    this.listasValoresService.obtenerPorTipo('TIPVI').pipe(
      map((response: ListaValor[]) => 
        response
          .filter((item) => item.idPadre !== null)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      )
    ).subscribe({
      next: (tipos) => {
        this.opcionesTipo = [{ label: 'Todos', value: '' }, ...tipos.map(t => {
          const codigoCorto = t.abreviatura || '';
          return {
            label: t.nombre,
            value: mapaTipos[codigoCorto] || codigoCorto.toLowerCase()
          };
        })];
      },
      error: () => {
        // En caso de error, usar valores por defecto
        this.opcionesTipo = [
          { label: 'Todos', value: '' },
          { label: 'Permanente', value: 'permanente' },
          { label: 'Ocasional', value: 'ocasional' },
        ];
      }
    });
  }

  // Carga ubicaciones geográficas en el mapa
  cargarUbicaciones(): void {
    this.ubicacionesService.getAll().subscribe({
      next: (ubicaciones) => {
        ubicaciones.forEach((ubicacion) => {
          this.ubicacionesMap.set(ubicacion.id, ubicacion.nombre);
        });
      },
    });
  }

  // Carga todas las solicitudes no borrador
  cargarSolicitudes(): void {
    this.cargando = true;
    
    this.solicitudService.getAll().subscribe({
      next: (solicitudes) => {
        this.solicitudes = solicitudes
          .filter((s) => s.estado !== 'borrador')
          .sort((a, b) => {
            const fechaA = a.fechaElaboracion ? new Date(a.fechaElaboracion).getTime() : 0;
            const fechaB = b.fechaElaboracion ? new Date(b.fechaElaboracion).getTime() : 0;
            return fechaB - fechaA; 
          });
         
        this.aplicarFiltros();
        this.cargarEstadisticas();
        this.cargarAprobaciones(); 
        this.cargando = false;
        
        if (this.isRealtimeRefresh) {
          this.isRealtimeRefresh = false;
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Se cargaron ${this.solicitudes.length} solicitudes`,
          });
        }
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las solicitudes',
        });
      },
    });
  }

  // Carga estadísticas de viáticos (calculadas localmente desde las solicitudes cargadas)
  cargarEstadisticas(): void {
    const total = this.solicitudes.length;
    const aprobadas = this.solicitudes.filter(s => s.estado === 'aprobado').length;
    const pendientes = this.solicitudes.filter(s => s.estado === 'pendiente').length;
    const rechazadas = this.solicitudes.filter(s => s.estado === 'rechazado').length;
    const pagadas = this.solicitudes.filter(s => s.estado === 'pagado').length;
    
    this.estadisticas = {
      total,
      aprobadas,
      pendientes,
      rechazadas,
      pagadas,
      porcentajeAprobadas: total > 0 ? Math.round((aprobadas / total) * 100) : 0,
      porcentajePendientes: total > 0 ? Math.round((pendientes / total) * 100) : 0,
      porcentajeRechazadas: total > 0 ? Math.round((rechazadas / total) * 100) : 0,
    };
  }

  // Retorna objeto de estadísticas vacío
  private obtenerEstadisticasVacias(): EstadisticasViaticos {
    return {
      total: 0,
      aprobadas: 0,
      pendientes: 0,
      rechazadas: 0,
      pagadas: 0,
      porcentajeAprobadas: 0,
      porcentajePendientes: 0,
      porcentajeRechazadas: 0,
    };
  }

  // Aplica filtros a las solicitudes
  aplicarFiltros(): void {
    const filtros = this.filtroForm.value;
    
    this.filtradas = this.solicitudes.filter((solicitud) => {
      return this.cumpleFiltros(solicitud, filtros);
    });

    // Precargar archivos de solicitudes filtradas
    setTimeout(() => this.precargarArchivos(), 500);
  }

  filtrarPorEstado(estado: string): void {
    this.filtroForm.patchValue({ estado: estado });
  }

  private cumpleFiltros(solicitud: SolicitudViaticos, filtros: Partial<{texto: string, estado: string, tipoViaticos: string, fechaDesde: Date}>): boolean {
    const validadores = [
      () => this.validarFiltroTexto(solicitud, filtros.texto),
      () => this.validarFiltroEstado(solicitud, filtros.estado),
      () => this.validarFiltroTipo(solicitud, filtros.tipoViaticos),
      () => this.validarFiltroFecha(solicitud, filtros.fechaDesde)
    ];

    return validadores.every(validador => validador());
  }

  private validarFiltroTexto(solicitud: SolicitudViaticos, texto: string | undefined): boolean {
    if (!texto) return true;
    
    const textoLower = texto.toLowerCase();
    const nombreCompleto = this.obtenerNombreCompleto(solicitud).toLowerCase();
    
    return nombreCompleto.includes(textoLower) ||
           solicitud.nit?.toLowerCase().includes(textoLower) ||
           solicitud.codigoSolicitud?.toLowerCase().includes(textoLower) ||
           solicitud.cargo?.toLowerCase().includes(textoLower) ||
           false;
  }

  private validarFiltroEstado(solicitud: SolicitudViaticos, estado: string | undefined): boolean {
    return !estado || solicitud.estado === estado;
  }

  private validarFiltroTipo(solicitud: SolicitudViaticos, tipoViaticos: string | undefined): boolean {
    if (!tipoViaticos) return true;
    if (!solicitud.tipoViaticos) return false;

    return solicitud.tipoViaticos.toLowerCase() === tipoViaticos.toLowerCase();
  }

  private validarFiltroFecha(solicitud: SolicitudViaticos, fechaDesde: Date | undefined): boolean {
    if (!fechaDesde || !solicitud.fechaElaboracion) return true;
    
    const fechaElaboracion = new Date(solicitud.fechaElaboracion);
    return fechaElaboracion >= new Date(fechaDesde);
  }

  // Limpia todos los filtros
  limpiarFiltros(): void {
    this.filtroForm.reset({
      texto: '',
      estado: '',
      tipoViaticos: '',
      programa: '',
      fechaDesde: null,
    });
  }

  // Muestra diálogo con detalle completo
  verDetalle(solicitud: SolicitudViaticos): void {
    this.solicitudSeleccionada = solicitud;
    this.mostrarDialogoDetalle = true;
    this.cargarConceptosLiquidacion(solicitud);
  }

  // Cierra diálogo de detalle
  cerrarDialogoDetalle(): void {
    this.mostrarDialogoDetalle = false;
    this.solicitudSeleccionada = null;
    this.conceptosLiquidacion = [];
  }

  // Carga conceptos de liquidación para la solicitud
  private async cargarConceptosLiquidacion(solicitud: SolicitudViaticos): Promise<void> {
    this.conceptosLiquidacion = [];
    this.cargandoConceptos = true;
    
    try {
      // Sumar todas las liquidaciones de todos los destinos
      const liquidacionGlobal: Record<string, { concepto: string; subtotal: number; marcado: boolean }> = {};
      
      if (solicitud.destinos && solicitud.destinos.length > 0) {
        solicitud.destinos.forEach(destino => {
          if (destino.liquidacion) {
            let liquidacionDestino: Record<string, any> = {};
            
            if (typeof destino.liquidacion === 'string') {
              try {
                liquidacionDestino = JSON.parse(destino.liquidacion);
              } catch {
                liquidacionDestino = destino.liquidacion as Record<string, any>;
              }
            } else if (typeof destino.liquidacion === 'object') {
              liquidacionDestino = destino.liquidacion as Record<string, any>;
            }
            
            Object.keys(liquidacionDestino).forEach(key => {
              const conceptoData = liquidacionDestino[key];
              if (conceptoData && typeof conceptoData === 'object') {
                const nombreConcepto = conceptoData.nombre || conceptoData.tipoConcepto || key;
                const subtotal = conceptoData.subtotal || 0;
                const marcado = conceptoData.marcado || false;
                
                if (subtotal > 0 || marcado) {
                  if (!liquidacionGlobal[nombreConcepto]) {
                    liquidacionGlobal[nombreConcepto] = {
                      concepto: nombreConcepto,
                      subtotal: 0,
                      marcado: false
                    };
                  }
                  liquidacionGlobal[nombreConcepto].subtotal += subtotal;
                  liquidacionGlobal[nombreConcepto].marcado = liquidacionGlobal[nombreConcepto].marcado || marcado;
                }
              }
            });
          }
        });
      }
      
      this.conceptosLiquidacion = Object.values(liquidacionGlobal)
        .sort((a, b) => a.concepto.localeCompare(b.concepto))
        .map(item => ({
          concepto: item.concepto,
          conceptoNombre: item.concepto,
          numeroDiasNoches: 0,
          valorUnitario: 0,   
          subtotal: item.subtotal,
          marcado: item.marcado,
          valorAprobado: item.subtotal
        } as ConceptoLiquidacion));

    } catch (error) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Información',
        detail: 'No se pudieron cargar los conceptos de liquidación',
        life: 3000
      });
    } finally {
      this.cargandoConceptos = false;
    }
  }

  // Calcula el total de conceptos marcados
  calcularTotalConceptos(): number {
    if (!this.conceptosLiquidacion || this.conceptosLiquidacion.length === 0) {
      return 0;
    }
    const conceptosMarcados = this.conceptosLiquidacion.filter(c => c.marcado);
    return conceptosMarcados.reduce((total, c) => total + (c.subtotal || 0), 0);
  }

  // Exporta datos a Excel
  exportarExcel(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar Excel',
      detail: 'Funcionalidad en desarrollo',
    });
  }

  // Exporta datos a PDF
  exportarPDF(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar PDF',
      detail: 'Funcionalidad en desarrollo',
    });
  }

  // Obtiene nombre completo del solicitante
  obtenerNombreCompleto(solicitud: SolicitudViaticos): string {
    const partes = [
      solicitud.primerNombre,
      solicitud.segundoNombre,
      solicitud.primerApellido,
      solicitud.segundoApellido,
    ].filter(Boolean);
    
    return partes.join(' ');
  }

  // Obtiene nombre de ubicación por ID
  obtenerNombreUbicacion(id: string | undefined): string {
    if (!id) return 'No especificado';
    return this.ubicacionesMap.get(id) || id;
  }

  // Obtiene destino completo del viaje
  obtenerDestinoCompleto(solicitud: SolicitudViaticos): string {
    // Verificar si hay destinos en el array
    if (solicitud.destinos && solicitud.destinos.length > 0) {
      const primerDestino = solicitud.destinos[0];
      const municipio = primerDestino.municipio ? this.obtenerNombreUbicacion(primerDestino.municipio) : '';
      const departamento = primerDestino.departamento ? this.obtenerNombreUbicacion(primerDestino.departamento) : '';
      
      if (municipio && departamento) {
        return `${municipio}, ${departamento}`;
      } else if (primerDestino.ciudad) {
        // Si es internacional, podría tener solo ciudad
        return primerDestino.ciudad;
      }
    }
    
    return 'No especificado';
  }

  // Obtiene origen completo del viaje
  obtenerOrigenCompleto(solicitud: SolicitudViaticos): string {
    const municipio = this.obtenerNombreUbicacion(solicitud.municipioSalida);
    const departamento = this.obtenerNombreUbicacion(solicitud.departamentoSalida);
    return `${municipio}, ${departamento}`;
  }

  // Obtiene tooltip con todos los destinos
  obtenerTooltipDestinos(solicitud: SolicitudViaticos): string {
    if (!solicitud.destinos || solicitud.destinos.length === 0) {
      return '';
    }

    const destinos = solicitud.destinos.map((destino, index) => {
      const municipio = destino.municipio ? this.obtenerNombreUbicacion(destino.municipio) : '';
      const departamento = destino.departamento ? this.obtenerNombreUbicacion(destino.departamento) : '';
      const ciudad = destino.ciudad || '';
      const fechaLlegada = destino.fechaLlegada ? new Date(destino.fechaLlegada).toLocaleDateString('es-CO') : '';
      
      let destinoTexto = '';
      if (municipio && departamento) {
        destinoTexto = `${municipio}, ${departamento}`;
      } else if (ciudad) {
        destinoTexto = ciudad;
      } else {
        destinoTexto = 'Destino no especificado';
      }
      
      return `<strong>${index + 1}.</strong> ${destinoTexto}${fechaLlegada ? ' - ' + fechaLlegada : ''}`;
    });

    return `<div style="text-align: left; line-height: 1.6;">
      ${destinos.join('<br/>')}
    </div>`;
  }

  // Convierte estado a texto legible
  obtenerTextoEstado(estado: string): string {
    const estados: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      pagado: 'Pagado',
      borrador: 'Borrador',
      anulado: 'Anulado',
    };
    return estados[estado] || estado;
  }

  // Obtiene severidad de PrimeNG según estado
  obtenerSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severidades: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pendiente: 'warn',
      aprobado: 'success',
      rechazado: 'danger',
      pagado: 'info',
      borrador: 'secondary',
      anulado: 'danger',
    };
    return severidades[estado] || 'secondary';
  }

  // Extrae concepto sin liquidación
  obtenerSoloConcepto(conceptoCompleto: string | undefined): string {
    if (!conceptoCompleto) return 'No especificado';
    
    const indexPipe = conceptoCompleto.indexOf('|');
    if (indexPipe > 0) {
      return conceptoCompleto.substring(0, indexPipe).trim();
    }
    
    const indexLiquidacion = conceptoCompleto.indexOf('Liquidación:');
    if (indexLiquidacion > 0) {
      return conceptoCompleto.substring(0, indexLiquidacion).trim();
    }
    
    return conceptoCompleto;
  }

  // Carga aprobaciones de todas las solicitudes
  cargarAprobaciones(): void {
    if (this.solicitudes.length === 0) return;

    this.solicitudes.forEach((solicitud) => {
      const codigo = solicitud.codigoSolicitud;
      if (codigo) {
        this.cargarAprobacionPorCodigo(codigo);
      }
    });
  }

  // Carga aprobación de una solicitud específica
  private cargarAprobacionPorCodigo(codigo: string): void {
    this.aprobacionService.obtenerPorSolicitud(codigo).subscribe({
      next: (aprobaciones) => {
        if (aprobaciones && aprobaciones.length > 0) {
          this.aprobacionesPorSolicitud.set(codigo, aprobaciones);
        }
      },
    });
  }

  // Obtiene aprobaciones de una solicitud
  getAprobaciones(codigoSolicitud: string): AprobacionViatico[] {
    return this.aprobacionesPorSolicitud.get(codigoSolicitud) || [];
  }

  // Verifica si solicitud tiene aprobaciones
  tieneAprobaciones(solicitud: SolicitudViaticos): boolean {
    const codigo = solicitud.codigoSolicitud;
    if (!codigo) return false;
    const aprobaciones = this.getAprobaciones(codigo);
    return aprobaciones.length > 0;
  }

  // Abre diálogo para inicializar aprobaciones
  abrirDialogInicializar(solicitud: SolicitudViaticos): void {
    if (solicitud.codigoSolicitud) {
      const aprobaciones = this.getAprobaciones(solicitud.codigoSolicitud);
      if (aprobaciones && aprobaciones.length > 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'Aprobaciones existentes',
          detail: 'Esta solicitud ya tiene niveles de aprobación. Use "Ver Niveles de Aprobación" para gestionarlos.',
          life: 4000
        });
        this.abrirDialogNivelesAprobacion(solicitud);
        return;
      }
    }
    
    this.solicitudSeleccionada = solicitud;
    this.mostrarDialogoInicializar = true;
    
    this.cargarUsuariosPorCargos();
    this.inicializarDatosAprobadores(solicitud);
    this.resetearSelecciones();
  }

  // Inicializa datos de aprobadores desde solicitud
  private inicializarDatosAprobadores(solicitud: SolicitudViaticos): void {
    const campos = [
      { nombre: 'directorPrograma', valor: solicitud.aprobadoDirectorPrograma },
      { nombre: 'decano', valor: solicitud.aprobadoDecano },
      { nombre: 'vicerrectorAdministrativo', valor: solicitud.aprobadoVicerrectorAdministrativo },
      { nombre: 'directorTalentoHumano', valor: solicitud.aprobadoDirectorTalentoHumano }
    ];

    campos.forEach(campo => {
      const idKey = `${campo.nombre}Id` as keyof typeof this.datosAprobadores;
      const nombreKey = `${campo.nombre}Nombre` as keyof typeof this.datosAprobadores;
      (this.datosAprobadores[idKey] as string) = '';
      (this.datosAprobadores[nombreKey] as string) = campo.valor || '';
    });
  }

  // Resetea selecciones de aprobadores
  private resetearSelecciones(): void {
    this.directorProgramaSeleccionado = null;
    this.decanoSeleccionado = null;
    this.vicerrectorAdministrativoSeleccionado = null;
    this.directorTalentoHumanoSeleccionado = null;
  }

  // Carga usuarios disponibles por cargo
  cargarUsuariosPorCargos(): void {
    this.loadingUsuarios = true;

    forkJoin({
      directoresPrograma: this.usuariosOracleService.getByCargo('DIRECTOR DE PROGRAMA'),
      decanos: this.usuariosOracleService.getByCargo('DECANO (A)'),
      directoresOficina: this.usuariosOracleService.getByCargo('DIRECTOR DE OFICINA'),
      directoresTalentoHumano: this.usuariosOracleService.getByPrograma('DIRECCIÓN DE TALENTO HUMANO'),
      vicerrectoresAdmin: this.usuariosOracleService.getByPrograma('VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA')
    }).subscribe({
      next: (resultados) => {
        this.procesarResultadosUsuarios(resultados);
        this.preseleccionarAprobadores();
        this.loadingUsuarios = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios disponibles'
        });
        this.loadingUsuarios = false;
      }
    });
  }

  // Procesa resultados de carga de usuarios
  private procesarResultadosUsuarios(resultados: {
    directoresPrograma: UsuarioOracle[];
    decanos: UsuarioOracle[];
    directoresOficina: UsuarioOracle[];
    directoresTalentoHumano: UsuarioOracle[];
    vicerrectoresAdmin: UsuarioOracle[];
  }): void {
    this.directoresProgramaSugeridos = resultados.directoresPrograma || [];
    
    const decanosYDirectores = [
      ...(resultados.decanos || []),
      ...(resultados.directoresOficina || [])
    ];
    this.decanosODirectoresSugeridos = this.filtrarUsuariosUnicos(decanosYDirectores);
    
    const vicerrectores = (resultados.vicerrectoresAdmin || []).filter(u => 
      u.cargo?.toUpperCase().includes('VICERRECTOR')
    );
    this.vicerrectoresAdministrativosSugeridos = vicerrectores;
    
    this.directoresTalentoHumanoSugeridos = resultados.directoresTalentoHumano || [];
  }

  // Filtra usuarios únicos por identificación
  private filtrarUsuariosUnicos(usuarios: UsuarioOracle[]): UsuarioOracle[] {
    return usuarios.filter((usuario, index, arr) => 
      arr.findIndex(u => u.identificacion === usuario.identificacion) === index
    );
  }

  // Preselecciona aprobadores según nombres guardados
  preseleccionarAprobadores(): void {
    const configuraciones = [
      { 
        nombre: this.datosAprobadores.directorProgramaNombre,
        lista: this.directoresProgramaSugeridos,
        setter: (usuario: UsuarioOracle) => {
          this.directorProgramaSeleccionado = usuario;
          this.datosAprobadores.directorProgramaId = usuario.identificacion;
        }
      },
      {
        nombre: this.datosAprobadores.decanoNombre,
        lista: this.decanosODirectoresSugeridos,
        setter: (usuario: UsuarioOracle) => {
          this.decanoSeleccionado = usuario;
          this.datosAprobadores.decanoId = usuario.identificacion;
        }
      },
      {
        nombre: this.datosAprobadores.vicerrectorAdministrativoNombre,
        lista: this.vicerrectoresAdministrativosSugeridos,
        setter: (usuario: UsuarioOracle) => {
          this.vicerrectorAdministrativoSeleccionado = usuario;
          this.datosAprobadores.vicerrectorAdministrativoId = usuario.identificacion;
        }
      },
      {
        nombre: this.datosAprobadores.directorTalentoHumanoNombre,
        lista: this.directoresTalentoHumanoSugeridos,
        setter: (usuario: UsuarioOracle) => {
          this.directorTalentoHumanoSeleccionado = usuario;
          this.datosAprobadores.directorTalentoHumanoId = usuario.identificacion;
        }
      }
    ];

    configuraciones.forEach(config => {
      if (config.nombre) {
        // Normalizar nombre para búsqueda flexible
        const nombreBuscado = config.nombre.toUpperCase().trim();
        
        // Intentar búsqueda exacta primero
        let usuario = config.lista.find(u => 
          u.nombre?.toUpperCase().trim() === nombreBuscado
        );
        
        // Si no encuentra, intentar búsqueda parcial
        if (!usuario) {
          usuario = config.lista.find(u => {
            const nombreUsuario = u.nombre?.toUpperCase().trim();
            return nombreUsuario && nombreBuscado && nombreUsuario.includes(nombreBuscado);
          });
        }
        
        // Si aún no encuentra, intentar búsqueda inversa (el guardado contiene el de Oracle)
        if (!usuario) {
          usuario = config.lista.find(u => {
            const nombreUsuario = u.nombre?.toUpperCase().trim();
            return nombreUsuario && nombreBuscado && nombreBuscado.includes(nombreUsuario);
          });
        }
        
        if (usuario) {
          config.setter(usuario);
        }
      }
    });
  }

  // Asigna director de programa seleccionado
  seleccionarDirectorPrograma(usuario: UsuarioOracle): void {
    this.datosAprobadores.directorProgramaId = usuario.identificacion;
    this.datosAprobadores.directorProgramaNombre = usuario.nombre;
  }

  // Asigna decano seleccionado
  seleccionarDecano(usuario: UsuarioOracle): void {
    this.datosAprobadores.decanoId = usuario.identificacion;
    this.datosAprobadores.decanoNombre = usuario.nombre;
  }

  // Asigna director de talento humano
  seleccionarDirectorTalentoHumano(usuario: UsuarioOracle): void {
    this.datosAprobadores.directorTalentoHumanoId = usuario.identificacion;
    this.datosAprobadores.directorTalentoHumanoNombre = usuario.nombre;
  }

  // Asigna vicerrector administrativo seleccionado
  seleccionarVicerrectorAdministrativo(usuario: UsuarioOracle): void {
    this.datosAprobadores.vicerrectorAdministrativoId = usuario.identificacion;
    this.datosAprobadores.vicerrectorAdministrativoNombre = usuario.nombre;
  }

  // Inicializa niveles de aprobación dinámicamente
  inicializarAprobaciones(): void {
    if (!this.solicitudSeleccionada?.codigoSolicitud) return;

    // Verificar si ya existen aprobaciones
    const aprobacionesExistentes = this.getAprobaciones(this.solicitudSeleccionada.codigoSolicitud);
    if (aprobacionesExistentes && aprobacionesExistentes.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aprobaciones ya existen',
        detail: 'Esta solicitud ya tiene niveles de aprobación inicializados. Use "Ver Niveles de Aprobación" para gestionarlos.',
        life: 5000
      });
      this.mostrarDialogoInicializar = false;
      return;
    }

    const cargo = this.solicitudSeleccionada.cargo;

    if (!cargo) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La solicitud no tiene un cargo asignado',
      });
      return;
    }

    this.cargando = true;

    this.aprobacionService.inicializarAprobacionesDinamicas(
      this.solicitudSeleccionada.codigoSolicitud,
      cargo
    ).subscribe({
      next: () => {
        const solicitudParaCargar = this.solicitudSeleccionada;
        
        this.mostrarDialogoInicializar = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Niveles de aprobación inicializados correctamente',
        });
        
        if (solicitudParaCargar) {
          setTimeout(() => {
            this.cargarAprobacionesSolicitud(solicitudParaCargar);
          }, 100);
        }
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || '';
        const isDuplicateError = errorMessage.includes('duplicate key') || 
                                errorMessage.includes('already exists') ||
                                errorMessage.includes('uk_aprobaciones_codigo_solicitud');
        
        if (isDuplicateError) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Aprobaciones ya existen',
            detail: 'Esta solicitud ya tiene niveles de aprobación. Recargue la página para ver los niveles actuales.',
            life: 6000
          });
          
          if (this.solicitudSeleccionada) {
            this.cargarAprobaciones();
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al inicializar',
            detail: 'No se pudieron inicializar las aprobaciones: ' + errorMessage,
            life: 5000
          });
        }
        
        this.mostrarDialogoInicializar = false;
        this.cargando = false;
      },
    });
  }

  // Asigna IDs desde selecciones de dropdown
  private asignarIdsDesdeSelecciones(): void {
    const selecciones = [
      { 
        seleccionado: this.directorProgramaSeleccionado,
        idKey: 'directorProgramaId',
        nombreKey: 'directorProgramaNombre'
      },
      {
        seleccionado: this.decanoSeleccionado,
        idKey: 'decanoId',
        nombreKey: 'decanoNombre'
      },
      {
        seleccionado: this.vicerrectorAdministrativoSeleccionado,
        idKey: 'vicerrectorAdministrativoId',
        nombreKey: 'vicerrectorAdministrativoNombre'
      },
      {
        seleccionado: this.directorTalentoHumanoSeleccionado,
        idKey: 'directorTalentoHumanoId',
        nombreKey: 'directorTalentoHumanoNombre'
      }
    ];

    selecciones.forEach(sel => {
      if (!this.datosAprobadores[sel.idKey as keyof typeof this.datosAprobadores] && sel.seleccionado) {
        (this.datosAprobadores[sel.idKey as keyof typeof this.datosAprobadores] as string) = sel.seleccionado.identificacion;
        (this.datosAprobadores[sel.nombreKey as keyof typeof this.datosAprobadores] as string) = sel.seleccionado.nombre;
      }
    });
  }

  // Valida que todos los aprobadores estén completos
  private validarCamposCompletos(): boolean {
    return !!(
      this.datosAprobadores.directorProgramaNombre &&
      this.datosAprobadores.decanoNombre &&
      this.datosAprobadores.vicerrectorAdministrativoNombre &&
      this.datosAprobadores.directorTalentoHumanoNombre
    );
  }

  // Cancela inicialización de aprobaciones
  cancelarInicializar(): void {
    this.mostrarDialogoInicializar = false;
    this.solicitudSeleccionada = null;
  }

  // Carga aprobaciones de solicitud específica
  cargarAprobacionesSolicitud(solicitud: SolicitudViaticos): void {
    const codigo = solicitud.codigoSolicitud;
    if (!codigo) return;

    this.solicitudSeleccionada = solicitud;
    this.cargando = true;

    this.aprobacionService.obtenerPorSolicitud(codigo).subscribe({
      next: (aprobaciones) => {
        if (aprobaciones && aprobaciones.length > 0) {
          this.aprobacionesPorSolicitud.set(codigo, aprobaciones);
        }
        this.cargando = false;
        this.mostrarDialogoNivelesAprobacion = true;
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aprobaciones',
        });
      },
    });
  }

  // Abre diálogo de niveles de aprobación
  abrirDialogNivelesAprobacion(solicitud: SolicitudViaticos): void {
    this.cargarAprobacionesSolicitud(solicitud);
  }

  // Cierra diálogo y recarga datos
  cerrarDialogoNivelesAprobacion(): void {
    this.mostrarDialogoNivelesAprobacion = false;
    
    if (this.solicitudSeleccionada?.id) {
      this.recargarSolicitudActualizada(this.solicitudSeleccionada.id);
    }
    
    this.solicitudSeleccionada = null;
  }

  // Recarga solicitud actualizada desde el servidor
  private recargarSolicitudActualizada(solicitudId: string): void {
    this.solicitudService.getById(solicitudId).subscribe({
      next: (solicitudActualizada) => {
        if (solicitudActualizada) {
          this.actualizarSolicitudEnLista(solicitudActualizada);
          this.cargarEstadisticas();
        }
      },
    });
  }

  // Actualiza solicitud en la lista
  private actualizarSolicitudEnLista(solicitud: SolicitudViaticos): void {
    const index = this.solicitudes.findIndex(s => s.id === solicitud.id);
    if (index !== -1) {
      this.solicitudes[index] = solicitud;
      this.aplicarFiltros();
    }
  }

  // Abre diálogo para aprobar nivel
  abrirDialogAprobar(aprobacion: AprobacionViatico): void {
    if (!this.puedeAprobar(aprobacion)) {
      const mensaje = this.obtenerMensajeValidacion(aprobacion);
      this.messageService.add({
        severity: 'warn',
        summary: 'No autorizado',
        detail: mensaje,
        life: 5000
      });
      return;
    }

    this.aprobacionSeleccionada = aprobacion;
    this.accionDialog = 'aprobar';
    this.observaciones = '';
    this.mostrarDialogoAprobarRechazar = true;
  }

  // Abre diálogo para rechazar nivel
  abrirDialogRechazar(aprobacion: AprobacionViatico): void{
    if (!this.puedeAprobar(aprobacion)) {
      const mensaje = this.obtenerMensajeValidacion(aprobacion);
      this.messageService.add({
        severity: 'warn',
        summary: 'No autorizado',
        detail: mensaje,
        life: 5000
      });
      return;
    }

    this.aprobacionSeleccionada = aprobacion;
    this.accionDialog = 'rechazar';
    this.observaciones = '';
    this.mostrarDialogoAprobarRechazar = true;
  }

  // Confirma acción de aprobar/rechazar
  confirmarAccion(): void {
    if (!this.aprobacionSeleccionada?.id) return;

    if (this.accionDialog === 'rechazar' && !this.observaciones?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Observaciones requeridas',
        detail: 'Debes ingresar las observaciones del rechazo'
      });
      return;
    }

    this.cargando = true;

    // Obtener la identificación del usuario autenticado
    const identificacionUsuario = this.usuarioAutenticado?.identificacion;

    const observable = this.accionDialog === 'aprobar'
      ? this.aprobacionService.aprobar(this.aprobacionSeleccionada.id, this.observaciones || '', identificacionUsuario)
      : this.aprobacionService.rechazar(this.aprobacionSeleccionada.id, this.observaciones, identificacionUsuario);

    observable.subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: response.message,
        });
        this.mostrarDialogoAprobarRechazar = false;
        
        if (this.solicitudSeleccionada) {
          this.cargarAprobacionesSolicitud(this.solicitudSeleccionada);
          
          if (this.solicitudSeleccionada.id) {
            this.recargarYActualizarSolicitud(this.solicitudSeleccionada.id);
          }
        }
      },
      error: (error) => {
        const mensajeError = error?.error?.message || 'No se pudo procesar la aprobación';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: mensajeError,
        });
        this.cargando = false;
      },
    });
  }

  // Recarga y actualiza solicitud tras aprobación
  private recargarYActualizarSolicitud(solicitudId: string): void {
    this.solicitudService.getById(solicitudId).subscribe({
      next: (solicitudActualizada) => {
        if (solicitudActualizada) {
          this.solicitudSeleccionada = solicitudActualizada;
          this.actualizarSolicitudEnLista(solicitudActualizada);
          this.cargarEstadisticas();
        }
      },
    });
  }

  // Cancela acción de aprobar/rechazar
  cancelarAccion(): void{
    this.mostrarDialogoAprobarRechazar = false;
    this.aprobacionSeleccionada = undefined;
    this.observaciones = '';
  }

  // Obtiene severidad del estado
  getSeverityEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    const severidades: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      aprobado: 'success',
      rechazado: 'danger',
      pendiente: 'warn',
    };
    return severidades[estado] || 'info';
  }

  // Obtiene nombre descriptivo del nivel
  getNombreNivel(nivel: number): string {
    const niveles: Record<number, string> = {
      1: 'Director de Programa',
      2: 'Decano/Director',
      3: 'Rectoría',
      4: 'Vicerrector Administrativo',
      5: 'Director de Talento Humano',
    };
    return niveles[nivel] || `Nivel ${nivel}`;
  }

  // Obtiene icono según nivel
  getIconoNivel(nivel: number): string {
    const iconos: Record<number, string> = {
      1: 'pi pi-user',
      2: 'pi pi-users',
      3: 'pi pi-crown',
      4: 'pi pi-briefcase',
      5: 'pi pi-dollar',
    };
    return iconos[nivel] || 'pi pi-check';
  }

  // Valida si el usuario autenticado puede aprobar una aprobación específica
  puedeAprobar(aprobacion: AprobacionViatico): boolean {
    if (!this.usuarioAutenticado || !this.usuarioOracleAutenticado) {
      return false;
    }

    if (aprobacion.estado === 'aprobado' || aprobacion.estado === 'rechazado') {
      return false;
    }

    // Validar que sea su turno (niveles anteriores deben estar aprobados)
    if (!this.esSuTurno(aprobacion)) {
      return false;
    }

    if (!aprobacion.aprobadorIdentificacion || aprobacion.aprobadorIdentificacion === 'null') {
      const nombreUsuario = this.usuarioOracleAutenticado.nombre.toLowerCase().trim();
      const nombreAprobador = aprobacion.aprobadorNombre.toLowerCase().trim();
      
      const palabrasUsuario = nombreUsuario.split(/\s+/).filter(p => p.length > 2);
      const palabrasAprobador = nombreAprobador.split(/\s+/).filter(p => p.length > 2);
      
      const todasCoinciden = palabrasUsuario.every(palabraUsuario => 
        palabrasAprobador.some(palabraAprobador => 
          palabraAprobador.includes(palabraUsuario) || palabraUsuario.includes(palabraAprobador)
        )
      );
      
      return todasCoinciden && palabrasUsuario.length === palabrasAprobador.length;
    }

    const identificacionCoincide = this.usuarioAutenticado.identificacion === aprobacion.aprobadorIdentificacion;
    
    if (!identificacionCoincide) {
      return false;
    }

    const nombreUsuario = this.usuarioOracleAutenticado.nombre.toLowerCase().trim();
    const nombreAprobador = aprobacion.aprobadorNombre.toLowerCase().trim();
    
    const palabrasUsuario = nombreUsuario.split(/\s+/).filter(p => p.length > 2);
    const palabrasAprobador = nombreAprobador.split(/\s+/).filter(p => p.length > 2);
    
    const nombreCoincide = palabrasUsuario.some(palabraUsuario => 
      palabrasAprobador.some(palabraAprobador => 
        palabraAprobador.includes(palabraUsuario) || palabraUsuario.includes(palabraAprobador)
      )
    );

    if (!nombreCoincide) {
      return false;
    }

    return identificacionCoincide && nombreCoincide;
  }

  // Verifica si es el turno de esta aprobación (niveles anteriores deben estar aprobados)
  esSuTurno(aprobacion: AprobacionViatico): boolean {
    if (!this.solicitudSeleccionada) {
      return false;
    }

    // Obtener todas las aprobaciones de la solicitud
    const aprobacionesSolicitud = this.aprobacionesPorSolicitud.get(this.solicitudSeleccionada.codigoSolicitud || '') || [];

    if (aprobacionesSolicitud.length === 0) {
      return false;
    }

    // Ordenar por nivel de aprobación
    const aprobacionesOrdenadas = [...aprobacionesSolicitud].sort((a, b) => 
      (a.nivelAprobacion || 0) - (b.nivelAprobacion || 0)
    );

    // Encontrar el índice de la aprobación actual en el arreglo ordenado
    const indiceActual = aprobacionesOrdenadas.findIndex(a => a.id === aprobacion.id);

    if (indiceActual === -1) {
      return false;
    }

    // Si es el primer nivel de esta solicitud, siempre puede aprobar
    if (indiceActual === 0) {
      return true;
    }

    // Verificar que todos los niveles anteriores (que existen en esta solicitud) estén aprobados
    for (let i = 0; i < indiceActual; i++) {
      if (aprobacionesOrdenadas[i].estado !== 'aprobado') {
        return false; // Hay un nivel anterior que no está aprobado
      }
    }

    return true;
  }

  // Obtiene los niveles anteriores que están pendientes de aprobación
  private obtenerNivelesAnteriorePendientes(aprobacion: AprobacionViatico): AprobacionViatico[] {
    if (!this.solicitudSeleccionada) {
      return [];
    }

    const aprobacionesSolicitud = this.aprobacionesPorSolicitud.get(this.solicitudSeleccionada.codigoSolicitud || '') || [];

    if (aprobacionesSolicitud.length === 0) {
      return [];
    }

    // Ordenar por nivel de aprobación
    const aprobacionesOrdenadas = [...aprobacionesSolicitud].sort((a, b) => 
      (a.nivelAprobacion || 0) - (b.nivelAprobacion || 0)
    );

    // Encontrar el índice de la aprobación actual
    const indiceActual = aprobacionesOrdenadas.findIndex(a => a.id === aprobacion.id);

    if (indiceActual === -1 || indiceActual === 0) {
      return [];
    }

    // Obtener los niveles anteriores que no están aprobados
    const nivelesPendientes: AprobacionViatico[] = [];
    for (let i = 0; i < indiceActual; i++) {
      if (aprobacionesOrdenadas[i].estado !== 'aprobado') {
        nivelesPendientes.push(aprobacionesOrdenadas[i]);
      }
    }

    return nivelesPendientes;
  }

  // Valida que el cargo del usuario autenticado corresponda al nivel de aprobación
  private validarCargoParaNivel(aprobacion: AprobacionViatico): boolean {
    if (!this.usuarioOracleAutenticado?.cargo) {
      return false;
    }

    const cargoUsuario = this.usuarioOracleAutenticado.cargo.toUpperCase();
    const nivelAprobacion = aprobacion.nivelAprobacion;

    const cargosPermitidosPorNivel: Record<number, string[]> = {
      1: ['DIRECTOR DE PROGRAMA'],
      2: ['DECANO', 'DECANO (A)', 'DIRECTOR DE OFICINA'],
      3: ['RECTOR', 'RECTORA', 'RECTORIA', 'RECTORÍA','RECTOR (A)'],
      4: ['VICERRECTOR', 'VICERRECTOR ADMINISTRATIVO', 'VICERRECTORIA ADMINISTRATIVA', 'VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA'],
      5: ['DIRECTOR DE OFICINA', 'DIRECTOR DE TALENTO HUMANO']
    };

    const cargosPermitidos = cargosPermitidosPorNivel[nivelAprobacion] || [];
    const coincide = cargosPermitidos.some(cargoPermitido => {
      const palabrasClavePermitidas = cargoPermitido.split(' ');
      const palabrasClaveUsuario = cargoUsuario.split(' ');
      
      return palabrasClavePermitidas.some(palabraPermitida => {
        if (palabraPermitida.length <= 3) return false;
        return palabrasClaveUsuario.some(palabraUsuario => 
          palabraUsuario.includes(palabraPermitida) || palabraPermitida.includes(palabraUsuario)
        );
      });
    });

    return coincide;
  }

  // Obtiene el mensaje de validación para mostrar al usuario
  obtenerMensajeValidacion(aprobacion: AprobacionViatico): string {
    if (!this.usuarioAutenticado || !this.usuarioOracleAutenticado) {
      return 'Usuario no validado en el sistema';
    }

    if (aprobacion.estado === 'aprobado') {
      return 'Esta aprobación ya fue procesada';
    }

    if (aprobacion.estado === 'rechazado') {
      return 'Esta aprobación ya fue rechazada';
    }

    // Validar si es su turno
    if (!this.esSuTurno(aprobacion)) {
      const nivelesAnteriores = this.obtenerNivelesAnteriorePendientes(aprobacion);
      if (nivelesAnteriores.length > 0) {
        const listaNiveles = nivelesAnteriores.map(n => `Nivel ${n.nivelAprobacion} (${n.aprobadorCargo})`).join(', ');
        return `Debe esperar a que se aprueben los siguientes niveles: ${listaNiveles}`;
      }
      return `Este nivel estará disponible cuando los niveles anteriores hayan sido aprobados.`;
    }

    if (!aprobacion.aprobadorIdentificacion || aprobacion.aprobadorIdentificacion === 'null') {
      const nombreUsuario = this.usuarioOracleAutenticado.nombre.toLowerCase().trim();
      const nombreAprobador = aprobacion.aprobadorNombre.toLowerCase().trim();
      
      const palabrasUsuario = nombreUsuario.split(/\s+/).filter(p => p.length > 2);
      const palabrasAprobador = nombreAprobador.split(/\s+/).filter(p => p.length > 2);
      
      const todasCoinciden = palabrasUsuario.every(palabraUsuario => 
        palabrasAprobador.some(palabraAprobador => 
          palabraAprobador.includes(palabraUsuario) || palabraUsuario.includes(palabraAprobador)
        )
      );

      if (!todasCoinciden || palabrasUsuario.length !== palabrasAprobador.length) {
        return `Este nivel debe ser aprobado por ${aprobacion.aprobadorNombre}. Usted está autenticado como ${this.usuarioOracleAutenticado.nombre}`;
      }
      
      return 'Puede aprobar esta solicitud (validación por nombre - los datos de identificación del aprobador están incompletos)';
    }

    const identificacionCoincide = this.usuarioAutenticado.identificacion === aprobacion.aprobadorIdentificacion;
    
    if (!identificacionCoincide) {
      return `Este nivel debe ser aprobado por ${aprobacion.aprobadorNombre} (ID: ${aprobacion.aprobadorIdentificacion}). Su identificación es ${this.usuarioAutenticado.identificacion}`;
    }

    const nombreUsuario = this.usuarioOracleAutenticado.nombre.toLowerCase().trim();
    const nombreAprobador = aprobacion.aprobadorNombre.toLowerCase().trim();
    
    const palabrasUsuario = nombreUsuario.split(/\s+/).filter(p => p.length > 2);
    const palabrasAprobador = nombreAprobador.split(/\s+/).filter(p => p.length > 2);
    
    const nombreCoincide = palabrasUsuario.some(palabraUsuario => 
      palabrasAprobador.some(palabraAprobador => 
        palabraAprobador.includes(palabraUsuario) || palabraUsuario.includes(palabraAprobador)
      )
    );

    if (!nombreCoincide) {
      return `Su nombre en Oracle (${this.usuarioOracleAutenticado.nombre}) no coincide con el aprobador asignado (${aprobacion.aprobadorNombre})`;
    }

    return 'Puede aprobar esta solicitud';
  }

  // Obtiene información resumida del estado de validación
  obtenerEstadoValidacion(): string {
    if (this.validandoUsuario) {
      return 'Validando...';
    }
    
    if (!this.usuarioAutenticado || !this.usuarioOracleAutenticado) {
      return 'No validado';
    }
    
    return 'Validado';
  }

  // Verifica si el usuario actual tiene permisos generales para aprobar
  tienePermisosGenerales(): boolean {
    return !this.validandoUsuario && 
           this.usuarioAutenticado !== null && 
           this.usuarioOracleAutenticado !== null;
  }

  // Verifica si una aprobación tiene datos incompletos
  tieneAprobadorDatosIncompletos(aprobacion: AprobacionViatico): boolean {
    return !aprobacion.aprobadorIdentificacion || 
           aprobacion.aprobadorIdentificacion === 'null' || 
           aprobacion.aprobadorIdentificacion.trim() === '';
  }

  // Método para ayudar a completar datos de aprobador
  completarDatosAprobador(aprobacion: AprobacionViatico): void {
    if (!this.usuarioOracleAutenticado || !this.solicitudSeleccionada?.codigoSolicitud) {
      return;
    }

    // Intentar asignar el aprobador con los datos del usuario Oracle actual
    this.aprobacionService.asignarAprobador(
      this.solicitudSeleccionada.codigoSolicitud,
      aprobacion.nivelAprobacion,
      this.usuarioOracleAutenticado.identificacion,
      this.usuarioOracleAutenticado.nombre,
      '' // email opcional
    ).subscribe({
      next: () => {
        if (this.solicitudSeleccionada) {
          this.cargarAprobacionesSolicitud(this.solicitudSeleccionada);
        }
      },
      error: () => {
        // Error manejado silenciosamente
      }
    });
  }

  // Abre diálogo para ver archivos de una solicitud
  verArchivos(solicitud: SolicitudViaticos): void {
    if (!solicitud.codigoSolicitud) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'La solicitud no tiene un código válido',
      });
      return;
    }

    this.solicitudSeleccionada = solicitud;
    this.cargarArchivosSolicitud(solicitud.codigoSolicitud);
  }

  // Carga archivos de una solicitud específica
  cargarArchivosSolicitud(codigoSolicitud: string): void {

    const archivosCache = this.archivosPorSolicitud.get(codigoSolicitud);
    if (archivosCache) {
      this.archivosSolicitud = archivosCache;
      this.mostrarDialogoArchivos = true;
      return;
    }

    this.cargandoArchivos = true;
    this.archivosService.obtenerPorSolicitud(codigoSolicitud).subscribe({
      next: (archivos) => {
        this.archivosSolicitud = archivos;
        this.archivosPorSolicitud.set(codigoSolicitud, archivos);
        this.mostrarDialogoArchivos = true;
        this.cargandoArchivos = false;

        if (archivos.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin archivos',
            detail: 'Esta solicitud no tiene archivos adjuntos',
          });
        }
      },
      error: () => {
        this.cargandoArchivos = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los archivos adjuntos',
        });
      },
    });
  }

  // Cierra diálogo de archivos
  cerrarDialogoArchivos(): void {
    this.mostrarDialogoArchivos = false;
    this.archivosSolicitud = [];
  }

  // Descarga un archivo específico
  descargarArchivo(archivo: ArchivosUsuarios): void {
    if (!archivo.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo no tiene un ID válido',
      });
      return;
    }

    this.archivosService.descargarYGuardarArchivo(archivo.id);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Descargando',
      detail: `Descargando ${archivo.nombreArchivo}...`,
    });
  }

  // Obtiene el icono según el tipo de archivo
  obtenerIconoArchivo(archivo: ArchivosUsuarios): string {
    return this.archivosService.obtenerIconoArchivo(archivo.tipoArchivo);
  }

  // Formatea el tamaño del archivo
  formatearTamanio(bytes?: number): string {
    return this.archivosService.formatearTamanio(bytes);
  }

  // Calcula el tamaño total de archivos
  calcularTamanioTotal(): number {
    return this.archivosSolicitud.reduce((sum, archivo) => sum + (archivo.tamanio || 0), 0);
  }

  // Verifica si una solicitud tiene archivos
  tieneArchivos(solicitud: SolicitudViaticos): boolean {
    if (!solicitud.codigoSolicitud) return false;
    const archivos = this.archivosPorSolicitud.get(solicitud.codigoSolicitud);
    return archivos ? archivos.length > 0 : false;
  }

  // Obtiene la cantidad de archivos de una solicitud
  contarArchivos(solicitud: SolicitudViaticos): number {
    if (!solicitud.codigoSolicitud) return 0;
    const archivos = this.archivosPorSolicitud.get(solicitud.codigoSolicitud);
    return archivos ? archivos.length : 0;
  }

  // Previsualiza un archivo
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

    this.archivosService.descargarArchivo(archivo.id).subscribe({
      next: (blob) => {
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

  // Cierra la vista previa
  cerrarVistaPrevia(): void {
    if (this.urlVistaPrevia) {
      URL.revokeObjectURL(this.urlVistaPrevia);
      this.urlVistaPrevia = '';
    }
    this.mostrarVistaPrevia = false;
    this.archivoPrevisualizado = null;
  }

  // Verifica si un archivo es previsualizable
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

  // Verifica si es una imagen
  esImagen(tipoArchivo: string): boolean {
    const tipo = tipoArchivo.toLowerCase();
    return tipo.includes('image') || 
           tipo.includes('png') || 
           tipo.includes('jpg') || 
           tipo.includes('jpeg') || 
           tipo.includes('gif') || 
           tipo.includes('webp');
  }

  // Verifica si es un PDF
  esPDF(tipoArchivo: string): boolean {
    return tipoArchivo.toLowerCase().includes('pdf');
  }

  // Precarga archivos de todas las solicitudes visibles
  precargarArchivos(): void {
    this.filtradas.forEach(solicitud => {
      if (solicitud.codigoSolicitud && !this.archivosPorSolicitud.has(solicitud.codigoSolicitud)) {
        this.archivosService.obtenerPorSolicitud(solicitud.codigoSolicitud).subscribe({
          next: (archivos) => {
            if (solicitud.codigoSolicitud) {
              this.archivosPorSolicitud.set(solicitud.codigoSolicitud, archivos);
            }
          },
          error: () => {
            // Error silencioso para precarga
          }
        });
      }
    });
  }

  /** Obtiene los códigos de los centros de costo separados por coma */
  obtenerCodigosCentrosCosto(): string {
    if (!this.solicitudSeleccionada?.centrosCosto || this.solicitudSeleccionada.centrosCosto.length === 0) {
      return 'No especificado';
    }
    return this.solicitudSeleccionada.centrosCosto.map(cc => cc.codigoCentroCosto).join(', ');
  }
}
