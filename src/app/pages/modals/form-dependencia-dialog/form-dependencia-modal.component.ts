import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-form-dependencia-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './form-dependencia-modal.component.html',
  styleUrl: './form-dependencia-modal.component.scss'
})
export class FormDependenciaModalComponent {
  @Input() visible = false;
  @Input() modoEdicion = false;
  @Input() guardando = false;
  @Input() formDependencia!: FormGroup;
  @Input() nombreError: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() hide = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.hide.emit();
  }

  guardar(): void {
    this.save.emit();
  }
}
