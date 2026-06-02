import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageModule } from 'primeng/message';
import { Profesor } from 'apps/planes_de_trabajo/src/app/core/models/profesor.model';
import { Plantilla } from 'apps/planes_de_trabajo/src/app/core/models/plantilla.model';
import { PlantillaService } from 'apps/planes_de_trabajo/src/app/core/services/plantilla.service';

@Component({
  selector: 'app-modal-crear-pt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    AutoCompleteModule,
    MessageModule
  ],
  templateUrl: './modal-crear-pt.html',
  styleUrl: './modal-crear-pt.scss',
  encapsulation: ViewEncapsulation.None
})
export class ModalCrearPTComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() profesor: Profesor | null = null;
  @Input() cargando: boolean = false;
  @Input() anio: number | undefined;
  @Input() periodo: number | undefined;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onCrear = new EventEmitter<{ plantilla: string }>();
  @Output() onCancelar = new EventEmitter<void>();

  plantillas: Plantilla[] = [];
  selectedPlantilla: Plantilla | null = null;
  filteredPlantillas: Plantilla[] = [];
  cargandoPlantillas: boolean = false;
  mostrarValidacion: boolean = false;

  constructor(private plantillaService: PlantillaService) { }

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.mostrarValidacion = false;
      if (this.plantillas.length === 0) {
        this.cargarPlantillas();
      }
    }
  }

  cargarPlantillas(): void {
    this.cargandoPlantillas = true;
    // Solo cargar las plantillas habilitadas
    this.plantillaService.getPlantillaHabilitada().subscribe({
      next: (plantillas) => {
        this.plantillas = plantillas;
        this.filteredPlantillas = plantillas;
        // Seleccionar automáticamente la primera plantilla habilitada
        if (plantillas && plantillas.length > 0) {
          this.selectedPlantilla = plantillas[0];
        }
        this.cargandoPlantillas = false;
      },
      error: (error) => {
        this.cargandoPlantillas = false;
      }
    });
  }

  cargarPlantillaHabilitada(): void {
    // Este método ya no es necesario porque cargarPlantillas() ya carga solo las habilitadas
    // Se mantiene por compatibilidad pero no hace nada
  }

  filterPlantillas(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredPlantillas = this.plantillas.filter(plantilla =>
      plantilla.nombre.toLowerCase().includes(query)
    );
  }

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.selectedPlantilla = null;
    this.mostrarValidacion = false;
  }

  onCrearClick(): void {
    this.mostrarValidacion = true;

    if (!this.isFormValid) {
      return;
    }

    if (this.selectedPlantilla) {
      this.onCrear.emit({
        plantilla: this.selectedPlantilla.id
      });
    }
  }

  onCancelarClick(): void {
    this.onCancelar.emit();
    this.onClose();
  }

  get isFormValid(): boolean {
    return !!this.anio && !!this.periodo && !!this.selectedPlantilla;
  }

  get periodoInfo(): string {
    if (!this.anio || !this.periodo) return 'Sin periodo seleccionado';
    return `${this.anio} - Periodo ${this.periodo}`;
  }
}