import { Component, OnInit, effect, untracked } from '@angular/core';
import { signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { PlantillaService } from '../../../core/services/plantilla.service';
import { SeccionService } from '../../../core/services/seccion.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';
import { Plantilla } from '../../../core/models/plantilla.model';
import { SeccionPadre, SeccionHijo, CreateSeccion } from '../../../core/models/seccion.model';
import { Actividad, CrearActividad } from '../../../core/models/actividad.model';
import { ModalCrearActividadComponent } from '../modales/modal-crear-actividad/modal-crear-actividad';
import { ModalCrearSeccionComponent } from '../modales/modal-crear-seccion/modal-crear-seccion';
import { DividerModule } from 'primeng/divider';

interface ActividadView extends Actividad {
    asesorias?: any[];
    numeroProyectosJurado?: number;
    descripcion?: string;
}

@Component({
    selector: 'app-planeacion-home',
    templateUrl: './planeacion-home.html',
    styleUrls: ['./planeacion-home.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        SelectModule,
        ButtonModule,
        InputTextModule,
        AccordionModule,
        TableModule,
        ToastModule,
        TagModule,
        InputNumberModule,
        TextareaModule,
        TooltipModule,
        ModalCrearActividadComponent,
        ModalCrearSeccionComponent,
        DividerModule
    ],
    providers: [MessageService]
})
export class PlaneacionHome implements OnInit {
    plantillas = signal<Plantilla[]>([]);
    plantillaSeleccionada: Plantilla | null = null;
    nombreNuevaPlantilla = signal<string>('');
    secciones = signal<SeccionPadre[]>([]);
    loading = signal<boolean>(false);
    eliminandoAsesoria: { [key: string]: boolean } = {};
    activePanels: string[] = [];
    seccionParaNuevaActividad: SeccionHijo | null = null;
    modalCrearActividadVisible = false;
    modalCrearSeccionVisible = false;
    seccionPadreParaNuevaSeccion: SeccionPadre | null = null;
    esCreandoSeccionPrincipal = true;
    guardandoSeccion = false;
    private debounceTimeouts: { [key: string]: any } = {};

    constructor(
        private plantillaService: PlantillaService,
        private seccionService: SeccionService,
        private actividadService: ActividadService,
        private messageService: MessageService,
        private realtimeService: PlanTrabajoRealtimeService
    ) {
        effect(() => {
            const trigger = this.realtimeService.refreshTrigger();

            if (trigger > 0 && this.plantillaSeleccionada) {
                untracked(() => {
                    
                    const planActualizado = this.realtimeService.planActualizado();

                    if (planActualizado) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Actualización Detectada',
                            detail: 'Se han realizado cambios en planes de trabajo',
                            life: 5000
                        });
                        this.realtimeService.resetSignal('actualizado');
                    }

                    this.loadPlantillas(); // Recargar plantillas por si afectan a alguna
                });
            }
        });
    }

    ngOnInit(): void {
        this.loadPlantillas();
    }

    loadPlantillas(): void {
        this.plantillaService.getPlantillas().subscribe({
            next: (data) => this.plantillas.set(data),
            error: (err) => {
                this.showError('Error al cargar las plantillas');
            }
        });
    }

    create(nombre: string): void {
        if (!nombre.trim()) {
            this.showWarn('El nombre de la plantilla es requerido');
            return;
        }
        this.plantillaService.create(nombre).subscribe({
            next: () => {
                this.showSuccess('Plantilla creada exitosamente');
                this.nombreNuevaPlantilla.set('');
                this.loadPlantillas();
            },
            error: (err) => {
                this.showError('Error al crear la plantilla');
            }
        });
    }

    onPlantillaChange(plantilla: Plantilla | null): void {
        if (!plantilla) {
            this.secciones.set([]);
            return;
        }
        this.loading.set(true);
        this.seccionService.getByPlantilla(plantilla.id).subscribe({
            next: (data) => {
                const seccionesPadre = data.filter(s => s.esPadre);
                seccionesPadre.forEach(padre => {
                    if (padre.hijos) {
                        padre.hijos.forEach(hijo => {
                            if (this.esSeccionNormal(hijo)) {
                                this.loadActividades(hijo);
                            }
                        });
                    }
                });
                this.secciones.set(seccionesPadre);
                this.loading.set(false);
            },
            error: (err) => {
                this.showError('Error al cargar las secciones');
                this.loading.set(false);
            }
        });
    }

    loadActividades(seccion: SeccionHijo): void {
        this.actividadService.getActividadesBySeccion(seccion.id).subscribe({
            next: (actividades) => {
                seccion.actividades = actividades as ActividadView[];
            },
            error: (err) => {
                this.showError(`Error cargando actividades de ${seccion.nombre}`);
            }
        });
    }

    esSeccionCursos(hijo: SeccionHijo): boolean {
        return hijo.seccionCursos;
    }

    esSeccionInvestigacion(hijo: SeccionHijo): boolean {
        return hijo.seccionInvestigativa;
    }

    esSeccionNormal(hijo: SeccionHijo): boolean {
        return !hijo.esPadre && !hijo.seccionCursos && !hijo.seccionInvestigativa;
    }

    onCambioHoras(actividadId: string, horas: number): void {
        if (horas < 1 || horas > 40) return;

        const key = `horas_${actividadId}`;
        if (this.debounceTimeouts[key]) {
            clearTimeout(this.debounceTimeouts[key]);
        }

        this.debounceTimeouts[key] = setTimeout(() => {
            this.actividadService.updateHorasMaximas(actividadId, horas).subscribe({
                next: () => this.showSuccess(`Horas máximas actualizadas a ${horas}`),
                error: () => this.showError('Error al actualizar las horas máximas')
            });
        }, 1000);
    }

    onCambioConcepto(seccionId: string, concepto: string): void {
        const key = `concepto_${seccionId}`;
        if (this.debounceTimeouts[key]) {
            clearTimeout(this.debounceTimeouts[key]);
        }

        this.debounceTimeouts[key] = setTimeout(() => {
            this.seccionService.updateConcepto(seccionId, concepto).subscribe({
                next: () => this.showSuccess(`Concepto actualizado a ${concepto}`),
                error: () => this.showError('Error al actualizar el concepto')
            });
        }, 1000);
    }

    toggleEstadoPlantilla(): void {
        if (!this.plantillaSeleccionada) return;
        const nuevoEstado = !this.plantillaSeleccionada.estado;
        const plantillaId = this.plantillaSeleccionada.id;
        this.plantillaService.updateEstado(plantillaId, nuevoEstado).subscribe({
            next: () => {
                this.showSuccess(
                    nuevoEstado ? 'Plantilla activada exitosamente' : 'Plantilla desactivada exitosamente'
                );
                if (this.plantillaSeleccionada) {
                    this.plantillaSeleccionada.estado = nuevoEstado;
                }
                this.loadPlantillas();
            },
            error: (err) => {
                this.showError('Error al actualizar el estado de la plantilla');
            }
        });
    }

    abrirModalCrearActividad(seccion: SeccionHijo): void {
        this.seccionParaNuevaActividad = seccion;
        this.modalCrearActividadVisible = true;
    }

    abrirModalCrearSeccionPrincipal(): void {
        this.seccionPadreParaNuevaSeccion = null;
        this.esCreandoSeccionPrincipal = true;
        this.modalCrearSeccionVisible = true;
    }

    abrirModalCrearSeccionSecundaria(seccionPadre: SeccionPadre): void {
        this.seccionPadreParaNuevaSeccion = seccionPadre;
        this.esCreandoSeccionPrincipal = false;
        this.modalCrearSeccionVisible = true;
    }

    eliminarActividad(actividadId: string): void {
        this.actividadService.delete(actividadId).subscribe({
            next: () => {
                this.showSuccess('Actividad eliminada correctamente');
                const seccionesActualizadas = this.secciones().map(padre => {
                    if (padre.hijos) {
                        padre.hijos.forEach(hijo => {
                            if (hijo.actividades) {
                                hijo.actividades = hijo.actividades.filter(a => a.id !== actividadId);
                            }
                        });
                    }
                    return padre;
                });
                this.secciones.set(seccionesActualizadas);
            },
            error: () => {
                this.showError('La actividad no se puede eliminar si ya se asignó a algún plan de trabajo');
            }
        });
    }

    eliminarSeccion(seccionId: string, nombre: string, esPadre: boolean): void {
        this.seccionService.deleteSeccion(seccionId).subscribe({
            next: () => {
                this.showSuccess(`Sección "${nombre}" eliminada correctamente`);
                const seccionesActualizadas = this.secciones().map(padre => {
                    if (esPadre) {
                        if (padre.id === seccionId) return null;
                        return padre;
                    } else {
                        if (padre.hijos) {
                            padre.hijos = padre.hijos.filter(hijo => hijo.id !== seccionId);
                        }
                        return padre;
                    }
                }).filter(padre => padre !== null) as SeccionPadre[];

                this.secciones.set(seccionesActualizadas);
            },
            error: (err) => {
                let mensaje = 'No se puede eliminar la sección porque tiene datos asociados.';
                if (err?.error?.message) {
                    mensaje = err.error.message;
                }
                this.showError(mensaje);
            }
        });
    }

    onGuardarNuevaActividad(actividad: CrearActividad): void {
        if (!this.seccionParaNuevaActividad) return;

        this.actividadService.create(actividad).subscribe({
            next: (actividadCreada) => {
                const seccion = this.seccionParaNuevaActividad;
                if (!seccion?.actividades) seccion!.actividades = [];
                seccion!.actividades.push(actividadCreada as ActividadView);
                this.showSuccess('Actividad creada exitosamente');
                this.cerrarModalActividad();
            },
            error: (err) => {
                this.showError('Error al crear la actividad');
            }
        });
    }

    onGuardarNuevaSeccion(seccion: CreateSeccion): void {
        this.guardandoSeccion = true;
        this.seccionService.createSeccion(seccion).subscribe({
            next: () => {
                this.showSuccess('Sección creada exitosamente');
                this.cerrarModalSeccion();
                // Recargar las secciones
                if (this.plantillaSeleccionada) {
                    this.onPlantillaChange(this.plantillaSeleccionada);
                }
            },
            error: (err) => {
                this.showError('Error al crear la sección');
                this.guardandoSeccion = false;
            },
            complete: () => {
                this.guardandoSeccion = false;
            }
        });
    }

    onCancelarModalActividad(): void {
        this.cerrarModalActividad();
    }

    onCancelarModalSeccion(): void {
        this.cerrarModalSeccion();
    }

    private cerrarModalActividad(): void {
        this.modalCrearActividadVisible = false;
        this.seccionParaNuevaActividad = null;
    }

    private cerrarModalSeccion(): void {
        this.modalCrearSeccionVisible = false;
        this.seccionPadreParaNuevaSeccion = null;
    }

    private showSuccess(message: string): void {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: message, life: 3000 });
    }

    private showWarn(message: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: message, life: 3000 });
    }

    private showError(message: string): void {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message, life: 4000 });
    }
}