import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { OfertaLaboral } from '../models/oferta-laboral.model';
import { HistorialPostulacion } from '../models/historial-postulacion.model';
import { PostulacionSeleccionada } from '../models/postulacion-seleccionada.model';

/**
 * Servicio público para las convocatorias — NO usa el AuthInterceptor.
 *
 * Crea su propio HttpClient inyectando HttpBackend directamente,
 * lo que salta todos los interceptors registrados globalmente.
 * Esto permite hacer peticiones sin token a los endpoints
 * marcados como permitAll() en el backend.
 */
@Injectable({
  providedIn: 'root',
})
export class ConvocatoriasPublicasService {
  private http: HttpClient;
  private readonly baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/public`;

  constructor(handler: HttpBackend) {
    this.http = new HttpClient(handler);
  }

  getActivas(): Observable<OfertaLaboral[]> {
    return this.http.get<OfertaLaboral[]>(`${this.baseUrl}/ofertas/activas`);
  }

  getCerradas(): Observable<OfertaLaboral[]> {
    return this.http.get<OfertaLaboral[]>(`${this.baseUrl}/ofertas/cerradas`);
  }

  getRankingPostulaciones(ofertaId: string): Observable<HistorialPostulacion[]> {
    return this.http.get<HistorialPostulacion[]>(
      `${this.baseUrl}/ranking/${ofertaId}`
    );
  }

  listarSeleccionadosFase2PorOferta(idOferta: string): Observable<PostulacionSeleccionada[]> {
    return this.http.get<PostulacionSeleccionada[]>(
      `${this.baseUrl}/seleccionados-fase2/${idOferta}`
    );
  }

  listarSeleccionadosFase3PorOferta(idOferta: string): Observable<PostulacionSeleccionada[]> {
    return this.http.get<PostulacionSeleccionada[]>(
      `${this.baseUrl}/seleccionados-fase3/${idOferta}`
    );
  }
}
