import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Profesor } from '../models/profesor.model';
import { PlanDeTrabajoModel } from '../models/planDeTrabajo.model';
import { PlanDeTrabajoService } from './planDeTrabajo.service';

import { ActividadPlanDeTrabajo } from '../models/actividadesPlanDeTrabajo.model';
import { environment } from '@shared/shared-environments';
import { HttpClient } from '@angular/common/http';
import { Curso } from '../models/curso.model';
import { Concepto } from '../models/concepto.model';
import { FilterCriteria, PeriodoAcademico } from '../models/filters.model';
import { SeccionHijo } from '../models/seccion.model';


@Injectable({
    providedIn: 'root',
})
export class SistemasService {
    private readonly base = `${environment.apiPlanesDeTraba}`;
    private readonly basept = `${environment.apiOracle}`;
    private readonly planDeTrabajoService = inject(PlanDeTrabajoService);


    constructor(private http: HttpClient) { }

    private readonly ALLOWED_CARGOS = ['PROFESOR', 'DIRECTOR DE PROGRAMA'];
    private readonly DIRECTOR_CARGO = 'DIRECTOR DE PROGRAMA';

    getActividadesByPlanId(idPt: string): Observable<ActividadPlanDeTrabajo[]> {
        return this.http.get<ActividadPlanDeTrabajo[]>(`${this.base}/actividades-pt/pt/${encodeURIComponent(idPt)}`);
    }

    getInvestigacionesByPlanId(idPt: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/investigacion-extension/pt/${encodeURIComponent(idPt)}`);
    }

    getAllConceptos(): Observable<Concepto[]> {
        return this.http.get<Concepto[]>(`${this.basept}/conceptos`);
    }

    getSeccionesCursos(tieneCursos: boolean): Observable<SeccionHijo[]> {
        return this.http.get<SeccionHijo[]>(`${this.base}/secciones/tiene-cursos/${tieneCursos}`);
    }

    ExcelExport(request: any): Observable<Blob> {
        return this.http.post(`${this.base}/informe-excel/export`, request, { responseType: 'blob' });
    }

    getCursosByProfesor(idProfesor: string): Observable<Curso[]> {
        return this.http.get<Curso[]>(`${this.basept}/prof-asignaturas/profesor/${encodeURIComponent(idProfesor)}`).pipe(
            map((cursos: Curso[]) => {
                const cursosConHoras = cursos.map(curso => ({
                    ...curso,
                    horasPresenciales: this.calcularHorasPresenciales(curso.horaInicio, curso.horaFin)
                }));

                const cursosAgrupados = new Map<string, Curso>();

                cursosConHoras.forEach(curso => {
                    const clave = `${curso.codAsignatura}-${curso.grupo}`;

                    if (cursosAgrupados.has(clave)) {
                        const cursoExistente = cursosAgrupados.get(clave)!;
                        cursoExistente.horasPresenciales += curso.horasPresenciales;
                    } else {
                        cursosAgrupados.set(clave, { ...curso });
                    }
                });

                return Array.from(cursosAgrupados.values());
            })
        );
    }

    private getCursosByProfesorRaw(idProfesor: string): Observable<Curso[]> {
        return this.http.get<Curso[]>(`${this.basept}/prof-asignaturas/profesor/${encodeURIComponent(idProfesor)}`).pipe(
            map((cursos: Curso[]) => {
                return cursos.map(curso => ({
                    ...curso,
                    horasPresenciales: this.calcularHorasPresenciales(curso.horaInicio, curso.horaFin)
                }));
            })
        );
    }

    private calcularHorasPresenciales(horaInicio: string, horaFin: string): number {
        const convertirA24Horas = (hora: string): number => {
            const [tiempo, periodo] = hora.split(' ');
            let [horas, minutos] = tiempo.split(':').map(Number);

            if (periodo === 'PM' && horas !== 12) {
                horas += 12;
            } else if (periodo === 'AM' && horas === 12) {
                horas = 0;
            }

            return horas + (minutos / 60);
        };

        const inicio = convertirA24Horas(horaInicio);
        const fin = convertirA24Horas(horaFin);

        let diferencia = fin - inicio;

        if (diferencia < 0) {
            diferencia = diferencia * -1;
        }

        return Math.round(diferencia);
    }

    filterByCargo(profesores: Profesor[]): Profesor[] {
        return profesores.filter((p) => this.ALLOWED_CARGOS.includes(p.cargo));
    }

    extractProgramasByFacultad(profesores: Profesor[], facultadId: string): Array<{ label: string; value: string }> {
        if (!facultadId) return [];

        const programas = profesores
            .filter((p) => p.centroCosto?.startsWith(facultadId))
            .map((p) => p.programa)
            .filter(Boolean);

        return [...new Set(programas)].map((p) => ({ label: p!, value: p! }));
    }

    filterProfesoresByCriteria(profesores: Profesor[], criteria: FilterCriteria): Profesor[] {
        let filtered = profesores;

        if (criteria.identificacion) {
            filtered = this.filterByIdentificacion(filtered, criteria.identificacion);
        }

        if (criteria.nombreCompleto) {
            filtered = this.filterByNombreCompleto(filtered, criteria.nombreCompleto);
        }

        if (criteria.facultad) {
            filtered = this.filterByFacultad(filtered, criteria.facultad);
        }

        if (criteria.programa) {
            filtered = this.filterByPrograma(filtered, criteria.programa);
        }

        if (criteria.novedades !== undefined) {
            filtered = filtered.filter(p => {
                const tieneNovedad = p.planDeTrabajo?.novedadesActivas === true;
                return criteria.novedades ? tieneNovedad : !tieneNovedad;
            });
        }

        return this.sortByDirector(filtered);
    }

    generatePeriodosAcademicos(yearOffset: number = 1): PeriodoAcademico[] {
        const currentYear = new Date().getFullYear();
        const minYear = 2026;
        const periods: PeriodoAcademico[] = [];

        for (let year = currentYear + yearOffset; year >= minYear; year--) {
            periods.push({
                label: `${year} - Periodo 2`,
                value: `${year}-2`,
                anio: year,
                periodo: 2,
            });
            periods.push({
                label: `${year} - Periodo 1`,
                value: `${year}-1`,
                anio: year,
                periodo: 1,
            });
        }

        return periods;
    }

    getCurrentPeriodo(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const period = month <= 6 ? 1 : 2;
        return `${year}-${period}`;
    }

    loadPlanTrabajoForProfesor(numIdentificacion: string, anio: number, periodo: number): Observable<PlanDeTrabajoModel | null> {
        return this.planDeTrabajoService.getByProfesorPeriodo(
            numIdentificacion,
            anio,
            periodo
        );
    }

    filterProfesoresWithPlans(profesores: Profesor[], anio: number, periodo: number): Observable<Profesor[]> {
        if (!profesores?.length) {
            return of([]);
        }

        const estadosPermitidos = ['Enviado a sistemas', 'Suspendido', 'Inactivado'];

        return forkJoin(
            estadosPermitidos.map(estado =>
                this.planDeTrabajoService.getByPeriodoAndEstado(anio, periodo, estado).pipe(
                    catchError(() => of([]))
                )
            )
        ).pipe(
            map((resultados: PlanDeTrabajoModel[][]) => {
                const todosLosPlanes = resultados.flat();
                const planesMap = new Map(todosLosPlanes.map(plan => [plan.idProfesor, plan]));

                return profesores
                    .filter(prof => planesMap.has(prof.numIdentificacion))
                    .map(prof => ({
                        ...prof,
                        planDeTrabajo: planesMap.get(prof.numIdentificacion)
                    }));
            }),
            catchError(() => of([]))
        );
    }

    exportProfesorDataToExcel(profesores: Profesor[], observaciones: string, anio: number, periodo: number, filename: string = 'Datos.xlsx'): Observable<boolean> {
        if (!profesores?.length) return of(false);

        return forkJoin({
            cursosData: this.fetchCursosForProfesores(profesores),
            seccionCursos: this.getSeccionesCursos(true).pipe(catchError(() => of([]))),
            conceptos: this.getAllConceptos().pipe(catchError(() => of([])))
        }).pipe(
            switchMap(({ cursosData, seccionCursos, conceptos }) => {
                const cursosOracle = this.buildCursosOracleMap(cursosData);
                const conceptoCursos = seccionCursos.find(s => s.seccionCursos)?.concepto || '430';

                const request = {
                    periodo: `${anio} - ${periodo}`,
                    profesores: profesores,
                    observaciones,
                    cursosOracle,
                    conceptos: conceptos,
                    conceptoCursos: conceptoCursos
                };

                return this.ExcelExport(request);
            }),
            map((blob: Blob) => this.downloadExcelFile(blob, filename)),
            catchError(() => of(false))
        );
    }

    private fetchCursosForProfesores(profesores: Profesor[]): Observable<Array<{ profesorId: string; cursos: any[] }>> {
        const cursosObservables = profesores.map(prof =>
            this.getCursosByProfesorRaw(prof.numIdentificacion).pipe(
                map(cursos => ({ profesorId: prof.numIdentificacion, cursos })),
                catchError(() => of({ profesorId: prof.numIdentificacion, cursos: [] }))
            )
        );
        return forkJoin(cursosObservables);
    }
    private buildCursosOracleMap(cursosData: Array<{ profesorId: string; cursos: any[] }>): Record<string, any[]> {
        return cursosData.reduce((map, item) => {
            map[item.profesorId] = item.cursos;
            return map;
        }, {} as Record<string, any[]>);
    }

    private downloadExcelFile(blob: Blob, filename: string): boolean {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        return true;
    }

    private filterByIdentificacion(profesores: Profesor[], id: string): Profesor[] {
        const searchTerm = id.toLowerCase();
        return profesores.filter((p) =>
            p.numIdentificacion?.toLowerCase().includes(searchTerm)
        );
    }

    private filterByNombreCompleto(profesores: Profesor[], nombre: string): Profesor[] {
        const searchTerm = nombre.toLowerCase().trim();
        return profesores.filter((p) => {
            const nombres = (p.nombres || '').toLowerCase();
            const apellidos = (p.apellidos || '').toLowerCase();
            const nombreCompleto = `${nombres} ${apellidos}`.trim();

            return nombres.includes(searchTerm) ||
                apellidos.includes(searchTerm) ||
                nombreCompleto.includes(searchTerm);
        });
    }

    private filterByFacultad(profesores: Profesor[], facultadId: string): Profesor[] {
        return profesores.filter((p) => p.centroCosto?.startsWith(facultadId));
    }

    private filterByPrograma(profesores: Profesor[], programa: string): Profesor[] {
        return profesores.filter((p) => p.programa === programa);
    }

    private sortByDirector(profesores: Profesor[]): Profesor[] {
        return [...profesores].sort((a, b) => {
            if (a.cargo === this.DIRECTOR_CARGO) return -1;
            if (b.cargo === this.DIRECTOR_CARGO) return 1;
            return 0;
        });
    }
}