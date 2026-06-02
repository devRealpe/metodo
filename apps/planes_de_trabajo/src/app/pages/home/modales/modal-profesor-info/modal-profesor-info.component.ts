import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { Profesor } from 'apps/planes_de_trabajo/src/app/core/models/profesor.model';

@Component({
  selector: 'app-modal-profesor-info',
  templateUrl: './modal-profesor-info.component.html',
  styleUrls: ['./modal-profesor-info.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    AvatarModule
  ]
})
export class ModalProfesorInfoComponent {
  @Input() visible: boolean = false;
  @Input() profesor: Profesor | null = null;
  @Input() fotoPerfilUrl: string | null = null;
  @Input() anio: number = 2025;
  @Input() periodo: number = 2;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onCerrar = new EventEmitter<void>();

  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onCerrar.emit();
  }

  get tipoIdentificacionLabel(): string {
    if (!this.profesor?.tipoIdentificacion) return '';
    
    const tipos: { [key: string]: string } = {
      'C.C.': 'Cédula de Ciudadanía (C.C.)',
      'T.I.': 'Tarjeta de Identidad (T.I.)',
      'C.E.': 'Cédula de Extranjería (C.E.)',
      'PAS': 'Pasaporte (PAS)'
    };
    
    return tipos[this.profesor.tipoIdentificacion] || this.profesor.tipoIdentificacion;
  }

  get nivelFormacionLabel(): string {
    if (!this.profesor?.nivelEducativo) return 'No especificado';
    return this.profesor.nivelEducativo;
  }

  get categoriaEscalafonLabel(): string {
    if (!this.profesor?.escalafon) return 'No especificado';
    return this.profesor.escalafon;
  }

  get tipoDedicacionLabel(): string {
    if (!this.profesor?.dedicacion) return 'No especificado';
    return this.profesor.dedicacion;
  }

  get tipoVinculacionLabel(): string {
    if (!this.profesor?.vinculacion) return 'No especificado';
    return this.profesor.vinculacion;
  }
}