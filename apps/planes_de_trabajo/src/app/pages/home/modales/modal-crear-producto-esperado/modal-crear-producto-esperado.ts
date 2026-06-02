import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { 
    CrearProductoEsperado,
    TipoProducto,
    TipoProductoHijo,
    Investigaciones
} from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { MessageModule } from 'primeng/message';

interface TipoProductoSelectable {
    id: string;
    nombre: string;
    descripcion: string;
}

@Component({
    selector: 'app-modal-crear-producto-esperado',
    templateUrl: './modal-crear-producto-esperado.html',
    styleUrl: 'modal-crear-producto-esperado.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        AccordionModule,
        BadgeModule,
        MessageModule
    ]
})
export class ModalProductoEsperadoComponent implements OnChanges {
    @Input() visible = false;
    @Input() guardando = false;
    @Input() investigacion!: Investigaciones;
    @Input() tiposProducto: TipoProducto[] = [];
    
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<CrearProductoEsperado>();
    @Output() cancelar = new EventEmitter<void>();

    nuevoProducto: CrearProductoEsperado = {
        nombre: '',
        idTipoProducto: '',
        idInvestigacionExtension: ''
    };

    selectedTipoProducto: TipoProductoSelectable | null = null;
    mostrarValidacion = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && changes['visible'].currentValue) {
            this.resetearFormulario();
        }
    }

    resetearFormulario(): void {
        this.nuevoProducto = {
            nombre: '',
            idTipoProducto: '',
            idInvestigacionExtension: this.investigacion?.id || ''
        };
        this.selectedTipoProducto = null;
    }

    seleccionarTipo(tipo: TipoProducto | TipoProductoHijo, isParent: boolean): void {
        this.selectedTipoProducto = {
            id: tipo.id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion
        };
    }

    obtenerHijos(tipo: TipoProducto): TipoProductoHijo[] {
        if (!tipo.hijos) return [];
        return Array.isArray(tipo.hijos) ? tipo.hijos : [tipo.hijos];
    }

    tieneHijos(tipo: TipoProducto): boolean {
        if (!tipo.hijos) return false;
        const hijos = this.obtenerHijos(tipo);
        return hijos.length > 0;
    }

    contarHijos(tipo: TipoProducto): number {
        return this.obtenerHijos(tipo).length;
    }

    limpiarSeleccion(): void {
        this.selectedTipoProducto = null;
    }

    onHide(): void {
        this.mostrarValidacion = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }

    onGuardar(): void {
        this.mostrarValidacion = true;

        if (!this.nuevoProducto.nombre || !this.selectedTipoProducto) {
            return;
        }

        this.guardando = true;

        if (this.selectedTipoProducto) {
            this.nuevoProducto.idTipoProducto = this.selectedTipoProducto.id;
        }

        if (this.validarFormulario()) {
            this.guardar.emit(this.nuevoProducto);
        }
    }

    onCancelar(): void {
        this.onHide();
    }

    validarFormulario(): boolean {
        if (!this.nuevoProducto.nombre?.trim()) {
            alert('Por favor, ingrese el nombre del producto');
            return false;
        }
        if (!this.nuevoProducto.idTipoProducto) {
            alert('Por favor, seleccione el tipo de producto');
            return false;
        }
        return true;
    }
}