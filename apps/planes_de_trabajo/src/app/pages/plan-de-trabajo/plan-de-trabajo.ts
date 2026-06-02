import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SeccionNormal } from './secciones-components/seccion-normal-component/seccion-normal';
import { SeccionCursos } from './secciones-components/seccion-cursos-component/seccion-cursos';
import { PlanDeTrabajoModel, UpdateFirmasPlanDeTrabajo } from '../../core/models/planDeTrabajo.model';
import { SeccionInvestigacion } from './secciones-components/seccion-investigacion-component/seccion-investigacion';
import { AccordionModule } from 'primeng/accordion';
import { CommonModule } from '@angular/common';
import { SeccionService } from '../../../app/core/services/seccion.service';
import { ProfesorService } from '../../core/services/profesor.service';
import { FirmaService } from '../../core/services/firma.service';
import { Profesor } from '../../core/models/profesor.model';
import { SeccionHijo, SeccionPadre } from '../../core/models/seccion.model';
import { ModalConfirmacionComponent } from '../home/modales/modal-confirmacion/modal-confirmacion';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Location } from '@angular/common';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { CreateAuditoria } from '../../core/models/auditoria.model';
import { NotificacionesPlanTrabajoService } from '../../core/services/notificaciones-plan-trabajo.service';

@Component({
    selector: 'app-plan-de-trabajo',
    templateUrl: 'plan-de-trabajo.html',
    styleUrls: ['./plan-de-trabajo.scss'],
    standalone: true,
    imports: [
        TableModule,
        CommonModule,
        SeccionNormal,
        SeccionCursos,
        SeccionInvestigacion,
        AccordionModule,
        CardModule,
        ButtonModule,
        ModalConfirmacionComponent,
        ToastModule
    ],
    providers: [
        MessageService
    ]
})

export class PlanDeTrabajo implements OnInit {
    seccionesPadres: SeccionPadre[] = [];
    planDeTrabajo!: PlanDeTrabajoModel;
    profesor!: Profesor;
    loading = true;
    error = '';
    displayModalConfirmacion = false;
    cargandoEnvio = false;
    horasTotales = 40;
    horasPorSeccion: Map<string, number> = new Map();

    private readonly messageService = inject(MessageService);

    constructor(
        private seccionService: SeccionService,
        private profesorService: ProfesorService,
        private firmaService: FirmaService,
        private auditoriaService: AuditoriaService,
        private notificacionesService: NotificacionesPlanTrabajoService,
        private router: Router,
        private location: Location
    ) {
        const navigation = this.router.getCurrentNavigation();
        let planRecibido = navigation?.extras?.state?.['planDeTrabajo'] as PlanDeTrabajoModel;
        if (!planRecibido) {
            const planGuardado = sessionStorage.getItem('planDeTrabajoActual');
            if (planGuardado) {
                planRecibido = JSON.parse(planGuardado);
            }
        } else {
            sessionStorage.setItem('planDeTrabajoActual', JSON.stringify(planRecibido));
        }

        if (planRecibido) {
            this.planDeTrabajo = planRecibido;
        }
    }

    ngOnDestroy(): void {
        sessionStorage.removeItem('planDeTrabajoActual');
    }

    ngOnInit() {
        if (this.planDeTrabajo) {
            this.cargarSecciones(this.planDeTrabajo.plantilla.id);
            this.cargarProfesor(this.planDeTrabajo.idProfesor);
        } else {
            this.error = 'No se recibió información del plan de trabajo';
            this.loading = false;
            this.showError('No se encontró información del plan de trabajo');
        }
    }

    cargarSecciones(plantillaId: string) {
        this.loading = true;
        this.seccionService.getByPlantilla(plantillaId)
            .subscribe({
                next: (secciones) => {
                    this.seccionesPadres = secciones.filter(seccion => seccion.esPadre)
                        .map(seccion => ({
                            ...seccion,
                            hijos: seccion.hijos?.map(hijo => ({
                                ...hijo,
                            })) || []
                        }));
                    this.loading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar las secciones';
                    this.loading = false;
                    this.showError('Error al cargar las secciones del plan de trabajo');
                }
            });
    }

    cargarProfesor(numIdentificacion: string): void {
        this.loading = true;
        this.profesorService.getById(numIdentificacion).subscribe({
            next: (profesor) => {
                if (profesor) {
                    this.profesor = profesor;
                    if (this.profesor.dedicacion === 'MEDIO TIEMPO SIN CONVERSIÓN') this.horasTotales = 20;
                } else {
                    this.error = 'Profesor no encontrado';
                    this.showError('No se encontró información del profesor');
                }
                this.loading = false;
            },
            error: (error) => {
                this.error = 'Error al cargar el profesor';
                this.loading = false;
                this.showError('Error al cargar la información del profesor');
            }
        });
    }

    onHorasChange(seccionId: string, horas: number): void {
        this.horasPorSeccion.set(seccionId, horas);
    }

    private calcularHorasPorTipo(filtro: (hijo: SeccionHijo) => boolean): number {
        let total = 0;
        this.seccionesPadres.forEach(padre => {
            padre.hijos?.forEach(hijo => {
                if (filtro(hijo)) {
                    total += this.horasPorSeccion.get(hijo.id) || 0;
                }
            });
        });
        return total;
    }

    get horasCursos(): number {
        return this.calcularHorasPorTipo(hijo => this.esSeccionCursos(hijo));
    }

    get horasNormales(): number {
        return this.calcularHorasPorTipo(hijo => this.esSeccionNormal(hijo));
    }

    get horasInvestigacion(): number {
        return this.calcularHorasPorTipo(hijo => this.esSeccionInvestigacion(hijo));
    }

    calcularHorasDisponibles(): number {
        return this.horasTotales - this.horasCursos - this.horasNormales - this.horasInvestigacion;
    }

    esSeccionCursos(hijo: SeccionHijo): boolean {
        return hijo.seccionCursos;
    }

    esSeccionInvestigacion(hijo: SeccionHijo): boolean {
        return hijo.seccionInvestigativa;
    }

    esSeccionNormal(hijo: SeccionHijo): boolean {
        return !hijo.seccionCursos && !hijo.seccionInvestigativa;
    }

    onEnviarPlanClick(): void {
        this.displayModalConfirmacion = true;
    }

    handleConfirmarEnvio(): void {
        if (!this.planDeTrabajo?.id) {
            this.showError('No hay plan de trabajo para enviar');
            return;
        }

        this.cargandoEnvio = true;
        let tipoCambio = 'Enviado';
        let accion = 'Plan de trabajo enviado al profesor';
        if (this.planDeTrabajo.estado === 'RECHAZADO' || this.planDeTrabajo.estado === 'Rechazado por Decanatura') {
            tipoCambio = 'Reenviado';
            accion = 'Plan de trabajo reenviado al profesor';
        }

        const firmaData: UpdateFirmasPlanDeTrabajo = {
            enviadoProfesor: true,
            firmaProfesor: this.planDeTrabajo.esDirector ? true : null,
            firmaDirector: null,
            firmaDecano: null,
            rechazado: false,
            estado: 'Activo',
        };

        this.firmaService.actualizarFirmas(this.planDeTrabajo.id, firmaData).subscribe({
            next: (planActualizado) => {
                this.planDeTrabajo = planActualizado;
                this.auditoriaService.create({
                    idPt: this.planDeTrabajo.id,
                    tipoCambio: tipoCambio,
                    accion: accion
                }).subscribe();

                // Enviar notificación al profesor
                this.enviarNotificacionAlProfesor();

                this.cargandoEnvio = false;
                this.displayModalConfirmacion = false;
                this.showSuccess('Plan de trabajo enviado exitosamente, redireccionando al inicio...');
                sessionStorage.removeItem('planDeTrabajoActual');

                setTimeout(() => {
                    this.location.back();
                }, 1000);
            },
            error: (error) => {
                this.showError('Error al enviar el plan de trabajo');
                this.cargandoEnvio = false;
                this.displayModalConfirmacion = false;
            }
        });
    }

    handleCancelarEnvio(): void {
        this.displayModalConfirmacion = false;
    }

    get nombreProfesor(): string {
        return this.profesor ? `${this.profesor.nombres} ${this.profesor.apellidos}` : '';
    }

    get estaSuspendido(): boolean {
        return this.planDeTrabajo?.estado === 'Suspendido';
    }

    get estaInactivado(): boolean {
        return this.planDeTrabajo?.estado === 'Inactivado';
    }

    volverHome(): void {
        sessionStorage.removeItem('planDeTrabajoActual');
        this.location.back();
    }

    private enviarNotificacionAlProfesor(): void {

        // Buscar director del programa para incluir en la notificación
        this.profesorService.getByPrograma(this.profesor.programa).subscribe({
            next: (profesores) => {
                const director = profesores.find(p => p.cargo === 'DIRECTOR DE PROGRAMA');
                
                if (director) {
                    // Notificación al profesor de que su plan está listo para revisar
                    this.notificacionesService.notificarAprobacionProfesor({
                        emailProfesor: this.profesor.numIdentificacion,
                        nombreProfesor: `${this.profesor.nombres} ${this.profesor.apellidos}`,
                        emailDirector: director.numIdentificacion,
                        nombreDirector: `${director.nombres} ${director.apellidos}`,
                        programa: this.profesor.programa,
                        periodo: this.planDeTrabajo.periodo,
                        anio: this.planDeTrabajo.anio
                    }).subscribe({
                        next: (response) => {
                        },
                        error: (err) => {
                        }
                    });
                } else {
                }
            },
            error: (err) => {
            }
        });
    }

    private showSuccess(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
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
}