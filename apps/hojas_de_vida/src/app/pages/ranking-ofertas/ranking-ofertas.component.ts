import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

import { InfoTableComponent, TableColumn, TableAction, InputComponent } from '@microfrontends/shared-ui';

import { RankingService } from '../../core/services/ranking.service';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';

@Component({
  selector: 'app-ranking-ofertas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TableModule,
    InputTextModule,
    SelectModule,
    ProgressSpinnerModule,
    TagModule,
    DialogModule,
    BreadcrumbModule,
    InfoTableComponent,
    InputComponent
  ],
  providers: [MessageService],
  templateUrl: './ranking-ofertas.component.html',
  styleUrls: ['./ranking-ofertas.component.scss']
})
export class RankingOfertasComponent implements OnInit {
  
  ofertas: OfertaLaboral[] = [];
  ofertasFiltradas: OfertaLaboral[] = [];
  loading = false;
  
  filtroTexto = '';
  filtroEstado = 'todas';

  opcionesEstado = [
    { label: 'Todas las ofertas', value: 'todas' },
    { label: 'Solo activas', value: 'activas' },
    { label: 'Solo inactivas', value: 'inactivas' }
  ];

  columns: TableColumn[] = [];
  actions: TableAction[] = [];

  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/administrador-convocatorias' };
  breadcrumbItems: MenuItem[] = [
    { label: 'Evaluación y Ranking' }
  ];

  constructor(
    private rankingService: RankingService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.inicializarTabla();
    this.cargarOfertas();
  }

  inicializarTabla(): void {
    this.columns = [
      {
        field: 'convocatoriaDisplay',
        header: 'Convocatoria',
        sortable: true,
        type: 'text'
      },
      {
        field: 'cargoDisplay',
        header: 'Cargo',
        sortable: true,
        type: 'text'
      },
      {
        field: 'departamentoSolicitante',
        header: 'Dependencia Solicitante',
        sortable: true
      },
      {
        field: 'fechaCierre',
        header: 'Fecha Cierre',
        sortable: true,
        type: 'date',
        dateFormat: 'dd/MM/yyyy'
      },
      {
        field: 'activo',
        header: 'Estado',
        sortable: true,
        type: 'badge',
        badgeConfig: {
          getSeverity: (value: boolean) => value ? 'success' : 'danger',
          getLabel: (value: boolean) => value ? 'Activa' : 'Inactiva'
        }
      }
    ];

    this.actions = [
      {
        icon: 'pi pi-list',
        tooltip: 'Ver ranking completo de postulaciones',
        severity: 'primary',
        onClick: (oferta: OfertaLaboral) => this.verRanking(oferta)
      }
    ];
  }

  cargarOfertas(): void {
    this.loading = true;
    
    this.rankingService.getOfertas().subscribe({
      next: (ofertas) => {
        this.ofertas = ofertas;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las ofertas',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.ofertas];

    if (this.filtroTexto.trim()) {
      const texto = this.filtroTexto.toLowerCase().trim();
      resultado = resultado.filter(oferta =>
        oferta.cargoRequerido?.toLowerCase().includes(texto) ||
        oferta.departamentoSolicitante?.toLowerCase().includes(texto) ||
        oferta.numeroConvocatoria?.toLowerCase().includes(texto) ||
        oferta.tipoConvocatoria?.toLowerCase().includes(texto)
      );
    }

    if (this.filtroEstado !== 'todas') {
      const esActiva = this.filtroEstado === 'activas';
      resultado = resultado.filter(oferta => oferta.activo === esActiva);
    }

    this.ofertasFiltradas = resultado.map(oferta => ({
      ...oferta,
      convocatoriaDisplay: `${oferta.numeroConvocatoria} (${oferta.tipoConvocatoria})`,
      cargoDisplay: this.truncarTexto(oferta.cargoRequerido, 30)
    }));
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  verRanking(oferta: OfertaLaboral): void {
    if (!oferta.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La oferta no tiene ID válido',
        life: 5000
      });
      return;
    }
    
    this.router.navigate(['/app/ranking-postulaciones', oferta.id], {
      state: { oferta }
    });
  }

  volverAOfertas(): void {
    this.router.navigate(['/app/ofertas-laborales']);
  }

  getSeverityEstado(activo: boolean): string {
    return activo ? 'success' : 'danger';
  }

  getTextEstado(activo: boolean): string {
    return activo ? 'Activa' : 'Inactiva';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  truncarTexto(texto: string, limite: number = 50): string {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite).trim() + '...';
  }

  onRowSelect(event: any): void {
  }

  onRowUnselect(event: any): void {
  }
}