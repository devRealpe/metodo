import { Component, OnInit, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { SolicitudViaticosService, SolicitudViaticos, EstadisticasViaticos, DestinoViatico } from '../../core/services/Solicitud-viaticos.service';
import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ListaValor } from '../../core/models/lista-valor.model';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { ViaticosRealtimeService } from '../../core/services/viaticos-realtime.service';

@Component({
  selector: 'app-mis-viaticos.component',
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
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './mis-viaticos.component.html',
  styleUrl: './mis-viaticos.component.scss',
})
export class MisViaticosComponent implements OnInit {
  private solicitudService = inject(SolicitudViaticosService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private listasValoresService = inject(ListasValoresService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private router = inject(Router);
  private realtimeService = inject(ViaticosRealtimeService);

  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  solicitudes: SolicitudViaticos[] = [];
  filtradas: SolicitudViaticos[] = [];
  solicitudSeleccionada: SolicitudViaticos | null = null;
  cargando = false;
  mostrarDialogoDetalle = false;
  private isRealtimeRefresh = false;
  
  usuarioLogueado: { identificacion: string; nombre: string } | null = null;
  
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
  
  filtroForm: FormGroup;

  // Opciones cargadas dinámicamente desde BD (igual que otras vistas)
  opcionesEstado: { label: string; value: string }[] = [];
  opcionesTipo: { label: string; value: string }[] = [];

  constructor() {
    this.filtroForm = this.fb.group({
      texto: [''],
      estado: [''],
      tipoViaticos: [''],
    });

    this.filtroForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
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
          // Solo recargar si ya se tiene usuario logueado
          if (this.usuarioLogueado?.identificacion) {
            this.cargarSolicitudes();
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarOpcionesEstado();
    this.cargarOpcionesTipo();
    this.cargarUbicaciones();
    this.obtenerUsuarioLogueado();
  }

  private obtenerUsuarioLogueado(): void {
    const userInfo = this.authService.getUserInfo();
    
    if (userInfo) {
      const identificacion = userInfo.identificacion || userInfo.preferred_username || '';
      
      this.usuarioLogueado = {
        identificacion: identificacion,
        nombre: userInfo.name || userInfo.preferred_username || 'Usuario'
      };
      
      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle && usuarioOracle.nombre) {
              this.usuarioLogueado = {
                identificacion: identificacion,
                nombre: usuarioOracle.nombre
              };
              this.cargarSolicitudes();
            } else {
              this.cargarSolicitudes();
            }
          },
          error: () => {
            this.cargarSolicitudes();
          }
        });
      } else {
        this.cargarSolicitudes();
      }
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se pudo identificar el usuario. Por favor, inicie sesión nuevamente.',
      });
    }
  }

  /** Carga opciones de estado desde BD (igual que otras vistas) */
  private cargarOpcionesEstado(): void {
    // Mapeo de códigos cortos de BD a valores largos que usa el backend
    const mapaEstados: Record<string, string> = {
      'PEND': 'pendiente',
      'APRO': 'aprobado',
      'RECH': 'rechazado',
      'PAGA': 'pagado',
      'BLOQ': 'bloqueado'
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
        ];
      }
    });
  }

  /** Carga opciones de tipo desde BD (igual que otras vistas) */
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

  cargarUbicaciones(): void {
    this.ubicacionesService.getAll().subscribe({
      next: (ubicaciones) => {
        ubicaciones.forEach((ubicacion) => {
          this.ubicacionesMap.set(ubicacion.id, ubicacion.nombre);
        });
      },
      error: (_) => { /* ignored */ },
    });
  }

  cargarSolicitudes(): void {
    if (!this.usuarioLogueado?.identificacion) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario. Por favor, inicie sesión nuevamente.',
      });
      return;
    }

    this.cargando = true;
    const identificacion = this.usuarioLogueado.identificacion;
    const nombre = this.usuarioLogueado.nombre;
    
    this.solicitudService.getAll().subscribe({
      next: (todasLasSolicitudes) => {
        
        this.solicitudes = todasLasSolicitudes.filter((s) => {
          if (s.estado === 'borrador') return false;
          
          const elaboradoPor = s.elaboradoPor?.trim().toUpperCase() || '';
          const nombreUpper = nombre.toUpperCase();
          const identificacionUpper = identificacion.toUpperCase();
          
          const normalizarTexto = (texto: string) => {
            return texto
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
          };
          
          const elaboradoNormalizado = normalizarTexto(elaboradoPor);
          const nombreNormalizado = normalizarTexto(nombreUpper);
          const identificacionNormalizada = normalizarTexto(identificacionUpper);
          
          const coincide = elaboradoPor === nombreUpper || 
                          elaboradoPor === identificacionUpper ||
                          elaboradoNormalizado === nombreNormalizado ||
                          elaboradoNormalizado === identificacionNormalizada ||
                          elaboradoPor.includes(nombreUpper) ||
                          elaboradoPor.includes(identificacionUpper);
          
          return coincide;
        }).sort((a, b) => {
          // Ordenar por fecha de elaboración descendente (más recientes primero)
          const fechaA = a.fechaElaboracion ? new Date(a.fechaElaboracion).getTime() : 0;
          const fechaB = b.fechaElaboracion ? new Date(b.fechaElaboracion).getTime() : 0;
          return fechaB - fechaA;
        });
        
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cargando = false;
        
        if (this.isRealtimeRefresh) {
          this.isRealtimeRefresh = false;
        } else if (this.solicitudes.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin solicitudes',
            detail: 'No has elaborado solicitudes de viáticos aún',
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Se cargaron ${this.solicitudes.length} solicitud(es) elaborada(s) por ti`,
          });
        }
      },
      error: () => {
        this.cargando = false;
        this.solicitudes = [];
        this.aplicarFiltros();
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar tus solicitudes',
        });
      },
    });
  }

  calcularEstadisticas(): void {
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
      porcentajeAprobadas: total > 0 ? (aprobadas / total) * 100 : 0,
      porcentajePendientes: total > 0 ? (pendientes / total) * 100 : 0,
      porcentajeRechazadas: total > 0 ? (rechazadas / total) * 100 : 0,
    };
  }

  get cantidadBorradores(): number {
    return this.solicitudes.filter(s => s.estado === 'borrador').length;
  }

  aplicarFiltros(): void {
    const filtros = this.filtroForm.value;
    
    this.filtradas = this.solicitudes.filter((solicitud) => {
      return this.cumpleFiltros(solicitud, filtros);
    });
  }

  filtrarPorEstado(estado: string): void {
    this.filtroForm.patchValue({ estado: estado });
  }

  private cumpleFiltros(solicitud: SolicitudViaticos, filtros: Partial<{texto: string, estado: string, tipoViaticos: string}>): boolean {
    if (filtros.texto) {
      const textoLower = filtros.texto.toLowerCase();
      const nombreCompleto = this.obtenerNombreCompleto(solicitud).toLowerCase();
      const coincideTexto = 
        nombreCompleto.includes(textoLower) ||
        solicitud.nit?.toLowerCase().includes(textoLower) ||
        solicitud.codigoSolicitud?.toLowerCase().includes(textoLower) ||
        solicitud.cargo?.toLowerCase().includes(textoLower);
      
      if (!coincideTexto) return false;
    }

    if (filtros.estado && solicitud.estado !== filtros.estado) {
      return false;
    }

    if (filtros.tipoViaticos && solicitud.tipoViaticos?.toLowerCase() !== filtros.tipoViaticos.toLowerCase()) {
      return false;
    }

    return true;
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({
      texto: '',
      estado: '',
      tipoViaticos: '',
    });
  }

  verDetalle(solicitud: SolicitudViaticos): void {
    this.solicitudSeleccionada = solicitud;
    this.mostrarDialogoDetalle = true;
  }

  cerrarDialogoDetalle(): void {
    this.mostrarDialogoDetalle = false;
    this.solicitudSeleccionada = null;
  }

  obtenerNombreCompleto(solicitud: SolicitudViaticos): string {
    const partes = [
      solicitud.primerNombre,
      solicitud.segundoNombre,
      solicitud.primerApellido,
      solicitud.segundoApellido,
    ].filter(Boolean);
    
    return partes.join(' ');
  }

  obtenerNombreUbicacion(id: string | undefined): string {
    if (!id) return 'No especificado';
    return this.ubicacionesMap.get(id) || id;
  }

  obtenerDestinoCompleto(solicitud: SolicitudViaticos): string {
    if (solicitud.destinos && solicitud.destinos.length > 0) {
      const primerDestino = solicitud.destinos[0];
      const municipio = primerDestino.municipio ? this.obtenerNombreUbicacion(primerDestino.municipio) : '';
      const departamento = primerDestino.departamento ? this.obtenerNombreUbicacion(primerDestino.departamento) : '';
      
      // Si tiene municipio pero departamento es N/A, es ciudad internacional (nuevo formato)
      if (municipio && (!departamento || departamento === 'N/A')) {
        return municipio;
      }
      
      // Si tiene ambos válidos, es ciudad nacional
      if (municipio && departamento) {
        return `${municipio}, ${departamento}`;
      }
      
      // Formato antiguo: ciudad internacional en campo ciudad
      if (primerDestino.ciudad) {
        return this.obtenerNombreUbicacion(primerDestino.ciudad);
      }
    }
    
    return 'No especificado';
  }

  obtenerTooltipDestinos(solicitud: SolicitudViaticos): string {
    if (!solicitud.destinos || solicitud.destinos.length === 0) {
      return '';
    }

    const destinos = solicitud.destinos.map((destino, index) => {
      const municipio = destino.municipio ? this.obtenerNombreUbicacion(destino.municipio) : '';
      const departamento = destino.departamento ? this.obtenerNombreUbicacion(destino.departamento) : '';
      const ciudad = destino.ciudad ? this.obtenerNombreUbicacion(destino.ciudad) : '';
      const fechaLlegada = destino.fechaLlegada ? new Date(destino.fechaLlegada).toLocaleDateString('es-CO') : '';
      
      let destinoTexto = '';
      // Si tiene municipio pero departamento es N/A, es ciudad internacional (nuevo formato)
      if (municipio && (!departamento || departamento === 'N/A')) {
        destinoTexto = municipio;
      } else if (municipio && departamento) {
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

  async descargarPDF(solicitud: SolicitudViaticos): Promise<void> {
    try {
      const pdfBlob = await lastValueFrom(
        this.solicitudService.descargarPDFMisViaticos(solicitud.id!)
      );
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mis_Viaticos_${solicitud.codigoSolicitud}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'PDF descargado exitosamente',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el PDF',
      });
    }
  }

  /** Obtiene el nombre del destino (funciona para ciudades nacionales e internacionales) */
  obtenerNombreDestino(destino: DestinoViatico | undefined): string {
    if (!destino) return 'No especificado';
    
    const municipio = destino.municipio ? this.obtenerNombreUbicacion(destino.municipio) : '';
    const departamento = destino.departamento ? this.obtenerNombreUbicacion(destino.departamento) : '';
    
    // Si tiene municipio pero el departamento es N/A, es ciudad internacional (nuevo formato)
    if (municipio && (!departamento || departamento === 'N/A')) {
      return municipio;
    }
    
    // Si tiene ambos válidos, es ciudad nacional
    if (municipio && departamento) {
      return `${municipio}, ${departamento}`;
    }
    
    // Formato antiguo: ciudad internacional en campo ciudad
    if (destino.ciudad) {
      return this.obtenerNombreUbicacion(destino.ciudad);
    }
    
    return 'No especificado';
  }

  /** Obtiene los códigos de los centros de costo separados por coma */
  obtenerCodigosCentrosCosto(): string {
    if (!this.solicitudSeleccionada?.centrosCosto || this.solicitudSeleccionada.centrosCosto.length === 0) {
      return 'No especificado';
    }
    return this.solicitudSeleccionada.centrosCosto.map(cc => cc.codigoCentroCosto).join(', ');
  }
}
