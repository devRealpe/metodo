import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { SolicitudResponse } from '../../../core/models/solicitud.models';

@Component({
  selector: 'app-detalle-solicitud-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TagModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './detalle-solicitud-modal.component.html',
  styleUrls: ['./detalle-solicitud-modal.component.scss'],
})
export class DetalleSolicitudModalComponent {
  @Input() visible = false;
  @Input() solicitudDetalle: SolicitudResponse | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  onVisibleChange(val: boolean): void {
    this.visible = val;
    this.visibleChange.emit(this.visible);
    if (!val) {
      this.close.emit();
    }
  }

  cerrarDetalle(): void {
    this.onVisibleChange(false);
  }

  getSeveridadEstado(estado: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      PENDIENTE: 'warn',
      EN_PROCESO: 'info',
      OBSERVACION: 'warn',
      RECHAZADO: 'danger',
      FINALIZADO: 'success',
    };
    return map[estado] ?? 'secondary';
  }

  getEtiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      OBSERVACION: 'Observación',
      RECHAZADO: 'Rechazado',
      FINALIZADO: 'Finalizado',
    };
    return map[estado] ?? estado;
  }

  getIconoEstado(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'pi pi-clock',
      EN_PROCESO: 'pi pi-cog',
      OBSERVACION: 'pi pi-exclamation-triangle',
      RECHAZADO: 'pi pi-times-circle',
      FINALIZADO: 'pi pi-check-circle',
    };
    return map[estado] ?? 'pi pi-circle';
  }

  getSeveridadRevision(estado: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      PENDIENTE: 'secondary',
      APROBADO: 'success',
      RECHAZADO: 'danger',
      OBSERVACION: 'warn',
    };
    return map[estado] ?? 'secondary';
  }

  readonly sortByEstadoYOrden = (
    a: { ordenFlujo: number; estado: string; puedeAprobar: boolean },
    b: { ordenFlujo: number; estado: string; puedeAprobar: boolean }
  ): number => {
    const prioridad = (r: { estado: string; puedeAprobar: boolean }): number => {
      if (r.estado === 'APROBADO') return 0;
      if (r.puedeAprobar) return 1;
      return 2;
    };
    const diff = prioridad(a) - prioridad(b);
    return diff !== 0 ? diff : a.ordenFlujo - b.ordenFlujo;
  };

  getEtiquetaRevision(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADO: 'Aprobado',
      RECHAZADO: 'Rechazado',
      OBSERVACION: 'Observación',
    };
    return map[estado] ?? estado;
  }

  formatearFecha(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
