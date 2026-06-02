 import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { AuthService } from '@microfrontends/shared-services';
    
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';

import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { PostulacionService } from '../../core/services/postulacion.service';
import { PersonasService } from '../../core/services/personas.service';

@Component({
  selector: 'app-ofertas-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,    
    ButtonModule,
    CardModule,
    ToastModule,
    ToolbarModule,
    SelectModule,
    ChipModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    InputTextModule,
    DialogModule,
    MessageModule,
  ],
  templateUrl: './ofertas-usuarios.component.html',
  styleUrls: ['./ofertas-usuarios.component.scss'],
  providers: [MessageService],
})
export class OfertasUsuariosComponent implements OnInit {
  ofertas: (OfertaLaboral & { yaPostulado?: boolean })[] = [];
  ofertasFiltradas: (OfertaLaboral & { yaPostulado?: boolean })[] = [];
  loading: boolean = false;
  
  detalleVisible: boolean = false;
  ofertaSeleccionada: OfertaLaboral | null = null;
  filtroTexto: string = '';
  filtroEstado: string = 'activas';
  opcionesEstadoAdmin = [
    { label: 'Todas las ofertas', value: 'todas' },
    { label: 'Solo activas', value: 'activas' },
    { label: 'Solo cerradas', value: 'inactivas' }
  ];

  havePermission = false;
  private esEmpleado = false;
  
  private ofertaIdFromRoute: string | null = null;

  constructor(
    private ofertaLaboralService: OfertaLaboralService,
    private postulacionService: PostulacionService,
    private personasService: PersonasService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.havePermission = this.authService.hasRole('ADMIN') || this.authService.hasRole('GESTION_HUMANA');

    this.route.paramMap.subscribe(params => {
      this.ofertaIdFromRoute = params.get('id');
    });

    // Verificar si el usuario es empleado de la universidad via oracle-service
    if (!this.havePermission) {
      this.personasService.esEmpleadoUniversidad().subscribe({
        next: (result) => {
          this.esEmpleado = result.esEmpleado;
          this.cargarOfertas();
        },
        error: () => {
          this.esEmpleado = false;
          this.cargarOfertas();
        }
      });
    } else {
      this.cargarOfertas();
    }
  }

  cargarOfertas(): void {
    this.loading = true;
    this.ofertaLaboralService.getAll().subscribe({
      next: (ofertas: any) => {
        this.ofertas = Array.isArray(ofertas) ? ofertas : [];
        this.verificarPostulaciones();
        this.filtroTexto = '';
        this.filtroEstado = 'activas';
        this.aplicarFiltros();
        this.loading = false;
        
        if (this.ofertaIdFromRoute) {
          const ofertaEspecifica = this.ofertas.find(o => o.id?.toString() === this.ofertaIdFromRoute);
          if (ofertaEspecifica) {
            this.verDetalle(ofertaEspecifica);
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Oferta no encontrada',
              detail: 'La oferta laboral solicitada no está disponible'
            });
          }
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las ofertas laborales'
        });
        this.loading = false;
      }
    });
  }

  verificarPostulaciones(): void {
    this.personasService.getPersonaActual().subscribe({
      next: (persona) => {
        if (persona?.id && Array.isArray(this.ofertas)) {
          this.ofertas.forEach(oferta => {
            if (oferta.id) {
              this.postulacionService.verificarPostulacion(persona.id!, oferta.id!).subscribe({
                next: (response) => {
                  oferta.yaPostulado = response.yaSePostulo;
                },
                error: () => {
                  oferta.yaPostulado = false;
                }
              });
            }
          });
        }
      },
      error: () => {
      }
    });
  }

  aplicarFiltros(): void {
    let ofertasFiltradas = Array.isArray(this.ofertas) ? [...this.ofertas] : [];

    if (!this.havePermission) {
      // Usuarios normales: solo ver ofertas activas y vigentes (no vencidas por fecha).
      // Filtrar internas si no es empleado.
      if (!this.esEmpleado) {
        ofertasFiltradas = ofertasFiltradas.filter(oferta =>
          !oferta.tipoConvocatoria?.toLowerCase().includes('interna')
        );
      }
      // Solo activas por toggle
      ofertasFiltradas = ofertasFiltradas.filter(oferta => oferta.activo);
      // Solo vigentes por fecha (fin del día de cierre inclusive, respetando UTC para evitar desfase de zona horaria)
      const ahora = new Date();
      ofertasFiltradas = ofertasFiltradas.filter(oferta => {
        if (!oferta.fechaCierre) return true;
        const parsed = new Date(oferta.fechaCierre as string);
        if (isNaN(parsed.getTime())) return true;
        const finDelDiaDeCierre = new Date(
          parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999
        );
        return finDelDiaDeCierre >= ahora;
      });
    } else {
      // Admins: filtro opcional por estado
      if (this.filtroEstado && this.filtroEstado !== 'todas') {
        if (this.filtroEstado === 'activas') {
          const ahora = new Date();
          ofertasFiltradas = ofertasFiltradas.filter(oferta => {
            if (!oferta.activo) return false;
            if (!oferta.fechaCierre) return true;
            const parsed = new Date(oferta.fechaCierre as string);
            if (isNaN(parsed.getTime())) return true;
            const finDelDiaDeCierre = new Date(
              parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999
            );
            return finDelDiaDeCierre >= ahora;
          });
        } else {
          // 'inactivas': activo=false O con fecha vencida
          const ahora = new Date();
          ofertasFiltradas = ofertasFiltradas.filter(oferta => {
            if (!oferta.activo) return true;
            if (!oferta.fechaCierre) return false;
            const parsed = new Date(oferta.fechaCierre as string);
            if (isNaN(parsed.getTime())) return false;
            const finDelDiaDeCierre = new Date(
              parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999
            );
            return finDelDiaDeCierre < ahora;
          });
        }
      }
    }

    if (this.filtroTexto && this.filtroTexto.trim()) {
      const texto = this.filtroTexto.toLowerCase().trim();
      ofertasFiltradas = ofertasFiltradas.filter(oferta =>
        (oferta.cargoRequerido && oferta.cargoRequerido.toLowerCase().includes(texto)) ||
        (oferta.funciones && oferta.funciones.toLowerCase().includes(texto)) ||
        (oferta.tipoConvocatoria && oferta.tipoConvocatoria.toLowerCase().includes(texto)) ||
        (oferta.departamentoSolicitante && oferta.departamentoSolicitante.toLowerCase().includes(texto))
      );
    }

    this.ofertasFiltradas = ofertasFiltradas;
  }

  onFiltroTextoChange(): void {
    this.aplicarFiltros();
  }

  onFiltroEstadoChange(): void {
    this.aplicarFiltros();
  }

  postularse(oferta: OfertaLaboral): void {
    if (!oferta?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la convocatoria. Intente nuevamente.'
      });
      return;
    }
    this.router.navigate(['/app/postulacion', oferta.id]);
  }

  verDetalle(oferta: OfertaLaboral): void {
    this.ofertaSeleccionada = oferta;
    this.detalleVisible = true;
  }

  irAVistaAdmin(): void {
    
    this.router.navigate(['/app/administrador-convocatorias']);
  }

  obtenerSeveridadEstado(activo: boolean): 'success' | 'danger' {
    return activo ? 'success' : 'danger';
  }

  obtenerTextoEstado(activo: boolean): string {
    return activo ? 'Activa' : 'Inactiva';
  }
  private normalizeDateForCards(date: string | Date | null | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) {
      const d = date;
      if (isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0);
  }

  formatearFecha(fecha?: string | Date): string {
    const d = this.normalizeDateForCards(fecha);
    if (!d) return '';
    return d.toLocaleDateString('es-CO');
  }

  esOfertaVigente(fechaCierre?: string | Date): boolean {
    if (!fechaCierre) return true;
    const d = this.normalizeDateForCards(fechaCierre);
    if (!d) return true;
    const today = new Date();
    const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    // >= para que el día de cierre sea inclusive: todo ese día se considera vigente
    return d >= todayNorm;
  }

  getDaysRemaining(fechaCierre?: string): number {
    if (!fechaCierre) return 0;
    const cierre = this.normalizeDateForCards(fechaCierre);
    if (!cierre) return 0;
    const today = new Date();
    const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    return Math.max(0, Math.ceil((cierre.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24)));
  }

  getDaysRemainingLabel(fechaCierre?: string): string {
    const days = this.getDaysRemaining(fechaCierre);
    if (days === 0) return 'Cierra hoy';
    if (days === 1) return '1 día';
    return days + ' días';
  }

  navigateToSystem(): void {
    window.location.href = window.location.origin + '/hojas_de_vida/register';
  }

  getVacantes(oferta: OfertaLaboral): number {
    return (oferta as any).vacantes ?? 1;
  }
  formatearTipoConvocatoria(tipo: string): string {
    if (!tipo) return '';
    return tipo.toLowerCase() === 'ambas' ? 'Interna/Externa' : tipo;
  }
}