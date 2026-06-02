import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  tipo: 'evaluacion' | 'firma' | 'devolucion' | 'info';
  enlace?: string;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent implements OnInit {
  notificaciones = signal<Notificacion[]>([]);
  cargando = signal(true);

  constructor(private router: Router) {}

  ngOnInit(): void {
    // TODO: Replace with actual notification service when backend endpoint is available
    this.notificaciones.set([]);
    this.cargando.set(false);
  }

  marcarLeida(notif: Notificacion): void {
    this.notificaciones.update((list) => list.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
    if (notif.enlace) {
      this.router.navigateByUrl(notif.enlace);
    }
  }

  marcarTodasLeidas(): void {
    this.notificaciones.update((list) => list.map((n) => ({ ...n, leida: true })));
  }

  get noLeidas(): number {
    return this.notificaciones().filter((n) => !n.leida).length;
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'evaluacion': return 'pi pi-file-edit';
      case 'firma': return 'pi pi-pen-to-square';
      case 'devolucion': return 'pi pi-undo';
      default: return 'pi pi-info-circle';
    }
  }

  getTipoSeverity(tipo: string): 'info' | 'warn' | 'danger' | 'success' {
    switch (tipo) {
      case 'evaluacion': return 'info';
      case 'firma': return 'warn';
      case 'devolucion': return 'danger';
      default: return 'info';
    }
  }
}
