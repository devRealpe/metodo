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
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';
import { PostulacionSeleccionada } from '../../core/models/postulacion-seleccionada.model';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { environment } from '@shared/shared-environments';
import { ImageViewerComponent, FotoCacheService, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { PersonasService } from '../../core/services/personas.service';

@Component({
  selector: 'app-seleccionados-fase3',
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
    BreadcrumbModule,
    ImageViewerComponent,
    InfoTableComponent
  ],
  providers: [MessageService],
  templateUrl: './seleccionados-fase3.component.html',
  styleUrls: ['./seleccionados-fase3.component.scss']
})
export class SeleccionadosFase3Component implements OnInit, OnDestroy {
  
  ofertaId: string = '';
  oferta: OfertaLaboral | null = null;
  seleccionados: PostulacionSeleccionada[] = [];
  seleccionadosMapeados: any[] = [];
  
  loading = false;
  mostrarDetalleSeleccion = false;
  seleccionadoActual: PostulacionSeleccionada | null = null;

  columns: TableColumn[] = [];
  actions: TableAction[] = [];

  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/administrador-convocatorias' };
  breadcrumbItems: MenuItem[] = [
    { label: 'Ofertas Finalizadas', routerLink: '/app/ofertas-finalizadas' },
    { label: 'Candidatos Fase 3' }
  ];

  private fotosCache = new Map<string, string>();
  private nombresCache = new Map<string, string>();
  
  constructor(
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private fotoCacheService: FotoCacheService,
    private personasService: PersonasService
  ) {}

  ngOnInit(): void {
    this.initializeTable();
    this.cargarNombresPersonas();
    
    this.route.queryParams.subscribe(params => {
      this.ofertaId = params['ofertaId'] || '';
      
      if (!this.ofertaId) {
        this.cargarTodosLosSeleccionadosFase3();
        return;
      }
      
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        this.oferta = navigation.extras.state['oferta'];
      }
      
      this.cargarSeleccionadosFase3();
    });
  }

  private initializeTable(): void {
    this.columns = [
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
        field: 'fechaSeleccionFase2',
        header: 'Fecha Selección Fase 2',
        sortable: true
      },
      {
        field: 'fechaSeleccionFase3',
        header: 'Fecha Selección Fase 3',
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
      }
    ];
  }

  cargarSeleccionadosFase3(): void {
    this.loading = true;
    
    this.postulacionesSeleccionadasService.listarSeleccionadosFase3PorOferta(this.ofertaId).subscribe({
      next: (seleccionados) => {
        this.procesarSeleccionados(seleccionados);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo cargar la lista de seleccionados Fase 3',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  cargarTodosLosSeleccionadosFase3(): void {
    this.loading = true;
    
    this.postulacionesSeleccionadasService.listarTodosLosSeleccionadosFase3().subscribe({
      next: (seleccionados) => {
        this.procesarSeleccionados(seleccionados);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo cargar la lista de seleccionados Fase 3',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  private procesarSeleccionados(seleccionados: PostulacionSeleccionada[]): void {
    this.seleccionados = seleccionados;
    
    this.seleccionadosMapeados = this.seleccionados.map(sel => {
      const postulacion = sel.postulacion;
      
      return {
        ...sel,
        candidato: postulacion?.nombreCompleto || postulacion?.nombres || 'Información no disponible',
        tipoDocumento: postulacion?.tipoDocumento || 'N/A',
        numeroDocumento: postulacion?.identificacion || postulacion?.numeroDocumento || 'N/A',
        fechaSeleccionFase2: this.formatFecha(sel.fechaSeleccion),
        fechaSeleccionFase3: this.formatFecha(sel.fechaSeleccionFase3),
        estado: 'Fase 3'
      };
    });
    
    if (this.seleccionados.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Información',
        detail: 'No hay candidatos en Fase 3 para esta oferta',
        life: 5000
      });
    }
    
    this.loading = false;
  }

  verDetalleSeleccion(seleccionado: PostulacionSeleccionada): void {
    this.seleccionadoActual = seleccionado;
    this.mostrarDetalleSeleccion = true;
  }

  cerrarDetalleSeleccion(): void {
    this.mostrarDetalleSeleccion = false;
    this.seleccionadoActual = null;
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
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  }

  getInitials(nombre: string | undefined): string {
    if (!nombre) return '?';
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  getFotoUrl(seleccionado: PostulacionSeleccionada): string | null {
    const personaId = seleccionado.postulacion?.personaId;
    if (!personaId) return null;
    
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

  volverAOfertas(): void {
    this.router.navigate(['/app/ofertas-finalizadas']);
  }

  volverAlDashboard(): void {
    this.router.navigate(['/app/administrador-convocatorias']);
  }

  ngOnDestroy(): void {
    this.fotosCache.clear();
    this.nombresCache.clear();
  }
}
