import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MomentoInvestigacion } from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { PlanDeTrabajoModel } from 'apps/planes_de_trabajo/src/app/core/models/planDeTrabajo.model';
import { Actividad } from 'apps/planes_de_trabajo/src/app/core/models/actividad.model';
import { CrearAsesoria } from 'apps/planes_de_trabajo/src/app/core/models/actividadesPlanDeTrabajo.model';
import { MessageModule } from 'primeng/message';
@Component({
    selector: 'app-modal-crear-asesoria',
    templateUrl: './modal-crear-asesoria.html',
    styleUrl: 'modal-crear-asesoria.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        AutoCompleteModule,
        MessageModule
    ]
})
export class ModalAsesoriaComponent implements OnChanges {
    @Input() visible = false;
    @Input() guardando = false;
    @Input() actividad!: Actividad;
    @Input() planDeTrabajo!: PlanDeTrabajoModel;
    @Input() actividadPtId!: string;
    @Input() momentosInvestigacion: MomentoInvestigacion[] = [];
    
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<CrearAsesoria>();
    @Output() cancelar = new EventEmitter<void>();

    nuevaAsesoria: CrearAsesoria = {
        titulo: '',
        idMomento: '',
        idActividadPT: ''
    };

    mostrarValidacion = false;
    selectedMomento: MomentoInvestigacion | null = null;
    filteredMomentos: MomentoInvestigacion[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && changes['visible'].currentValue) {
            this.resetearFormulario();
        }
    }

    resetearFormulario(): void {
        this.nuevaAsesoria = {
            titulo: '',
            idMomento: '',
            idActividadPT: this.actividadPtId,
        };
        this.selectedMomento = null;
    }

    onHide(): void {
        this.mostrarValidacion = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }

    onGuardar(): void {
        this.mostrarValidacion = true;
        if (!this.nuevaAsesoria.titulo || !this.selectedMomento) {
            return;
        }

        this.guardando = true;

        if (this.selectedMomento) {
            this.nuevaAsesoria.idMomento = this.selectedMomento.id;
        }

        if (this.validarFormulario()) {
            this.guardar.emit(this.nuevaAsesoria);
        }
    }

    onCancelar(): void {
        this.onHide();
    }

    validarFormulario(): boolean {
        if (!this.nuevaAsesoria.titulo?.trim()) {
            alert('Por favor, ingrese el título del proyecto');
            return false;
        }
        if (!this.nuevaAsesoria.idMomento) {
            alert('Por favor, seleccione la fase');
            return false;
        }
        if (!this.nuevaAsesoria.idActividadPT) {
            alert('Error: No se ha encontrado la actividad del plan de trabajo');
            return false;
        }
        return true;
    }

    filterMomentos(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredMomentos = this.momentosInvestigacion.filter(momento => 
            momento.nombre.toLowerCase().includes(query)
        );
    }
}