import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { ErrorHandlerService } from './error-handler.service';
import { Movilidad } from '../models/movilidad.model';

@Injectable({
    providedIn: 'root',
})
export class MovilidadPostulanteService {
    private readonly apiUrl = `${environment.internacionalizacionApi}/movilidad-postulantes`;

    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlerService
    ) {}

    deleteByMovilidadId(movilidadId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.deleteByMovilidadId'))
            );
    }

    /**
     * Crea una nueva relación MovilidadPostulante en el backend.
     * El objeto debe contener al menos { movilidad: { id: string }, postulante: { id: string } }.
     */
    create(relacion: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, relacion).pipe(
            catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.create'))
        );
    }

    /** Devuelve las relaciones MovilidadPostulante para una movilidad específica */
    getByMovilidadId(movilidadId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.getByMovilidadId'))
            );
    }

    /** Devuelve una relación MovilidadPostulante específica por su ID */
    getById(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.getById'))
            );
    }

    /** Devuelve todas las relaciones MovilidadPostulante crudas */
    getAllRelations(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl).pipe(
            catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.getAllRelations'))
        );
    }

    /**
     * Devuelve las Movilidades que aparecen en la tabla movilidad_postulante (sin duplicados)
     * e incluye el id de la relación (movilidad_postulante.id) en la propiedad
     * `movilidadPostulanteId` para que el cliente pueda usarlo directamente.
     */
    getMovilidadesFromPostulantes(): Observable<any[]> {
        return this.getAllRelations().pipe(
            map(relaciones => {
                console.debug('[MovilidadPostulanteService] relaciones raw:', relaciones.map(r => ({
                    mpId: r?.id,
                    movilidadId: r?.movilidad?.id
                })));
                const map = new Map<string, any>();
                relaciones.forEach(r => {
                    const mov = r?.movilidad;
                    if (mov && mov.id) {
                        if (!map.has(mov.id)) {
                            // copiar la movilidad y añadir el mpId del registro movilidad_postulante
                            map.set(mov.id, { ...mov, movilidadPostulanteId: r.id });
                        }
                    }
                });
                const resultado = Array.from(map.values());
                console.debug('[MovilidadPostulanteService] movilidades enriquecidas:', resultado.map(m => ({
                    movilidadId: m.id,
                    movilidadPostulanteId: m.movilidadPostulanteId
                })));
                return resultado;
            }),
            catchError(() => of([]))
        );
    }

    /** Movilidades que actualmente tienen `solicitarAutorizacion=true`. */
    getMovilidadesRequiriendoAutorizacion(): Observable<Movilidad[]> {
        return this.http.get<Movilidad[]>(`${this.apiUrl}/requiriendo-autorizacion`).pipe(
            catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadPostulanteService.getMovilidadesRequiriendoAutorizacion'))
        );
    }
}