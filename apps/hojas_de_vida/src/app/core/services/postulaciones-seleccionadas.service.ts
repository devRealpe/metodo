import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import {
  PostulacionSeleccionada,
  CrearSeleccionRequest,
  CrearSeleccionResponse,
  VerificacionSeleccion
} from '../models/postulacion-seleccionada.model';

@Injectable({
  providedIn: 'root'
})
export class PostulacionesSeleccionadasService {
  private readonly apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/postulaciones-seleccionadas`;

  constructor(private http: HttpClient) {}

  crearSeleccion(request: CrearSeleccionRequest, seleccionadoPor: string): Observable<CrearSeleccionResponse> {
    const params: any = {
      idPostulacion: request.historialPostulacionId,
      idOferta: request.ofertaLaboralId,
      seleccionadoPor: seleccionadoPor
    };
    if (request.observaciones) {
      params.motivo = request.observaciones;
    }
    return this.http.post<CrearSeleccionResponse>(this.apiUrl, null, { params });
  }

  listarPorOferta(idOferta: string): Observable<PostulacionSeleccionada[]> {
    return this.http.get<any>(`${this.apiUrl}/oferta/${idOferta}`).pipe(
      map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
    );
  }

  listarTodos(): Observable<PostulacionSeleccionada[]> {
    return this.http.get<PostulacionSeleccionada[]>(this.apiUrl);
  }

  verificarSeleccion(idPostulacion: string): Observable<VerificacionSeleccion> {
    return this.http.get<VerificacionSeleccion>(`${this.apiUrl}/verificar/${idPostulacion}`);
  }

  eliminarSeleccion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  contarSeleccionados(idOferta: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/oferta/${idOferta}/count`);
  }

  descargarCsvSeleccionados(idOferta: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/oferta/${idOferta}/export-csv`, {
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv'
      }
    });
  }

  descargarCsvSeleccionadoIndividual(idSeleccion: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${idSeleccion}/export-csv`, {
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv'
      }
    });
  }

  marcarComoSeleccionadoFase3(idSeleccion: string): Observable<PostulacionSeleccionada> {
    return this.http.put<PostulacionSeleccionada>(`${this.apiUrl}/${idSeleccion}/marcar-fase3`, null);
  }

  listarSeleccionadosFase3PorOferta(idOferta: string): Observable<PostulacionSeleccionada[]> {
    return this.http.get<PostulacionSeleccionada[]>(`${this.apiUrl}/fase3/oferta/${idOferta}`);
  }

  listarTodosLosSeleccionadosFase3(): Observable<PostulacionSeleccionada[]> {
    return this.http.get<PostulacionSeleccionada[]>(`${this.apiUrl}/fase3`);
  }

  enviarCorreosNoSeleccionados(idOferta: string): Observable<{ mensaje: string; enviados: number }> {
    return this.http.post<{ mensaje: string; enviados: number }>(
      `${this.apiUrl}/oferta/${idOferta}/enviar-correos-no-seleccionados`, null
    );
  }

  enviarNotificacionesManualesFase2(ids: string[]): Observable<{ mensaje: string; enviados: number }> {
    return this.http.post<{ mensaje: string; enviados: number }>(
      `${this.apiUrl}/notificar-fase2`,
      ids
    );
  }
}
