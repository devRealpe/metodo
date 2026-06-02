import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLog } from '../../../core/models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  logsFiltrados = signal<AuditLog[]>([]);
  cargando = signal(false);

  filtroTexto = '';
  filtroEntidad = '';

  entidades = [
    { label: 'Todas', value: '' },
    { label: 'Evaluación', value: 'EVALUACION' },
    { label: 'Periodo', value: 'PERIODO' },
    { label: 'Formato', value: 'FORMATO' },
    { label: 'Asignación', value: 'ASIGNACION' },
    { label: 'Plan Mejora', value: 'PLAN_MEJORA' },
    { label: 'Usuario', value: 'USUARIO' },
  ];

  constructor(
    private adminService: AdminService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.cargando.set(true);
    this.adminService.listarAuditoria().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando auditoría' });
        this.cargando.set(false);
      },
    });
  }

  aplicarFiltros(): void {
    let resultado = this.logs();

    if (this.filtroEntidad) {
      resultado = resultado.filter((l) => l.entidad === this.filtroEntidad);
    }

    if (this.filtroTexto) {
      const texto = this.filtroTexto.toLowerCase();
      resultado = resultado.filter(
        (l) =>
          l.usuarioNombre.toLowerCase().includes(texto) ||
          l.accion.toLowerCase().includes(texto) ||
          l.entidad.toLowerCase().includes(texto)
      );
    }

    this.logsFiltrados.set(resultado);
  }

  onFiltroTextoChange(): void {
    this.aplicarFiltros();
  }

  onFiltroEntidadChange(): void {
    this.aplicarFiltros();
  }

  getSeverityAccion(accion: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const a = accion.toUpperCase();
    if (a.includes('CREAR') || a.includes('CREATE')) return 'success';
    if (a.includes('ACTUALIZAR') || a.includes('UPDATE')) return 'info';
    if (a.includes('ELIMINAR') || a.includes('DELETE') || a.includes('ANULAR')) return 'danger';
    if (a.includes('FORZAR') || a.includes('FORCE')) return 'warn';
    return 'secondary';
  }
}
