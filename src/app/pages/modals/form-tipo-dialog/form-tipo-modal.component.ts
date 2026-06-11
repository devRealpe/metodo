import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TipoSolicitudAdmin } from '../../../core/models/tipo-solicitud-admin.models';

@Component({
  selector: 'app-form-tipo-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './form-tipo-modal.component.html',
  styleUrls: ['./form-tipo-modal.component.scss'],
})
export class FormTipoModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() tipoEditando: TipoSolicitudAdmin | null = null;
  @Input() guardando = false;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<{ nombre: string; descripcion?: string; activo?: boolean }>();

  formTipo: FormGroup;
  modoEdicion = false;

  constructor() {
    this.formTipo = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      activo: [true],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tipoEditando']) {
      if (this.tipoEditando) {
        this.modoEdicion = true;
        this.formTipo.patchValue({
          nombre: this.tipoEditando.nombre,
          descripcion: this.tipoEditando.descripcion ?? '',
          activo: this.tipoEditando.activo,
        });
      } else {
        this.modoEdicion = false;
        this.formTipo.reset({ nombre: '', descripcion: '', activo: true });
      }
    }
    
    if (changes['visible'] && !this.visible) {
        // Modal closed
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  guardar(): void {
    if (this.formTipo.invalid) {
      this.formTipo.markAllAsTouched();
      return;
    }
    this.save.emit(this.formTipo.value);
  }

  get nombreError(): string | null {
    const ctrl = this.formTipo.get('nombre');
    if (!ctrl?.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'El nombre es obligatorio';
    if (ctrl.errors['maxlength']) return 'Máximo 100 caracteres';
    return null;
  }
}
