import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';

import { EstudianteConsultaResponse, ValidacionRequisitos } from '../../../core/models/solicitud.models';

@Component({
  selector: 'app-validacion-requisitos-direccion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    ProgressBarModule,
    DividerModule,
    TextareaModule,
    TagModule
  ],
  templateUrl: './validacion-requisitos-direccion-modal.component.html',
  styleUrl: './validacion-requisitos-direccion-modal.component.scss'
})
export class ValidacionRequisitosDireccionComponent implements OnInit {
  @Input() visible = false;
  @Input() cargandoEstudiante = false;
  @Input() estudianteDatos: EstudianteConsultaResponse | null = null;
  @Input() validacion: ValidacionRequisitos | null = null;
  @Input() puedeOtorgarSello = false;
  @Input() aprobando = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() otorgar = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  observacionForm!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.observacionForm = this.fb.group({
      observacion: ['']
    });
  }

  onHide() {
    this.visibleChange.emit(false);
    this.cerrar.emit();
    this.observacionForm.reset();
  }

  onOtorgarSello() {
    this.otorgar.emit(this.observacionForm.value.observacion || '');
  }

  getSeveridadSolicitudGrado(estado: string): 'success' | 'warn' | 'danger' | 'secondary' {
    const s = (estado ?? '').toLowerCase();
    if (s === 'aprobado') return 'success';
    if (s === 'solicitado') return 'info' as any;
    if (s === 'rechazado') return 'danger';
    return 'secondary';
  }
}
