import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';

import { AuditoriaService } from '../../core/services/auditoria.service';
import { HistorialCambiosDto } from '../../core/models/historial-cambios.model';

@Component({
  selector: 'app-historial-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    DatePickerModule,
    DialogModule,
    TooltipModule,
    ProgressSpinnerModule,
    PanelModule
  ],
  templateUrl: './historial-auditoria.component.html',
  styleUrls: ['./historial-auditoria.component.scss']
})
export class HistorialAuditoriaComponent implements OnInit {
  historial: HistorialCambiosDto[] = [];
  loading = false;
  detalleVisible = false;
  cambioSeleccionado: HistorialCambiosDto | null = null;

  identificacion = '';
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;

  page = 0;
  size = 20;
  totalElements = 0;

  constructor(
    private auditoriaService: AuditoriaService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['identificacion']) {
        this.identificacion = params['identificacion'];
        this.buscarPorIdentificacion();
      }
    });
  }

  buscarPorIdentificacion(): void {
    if (!this.identificacion) {
      return;
    }

    this.loading = true;
    this.auditoriaService
      .obtenerHistorialPorPersona(this.identificacion, this.page, this.size)
      .subscribe({
        next: (response) => {
          this.historial = response.content;
          this.totalElements = response.totalElements;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
        }
      });
  }

  buscarPorFechas(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      return;
    }

    this.loading = true;
    const fechaInicioISO = this.fechaInicio.toISOString();
    const fechaFinISO = this.fechaFin.toISOString();

    this.auditoriaService
      .obtenerHistorialPorFechas(fechaInicioISO, fechaFinISO)
      .subscribe({
        next: (response) => {
          this.historial = response;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
        }
      });
  }

  verDetalle(cambio: HistorialCambiosDto): void {
    this.cambioSeleccionado = cambio;
    this.detalleVisible = true;
  }

  formatearFecha(fecha: string): string {
    return this.auditoriaService.formatearFecha(fecha);
  }

  obtenerColorAccion(accion: string): 'success' | 'info' | 'danger' | 'secondary' {
    return this.auditoriaService.obtenerColorAccion(accion) as any;
  }

  obtenerIconoAccion(accion: string): string {
    return this.auditoriaService.obtenerIconoAccion(accion);
  }

  obtenerCamposModificados(): string[] {
    if (!this.cambioSeleccionado) {
      return [];
    }
    return this.auditoriaService.obtenerCamposModificados(
      this.cambioSeleccionado.datosAnteriores,
      this.cambioSeleccionado.datosNuevos
    );
  }

  limpiarFiltros(): void {
    this.identificacion = '';
    this.fechaInicio = null;
    this.fechaFin = null;
    this.historial = [];
  }

  onPageChange(event: any): void {
    this.page = event.page;
    this.size = event.rows;
    this.buscarPorIdentificacion();
  }
}
