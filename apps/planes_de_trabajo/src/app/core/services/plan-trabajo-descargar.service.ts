import { Injectable } from '@angular/core';
import { ResumenPtService } from './resumen-pt.service';
import {
    PdfExportService,
    PlanDeTrabajoCompleto,
    ResumenProfesor,
    SeccionPadreData
} from './pdf-export.service';
import { ProfesorService } from '../services/profesor.service';
import { SeccionService } from './seccion.service';
import { ActividadesPlanDeTrabajoService } from './actividadesPlanDeTrabajo.service';
import { CursoService } from './curso.service';
import { InvestigacioneService } from './investigaciones.service';
import { PlanDeTrabajoModel } from '../models/planDeTrabajo.model';
import { Profesor } from '../models/profesor.model';
import { WordExportService } from './word-export.service';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ProfesorConPlan {
    numIdentificacion: string;
    nombres: string;
    apellidos: string;
    programa: string;
    facultad: string;
    cargo?: string;
    dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO';
    planDeTrabajo: PlanDeTrabajoModel | null;
    nivelEducativo?: string;
    escalafon?: string;
    vinculacion?: string;
}

export interface ContextoExportacion {
    periodo: { anio: number; periodo: number };
    decano: { nombres: string; apellidos: string; facultad: string };
}

@Injectable({
    providedIn: 'root'
})
export class PlanTrabajoDescargarService {

    constructor(
        private pdfExportService: PdfExportService,
        private profesorService: ProfesorService,
        private seccionService: SeccionService,
        private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
        private cursoService: CursoService,
        private investigacionService: InvestigacioneService,
        private resumenPtService: ResumenPtService,
        private wordExportService: WordExportService
    ) { }

    async descargarPTIndividual(
        profesor: ProfesorConPlan,
        contexto: ContextoExportacion
    ): Promise<void> {
        if (!profesor.planDeTrabajo) {
            throw new Error(`${profesor.nombres} ${profesor.apellidos} no tiene un plan de trabajo asignado`);
        }

        const planCompleto = await this.obtenerPlanDeTrabajoCompleto(profesor, contexto);
        if (!planCompleto) {
            throw new Error('No se pudo obtener el plan de trabajo completo');
        }

        await this.pdfExportService.exportarPTIndividual(planCompleto);
    }

    async descargarPTIndividualWord(
        profesor: ProfesorConPlan,
        contexto: ContextoExportacion
    ): Promise<void> {
        if (!profesor.planDeTrabajo) {
            throw new Error(`${profesor.nombres} ${profesor.apellidos} no tiene un plan de trabajo asignado`);
        }

        const planCompleto = await this.obtenerPlanDeTrabajoCompleto(profesor, contexto);
        if (!planCompleto) {
            throw new Error('No se pudo obtener el plan de trabajo completo');
        }

        await this.wordExportService.exportarPTIndividual(planCompleto);
    }

    async exportarPTConsolidado(
        profesores: ProfesorConPlan[],
        contexto: ContextoExportacion
    ): Promise<void> {
        const profesoresConPlan = profesores.filter(p => p.planDeTrabajo);
        if (profesoresConPlan.length === 0) {
            return;
        }

        const todasLasSeccionesHijas = new Map<string, number>();
        if (profesoresConPlan.length > 0) {
            const primerPlan = profesoresConPlan[0].planDeTrabajo!;
            const seccionesPlantilla = await this.seccionService.getByPlantilla(primerPlan.plantilla.id).toPromise();
            if (seccionesPlantilla) {
                for (const seccionPadre of seccionesPlantilla) {
                    for (const seccionHijo of seccionPadre.hijos) {
                        const nombreUsar = seccionHijo.nombre?.trim() !== '' ? seccionHijo.nombre : seccionPadre.nombre;
                        todasLasSeccionesHijas.set(nombreUsar, 0);
                    }
                }
            }
        }

        const resumenProfesores: ResumenProfesor[] = [];

        for (const profesor of profesoresConPlan) {
            const planCompleto = await this.obtenerPlanDeTrabajoCompleto(profesor, contexto);
            if (!planCompleto) {
                continue;
            }

            const totalesPorSeccion = new Map<string, number>();
            todasLasSeccionesHijas.forEach((_, seccion) => {
                totalesPorSeccion.set(seccion, 0);
            });

            for (const seccionPadre of planCompleto.secciones) {
                for (const seccionHijo of seccionPadre.hijos) {
                    const nombreUsar = seccionHijo.nombre?.trim() !== '' ? seccionHijo.nombre : seccionPadre.nombre;
                    if (totalesPorSeccion.has(nombreUsar)) {
                        totalesPorSeccion.set(nombreUsar, seccionHijo.totalHoras);
                    }
                }
            }

            const totalGeneral = planCompleto.totalHoras;

            resumenProfesores.push({
                profesor: {
                    id: profesor.numIdentificacion,
                    documento: profesor.numIdentificacion,
                    nombres: profesor.nombres,
                    apellidos: profesor.apellidos,
                    estado: profesor.planDeTrabajo?.rechazado ? 'Rechazado' : 'Aprobado',
                    dedicacion: profesor.dedicacion,
                    rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
                    programa: profesor.programa,
                    facultad: profesor.facultad
                },
                totalesPorSeccion,
                totalGeneral
            });
        }

        const facultad = contexto.decano.facultad;
        const todosLosProfesores = await this.profesorService.getByFacultad(facultad).toPromise();
        const programasUnicos = [...new Set(profesores.map(p => p.programa))];
        const directoresPorPrograma = new Map<string, string>();
        programasUnicos.forEach(programa => {
            const director = todosLosProfesores?.find(p => p.cargo === 'DIRECTOR DE PROGRAMA' && p.programa === programa);
            if (director) directoresPorPrograma.set(programa, `${director.nombres} ${director.apellidos}`);
        });
        let nombreDirector = '';
        if (programasUnicos.length === 1) {
            nombreDirector = directoresPorPrograma.get(programasUnicos[0]) || '';
        } else {
            nombreDirector = Array.from(directoresPorPrograma.values())[0] || 'No asignado';
        }

        const seccionesConPadre = new Map<string, string>();
        if (profesoresConPlan.length > 0) {
            const primerPlan = profesoresConPlan[0].planDeTrabajo!;
            const seccionesPlantilla = await this.seccionService.getByPlantilla(primerPlan.plantilla.id).toPromise();
            if (seccionesPlantilla) {
                for (const seccionPadre of seccionesPlantilla) {
                    for (const seccionHijo of seccionPadre.hijos) {
                        const nombreUsar = seccionHijo.nombre?.trim() !== '' ? seccionHijo.nombre : seccionPadre.nombre;
                        seccionesConPadre.set(nombreUsar, seccionPadre.nombre);
                    }
                }
            }
        }

        let programaMostrar = programasUnicos.length === 1 ? programasUnicos[0] : facultad;
        await this.pdfExportService.exportarPTsAprobados(
            resumenProfesores,
            programaMostrar,
            facultad,
            `${contexto.periodo.anio}-${contexto.periodo.periodo}`,
            `${contexto.decano.nombres} ${contexto.decano.apellidos}`,
            nombreDirector,
            seccionesConPadre
        );
    }

    async exportarZIP(
        profesores: ProfesorConPlan[],
        contexto: ContextoExportacion,
        nombreCarpetaPersonalizado?: string
    ): Promise<void> {
        const profesoresConPlan = profesores.filter(p => p.planDeTrabajo);
        if (profesoresConPlan.length === 0) {
            return;
        }

        const zip = new JSZip();
        const nombreCarpeta = nombreCarpetaPersonalizado
            ? nombreCarpetaPersonalizado
            : `Planes_Trabajo_${contexto.periodo.anio}_${contexto.periodo.periodo}`;

        const folder = zip.folder(nombreCarpeta);

        if (!folder) {
            throw new Error("No se pudo crear el directorio en el ZIP");
        }

        for (const profesor of profesoresConPlan) {
            try {
                const planCompleto = await this.obtenerPlanDeTrabajoCompleto(profesor, contexto);
                if (planCompleto) {
                    const blob = await this.pdfExportService.generarPTIndividualBlob(planCompleto);
                    const fileName = `PT_${profesor.nombres.replace(/\s+/g, '_')}_${profesor.apellidos.replace(/\s+/g, '_')}.pdf`;
                    folder.file(fileName, blob);
                }
            } catch (error) {
                folder.file(`ERROR_${profesor.nombres}_${profesor.apellidos}.txt`, `No se pudo generar el plan de trabajo: ${error}`);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${nombreCarpeta}.zip`);
    }

    private async obtenerPlanDeTrabajoCompleto(
        profesor: ProfesorConPlan,
        contexto: ContextoExportacion
    ): Promise<PlanDeTrabajoCompleto | null> {
        if (!profesor.planDeTrabajo) return null;

        try {
            let nombreDirector = '';
            const directores = await this.profesorService.getByFacultad(contexto.decano.facultad).toPromise();
            const director = directores?.find(p => p.cargo === 'DIRECTOR DE PROGRAMA' && p.programa === profesor.programa);
            if (director) {
                nombreDirector = `${director.nombres} ${director.apellidos}`;
            }

            const nombreDecano = `${contexto.decano.nombres} ${contexto.decano.apellidos}`;

            const secciones = await this.seccionService.getByPlantilla(profesor.planDeTrabajo.plantilla.id).toPromise();
            if (!secciones || secciones.length === 0) {
                throw new Error('No se encontraron secciones para el plan de trabajo');
            }

            const actividades = await this.actividadesPlanDeTrabajoService.getByPtId(profesor.planDeTrabajo.id).toPromise();
            const asignaturas = await this.cursoService.getByProfesor(profesor.numIdentificacion).toPromise();

            const seccionesProcesadas: SeccionPadreData[] = [];

            for (const seccionPadre of secciones) {
                const hijosConContenido: any[] = [];
                let totalHorasSeccionPadre = 0;

                for (const seccionHijo of seccionPadre.hijos) {
                    let horasSeccionHijo = 0;
                    let contenidoHijo: any;

                    if (seccionHijo.seccionCursos && asignaturas) {
                        const asignaturasData = asignaturas.map(a => ({
                            codAsignatura: a.codAsignatura,
                            grupo: a.grupo,
                            semestre: a.semestre.toString(),
                            nomAsignatura: a.nomAsignatura,
                            numEstudiantes: a.numEstudiantes,
                            numCreditos: a.numCreditos,
                            horasPresenciales: a.horasPresenciales
                        }));
                        horasSeccionHijo = asignaturasData.reduce((sum, a) => sum + a.horasPresenciales, 0);
                        contenidoHijo = {
                            nombre: seccionHijo.nombre,
                            actividades: [],
                            asignaturas: asignaturasData,
                            totalHoras: horasSeccionHijo,
                            tipo: 'asignaturas'
                        };
                    } else if (seccionHijo.seccionInvestigativa) {
                        try {
                            const investigaciones = await this.investigacionService.getByPt(profesor.planDeTrabajo.id, seccionHijo.id).toPromise();
                            const investigacionesArray = Array.isArray(investigaciones) ? investigaciones : (investigaciones ? [investigaciones] : []);
                            const investigacionesData = investigacionesArray.map(inv => ({
                                codigo: inv.codigo,
                                nombreProyecto: inv.nombreProyecto,
                                grupo: inv.grupo?.sigla || inv.grupo?.nombre || 'N/A',
                                momento: inv.momentoInvestigacion?.nombre || 'N/A',
                                productos: inv.productos?.map((p: any) => p.nombre).join(', ') || 'Sin productos',
                                horas: inv.horas
                            }));
                            horasSeccionHijo = investigacionesData.reduce((sum, inv) => sum + inv.horas, 0);
                            contenidoHijo = {
                                nombre: seccionHijo.nombre,
                                actividades: [],
                                investigaciones: investigacionesData,
                                totalHoras: horasSeccionHijo,
                                tipo: 'investigacion'
                            };
                        } catch (error) {
                            contenidoHijo = {
                                nombre: seccionHijo.nombre,
                                actividades: [],
                                investigaciones: [],
                                totalHoras: 0,
                                tipo: 'investigacion'
                            };
                        }
                    } else {
                        const actividadesSeccion = actividades?.filter(act =>
                            seccionHijo.actividades.some(a => a.id === act.actividades.id)
                        ) || [];
                        const actividadesData = actividadesSeccion.map(act => ({
                            nombre: act.actividades?.nombre || 'Sin nombre',
                            descripcion: act.descripcion || '',
                            horas: act.horas,
                            asesorias: Array.isArray(act.asesorias) ? act.asesorias.map(a => ({
                                id: a.id,
                                titulo: a.titulo,
                                momento_asesoria: a.momento_asesoria
                            })) : []
                        }));
                        horasSeccionHijo = actividadesData.reduce((sum, act) => sum + act.horas, 0);
                        contenidoHijo = {
                            nombre: seccionHijo.nombre?.trim() !== '' ? seccionHijo.nombre : seccionPadre.nombre,
                            actividades: actividadesData,
                            totalHoras: horasSeccionHijo,
                            tipo: 'actividades'
                        };
                    }

                    hijosConContenido.push(contenidoHijo);
                    totalHorasSeccionPadre += horasSeccionHijo;
                }

                seccionesProcesadas.push({
                    nombre: seccionPadre.nombre,
                    hijos: hijosConContenido,
                    totalHoras: totalHorasSeccionPadre
                });
            }

            const totalHoras = seccionesProcesadas.reduce((sum, s) => sum + s.totalHoras, 0);

            return {
                profesor: {
                    id: profesor.numIdentificacion,
                    documento: profesor.numIdentificacion,
                    nombres: profesor.nombres,
                    apellidos: profesor.apellidos,
                    estado: profesor.planDeTrabajo.rechazado ? 'Rechazado' : 'Aprobado',
                    dedicacion: profesor.dedicacion,
                    rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
                    programa: profesor.programa,
                    facultad: profesor.facultad,
                    formacion: profesor.nivelEducativo || 'No especificado',
                    escalafon: profesor.escalafon || 'No especificado',
                    vinculacion: profesor.vinculacion || 'No especificado'
                },
                secciones: seccionesProcesadas,
                totalHoras,
                periodo: `${contexto.periodo.anio}-${contexto.periodo.periodo}`,
                facultad: profesor.facultad,
                programa: profesor.programa,
                decano: nombreDecano,
                director: nombreDirector,
                anio: contexto.periodo.anio,
                periodoAcademico: contexto.periodo.periodo
            };
        } catch (error) {
            return null;
        }
    }
}