import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { DateFormatterUtil } from '../../core/utils';
import { InfoTableComponent, TableColumn, TableAction, InputComponent } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-ofertas-finalizadas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TagModule,
    ProgressSpinnerModule,
    BreadcrumbModule,
    InfoTableComponent,
    InputComponent
  ],
  providers: [MessageService],
  templateUrl: './ofertas-finalizadas.component.html',
  styleUrls: ['./ofertas-finalizadas.component.scss']
})
export class OfertasFinalizadasComponent implements OnInit {
  
  ofertasFinalizadas: OfertaLaboral[] = [];
  ofertasFinalizadasOriginal: OfertaLaboral[] = []; 
  loading = false;
  filtroTexto = ''; 

  columns: TableColumn[] = [];
  actions: TableAction[] = [];

  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/administrador-convocatorias' };
  breadcrumbItems: MenuItem[] = [
    { label: 'Ofertas Finalizadas' }
  ];

  constructor(
    private ofertaLaboralService: OfertaLaboralService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeTable();
    this.cargarOfertasFinalizadas();
  }

  private initializeTable(): void {
    this.columns = [
      {
        field: 'numeroConvocatoria',
        header: 'Convocatoria',
        sortable: true,
        width: '150px'
      },
      {
        field: 'cargoRequerido',
        header: 'Cargo',
        sortable: true,
        width: '250px'
      },
      {
        field: 'tipoConvocatoria',
        header: 'Tipo',
        sortable: true,
        width: '120px'
      },
      {
        field: 'departamentoSolicitante',
        header: 'Departamento',
        sortable: true,
        width: '200px'
      },
      {
        field: 'fechaPublicacion',
        header: 'Publicación',
        sortable: true,
        width: '120px'
      },
      {
        field: 'fechaCierre',
        header: 'Cierre',
        sortable: true,
        width: '120px'
      }
    ];

    this.actions = [
      {
        icon: 'pi pi-users',
        label: 'Ver Seleccionados',
        severity: 'success',
        outlined: true,
        tooltip: 'Ver candidatos seleccionados para entrevista',
        onClick: (row: OfertaLaboral) => this.verCandidatos(row)
      }
    ];
  }

  cargarOfertasFinalizadas(): void {
    this.loading = true;
    
    this.ofertaLaboralService.getAll().subscribe({
      next: (ofertas: OfertaLaboral[]) => {
        this.ofertasFinalizadasOriginal = ofertas.filter(oferta => !oferta.activo && !oferta.eliminado);
        this.ofertasFinalizadas = [...this.ofertasFinalizadasOriginal];
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la lista de ofertas finalizadas',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  onFiltroChange(): void {
    const termino = this.filtroTexto.toLowerCase().trim();
    
    if (!termino) {
      this.ofertasFinalizadas = [...this.ofertasFinalizadasOriginal];
      return;
    }

    this.ofertasFinalizadas = this.ofertasFinalizadasOriginal.filter(oferta => {
      const cargo = (oferta.cargoRequerido || '').toLowerCase();
      const convocatoria = (oferta.numeroConvocatoria || '').toLowerCase();
      const departamento = (oferta.departamentoSolicitante || '').toLowerCase();
      const tipo = (oferta.tipoConvocatoria || '').toLowerCase();
      
      return cargo.includes(termino) || 
             convocatoria.includes(termino) || 
             departamento.includes(termino) ||
             tipo.includes(termino);
    });
  }

  verCandidatos(oferta: OfertaLaboral): void {
    this.router.navigate(['/app/seleccionados-fase2'], {
      queryParams: { ofertaId: oferta.id }
    });
  }

  volverAlDashboard(): void {
    this.router.navigate(['/app/administrador-convocatorias']);
  }

  formatFechaCorta(fecha: Date | string | undefined): string {
    if (!fecha) return '-';
    return DateFormatterUtil.formatShort(fecha);
  }

  formatearTipoConvocatoria(tipo: string): string {
    if (!tipo) return 'N/A';
    return tipo.toLowerCase() === 'ambas' ? 'Interna/Externa' : tipo;
  }
}
