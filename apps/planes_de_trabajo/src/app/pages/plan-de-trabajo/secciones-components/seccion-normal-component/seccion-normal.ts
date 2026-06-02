import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { ActividadService } from '../../../../core/services/actividad.service';
import { ActividadesPlanDeTrabajoService } from '../../../../core/services/actividadesPlanDeTrabajo.service';
import { AsesoriaService } from 'apps/planes_de_trabajo/src/app/core/services/asesorias.service';
import { AuditoriaService } from 'apps/planes_de_trabajo/src/app/core/services/auditoria.service';
import { MomentoInvService } from '../../../../core/services/momentoInvestigacion.service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SeccionHijo } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { Actividad } from 'apps/planes_de_trabajo/src/app/core/models/actividad.model';
import { PlanDeTrabajoModel } from 'apps/planes_de_trabajo/src/app/core/models/planDeTrabajo.model';
import { MomentoInvestigacion } from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { ActividadPlanDeTrabajo, CreateActividadPlanDeTrabajo, UpdateActividadPlanDeTrabajo, Asesoria, CrearAsesoria } from 'apps/planes_de_trabajo/src/app/core/models/actividadesPlanDeTrabajo.model';
import { CreateAuditoria } from 'apps/planes_de_trabajo/src/app/core/models/auditoria.model';
import { ModalAsesoriaComponent } from '../../../home/modales/modal-crear-asesoria/modal-crear-asesoria';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, groupBy, mergeMap, concatMap, tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { IftaLabelModule } from 'primeng/iftalabel';

interface ActividadExtendida extends Actividad {
    horas?: number;
    descripcion?: string;
    numeroProyectosJurado?: number;
    actividadPlanDeTrabajoId?: string;
    asesorias?: Asesoria[];
    esPersonalizada?: boolean;
    horasGuardadas?: number;
    descripcionGuardada?: string;
    numeroProyectosJuradoGuardado?: number;
}

@Component({
    selector: 'app-seccion-normal',
    templateUrl: 'seccion-normal.html',
    styleUrls: ['./seccion-normal.scss'],
    standalone: true,
    imports: [
        TableModule,
        CommonModule,
        InputNumberModule,
        FormsModule,
        TextareaModule,
        ButtonModule,
        TooltipModule,
        ModalAsesoriaComponent,
        IftaLabelModule
    ],
    providers: [ActividadService]
})
export class SeccionNormal implements OnInit, OnDestroy {
    @Input() seccionHijo!: SeccionHijo;
    @Input() planDeTrabajo!: PlanDeTrabajoModel;
    @Input() horasDisponibles: number = 0;
    @Input() nombrePrograma: string = '';

    @Output() horasUsadasChange = new EventEmitter<number>();

    value: number | undefined;
    actividades!: ActividadExtendida[];
    displayAsesoriaDialog = false;
    guardandoAsesoria = false;
    eliminandoAsesoria: { [key: string]: boolean } = {};
    eliminandoActividad: { [key: string]: boolean } = {};
    actividadSeleccionada: ActividadExtendida | null = null;
    momentosInvestigacion: MomentoInvestigacion[] = [];

    private cambiosSubject = new Subject<{ actividadId: string, campo: string, valor: any }>();
    private readonly messageService = inject(MessageService);

    constructor(
        private actividadService: ActividadService,
        private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
        private asesoriaService: AsesoriaService,
        private momentoInvService: MomentoInvService,
        private auditoriaService: AuditoriaService
    ) { }

    ngOnInit() {
        this.cargarActividades();
        this.cargarMomentos();
        this.configurarAutoguardado();
    }

    cargarMomentos(): void {
        this.momentoInvService.getAll().subscribe({
            next: (data: any) => {
                this.momentosInvestigacion = Array.isArray(data) ? data : [data];
            },
            error: (error) => {
                this.showMessage('error', 'Error al cargar momentos de investigación');
                this.momentosInvestigacion = [];
            }
        });
    }

    cargarActividades(): void {
        if (this.seccionHijo && this.planDeTrabajo) {
            forkJoin({
                actividades: this.actividadService.getActividadesBySeccion(this.seccionHijo.id),
                datosGuardados: this.actividadesPlanDeTrabajoService.getByPtId(this.planDeTrabajo.id)
            }).subscribe({
                next: ({ actividades, datosGuardados }) => {
                    this.procesarActividades(actividades, datosGuardados);
                },
                error: (error) => {
                    this.showMessage('error', 'Error al cargar actividades y datos');
                }
            });
        }
    }

    private procesarActividades(actividades: Actividad[], actividadesPlan: ActividadPlanDeTrabajo[]): void {
        this.actividades = actividades
            .map(act => {
                const actividadGuardada = actividadesPlan.find(
                    ap => ap.actividades.id === act.id
                );

                return actividadGuardada
                    ? {
                        ...act,
                        esPersonalizada: false,
                        horas: actividadGuardada.horas,
                        descripcion: actividadGuardada.descripcion,
                        numeroProyectosJurado: actividadGuardada.numeroProyectosJurado,
                        actividadPlanDeTrabajoId: actividadGuardada.id,
                        asesorias: actividadGuardada.asesorias || [],
                        horasGuardadas: actividadGuardada.horas,
                        descripcionGuardada: actividadGuardada.descripcion,
                        numeroProyectosJuradoGuardado: actividadGuardada.numeroProyectosJurado
                    }
                    : this.inicializarActividadVacia(act);
            });

        this.emitirHorasUsadas();
    }

    private inicializarActividadVacia(actividad: Actividad): ActividadExtendida {
        return {
            ...actividad,
            horas: 0,
            descripcion: '',
            numeroProyectosJurado: 0,
            asesorias: [],
            esPersonalizada: false,
            horasGuardadas: 0,
            descripcionGuardada: '',
            numeroProyectosJuradoGuardado: 0
        };
    }

    configurarAutoguardado(): void {
        this.cambiosSubject.pipe(
            groupBy(cambio => cambio.actividadId),
            mergeMap(group => group.pipe(
                debounceTime(800),
                distinctUntilChanged((prev, curr) =>
                    prev.campo === curr.campo &&
                    prev.valor === curr.valor
                ),
                concatMap(cambio => this.guardarCambio(cambio.actividadId))
            ))
        ).subscribe({
            
        });
    }

    onCambioHoras(actividadId: string, valor: number | null): void {
        const actividad = this.actividades.find(a => a.id === actividadId);
        if (!actividad) return;

        const nuevasHoras = valor ?? 0;
        const horasActuales = actividad.horas || 0;
        const diferencia = nuevasHoras - horasActuales;

        // Validar si hay suficientes horas disponibles
        if (diferencia > this.horasDisponibles) {
            this.showMessage('warn', 'No hay suficientes horas disponibles');
            actividad.horas = horasActuales;
            return;
        }

        if (nuevasHoras > actividad.horasMaximas) {
            this.showMessage('warn', 'No se puede asignar mas horas de las maximas');
            actividad.horas = horasActuales;
            return;
        }

        if (nuevasHoras < 0) {
            actividad.horas = 0;
            return;
        }
        // Aplicar el cambio directamente sin modal
        actividad.horas = nuevasHoras;
        this.cambiosSubject.next({ actividadId, campo: 'horas', valor: actividad.horas });
        this.emitirHorasUsadas();
    }

    onCambioDescripcion(actividadId: string, valor: string): void {
        this.actualizarCampo(actividadId, 'descripcion', valor);
    }

    onCambioNumeroProyectos(actividadId: string, valor: number | null): void {
        this.actualizarCampo(actividadId, 'numeroProyectos', valor ?? 0);
    }

    private actualizarCampo(actividadId: string, campo: string, valor: any): void {
        const actividad = this.actividades.find(a => a.id === actividadId);
        if (actividad) {
            if (campo === 'numeroProyectos') {
                actividad.numeroProyectosJurado = valor;
            } else if (campo === 'descripcion') {
                actividad.descripcion = valor;
            }
            this.cambiosSubject.next({ actividadId, campo, valor });
        }
    }

    getMaxHoras(actividadId: string): number {
        const actividad = this.actividades.find(a => a.id === actividadId);
        const horasActuales = actividad?.horas || 0;
        const maxPosible = horasActuales + this.horasDisponibles;

        // Si hay horasMaximas definidas y son menores al máximo posible, usar ese límite
        if (actividad?.horasMaximas && actividad.horasMaximas < maxPosible) {
            return actividad.horasMaximas;
        }

        return maxPosible;
    }

    emitirHorasUsadas(): void {
        const totalHoras = this.calcularSubtotal();
        this.horasUsadasChange.emit(totalHoras);
    }

    guardarCambio(actividadId: string): Observable<any> {
        const actividad = this.actividades.find(a => a.id === actividadId);
        if (!actividad) return of(null);

        // Si las horas son 0, desvincular la actividad del plan
        if (actividad.horas === 0) {
            if (actividad.actividadPlanDeTrabajoId) {
                return this.eliminarActividadPlanDeTrabajo(actividad);
            }
            return of(null);
        }

        // Si ya existe, actualizar; si no, crear
        if (actividad.actividadPlanDeTrabajoId) {
            return this.actualizarActividadPlanDeTrabajo(actividad);
        } else {
            return this.crearActividadPlanDeTrabajo(actividad);
        }
    }

    crearActividadPlanDeTrabajo(actividad: ActividadExtendida): Observable<ActividadPlanDeTrabajo> {

        const createData: CreateActividadPlanDeTrabajo = {
            descripcion: actividad.descripcion || null,
            numeroProyectosJurado: actividad.numeroProyectosJurado || null,
            horas: actividad.horas || 0,
            planDeTrabajoId: this.planDeTrabajo.id,
            actividadId: actividad.id
        };

        return this.actividadesPlanDeTrabajoService.create(createData).pipe(
            tap({
                next: (response: ActividadPlanDeTrabajo) => {
                    actividad.actividadPlanDeTrabajoId = response.id;
                    actividad.horasGuardadas = actividad.horas;
                    actividad.descripcionGuardada = actividad.descripcion;
                    actividad.numeroProyectosJuradoGuardado = actividad.numeroProyectosJurado;

                    this.crearAuditoria(
                        'Actividad Asignada',
                        `Se asignó la actividad "${actividad.nombre}" al plan de trabajo con ${actividad.horas} horas`
                    );

                    this.showMessage('success', 'Actividad guardada exitosamente');
                },
                error: (error) => {
                    this.showMessage('error', 'Error al guardar actividad');
                }
            })
        );
    }

    actualizarActividadPlanDeTrabajo(actividad: ActividadExtendida): Observable<any> {
        if (!actividad.actividadPlanDeTrabajoId) return of(null);

        const updateData: UpdateActividadPlanDeTrabajo = {
            descripcion: actividad.descripcion || null,
            numeroProyectosJurado: actividad.numeroProyectosJurado || null,
            horas: actividad.horas || 0
        };

        return this.actividadesPlanDeTrabajoService.update(actividad.actividadPlanDeTrabajoId, updateData).pipe(
            tap({
                next: () => {
                    this.auditarCambios(actividad);
                    this.showMessage('success', 'Actividad actualizada exitosamente');
                },
                error: (error) => {
                    this.showMessage('error', 'Error al actualizar actividad');
                }
            })
        );
    }

    private auditarCambios(actividad: ActividadExtendida): void {
        if (actividad.horas !== actividad.horasGuardadas) {
            const accion = (actividad.horas || 0) > (actividad.horasGuardadas || 0)
                ? `Se aumentaron las horas de la actividad: "${actividad.nombre}" a ${actividad.horas} horas`
                : `Se disminuyeron las horas de la actividad: "${actividad.nombre}" a ${actividad.horas} horas`;

            this.crearAuditoria('Actividad Actualizada', accion);
            actividad.horasGuardadas = actividad.horas;
        }

        if (actividad.descripcion !== actividad.descripcionGuardada) {
            this.crearAuditoria(
                'Actividad Actualizada',
                `Se actualizo la descripcion de la actividad: "${actividad.nombre}" a "${actividad.descripcion}"`
            );
            actividad.descripcionGuardada = actividad.descripcion;
        }

        if (actividad.numeroProyectosJurado !== actividad.numeroProyectosJuradoGuardado) {
            this.crearAuditoria(
                'Actividad Actualizada',
                `Se actualizo el numero de proyectos jurado de la actividad: "${actividad.nombre}" a ${actividad.numeroProyectosJurado}`
            );
            actividad.numeroProyectosJuradoGuardado = actividad.numeroProyectosJurado;
        }
    }

    eliminarActividadPlanDeTrabajo(actividad: ActividadExtendida): Observable<any> {
        if (!actividad.actividadPlanDeTrabajoId) return of(null);

        return this.actividadesPlanDeTrabajoService.delete(actividad.actividadPlanDeTrabajoId).pipe(
            tap({
                next: () => {
                    this.crearAuditoria(
                        'Actividad Desvinculada',
                        `Actividad: "${actividad.nombre}" desvinculada del plan de trabajo`
                    );

                    actividad.actividadPlanDeTrabajoId = undefined;
                    actividad.descripcion = '';
                    actividad.numeroProyectosJurado = 0;
                    actividad.horasGuardadas = 0;
                    actividad.descripcionGuardada = '';
                    actividad.numeroProyectosJuradoGuardado = 0;

                    this.emitirHorasUsadas();
                    this.showMessage('success', 'Actividad desvinculada exitosamente');
                },
                error: (error) => {
                    this.showMessage('error', 'Error al desvincular actividad del plan de trabajo');
                }
            })
        );
    }

    abrirDialogoAsesoria(actividad: ActividadExtendida): void {
        if (!actividad.actividadPlanDeTrabajoId) {
            this.showMessage('warn', 'Primero debe guardar horas para esta actividad antes de agregar asesorías');
            return;
        }
        this.actividadSeleccionada = actividad;
        this.displayAsesoriaDialog = true;
    }

    cerrarDialogoAsesoria(): void {
        this.displayAsesoriaDialog = false;
        this.actividadSeleccionada = null;
    }

    onGuardarAsesoria(asesoria: CrearAsesoria): void {
        this.guardandoAsesoria = true;
        const actividadActual = this.actividadSeleccionada;

        this.asesoriaService.create(asesoria).subscribe({
            next: (response) => {
                this.cerrarDialogoAsesoria();
                this.cargarActividades();
                this.guardandoAsesoria = false;

                if (actividadActual) {
                    this.crearAuditoria(
                        'Actividad Actualizada',
                        `Asesoria agregada: "${asesoria.titulo}" en la actividad:"${actividadActual.nombre}"`
                    );
                }

                this.showMessage('success', 'Asesoría creada exitosamente');
            },
            error: (error) => {
                this.showMessage('error', 'Error al crear asesoría');
                this.guardandoAsesoria = false;
            }
        });
    }

    eliminarAsesoria(asesoriaId: string): void {
        this.eliminandoAsesoria[asesoriaId] = true;
        this.asesoriaService.delete(asesoriaId).subscribe({
            next: () => {
                const actividad = this.actividades.find(a => a.asesorias?.some(as => as.id === asesoriaId));
                if (actividad) {
                    const asesoria = actividad.asesorias?.find(as => as.id === asesoriaId);
                    this.crearAuditoria(
                        'Actividad actualizada',
                        `Asesoria eliminada: "${asesoria?.titulo}" en la actividad: "${actividad.nombre}"`
                    );
                }

                this.cargarActividades();
                delete this.eliminandoAsesoria[asesoriaId];
                this.showMessage('success', 'Asesoría eliminada exitosamente');
            },
            error: (error) => {
                this.showMessage('error', 'Error al eliminar asesoría');
                delete this.eliminandoAsesoria[asesoriaId];
            }
        });
    }

    calcularSubtotal(): number {
        return this.actividades?.reduce((total, actividad) =>
            total + (actividad.horas || 0), 0
        ) || 0;
    }

    private showMessage(severity: 'success' | 'error' | 'warn', detail: string): void {
        const summaries = {
            success: 'Éxito',
            error: 'Error',
            warn: 'Advertencia'
        };

        this.messageService.add({
            severity,
            summary: summaries[severity],
            detail,
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