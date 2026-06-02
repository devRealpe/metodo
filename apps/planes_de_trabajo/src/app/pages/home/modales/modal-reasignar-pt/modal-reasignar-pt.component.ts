import { Component, Input, Output, EventEmitter, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Profesor } from '../../../../core/models/profesor.model';

@Component({
  selector: 'app-modal-reasignar-pt',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DialogModule
  ],
  templateUrl: './modal-reasignar-pt.html',
  styleUrls: ['./modal-reasignar-pt.scss']
})
export class ModalReasignarPtComponent {
  @Input() visible = false;
  @Input() planId = '';
  @Input() periodo = '';
  @Input() profesorOriginal: Profesor | null = null;
  @Input() profesoresDisponibles: Signal<Profesor[]> = signal([]);
  @Input() cargando = signal(false);
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onSeleccionarProfesor = new EventEmitter<Profesor>();

  onSeleccionar(profesor: Profesor): void {
    this.onSeleccionarProfesor.emit(profesor);
  }

  onCancelar(): void {
    this.visibleChange.emit(false);
  }
}