import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-eliminar-tipo-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './eliminar-tipo-modal.component.html',
  styleUrls: ['./eliminar-tipo-modal.component.scss'],
})
export class EliminarTipoModalComponent {
  @Input() visible = false;
  @Input() tipoNombre = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get dialogData(): ConfirmationDialogData {
    return {
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de que desea eliminar el tipo de solicitud <strong>"${this.tipoNombre}"</strong>?<br>Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      severity: 'error',
      acceptButtonClass: 'p-button-danger',
    };
  }
}
