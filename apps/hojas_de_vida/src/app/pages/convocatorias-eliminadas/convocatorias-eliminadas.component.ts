import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-convocatorias-eliminadas',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule
  ],
  templateUrl: './convocatorias-eliminadas.component.html',
  styleUrls: ['./convocatorias-eliminadas.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ConvocatoriasEliminadasComponent implements OnInit {
  convocatoriasEliminadas: OfertaLaboral[] = [];
  loading: boolean = false;

  detalleVisible: boolean = false;
  ofertaSeleccionada: OfertaLaboral | null = null;

  requisitosConTitulo = [
    'Formación técnica o tecnológica:',
    'Formación pregrado:',
    'Formación posgrado:'
  ];

  constructor(
    private ofertaService: OfertaLaboralService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConvocatoriasEliminadas();
  }

  cargarConvocatoriasEliminadas(): void {
    this.loading = true;
    this.ofertaService.getEliminadas().subscribe({
      next: (data) => {
        this.convocatoriasEliminadas = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No fue posible cargar las convocatorias eliminadas.',
          life: 5000
        });
      }
    });
  }

  onRestaurar(oferta: OfertaLaboral): void {
    if (!oferta.id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea restaurar la convocatoria "${oferta.cargoRequerido}"?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-refresh',
      acceptLabel: 'Sí, Restaurar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.restaurarConvocatoria(oferta);
      }
    });
  }

  private restaurarConvocatoria(oferta: OfertaLaboral): void {
    if (!oferta.id) return;

    this.ofertaService.restaurar(oferta.id).subscribe({
      next: () => {
        this.convocatoriasEliminadas = this.convocatoriasEliminadas.filter(c => c.id !== oferta.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Restaurada',
          detail: 'La convocatoria ha sido restaurada correctamente.',
          life: 3000
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al restaurar',
          detail: 'No fue posible restaurar la convocatoria.',
          life: 5000
        });
      }
    });
  }

  onEliminarPermanentemente(oferta: OfertaLaboral): void {
    if (!oferta.id) return;

    this.confirmationService.confirm({
      message: `¿Está completamente seguro de que desea eliminar permanentemente la convocatoria "${oferta.cargoRequerido}"?<br><br><strong>Esta acción no se puede deshacer y eliminará todos los datos asociados.</strong>`,
      header: 'Eliminación Permanente',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar Permanentemente',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.eliminarPermanentemente(oferta);
      }
    });
  }

  private eliminarPermanentemente(oferta: OfertaLaboral): void {
    if (!oferta.id) return;

    this.ofertaService.delete(oferta.id).subscribe({
      next: () => {
        this.convocatoriasEliminadas = this.convocatoriasEliminadas.filter(c => c.id !== oferta.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminada Permanentemente',
          detail: 'La convocatoria ha sido eliminada permanentemente.',
          life: 3000
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail: 'No fue posible eliminar permanentemente la convocatoria.',
          life: 5000
        });
      }
    });
  }

  verDetalles(oferta: OfertaLaboral): void {
    this.ofertaSeleccionada = oferta;
    this.detalleVisible = true;
  }

  esRequisitoConTitulo(nombreRequisito: string): boolean {
    return this.requisitosConTitulo.includes(nombreRequisito);
  }

  volverAOfertas(): void {
    this.router.navigate(['/app/ofertas-laborales']);
  }

  truncarTexto(texto: string, limite: number = 150): string {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite).trim() + '...';
  }

  formatearTipoConvocatoria(tipo: string): string {
    if (!tipo) return '';
    return tipo.toLowerCase() === 'ambas' ? 'Interna/Externa' : tipo;
  }
}