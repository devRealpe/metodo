import { environment } from '@shared/shared-environments';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Laboratorio } from '../models/laboratorio.model';


@Injectable({ providedIn: 'root' })
export class LaboratoriosService {
  private readonly base = `${environment.apilaboratoriosLocal}`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Laboratorio[]> { 
    return this.http.get<Laboratorio[]>(this.base); 
  }
  getById(id: string) { return this.http.get<Laboratorio>(`${this.base}/${id}`); }
  create(payload: Omit<Laboratorio, 'id'>) { return this.http.post<Laboratorio>(this.base, payload); }
  update(id: string, payload: Partial<Laboratorio>) { return this.http.put<Laboratorio>(`${this.base}/${id}`, payload); }
  delete(id: string) { return this.http.delete<void>(`${this.base}/${id}`); }

  getByUbicacion(u: string) { return this.http.get<Laboratorio[]>(`${this.base}/ubicacion/${encodeURIComponent(u)}`); }
  getByTipo(t: string) { return this.http.get<Laboratorio[]>(`${this.base}/tipo/${encodeURIComponent(t)}`); }
  getByEstado(e: string) { return this.http.get<Laboratorio[]>(`${this.base}/estado/${encodeURIComponent(e)}`); }
  getDisponibles(c: number) { return this.http.get<Laboratorio[]>(`${this.base}/disponibles`, { params: { capacidad: c } as any }); }
  getByCapacidadMinima(c: number) { return this.http.get<Laboratorio[]>(`${this.base}/capacidad-minima`, { params: { capacidad: c } as any }); }
  searchByNombre(nombre: string) { return this.http.get<Laboratorio[]>(`${this.base}/buscar`, { params: { nombre } as any }); }

  ocuparCupo(id: string) { 
    return this.http.post<Laboratorio>(`${this.base}/${id}/ocupar-cupo`, {}); 
  }
  
  liberarCupo(id: string) { 
    return this.http.post<Laboratorio>(`${this.base}/${id}/liberar-cupo`, {}); 
  }

  getOcupacionActual(id: string) {
    return this.http.get<{ ocupados: number; capacidad: number; disponibles: number }>(`${this.base}/${id}/ocupacion`);
  }
}

