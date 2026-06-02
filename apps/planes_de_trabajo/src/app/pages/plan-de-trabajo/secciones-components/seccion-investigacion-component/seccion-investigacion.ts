import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SeccionHijo } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { Investigaciones, CrearInvestigaciones, GrupoDeInvestigacion, MomentoInvestigacion, TipoProducto, CrearProductoEsperado } from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { PlanDeTrabajoModel } from 'apps/planes_de_trabajo/src/app/core/models/planDeTrabajo.model';
import { InvestigacioneService } from 'apps/planes_de_trabajo/src/app/core/services/investigaciones.service';
import { GrupoInvService } from 'apps/planes_de_trabajo/src/app/core/services/grupoInvestigacion.service';
import { MomentoInvService } from 'apps/planes_de_trabajo/src/app/core/services/momentoInvestigacion.service';
import { TiposProductoService } from 'apps/planes_de_trabajo/src/app/core/services/TiposProducto.service';
import { ProductoEsperadoService } from 'apps/planes_de_trabajo/src/app/core/services/productoEsperado.service';
import { ModalInvestigacionComponent } from '../../../home/modales/modal-crear-investigacion/modal-crear-investigacion';
import { ModalProductoEsperadoComponent } from '../../../home/modales/modal-crear-producto-esperado/modal-crear-producto-esperado';
import { MessageService } from 'primeng/api';
import { AuditoriaService } from 'apps/planes_de_trabajo/src/app/core/services/auditoria.service';
import { CreateAuditoria } from 'apps/planes_de_trabajo/src/app/core/models/auditoria.model';

interface InvestigacionExtendida extends Investigaciones {
    horasGuardadas?: number;
}

@Component({
    selector: 'app-seccion-investigacion',
    templateUrl: 'seccion-investigacion.html',
    styleUrls: ['./seccion-investigacion.scss'],
    standalone: true,
    imports: [TableModule, CommonModule, ButtonModule, InputNumberModule, FormsModule, TooltipModule, ModalInvestigacionComponent, ModalProductoEsperadoComponent]
})

export class SeccionInvestigacion implements OnInit, OnDestroy {
    @Input() seccionHijo!: SeccionHijo;
    @Input() planDeTrabajo!: PlanDeTrabajoModel;
    @Input() horasDisponibles: number = 0;

    @Output() horasUsadasChange = new EventEmitter<number>();

    investigaciones: InvestigacionExtendida[] = [];
    displayDialog = false;
    displayProductoDialog = false;
    cargando = false;
    guardando = false;
    guardandoProducto = false;
    cargandoDatosFormulario = false;
    eliminando: { [key: string]: boolean } = {};
    eliminandoProducto: { [key: string]: boolean } = {};

    gruposInvestigacion: GrupoDeInvestigacion[] = [];
    momentosInvestigacion: MomentoInvestigacion[] = [];
    tiposProducto: TipoProducto[] = [];

    investigacionSeleccionada: Investigaciones | null = null;

    private cambiosSubject = new Subject<{ investigacionId: string, horas: number }>();
    private readonly messageService = inject(MessageService);

    constructor(
        private investigacionService: InvestigacioneService,
        private grupoInvService: GrupoInvService,
        private momentoInvService: MomentoInvService,
        private tiposProductoService: TiposProductoService,
        private productoEsperadoService: ProductoEsperadoService,
        private auditoriaService: AuditoriaService
    ) { }

    ngOnInit() {
        if (this.planDeTrabajo?.id) {
            this.cargarInvestigaciones();
            this.cargarDatosFormulario();
            this.configurarAutoguardado();
        }
    }

    configurarAutoguardado(): void {
        this.cambiosSubject.pipe(
            debounceTime(800),
            distinctUntilChanged((prev, curr) =>
                prev.investigacionId === curr.investigacionId &&
                prev.horas === curr.horas
            )
        ).subscribe(cambio => {
            this.guardarCambioHoras(cambio.investigacionId);
        });
    }

    cargarInvestigaciones(): void {
        this.cargando = true;
        this.investigacionService.getByPt(this.planDeTrabajo.id, this.seccionHijo.id).subscribe({
            next: (data: any) => {
                const investigacionesCargadas = Array.isArray(data) ? data : [data];
                this.investigaciones = investigacionesCargadas.map((inv: Investigaciones) => ({
                    ...inv,
                    horasGuardadas: inv.horas
                }));
                this.cargando = false;
                this.emitirHorasUsadas();
            },
            error: (error) => {
                this.showError('Error al cargar investigaciones');
                this.investigaciones = [];
                this.cargando = false;
                this.emitirHorasUsadas();
            }
        });
    }

    cargarDatosFormulario(): void {
        this.cargandoDatosFormulario = true;

        forkJoin({
            grupos: this.grupoInvService.getAll(),
            momentos: this.momentoInvService.getAll(),
            tiposProducto: this.tiposProductoService.getAll()
        }).subscribe({
            next: (resultado) => {
                this.gruposInvestigacion = Array.isArray(resultado.grupos)
                    ? resultado.grupos
                    : [resultado.grupos];

                this.momentosInvestigacion = Array.isArray(resultado.momentos)
                    ? resultado.momentos
                    : [resultado.momentos];

                this.tiposProducto = Array.isArray(resultado.tiposProducto)
                    ? resultado.tiposProducto
                    : [resultado.tiposProducto];

                this.cargandoDatosFormulario = false;
            },
            error: (error) => {
                this.showError('Error al cargar datos del formulario');
                this.gruposInvestigacion = [];
                this.momentosInvestigacion = [];
                this.tiposProducto = [];
                this.cargandoDatosFormulario = false;
            }
        });
    }

    onCambioHoras(investigacionId: string, valor: number | null): void {
        const investigacion = this.investigaciones.find(i => i.id === investigacionId);
        if (investigacion) {
            const nuevasHoras = valor ?? 0;
            const horasActuales = investigacion.horas || 0;
            const diferencia = nuevasHoras - horasActuales;

            if (diferencia > this.horasDisponibles) {
                this.showWarn('No hay suficientes horas disponibles');
                return;
            }

            investigacion.horas = nuevasHoras;
            this.cambiosSubject.next({ investigacionId, horas: investigacion.horas });
            this.emitirHorasUsadas();
        }
    }

    getMaxHoras(investigacionId: string): number {
        const investigacion = this.investigaciones.find(i => i.id === investigacionId);
        const horasActuales = investigacion?.horas || 0;
        return horasActuales + this.horasDisponibles;
    }

    emitirHorasUsadas(): void {
        const totalHoras = this.calcularSubtotal();
        this.horasUsadasChange.emit(totalHoras);
    }

    guardarCambioHoras(investigacionId: string): void {
        const investigacion = this.investigaciones.find(i => i.id === investigacionId);
        if (!investigacion) return;

        this.investigacionService.update(investigacionId, {
            horas: investigacion.horas || 0
        }).subscribe({
            next: () => {
                if (investigacion.horas !== investigacion.horasGuardadas) {
                    const accion = (investigacion.horas || 0) > (investigacion.horasGuardadas || 0)
                        ? `Se aumentaron las horas de la investigacion: "${investigacion.nombreProyecto}" a ${investigacion.horas} horas`
                        : `Se disminuyeron las horas de la investigacion: "${investigacion.nombreProyecto}" a ${investigacion.horas} horas`;

                    this.crearAuditoria('Actualizar Investigacion', accion);
                    investigacion.horasGuardadas = investigacion.horas;
                }
                this.showSuccess('Horas actualizadas exitosamente');
            },
            error: (error) => {
                this.showError('Error al actualizar horas de investigación');
            }
        });
    }

    eliminarInvestigacion(investigacionId: string): void {
        const investigacion = this.investigaciones.find(i => i.id === investigacionId);
        this.eliminando[investigacionId] = true;
        this.investigacionService.delete(investigacionId).subscribe({
            next: () => {
                if (investigacion) {
                    this.crearAuditoria(
                        'Eliminar Investigacion',
                        `Investigacion: "${investigacion.nombreProyecto}" eliminada del plan de trabajo`
                    );
                }
                this.cargarInvestigaciones();
                delete this.eliminando[investigacionId];
                this.showSuccess('Investigación eliminada exitosamente');
            },
            error: (error) => {
                this.showError('Error al eliminar investigación');
                delete this.eliminando[investigacionId];
            }
        });
    }

    abrirDialogo(): void {
        this.displayDialog = true;
    }

    cerrarDialogo(): void {
        this.displayDialog = false;
    }

    onGuardarInvestigacion(investigacion: CrearInvestigaciones): void {
        this.guardando = true;
        this.investigacionService.create(investigacion).subscribe({
            next: (response) => {
                this.cerrarDialogo();
                this.cargarInvestigaciones();
                this.guardando = false;

                this.crearAuditoria(
                    'Crear Investigacion',
                    `Se creó la investigación "${investigacion.nombreProyecto}" en el plan de trabajo`
                );

                this.showSuccess('Investigación creada exitosamente');
            },
            error: (error) => {
                this.showError('Error al crear investigación');
                this.guardando = false;
            }
        });
    }

    // Métodos para producto esperado
    abrirDialogoProducto(investigacion: Investigaciones): void {
        this.investigacionSeleccionada = investigacion;
        this.displayProductoDialog = true;
    }

    cerrarDialogoProducto(): void {
        this.displayProductoDialog = false;
        this.investigacionSeleccionada = null;
    }

    onGuardarProducto(producto: CrearProductoEsperado): void {
        this.guardandoProducto = true;
        const investigacionActual = this.investigacionSeleccionada;

        this.productoEsperadoService.create(producto).subscribe({
            next: (response) => {
                this.cerrarDialogoProducto();
                this.cargarInvestigaciones();
                this.guardandoProducto = false;

                if (investigacionActual) {
                    this.crearAuditoria(
                        'Agregar Producto',
                        `Producto agregado: "${producto.nombre}" en la investigacion: "${investigacionActual.nombreProyecto}"`
                    );
                }

                this.showSuccess('Producto esperado creado exitosamente');
            },
            error: (error) => {
                this.showError('Error al crear producto esperado');
                this.guardandoProducto = false;
            }
        });
    }

    eliminarProducto(productoId: string, investigacionId: string): void {
        this.eliminandoProducto[productoId] = true;

        // Encontrar info para auditoria
        const investigacion = this.investigaciones.find(i => i.id === investigacionId);
        const producto = investigacion?.productos.find(p => p.id === productoId);

        this.productoEsperadoService.delete(productoId).subscribe({
            next: () => {
                if (investigacion && producto) {
                    this.crearAuditoria(
                        'Eliminar Producto',
                        `Producto eliminado: "${producto.nombre}" en la investigacion: "${investigacion.nombreProyecto}"`
                    );
                }

                this.cargarInvestigaciones();
                delete this.eliminandoProducto[productoId];
                this.showSuccess('Producto esperado eliminado exitosamente');
            },
            error: (error) => {
                this.showError('Error al eliminar producto esperado');
                delete this.eliminandoProducto[productoId];
            }
        });
    }

    calcularSubtotal(): number {
        if (!this.investigaciones || this.investigaciones.length === 0) {
            return 0;
        }
        return this.investigaciones.reduce((total, inv) => {
            return total + (inv.horas || 0);
        }, 0);
    }

    obtenerProductosTexto(productos: any[]): string {
        if (!productos || productos.length === 0) {
            return 'Sin productos';
        }
        return productos.map(p => p.nombre).join(', ');
    }

    private showSuccess(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: message,
            life: 2000
        });
    }

    private showWarn(message: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: message,
            life: 2000
        });
    }

    private showError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 2000
        });
    }

    private crearAuditoria(tipoCambio: string, accion: string): void {
        if (!this.planDeTrabajo) return;

        const auditoria: CreateAuditoria = {
            idPt: this.planDeTrabajo.id,
            tipoCambio,
            accion
        };

        this.auditoriaService.create(auditoria).subscribe({
            error: () => console.error('Error creando auditoria')
        });
    }

    ngOnDestroy(): void {
        this.cambiosSubject.complete();
    }
}