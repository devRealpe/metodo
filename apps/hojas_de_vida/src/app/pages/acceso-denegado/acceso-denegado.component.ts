import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-acceso-denegado',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  template: `
    <div class="flex align-items-center justify-content-center min-h-screen px-4">
      <p-card styleClass="max-w-30rem w-full">
        <div class="text-center">
          <i class="pi pi-ban text-6xl text-red-500 mb-4"></i>
          <h1 class="text-4xl font-bold text-900 mb-3">Acceso Denegado</h1>
          <p class="text-lg text-600 mb-4">
            No tienes los permisos necesarios para acceder a esta página.
          </p>
          <p class="text-sm text-500 mb-5">
            Si crees que esto es un error, por favor contacta al administrador del sistema.
          </p>
          <div class="flex gap-2 justify-content-center">
            <p-button 
              label="Volver al Inicio" 
              icon="pi pi-home"
              (onClick)="goToHome()"
              styleClass="p-button-primary">
            </p-button>
            <p-button 
              label="Ir Atrás" 
              icon="pi pi-arrow-left"
              (onClick)="goBack()"
              styleClass="p-button-text">
            </p-button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AccesoDenegadoComponent {
  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/app/inicio']);
  }

  goBack(): void {
    window.history.back();
  }
}
