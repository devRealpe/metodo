import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ProfesorService } from '../../../core/services/profesor.service';
import { Profesor } from '../../../core/models/profesor.model';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule
  ]
})
export class AdminHomeComponent {
  cedulaBusqueda = '';
  usuarioEncontrado: Profesor | null = null;

  constructor(private profesorService: ProfesorService, private router: Router) {}

  async buscarUsuario(): Promise<void> {
    if (!this.cedulaBusqueda.trim()) return;
    try {
      const profesor = await firstValueFrom(
        this.profesorService.getById(this.cedulaBusqueda.trim())
      );
      this.usuarioEncontrado = profesor || null;
    } catch {
      this.usuarioEncontrado = null;
    }
  }

  navegar(ruta: string): void {
    this.router.navigate([`/app/${ruta}`], {
      queryParams: { id: this.usuarioEncontrado?.numIdentificacion }
    });
  }
}