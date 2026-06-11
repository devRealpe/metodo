import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-confirmar-masivo-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './confirmar-masivo-modal.component.html',
  styleUrls: ['./confirmar-masivo-modal.component.scss'],
})
export class ConfirmarMasivoModalComponent {
  @Input() visible = false;
  @Input() nombreArchivo = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get dialogData(): ConfirmationDialogData {
    return {
      title: 'Confirmar Carga Masiva',
      message: `¿Confirma la carga masiva desde el archivo <strong>"${this.nombreArchivo}"</strong>?<br>Se procesarán todas las cédulas contenidas en el archivo.`,
      icon: 'pi pi-upload',
      acceptLabel: 'Cargar',
      rejectLabel: 'Cancelar',
      severity: 'success',
      acceptButtonClass: 'p-button-primary',
    };
  }
}
