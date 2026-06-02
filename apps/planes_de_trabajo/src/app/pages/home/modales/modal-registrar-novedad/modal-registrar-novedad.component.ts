import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TextareaComponent } from 'libs/shared/shared-ui/textarea-component/textarea-component';
import { InputComponent } from '@microfrontends/shared-ui';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { NovedadService } from 'apps/planes_de_trabajo/src/app/core/services/novedad.service';
import { CrearNovedad, Novedad } from 'apps/planes_de_trabajo/src/app/core/models/novedad.model';

@Component({
  selector: 'app-modal-registrar-novedad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TagModule,
    TextareaComponent,
    InputComponent,
    DatePickerModule,
    InputTextModule
  ],
  templateUrl: './modal-registrar-novedad.component.html',
  styleUrls: ['./modal-registrar-novedad.component.scss']
})
export class ModalRegistrarNovedadComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() planDeTrabajoId: string = '';
  @Input() profesorNombre: string = '';
  @Input() planDeTrabajoPeriodo: string = '';
  @Input() registradoPorId: string = '';
  @Input() registradoPorNombreCedula: string = '';
  @Input() modoLectura: boolean = false;

  @Output() onConfirmar = new EventEmitter<Novedad>();
  @Output() onCancelar = new EventEmitter<void>();

  fechaRegistro: Date = new Date();
  motivo = '';
  tipoNovedad = '';
  observaciones = '';
  motivoPredefinido: string | null = null;
  motivoPersonalizado = '';
  creando = false;
  cargandoNovedad = false;
  cancelando = false;
  novedadExistente: Novedad | null = null;

  opcionesMotivo = [
    { label: 'Cambio de programa', value: 'CAMBIO_PROGRAMA' },
    { label: 'Renuncia', value: 'RENUNCIA' },
    { label: 'Licencia de Maternidad', value: 'LICENCIA_MATERNIDAD' },
    { label: 'Otro', value: 'OTRO' }
  ];

  constructor(private novedadService: NovedadService) { }

  ngOnInit() {
    if (this.visible && this.planDeTrabajoId) {
      this.verificarNovedadExistente();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['visible'] && this.visible) || changes['planDeTrabajoId']) {
      if (this.planDeTrabajoId) {
        this.verificarNovedadExistente();
      }
    }
  }


  private verificarNovedadExistente() {
    this.cargandoNovedad = true;
    this.novedadExistente = null;

    this.novedadService.getByPlanDeTrabajo(this.planDeTrabajoId).subscribe({
      next: (novedades) => {
        if (novedades && novedades.length > 0) {
          const novedadesOrdenadas = novedades.sort((a, b) =>
            new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
          );

          let novedadActiva = novedadesOrdenadas.find(n =>
            n.estado === 'PENDIENTE' || n.estado === 'APROBADA'
          );

          if (this.modoLectura && !novedadActiva) {
            novedadActiva = novedadesOrdenadas[0];
          }

          if (novedadActiva) {
            this.novedadExistente = novedadActiva;
            this.motivo = this.novedadExistente.motivo;
            this.tipoNovedad = this.novedadExistente.tipoNovedad || '';
            this.observaciones = this.novedadExistente.observaciones || '';
            this.fechaRegistro = new Date(this.novedadExistente.fechaRegistro);
          }
        }
        this.cargandoNovedad = false;
      },
      error: () => {
        this.cargandoNovedad = false;
      }
    });
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onCancelar.emit();
    this.resetForm();
  }

  puedeConfirmar(): boolean {
    if (this.novedadExistente) return false;

    const tienePlan = !!this.planDeTrabajoId;
    const tieneRegistrador = !!this.registradoPorId;
    const tieneMotivoPredefinido = !!this.motivoPredefinido;

    if (!tieneMotivoPredefinido) return false;

    if (this.motivoPredefinido === 'OTRO') {
      return tienePlan && tieneRegistrador && !!this.motivoPersonalizado.trim();
    }

    return tienePlan && tieneRegistrador;
  }

  estaEnModoLectura(): boolean {
    if (this.modoLectura) return true;
    if (this.novedadExistente &&
      this.novedadExistente.estado !== 'PENDIENTE' &&
      this.novedadExistente.estado !== 'APROBADA') {
      return true;
    }
    return false;
  }

  private formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

  onConfirmarClick() {
    if (!this.puedeConfirmar()) return;

    let motivoFinal = '';
    switch (this.motivoPredefinido) {
      case 'CAMBIO_PROGRAMA':
        motivoFinal = 'Cambio de programa';
        break;
      case 'RENUNCIA':
        motivoFinal = 'Renuncia';
        break;
      case 'LICENCIA_MATERNIDAD':
        motivoFinal = 'Licencia de Maternidad';
        break;
      case 'OTRO':
        motivoFinal = this.motivoPersonalizado.trim();
        break;
      default:
        return;
    }


    
    const fecha = this.fechaRegistro || new Date();
const fechaTexto = this.formatDate(fecha);
    const obsConFecha = this.observaciones?.trim()
      ? `${this.observaciones.trim()} | Fecha seleccionada: ${fechaTexto}`
      : `Fecha seleccionada: ${fechaTexto}`;

    const payload: CrearNovedad = {
      idPt: this.planDeTrabajoId,
      motivo: motivoFinal,
      registradoPor: this.registradoPorId,
      tipoNovedad: this.tipoNovedad.trim() || undefined,
      observaciones: obsConFecha
    };

    this.creando = true;
    this.novedadService.create(payload).subscribe({
      next: (resp) => {
        this.creando = false;
        this.novedadExistente = resp;
        this.onConfirmar.emit(resp);
      },
      error: (err) => {
        this.creando = false;
      }
    });
  }

  onCancelarClick() {
    this.onClose();
  }

  private resetForm() {
    this.motivo = '';
    this.tipoNovedad = '';
    this.observaciones = '';
    this.fechaRegistro = new Date();
    this.creando = false;
    this.cargandoNovedad = false;
    this.novedadExistente = null;
  }

  getSeverityEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (estado) {
      case 'APROBADA':
      case 'RESUELTA':
        return 'success';
      case 'PENDIENTE':
        return 'warn';
      case 'RECHAZADA':
      case 'CANCELADA':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'APROBADA':
        return 'Aprobada';
      case 'RESUELTA':
        return 'Resuelta';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'RECHAZADA':
        return 'Rechazada';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return estado;
    }
  }

  onCancelarNovedad(): void {
    if (!this.novedadExistente?.id) return;

    this.cancelando = true;
    this.novedadService.delete(this.novedadExistente.id).subscribe({
      next: () => {
        this.cancelando = false;
        this.onConfirmar.emit(this.novedadExistente!);
        this.onClose();
      },
      error: (err) => {
               this.cancelando = false;
      }
    });
  }
}