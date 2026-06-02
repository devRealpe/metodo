import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modal-confirmacion',
  standalone: true,
  imports: [
    CommonModule, 
    DialogModule, 
    ButtonModule
  ],
  templateUrl: './modal-confirmacion.html',
  styleUrl: './modal-confirmacion.scss'
})
export class ModalConfirmacionComponent {
  @Input() visible: boolean = false;
  @Input() titulo: string = 'Confirmar Acción';
  @Input() mensaje: string = '¿Está seguro de realizar esta acción?';
  @Input() textoConfirmar: string = 'Confirmar';
  @Input() textoCancelar: string = 'Cancelar';
  @Input() severidad: 'success' | 'warn' | 'info' | 'danger' = 'info';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onConfirmar = new EventEmitter<void>();
  @Output() onCancelar = new EventEmitter<void>();

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onConfirmarClick(): void {
    this.onConfirmar.emit();
    this.onClose();
  }

  onCancelarClick(): void {
    this.onCancelar.emit();
    this.onClose();
  }
}
