import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PostulacionDto } from '../models/postulacion.model';
import { environment } from '@shared/shared-environments';

interface ApiResponse<T> {
  status: string;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class PostulacionService {
  
  private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/postulaciones`;
  constructor(private http: HttpClient) {}

  crearPostulacion(postulacion: PostulacionDto): Observable<PostulacionDto> {
    return this.http.post<ApiResponse<PostulacionDto>>(`${this.apiUrl}/crear`, postulacion).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Error al crear la postulación');
      })
    );
  }

  obtenerPostulacionesPorPersona(personaId: string): Observable<PostulacionDto[]> {
    return this.http.get<PostulacionDto[]>(`${this.apiUrl}/persona/${personaId}`);
  }
  obtenerPostulacionesEnriquecidas(personaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/persona/${personaId}/enriquecidas`);
  }
  verificarPostulacion(personaId: string, convocatoriaId: string): Observable<{yaSePostulo: boolean}> {
    return this.http.get<{yaSePostulo: boolean}>(`${this.apiUrl}/verificar/${personaId}/${convocatoriaId}`);
  }

  contarPostulacionesActivas(personaId: string): Observable<{postulacionesActivas: number, limiteMaximo: number, limiteAlcanzado: boolean}> {
    return this.http.get<{postulacionesActivas: number, limiteMaximo: number, limiteAlcanzado: boolean}>(`${this.apiUrl}/activas/count/${personaId}`);
  }

  obtenerPostulacionesPorConvocatoria(convocatoriaId: string): Observable<PostulacionDto[]> {
    return this.http.get<PostulacionDto[]>(`${this.apiUrl}/convocatoria/${convocatoriaId}`);
  }

  obtenerPostulacionPorId(id: string): Observable<PostulacionDto> {
    return this.http.get<PostulacionDto>(`${this.apiUrl}/${id}`);
  }

  obtenerDetallesPostulacion(id: string): Observable<any> {
    const baseUrl = environment.apiHojasDeVida.replace('/postulaciones', '');
    return this.http.get<any>(`${baseUrl}/postulaciones-vista/postulaciones/${id}/detalles`);
  }

  actualizarPostulacion(id: string, postulacion: PostulacionDto): Observable<PostulacionDto> {
    return this.http.put<PostulacionDto>(`${this.apiUrl}/${id}`, postulacion);
  }
}