import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-eliminar-solicitud-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './eliminar-solicitud-modal.component.html',
  styleUrls: ['./eliminar-solicitud-modal.component.scss'],
})
export class EliminarSolicitudModalComponent {
  @Input() visible = false;
  @Input() cedula: number | string = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get dialogData(): ConfirmationDialogData {
    return {
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de eliminar la solicitud para la identificación <strong>${this.cedula}</strong>?<br>Esta acción no se puede deshacer.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      severity: 'error',
      acceptButtonClass: 'p-button-danger',
    };
  }
}
