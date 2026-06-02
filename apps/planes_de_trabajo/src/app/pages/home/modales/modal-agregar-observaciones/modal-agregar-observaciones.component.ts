import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-modal-agregar-observaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ],
  templateUrl: './modal-agregar-observaciones.component.html',
  styleUrls: ['./modal-agregar-observaciones.component.scss']
})
export class ModalAgregarObservacionesComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  
  @Output() onConfirmar = new EventEmitter<string>();
  @Output() onCancelar = new EventEmitter<void>();

  observaciones = '';

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onCancelar.emit();
    this.observaciones = '';
  }

  onConfirmarClick() {
    if (this.observaciones.trim()) {
      this.onConfirmar.emit(this.observaciones.trim());
      this.observaciones = '';
      this.visible = false;
      this.visibleChange.emit(false);
    }
  }

  onCancelarClick() {
    this.onClose();
  }
}