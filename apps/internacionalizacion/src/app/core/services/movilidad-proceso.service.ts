import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { MovilidadProceso, MovilidadConArchivos } from '../models/movilidad-proceso.model';
import { Movilidad } from '../models/movilidad.model';

@Injectable({
    providedIn: 'root',
})
export class MovilidadProcesoService {
    private readonly apiUrl = `${environment.internacionalizacionApi}/movilidades-proceso`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<MovilidadProceso[]> {
        return this.http.get<MovilidadProceso[]>(this.apiUrl);
    }

    getAprobadas(): Observable<MovilidadConArchivos[]> {
        return this.http.get<MovilidadConArchivos[]>(`${this.apiUrl}/aprobadas`);
    }

    getById(id: string): Observable<MovilidadProceso> {
        return this.http.get<MovilidadProceso>(`${this.apiUrl}/${id}`);
    }

    getByMovilidadId(idMovilidad: string): Observable<MovilidadProceso[]> {
        return this.http.get<MovilidadProceso[]>(`${this.apiUrl}/movilidad/${idMovilidad}`);
    }

    create(movilidadProceso: MovilidadProceso): Observable<MovilidadProceso> {
        return this.http.post<MovilidadProceso>(this.apiUrl, movilidadProceso);
    }

    update(id: string, movilidadProceso: any): Observable<MovilidadProceso> {
        return this.http.put<MovilidadProceso>(`${this.apiUrl}/${id}`, movilidadProceso);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    deleteByMovilidadId(movilidadId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`);
    }

    sync(): Observable<string> {
        return this.http.get(`${this.apiUrl}/sync`, { responseType: 'text' });
    }

    resetToPendiente(): Observable<string> {
        return this.http.post(`${this.apiUrl}/reset-to-pendiente`, {}, { responseType: 'text' });
    }
}