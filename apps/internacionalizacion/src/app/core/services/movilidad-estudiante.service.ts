import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { ErrorHandlerService } from './error-handler.service';
import { Movilidad } from '../models/movilidad.model';

@Injectable({
    providedIn: 'root',
})
export class MovilidadEstudianteService {
    private readonly apiUrl = `${environment.internacionalizacionApi}/movilidad-estudiantes`;

    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlerService
    ) {}

    deleteByMovilidadId(movilidadId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadEstudianteService.deleteByMovilidadId'))
            );
    }

    /** Devuelve las relaciones MovilidadEstudiante para una movilidad específica */
    getByMovilidadId(movilidadId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadEstudianteService.getByMovilidadId'))
            );
    }

    getMovilidadesRequiriendoAutorizacion(): Observable<Movilidad[]> {
        return this.http.get<Movilidad[]>(`${this.apiUrl}/requiriendo-autorizacion`)
            .pipe(
                catchError(error => this.errorHandler.handleHttpError(error, 'MovilidadEstudianteService.getMovilidadesRequiriendoAutorizacion'))
            );
    }
}