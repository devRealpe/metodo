import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Plantilla } from '../models/plantilla.model';

@Injectable({
    providedIn: 'root'
})
export class PlantillaService {
    private readonly base = `${environment.apiPlanesDeTraba}/plantilla`;
    constructor(private http: HttpClient) { }

    getPlantillas(): Observable<Plantilla[]> {
        return this.http.get<Plantilla[]>(`${this.base}/`);
    }

    getPlantillaHabilitada(): Observable<Plantilla[]> {
        return this.http.get<Plantilla[]>(`${this.base}/habilitadas`);
    }

    create(nombre: string): Observable<any> {
        return this.http.post(`${this.base}/${encodeURIComponent(nombre)}`, {});
    }

    updateEstado(id: string, estado: boolean): Observable<any> {
        return this.http.put(`${this.base}/${encodeURIComponent(id)}/${estado.toString()}`, {});
    }
}