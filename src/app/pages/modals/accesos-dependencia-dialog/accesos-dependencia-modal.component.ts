import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

import { DependenciaResponse } from '../../../core/models/dependencia.models';

@Component({
  selector: 'app-accesos-dependencia-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DividerModule,
    TooltipModule,
  ],
  templateUrl: './accesos-dependencia-modal.component.html',
  styleUrl: './accesos-dependencia-modal.component.scss'
})
export class AccesosDependenciaModalComponent {
  @Input() visible = false;
  @Input() dependenciaAccesos: DependenciaResponse | null = null;
  @Input() agregandoAcceso = false;
  @Input() eliminandoAcceso: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() hide = new EventEmitter<void>();
  @Output() addAcceso = new EventEmitter<string>();
  @Output() removeAcceso = new EventEmitter<string>();

  nuevoAcceso = '';

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.nuevoAcceso = '';
    this.hide.emit();
  }

  agregar(): void {
    if (this.nuevoAcceso.trim()) {
      this.addAcceso.emit(this.nuevoAcceso);
      // Not clearing nuevoAcceso here because we might want to wait for success.
      // But the parent can't easily clear it. Let's clear it if they need to.
      // Actually, the parent already does: `this.nuevoAcceso = ''` on success.
      // We will handle clearing in the parent by letting the parent pass it or just let the parent handle the API call.
      // If we keep nuevoAcceso internal, we need a way to clear it on success.
      // For now, let's just clear it after emit. If error, the user can retype.
      const valor = this.nuevoAcceso;
      this.nuevoAcceso = '';
      this.addAcceso.emit(valor);
    }
  }

  eliminar(valor: string): void {
    this.removeAcceso.emit(valor);
  }
}
