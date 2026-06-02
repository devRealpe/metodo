import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

export interface PlanOpcion {
  id: string;
  label: string;
  periodo: string;
}

@Component({
  selector: 'app-modal-activar-novedad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputTextModule
  ],
  templateUrl: './modal-activar-novedad.component.html',
  styleUrls: ['./modal-activar-novedad.component.scss'],
})
export class ModalActivarNovedadComponent implements OnChanges{
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() registradoPorNombreCedula: string = '';
  @Input() planesDisponibles: PlanOpcion[] = [];
  @Input() periodosOpciones: { label: string; value: string }[] = [];

  @Output() onConfirmar = new EventEmitter<{ planId: string }>();
  @Output() onCancelar = new EventEmitter<void>();
  
  planSeleccionadoId: string = '';
  periodoSeleccionado: string = '';
  planesDisponiblesFiltrados: PlanOpcion[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['planesDisponibles']) {
      this.filtrarPlanesPorPeriodo();
    }
  }

  onPeriodoChange(): void {
    this.planSeleccionadoId = '';
    this.filtrarPlanesPorPeriodo();
  }

  private filtrarPlanesPorPeriodo(): void {
    if (!this.periodoSeleccionado) {
      this.planesDisponiblesFiltrados = [];
      return;
    }

    this.planesDisponiblesFiltrados = this.planesDisponibles.filter(
      plan => plan.periodo === this.periodoSeleccionado
    );
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onCancelar.emit();
    this.reset();
  }

  puedeConfirmar(): boolean {
    return !!this.planSeleccionadoId && !!this.periodoSeleccionado;
  }

  confirmar() {
    if (!this.puedeConfirmar()) return;
    this.onConfirmar.emit({
      planId: this.planSeleccionadoId
    });
    this.reset();
  }

  private reset() {
    this.planSeleccionadoId = '';
    this.periodoSeleccionado = '';
    this.planesDisponiblesFiltrados = [];
  }
}