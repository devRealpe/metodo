import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { 
    CrearInvestigaciones,
    GrupoDeInvestigacion,
    MomentoInvestigacion
} from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { PlanDeTrabajoModel } from 'apps/planes_de_trabajo/src/app/core/models/planDeTrabajo.model';
import { SeccionHijo } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { MessageModule } from 'primeng/message';

@Component({
    selector: 'app-modal-crear-investigacion',
    templateUrl: './modal-crear-investigacion.html',
    styleUrl: 'modal-crear-investigacion.scss',
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
export class ModalInvestigacionComponent implements OnChanges {
    @Input() visible = false;
    @Input() guardando = false;
    @Input() seccionHijo!: SeccionHijo;
    @Input() planDeTrabajo!: PlanDeTrabajoModel;
    @Input() gruposInvestigacion: GrupoDeInvestigacion[] = [];
    @Input() momentosInvestigacion: MomentoInvestigacion[] = [];
    
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<CrearInvestigaciones>();
    @Output() cancelar = new EventEmitter<void>();

    nuevaInvestigacion: CrearInvestigaciones = {
        codigo: '',
        nombreProyecto: '',
        idPt: '',
        idGrupo: '',
        idMomento: '',
        idSeccion: ''
    };

    selectedGrupo: GrupoDeInvestigacion | null = null;
    selectedMomento: MomentoInvestigacion | null = null;
    mostrarValidacion = false;
    filteredGrupos: GrupoDeInvestigacion[] = [];
    filteredMomentos: MomentoInvestigacion[] = [];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && changes['visible'].currentValue) {
            this.resetearFormulario();
        }
    }

    resetearFormulario(): void {
        this.nuevaInvestigacion = {
            codigo: '',
            nombreProyecto: '',
            idPt: this.planDeTrabajo?.id || '',
            idGrupo: '',
            idMomento: '',
            idSeccion: this.seccionHijo?.id || ''
        };
        this.selectedGrupo = null;
        this.selectedMomento = null;
    }

    onHide(): void {
        this.mostrarValidacion = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }

    onGuardar(): void {
        this.mostrarValidacion = true;

        if (!this.nuevaInvestigacion.codigo || !this.nuevaInvestigacion.nombreProyecto || 
            !this.selectedGrupo || !this.selectedMomento) {
            return;
        }

        this.guardando = true;

        if (this.selectedGrupo) {
            this.nuevaInvestigacion.idGrupo = this.selectedGrupo.id;
        }
        if (this.selectedMomento) {
            this.nuevaInvestigacion.idMomento = this.selectedMomento.id;
        }

        if (this.validarFormulario()) {
            this.guardar.emit(this.nuevaInvestigacion);
        }
    }

    onCancelar(): void {
        this.onHide();
    }

    validarFormulario(): boolean {
        if (!this.nuevaInvestigacion.codigo?.trim()) {
            return false;
        }
        if (!this.nuevaInvestigacion.nombreProyecto?.trim()) {
            return false;
        }
        if (!this.nuevaInvestigacion.idGrupo) {
            return false;
        }
        if (!this.nuevaInvestigacion.idMomento) {
            return false;
        }
        return true;
    }

    filterGrupos(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredGrupos = this.gruposInvestigacion.filter(grupo => 
            grupo.nombre.toLowerCase().includes(query) || 
            grupo.sigla.toLowerCase().includes(query) ||
            grupo.codigo.toLowerCase().includes(query)
        );
    }

    filterMomentos(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredMomentos = this.momentosInvestigacion.filter(momento => 
            momento.nombre.toLowerCase().includes(query)
        );
    }
}