import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modal-mostrar-rechazo',
  templateUrl: './modal-mostrar-rechazo.component.html',
  styleUrls: ['./modal-mostrar-rechazo.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule
  ]
})
export class ModalMostrarRechazoComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  
  @Input() motivo: string | null = '';
  @Input() titulo = 'Plan de Trabajo Rechazado';
  
  @Output() onCerrar = new EventEmitter<void>();

  onClose() {
    this.visibleChange.emit(false);
    this.onCerrar.emit();
  }
}