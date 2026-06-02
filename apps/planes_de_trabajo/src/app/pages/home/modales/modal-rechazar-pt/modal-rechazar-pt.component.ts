import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaComponent } from 'libs/shared/shared-ui/textarea-component/textarea-component';

@Component({
  selector: 'app-modal-rechazar-pt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaComponent
  ],
  templateUrl: './modal-rechazar-pt.component.html',
  styleUrls: ['./modal-rechazar-pt.component.scss']
})
export class ModalRechazarPtComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  
  @Input() titulo = 'Rechazar Plan de Trabajo';
  @Input() mensaje = '¿Está seguro de que desea rechazar este plan de trabajo? Por favor, indique el motivo.';
  @Input() nombreProfesor: string = '';
  
  @Output() onConfirmar = new EventEmitter<string>();
  @Output() onCancelar = new EventEmitter<void>();

  motivoRechazo = '';

  onClose() {
    this.motivoRechazo = '';
    this.visibleChange.emit(false);
    this.onCancelar.emit();
  }

  onConfirmarClick() {
    if (this.motivoRechazo.trim()) {
      this.onConfirmar.emit(this.motivoRechazo);
      this.motivoRechazo = '';
    }
  }

  onCancelarClick() {
    this.onClose();
  }
}