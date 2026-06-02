import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';

import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';
import { PostulacionSeleccionada } from '../../core/models/postulacion-seleccionada.model';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { environment } from '@shared/shared-environments';
import { ImageViewerComponent, FotoCacheService, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { DateFormatterUtil, CalculationUtil } from '../../core/utils';
import { PersonasService } from '../../core/services/personas.service';
import { EntrevistasService, EmailNotificationService, NotificationManagementService } from '@microfrontends/shared-services';
import { NotificationType, NotificationPriority } from '@microfrontends/shared-models';

@Component({
  selector: 'app-seleccionados-fase2',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TableModule,
    TagModule,
    DialogModule,
    ProgressSpinnerModule,
    CheckboxModule,
    BreadcrumbModule,
    TooltipModule,
    ImageViewerComponent,
    InfoTableComponent
  ],
  providers: [MessageService],
  templateUrl: './seleccionados-fase2.component.html',
  styleUrls: ['./seleccionados-fase2.component.scss']
})
export class SeleccionadosFase2Component implements OnInit, OnDestroy {
  
  ofertaId: string = '';
  oferta: OfertaLaboral | null = null;
  seleccionados: PostulacionSeleccionada[] = [];
  seleccionadosMapeados: any[] = []; 
  
  loading = false;
  mostrarDetalleSeleccion = false;
  seleccionadoActual: PostulacionSeleccionada | null = null;

  // diálogo personalizado para confirmar avance a Fase 3
  mostrarDialogConfirmacionFase3 = false;
  seleccionadoFase3: PostulacionSeleccionada | null = null;

  // diálogo de notificación manual Fase 2
  mostrarDialogNotificacion = false;
  seleccionadosParaNotificar: Set<string> = new Set();
  seleccionarTodosNotificacion = false;
  enviandoNotificaciones = false;

  modoEntrevistasMasivas = false;
  postulacionesParaEntrevista: Set<string> = new Set();
  seleccionarTodosEntrevista = false;

  columns: TableColumn[] = [];
  actions: TableAction[] = [];

  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/administrador-convocatorias' };
  breadcrumbItems: MenuItem[] = [
    { label: 'Ofertas Finalizadas', routerLink: '/app/ofertas-finalizadas' },
    { label: 'Candidatos Seleccionados' }
  ];

  private fotosCache = new Map<string, string>();
  private nombresCache = new Map<string, string>(); 
  private entrevistasCache = new Map<string, boolean>(); 
  
  constructor(
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private fotoCacheService: FotoCacheService,
    private personasService: PersonasService,
    private entrevistasService: EntrevistasService,
    private emailService: EmailNotificationService,
    private notificationService: NotificationManagementService
  ) {}  ngOnInit(): void {
    this.initializeTable();
    this.cargarNombresPersonas();
    
    this.route.queryParams.subscribe(params => {
      this.ofertaId = params['ofertaId'] || '';
      
      if (!this.ofertaId) {
        this.router.navigate(['/app/ofertas-finalizadas']);
        return;
      }
      
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        this.oferta = navigation.extras.state['oferta'];
      }
      
      this.cargarSeleccionados();
    });
  }

  private initializeTable(): void {
    const checkboxColumn: TableColumn = {
      field: 'seleccion',
      header: '',
      sortable: false,
      type: 'custom',
      width: '50px'
    };

    this.columns = [
      ...(this.modoEntrevistasMasivas ? [checkboxColumn] : []), 
      {
        field: 'candidato',
        header: 'Candidato',
        sortable: true,
        type: 'custom'
      },
      {
        field: 'tipoDocumento',
        header: 'Tipo Doc.',
        sortable: true
      },
      {
        field: 'numeroDocumento',
        header: 'Número Documento',
        sortable: true
      },
      {
        field: 'fechaSeleccion',
        header: 'Fecha Selección',
        sortable: true
      },
      {
        field: 'estado',
        header: 'Estado',
        sortable: true,
        type: 'badge',
        badgeConfig: {
          getSeverity: () => 'success',
          getLabel: (value: string) => value
        }
      }
    ];

    this.actions = [
      {
        icon: 'pi pi-eye',
        label: 'Ver Detalle',
        severity: 'info',
        outlined: true,
        tooltip: 'Ver detalle de selección',
        onClick: (row: PostulacionSeleccionada) => this.verDetalleSeleccion(row)
      },
      {
        icon: (row: PostulacionSeleccionada) => this.tieneEntrevista(row.postulacion?.id) ? 'pi pi-eye' : 'pi pi-plus',
        label: (row: PostulacionSeleccionada) => this.tieneEntrevista(row.postulacion?.id) ? 'Ver Entrevista' : 'Realizar Entrevista',
        severity: 'warn',
        outlined: true,
        tooltip: (row: PostulacionSeleccionada) => this.tieneEntrevista(row.postulacion?.id) ? 'Ver entrevista realizada' : 'Realizar nueva entrevista',
        onClick: (row: PostulacionSeleccionada) => {
          if (this.tieneEntrevista(row.postulacion?.id)) {
            this.verEntrevista(row);
          } else {
            this.realizarEntrevista(row);
          }
        }
      },
      {
        icon: (row: PostulacionSeleccionada) => row.seleccionadoFase3 ? 'pi pi-check-circle' : 'pi pi-check',
        label: (row: PostulacionSeleccionada) => row.seleccionadoFase3 ? 'Seleccionado' : 'Seleccionar',
        severity: 'success',
        outlined: false,
        styleClass: 'mi-boton-confirmar',
        tooltip: '',
        disabled: (row: PostulacionSeleccionada) => row.seleccionadoFase3 === true,
        onClick: (row: PostulacionSeleccionada) => this.seleccionarParaFase3(row)
      }
    ];
  }

  cargarSeleccionados(): void {
    this.loading = true;
    
    this.postulacionesSeleccionadasService.listarPorOferta(this.ofertaId).subscribe({
      next: (seleccionados) => {
        this.seleccionados = seleccionados;
        
        this.seleccionadosMapeados = this.seleccionados.map(sel => {
          const postulacion = sel.postulacion;
          
          return {
            ...sel,
            candidato: postulacion?.nombreCompleto || postulacion?.nombres || 'Información no disponible',
            tipoDocumento: postulacion?.tipoDocumento || 'N/A',
            numeroDocumento: postulacion?.identificacion || postulacion?.numeroDocumento || 'N/A',
            fechaSeleccion: this.formatFecha(sel.fechaSeleccion),
            estado: 'Seleccionado'
          };
        });
        
        this.verificarEntrevistas();
        
        if (this.seleccionados.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'No hay candidatos seleccionados para esta oferta',
            life: 5000
          });
        }
        
        this.loading = false;
      },
      error: (error) => {
          this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo cargar la lista de seleccionados',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  private verificarEntrevistas(): void {
    this.seleccionados.forEach(sel => {
      if (sel.postulacion?.id) {
        this.entrevistasService.obtenerEntrevistaPorPostulacion(sel.postulacion.id).subscribe({
          next: (entrevista) => {
            this.entrevistasCache.set(sel.postulacion.id, entrevista !== null);
          },
          error: () => {
            this.entrevistasCache.set(sel.postulacion.id, false);
          }
        });
      }
    });
  }

  tieneEntrevista(postulacionId: string | undefined): boolean {
    if (!postulacionId) return false;
    return this.entrevistasCache.get(postulacionId) || false;
  }

  verEntrevista(seleccionado: PostulacionSeleccionada): void {
    this.router.navigate(['/app/lista-entrevistas'], {
      queryParams: { 
        postulacionId: seleccionado.postulacion.id,
        nombreAspirante: seleccionado.postulacion.nombreCompleto || 
          `${seleccionado.postulacion.persona?.primerNombre || ''} ${seleccionado.postulacion.persona?.primerApellido || ''}`.trim()
      }
    });
  }

  realizarEntrevista(seleccionado: PostulacionSeleccionada): void {
    this.router.navigate(['/app/entrevistas/crear'], {
      queryParams: {
        idPostulacion: seleccionado.postulacion.id,
        desde: 'fase2'
      }
    });
  }

  verDetalleSeleccion(seleccionado: PostulacionSeleccionada): void {
    this.seleccionadoActual = seleccionado;
    this.mostrarDetalleSeleccion = true;
  }

  cerrarDetalleSeleccion(): void {
    this.mostrarDetalleSeleccion = false;
    this.seleccionadoActual = null;
  }

  seleccionarParaFase3(seleccionado: PostulacionSeleccionada): void {
    if (!seleccionado.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede seleccionar: ID de selección no disponible',
        life: 3000
      });
      return;
    }
    this.abrirDialogConfirmacionFase3(seleccionado);
  }

  abrirDialogConfirmacionFase3(seleccionado: PostulacionSeleccionada): void {
    this.seleccionadoFase3 = seleccionado;
    this.mostrarDialogConfirmacionFase3 = true;
  }

  cerrarDialogConfirmacionFase3(): void {
    this.mostrarDialogConfirmacionFase3 = false;
    this.seleccionadoFase3 = null;
  }

  confirmarSeleccionFase3(): void {
    if (!this.seleccionadoFase3?.id) {
      return;
    }
    this.loading = true;
    this.postulacionesSeleccionadasService
      .marcarComoSeleccionadoFase3(this.seleccionadoFase3.id)
      .subscribe({
        next: (seleccionActualizada) => {
          const index = this.seleccionados.findIndex(
            (s) => s.id === this.seleccionadoFase3?.id
          );
          if (index !== -1) {
            this.seleccionados[index] = seleccionActualizada;
          }
          const indexMapeado = this.seleccionadosMapeados.findIndex(
            (s) => s.id === this.seleccionadoFase3?.id
          );
          if (indexMapeado !== -1) {
            this.seleccionadosMapeados[indexMapeado] = {
              ...this.seleccionadosMapeados[indexMapeado],
              ...seleccionActualizada,
            };
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `${this.seleccionadoFase3?.postulacion?.nombreCompleto ||
              'El candidato'} ha sido seleccionado para Fase 3`,
            life: 5000,
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'No se pudo actualizar la selección para Fase 3',
            life: 5000,
          });
        },
        complete: () => {
          this.loading = false;
          this.cerrarDialogConfirmacionFase3();
        },
      });
  }

  formatFecha(fecha: Date | string | undefined): string {
    if (!fecha) return '-';
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '-';
    }
  }

  getInitials(nombre: any): string {
    // convert to string and trim whitespace
    if (nombre == null || nombre === '') {
      return '?';
    }
    const str = String(nombre).trim();
    if (str.length === 0) {
      return '?';
    }
    const parts = str.split(/\s+/);
    if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
      const initials = parts[0][0] + parts[1][0];
      return initials.toString().toUpperCase();
    }
    // fallback: first two characters
    return str.substring(0, 2).toUpperCase();
  }

  getFotoUrl(seleccionado: PostulacionSeleccionada): string | null {
    const personaId = seleccionado.postulacion?.personaId;
    if (!personaId) {
      return null;
    }
    
    if (this.fotosCache.has(personaId)) {
      return this.fotosCache.get(personaId) || null;
    }
    
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

  private cargarNombresPersonas(): void {
    this.personasService.obtenerPersonas().subscribe({
      next: (personas) => {
        personas.forEach(persona => {
          if (persona.identificacion) {
            const nombreCompleto = `${persona.primerNombre || ''} ${persona.segundoNombre || ''} ${persona.primerApellido || ''} ${persona.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();
            this.nombresCache.set(persona.identificacion, nombreCompleto);
          }
        });
      },
      error: (error) => {
      }
    });
  }

  obtenerNombreCompleto(identificacion: string | undefined): string {
    if (!identificacion) {
      return 'Usuario autenticado';
    }
    
    if (this.nombresCache.has(identificacion)) {
      return this.nombresCache.get(identificacion)!;
    }
    return identificacion;
  }

  ngOnDestroy(): void {
    this.fotosCache.clear();
    this.nombresCache.clear();
    this.entrevistasCache.clear();
  }

  // ─── Notificación Manual Fase 2 ───────────────────────────────────────────

  abrirDialogNotificacion(): void {
    this.seleccionadosParaNotificar.clear();
    this.seleccionarTodosNotificacion = false;
    this.mostrarDialogNotificacion = true;
  }

  cerrarDialogNotificacion(): void {
    this.mostrarDialogNotificacion = false;
    this.seleccionadosParaNotificar.clear();
    this.seleccionarTodosNotificacion = false;
  }

  toggleSeleccionNotificacion(id: string): void {
    if (this.seleccionadosParaNotificar.has(id)) {
      this.seleccionadosParaNotificar.delete(id);
    } else {
      this.seleccionadosParaNotificar.add(id);
    }
    this.seleccionarTodosNotificacion =
      this.seleccionados.length > 0 &&
      this.seleccionados.every(s => s.id && this.seleccionadosParaNotificar.has(s.id));
  }

  toggleSeleccionarTodosNotificacion(checked: boolean): void {
    if (checked) {
      this.seleccionados.forEach(s => { if (s.id) this.seleccionadosParaNotificar.add(s.id); });
    } else {
      this.seleccionadosParaNotificar.clear();
    }
    this.seleccionarTodosNotificacion = checked;
  }

  confirmarEnvioNotificaciones(): void {
    if (this.seleccionadosParaNotificar.size === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Debe seleccionar al menos un candidato',
        life: 3000
      });
      return;
    }

    this.enviandoNotificaciones = true;
    const ids = Array.from(this.seleccionadosParaNotificar);

    this.postulacionesSeleccionadasService.enviarNotificacionesManualesFase2(ids).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Notificaciones enviadas',
          detail: `Se notificó a ${res.enviados} candidato(s) correctamente`,
          life: 5000
        });
        this.cerrarDialogNotificacion();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.mensaje || 'No se pudieron enviar las notificaciones',
          life: 5000
        });
      },
      complete: () => {
        this.enviandoNotificaciones = false;
      }
    });
  }

  toggleModoEntrevistasMasivas(): void {
    this.modoEntrevistasMasivas = !this.modoEntrevistasMasivas;
    
    if (!this.modoEntrevistasMasivas) {
      this.postulacionesParaEntrevista.clear();
      this.seleccionarTodosEntrevista = false;
    }
  
    this.initializeTable();
  }
  
  toggleSeleccionEntrevista(postulacionId: string): void {
    if (this.postulacionesParaEntrevista.has(postulacionId)) {
      this.postulacionesParaEntrevista.delete(postulacionId);
    } else {
      this.postulacionesParaEntrevista.add(postulacionId);
    }
    
    this.actualizarSeleccionarTodosEntrevista();
  }
  
  seleccionarTodosEntrevistaChange(event: any): void {
    if (event.checked) {
      this.seleccionados.forEach(sel => {
        if (sel.id) {
          this.postulacionesParaEntrevista.add(sel.id);
        }
      });
    } else {
      this.postulacionesParaEntrevista.clear();
    }
  }
  
  private actualizarSeleccionarTodosEntrevista(): void {
    this.seleccionarTodosEntrevista = 
      this.seleccionados.length > 0 && 
      this.seleccionados.every(sel => sel.id && this.postulacionesParaEntrevista.has(sel.id));
  }
  
  iniciarEntrevistasMasivas(): void {
    if (this.postulacionesParaEntrevista.size === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Debe seleccionar al menos un aspirante',
        life: 3000
      });
      return;
    }
    
    const postulacionesSeleccionadas = this.seleccionados.filter(sel => 
      sel.id && this.postulacionesParaEntrevista.has(sel.id)
    );
    
    
    if (postulacionesSeleccionadas.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No se pudieron recuperar los datos de las postulaciones seleccionadas',
        life: 3000
      });
      return;
    }
    
    this.router.navigate(['/app/entrevistas-masivas'], {
      state: { postulaciones: postulacionesSeleccionadas }
    });
  }

  descargarCsv(): void {
    if (!this.ofertaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede generar el CSV: ID de oferta no disponible',
        life: 3000
      });
      return;
    }

    if (this.seleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'No hay candidatos seleccionados para exportar',
        life: 3000
      });
      return;
    }

    this.loading = true;
    
    this.postulacionesSeleccionadasService.descargarCsvSeleccionados(this.ofertaId).subscribe({
      next: (blob: Blob) => {
        this.descargarArchivo(blob, 'todos');
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo generar el archivo CSV',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  descargarCsvIndividual(seleccionado: PostulacionSeleccionada): void {
    if (!seleccionado.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede generar el CSV: ID de selección no disponible',
        life: 3000
      });
      return;
    }

    this.postulacionesSeleccionadasService.descargarCsvSeleccionadoIndividual(seleccionado.id).subscribe({
      next: (blob: Blob) => {
        const nombreCandidato = seleccionado.postulacion?.nombreCompleto || 
                               seleccionado.postulacion?.identificacion || 
                               'candidato';
        this.descargarArchivo(blob, 'individual', nombreCandidato);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Datos de ${nombreCandidato} descargados correctamente`,
          life: 3000
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo generar el archivo CSV del candidato',
          life: 5000
        });
      }
    });
  }

  private descargarArchivo(blob: Blob, tipo: 'todos' | 'individual', nombreCandidato?: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fecha = new Date().toISOString().split('T')[0];
    
    if (tipo === 'todos') {
      const nombreOferta = this.oferta?.cargoRequerido?.replace(/\s+/g, '_') || 'oferta';
      link.download = `candidatos_seleccionados_${nombreOferta}_${fecha}.csv`;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `${this.seleccionados.length} candidato(s) exportado(s) correctamente`,
        life: 3000
      });
    } else {
      const nombre = nombreCandidato?.replace(/\s+/g, '_') || 'candidato';
      link.download = `candidato_${nombre}_${fecha}.csv`;
    }
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  get puedeDescargarCsv(): boolean {
    return this.seleccionados.length > 0;
  }

  private enviarNotificacionSeleccionFase2(seleccionado: PostulacionSeleccionada): void {
    const personaId = seleccionado.postulacion?.personaId;
    
    if (!personaId) {
      return;
    }

    this.personasService.obtenerPersonaPorId(personaId).subscribe({
      next: (persona: any) => {
        const email = persona.correo || persona.correoPersonal;
        if (!email || !email.trim()) {
          return;
        }

        const nombreCompleto = seleccionado.postulacion?.nombreCompleto || 
                               `${persona.primerNombre || ''} ${persona.primerApellido || ''}`.trim() ||
                               'Candidato';
        const ofertaTitulo = this.oferta?.cargoRequerido || 'Convocatoria Laboral';
        const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'N/A';

        this.emailService.notificarSeleccionFase2(
          email,
          nombreCompleto,
          ofertaTitulo,
          numeroConvocatoria
        ).subscribe({
          next: () => {

          },
          error: (error) => {
          }
        });
      },
      error: (error: any) => {
      }
    });
  }

  private enviarNotificacionMongoDBFase2(seleccionado: PostulacionSeleccionada): void {

    const personaId = seleccionado.postulacion?.personaId;
    
    if (!personaId) {
      return;
    }

    this.personasService.obtenerPersonaPorId(personaId).subscribe({
      next: (persona: any) => {

        const email = persona.correo || persona.correoPersonal;

        if (!email || !email.trim()) {
          return;
        }

        const nombreCompleto = seleccionado.postulacion?.nombreCompleto || 
                               `${persona.primerNombre || ''} ${persona.primerApellido || ''}`.trim() ||
                               'Candidato';
        const ofertaTitulo = this.oferta?.cargoRequerido || 'Convocatoria Laboral';
        const numeroConvocatoria = this.oferta?.numeroConvocatoria || 'N/A';


        this.notificationService.createNotification({
          title: '🌟 ¡Excelente! Has superado la Fase 2',
          message: `Felicitaciones, has sido seleccionado en la Fase 2 para la convocatoria: ${ofertaTitulo} (${numeroConvocatoria}). Estás muy cerca de lograr tu objetivo.`,
          type: NotificationType.INFO,
          priority: NotificationPriority.HIGH,
          userEmail: email,
          projectContext: 'hojas_de_vida',
          link: `/app/mis-postulaciones`,
          icon: 'pi pi-star-fill',
          metadata: {
            ofertaId: this.ofertaId,
            postulacionId: seleccionado.postulacion?.id,
            ofertaTitulo: ofertaTitulo,
            numeroConvocatoria: numeroConvocatoria,
            candidatoNombre: nombreCompleto,
            fechaSeleccion: new Date().toISOString(),
            fase: 'FASE_2_SELECCION_FINAL'
          }
        }).subscribe({
          next: () => {
          },
          error: (error) => {
          }
        });
      },
      error: (error: any) => {
      }
    });
  }
}

