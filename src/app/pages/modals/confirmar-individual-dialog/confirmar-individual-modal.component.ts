import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-confirmar-individual-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './confirmar-individual-modal.component.html',
  styleUrls: ['./confirmar-individual-modal.component.scss'],
})
export class ConfirmarIndividualModalComponent {
  @Input() visible = false;
  @Input() estudianteNombre = '';
  @Input() cedula: number | string = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get dialogData(): ConfirmationDialogData {
    return {
      title: 'Confirmar Registro',
      message: `¿Confirma el registro de la solicitud para <strong>${this.estudianteNombre}</strong> (cédula <strong>${this.cedula}</strong>)?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Registrar',
      rejectLabel: 'Cancelar',
      severity: 'success',
      acceptButtonClass: 'p-button-primary',
    };
  }
}
