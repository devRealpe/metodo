import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { TipoDependenciaItem, TipoSolicitudAdmin } from '../../../core/models/tipo-solicitud-admin.models';
import { DependenciaResponse } from '../../../core/models/dependencia.models';

@Component({
  selector: 'app-flujo-dependencias-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TagModule,
    DividerModule,
    TooltipModule,
  ],
  templateUrl: './flujo-dependencias-modal.component.html',
  styleUrls: ['./flujo-dependencias-modal.component.scss'],
})
export class FlujoDependenciasModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() tipoFlujo: TipoSolicitudAdmin | null = null;
  @Input() dependenciasActivas: DependenciaResponse[] = [];
  
  @Input() agregandoDependencia = false;
  @Input() eliminandoDependenciaId: string | null = null;
  @Input() guardandoOrdenId: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() addDependencia = new EventEmitter<{ uuidDependencia: string; ordenFlujo: number; flujoParalelo: boolean }>();
  @Output() removeDependencia = new EventEmitter<string>();
  @Output() reorderDependencia = new EventEmitter<{ dep: TipoDependenciaItem; nuevoOrden: number }>();

  nuevaDependencia: DependenciaResponse | null = null;
  nuevoOrden = 1;
  
  editandoOrden: string | null = null;
  ordenTemporal = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (this.visible && this.tipoFlujo) {
        this.resetAddForm();
      } else {
        this.cancelarEdicionOrden();
      }
    }
    if (changes['tipoFlujo']) {
      if (this.visible && this.tipoFlujo) {
        // If type changed while modal is open, reset next order based on new dependencias
        this.resetAddForm();
      }
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  get dependenciasDisponibles(): DependenciaResponse[] {
    if (!this.tipoFlujo) return [];
    const asignadas = new Set(this.tipoFlujo.dependencias.map(d => d.uuidDependencia));
    return this.dependenciasActivas.filter(d => !asignadas.has(d.uuid));
  }

  resetAddForm(): void {
    this.nuevaDependencia = null;
    this.nuevoOrden = (this.tipoFlujo && this.tipoFlujo.dependencias.length > 0)
      ? Math.max(...this.tipoFlujo.dependencias.map(d => d.ordenFlujo)) + 1
      : 1;
  }

  onAddDependencia(): void {
    if (!this.nuevaDependencia) return;

    const ordenExiste = this.tipoFlujo?.dependencias.some(d => d.ordenFlujo === this.nuevoOrden) || false;

    this.addDependencia.emit({
      uuidDependencia: this.nuevaDependencia.uuid,
      ordenFlujo: this.nuevoOrden,
      flujoParalelo: ordenExiste
    });
    // Form will reset after successful add from parent if necessary, 
    // or parent will update tipoFlujo, triggering ngOnChanges
  }

  onRemoveDependencia(uuid: string): void {
    this.removeDependencia.emit(uuid);
  }

  iniciarEdicionOrden(dep: TipoDependenciaItem): void {
    this.editandoOrden = dep.uuid;
    this.ordenTemporal = dep.ordenFlujo;
  }

  cancelarEdicionOrden(): void {
    this.editandoOrden = null;
  }

  guardarOrden(dep: TipoDependenciaItem): void {
    if (this.ordenTemporal === dep.ordenFlujo) {
      this.cancelarEdicionOrden();
      return;
    }
    this.reorderDependencia.emit({ dep, nuevoOrden: this.ordenTemporal });
    this.editandoOrden = null;
  }
}
