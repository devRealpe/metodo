import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { CreateSeccion } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';

@Component({
    selector: 'app-modal-crear-seccion',
    templateUrl: './modal-crear-seccion.html',
    styleUrls: ['./modal-crear-seccion.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        CheckboxModule,
        MessageModule
    ]
})
export class ModalCrearSeccionComponent implements OnChanges {
    @Input() visible = false;
    @Input() esSeccionPrincipal = true;
    @Input() plantillaId: string | null = null;
    @Input() plantillaNombre: string = '';
    @Input() seccionPadreId: string | null = null;
    @Input() seccionPadreNombre: string = '';
    @Input() guardando = false;

    // NUEVO: Recibe todas las secciones de la plantilla para validar si ya existe una con cursos
    @Input() seccionesPlantilla: any[] = [];

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<CreateSeccion>();
    @Output() cancelar = new EventEmitter<void>();

    mostrarValidacion = false;
    mostrarErrorTipoSeccion = false;

    // NUEVO: Computa si ya existe una sección secundaria con cursos
    get existeSeccionCursos(): boolean {
        if (!this.seccionesPlantilla) return false;
        // Buscar en todas las secciones hijas de todos los padres
        return this.seccionesPlantilla.some((padre: any) =>
            padre.hijos?.some((hijo: any) => hijo.seccionCursos)
        );
    }

    nuevaSeccion: Partial<CreateSeccion> = {
        nombre: '',
        esPadre: true,
        seccionCursos: false,
        seccionInvestigativa: false,
        concepto: undefined,
        idPlantilla: null,
        idSeccionPadre: null
    };

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && changes['visible'].currentValue) {
            this.resetearFormulario();
        }

        if (changes['esSeccionPrincipal']) {
            this.nuevaSeccion.esPadre = this.esSeccionPrincipal;
            this.nuevaSeccion.idPlantilla = this.esSeccionPrincipal ? this.plantillaId : null;
            this.nuevaSeccion.idSeccionPadre = !this.esSeccionPrincipal ? this.seccionPadreId : null;
        }
    }

    resetearFormulario(): void {
        this.nuevaSeccion = {
            nombre: '',
            esPadre: this.esSeccionPrincipal,
            seccionCursos: false,
            seccionInvestigativa: false,
            concepto: undefined,
            idPlantilla: this.esSeccionPrincipal ? this.plantillaId : null,
            idSeccionPadre: !this.esSeccionPrincipal ? this.seccionPadreId : null
        };
        this.mostrarValidacion = false;
        this.mostrarErrorTipoSeccion = false;
    }

    onCambioSeccionCursos(): void {
        if (this.nuevaSeccion.seccionCursos && this.nuevaSeccion.seccionInvestigativa) {
            this.mostrarErrorTipoSeccion = true;
            this.nuevaSeccion.seccionInvestigativa = false;
        } else {
            this.mostrarErrorTipoSeccion = false;
        }
        // Si ya existe una sección con cursos, desmarcar y bloquear
        if (this.existeSeccionCursos) {
            this.nuevaSeccion.seccionCursos = false;
        }
    }

    onCambioSeccionInvestigativa(): void {
        if (this.nuevaSeccion.seccionInvestigativa && this.nuevaSeccion.seccionCursos) {
            this.mostrarErrorTipoSeccion = true;
            this.nuevaSeccion.seccionCursos = false;
        } else {
            this.mostrarErrorTipoSeccion = false;
        }
    }

    onHide(): void {
        this.mostrarValidacion = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }

    onCancelar(): void {
        this.onHide();
    }

    onGuardar(): void {
        this.mostrarValidacion = true;

        if (!this.validarFormulario()) {
            return;
        }

        const seccionParaCrear: CreateSeccion = {
            nombre: this.nuevaSeccion.nombre!,
            esPadre: this.esSeccionPrincipal,
            seccionCursos: this.esSeccionPrincipal ? false : this.nuevaSeccion.seccionCursos!,
            seccionInvestigativa: this.esSeccionPrincipal ? false : this.nuevaSeccion.seccionInvestigativa!,
            concepto: this.esSeccionPrincipal ? null : String(this.nuevaSeccion.concepto),
            idPlantilla: this.esSeccionPrincipal ? this.plantillaId : null,
            idSeccionPadre: this.esSeccionPrincipal ? null : this.seccionPadreId
        };

        this.guardar.emit(seccionParaCrear);
    }

    validarFormulario(): boolean {
        if (!this.nuevaSeccion.nombre?.trim()) {
            return false;
        }

        // Si es secundaria, validar concepto
        if (!this.esSeccionPrincipal && !this.nuevaSeccion.concepto) {
            return false;
        }

        return true;
    }
}