import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { CrearActividad } from 'apps/planes_de_trabajo/src/app/core/models/actividad.model';
import { SeccionHijo } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
    selector: 'app-modal-crear-actividad',
    templateUrl: './modal-crear-actividad.html',
    styleUrls: ['./modal-crear-actividad.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        CheckboxModule,
        SelectModule,
        MessageModule,
        AutoCompleteModule
    ]
})
export class ModalCrearActividadComponent implements OnChanges {
    @Input() visible = false;
    @Input() guardando = false;
    @Input() seccionHijo!: SeccionHijo;
    @Input() horasDisponibles: number = 0;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<CrearActividad>();
    @Output() cancelar = new EventEmitter<void>();

    nuevaActividad: CrearActividad = {
        nombre: '',
        tieneDescripcion: false,
        tieneAsesorias: false,
        seccionId: '',
        horasMaximas: 0
    };

    mostrarValidacion = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && changes['visible'].currentValue) {
            this.resetearFormulario();
        }

        if (changes['seccionHijo'] && this.seccionHijo) {
            this.nuevaActividad.seccionId = this.seccionHijo.id;
        }
    }

    resetearFormulario(): void {
        this.nuevaActividad = {
            nombre: '',
            tieneDescripcion: false,
            tieneAsesorias: false,
            seccionId: this.seccionHijo?.id || '',
            horasMaximas: 0
        };
        this.mostrarValidacion = false;
    }

    onHide(): void {
        this.mostrarValidacion = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }

    onGuardar(): void {
        this.mostrarValidacion = true;

        if (!this.nuevaActividad.nombre || this.nuevaActividad.horasMaximas <= 0) {
            return;
        }

        this.guardar.emit(this.nuevaActividad);
    }

    onCancelar(): void {
        this.onHide();
    }
}