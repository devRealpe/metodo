import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { HistorialPostulacion, PaginatedHistorialPostulacion } from '../models/historial-postulacion.model';
import { OfertaLaboralService } from './ofertas-laborales.service';
import { OfertaLaboral } from '../models/oferta-laboral.model';
import { EvaluacionDetalleDTO } from '../models/ranking.model';

@Injectable({
  providedIn: 'root'
})
export class RankingService {
  
  private readonly baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/postulaciones-vista`;

  constructor(
    private http: HttpClient,
    private ofertaLaboralService: OfertaLaboralService
  ) {}

  getOfertas(): Observable<OfertaLaboral[]> {
    return this.ofertaLaboralService.getAll();
  }


  getOfertasPaginadas(
    page: number = 0, 
    size: number = 10, 
    sortBy: string = 'fechaPublicacion', 
    sortDir: string = 'desc'
  ): Observable<OfertaLaboral[]> {
    return this.ofertaLaboralService.getAll();
  }

  getRankingPostulaciones(ofertaId: string): Observable<HistorialPostulacion[]> {
    return this.http.get<HistorialPostulacion[]>(
      `${this.baseUrl}/ofertas/${ofertaId}/postulaciones`
    );
  }

  getRankingPostulacionesPaginadas(
    ofertaId: string,
    page: number = 0,
    size: number = 10,
    aprueba?: boolean,
    sortBy: string = 'puntajeFinal',
    sortDir: string = 'desc'
  ): Observable<PaginatedHistorialPostulacion> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (aprueba !== undefined) {
      params = params.set('aprueba', aprueba.toString());
    }

    return this.http.get<PaginatedHistorialPostulacion>(
      `${this.baseUrl}/ofertas/${ofertaId}/postulaciones/paginadas`,
      { params }
    );
  }

  getDetallePostulacion(postulacionId: string): Observable<HistorialPostulacion> {
    return this.http.get<HistorialPostulacion>(
      `${this.baseUrl}/postulaciones/${postulacionId}/detalles`
    );
  }

  getDetalleEvaluacionAutomatica(postulacionId: string): Observable<EvaluacionDetalleDTO> {
    return this.http.get<EvaluacionDetalleDTO>(
      `${environment.apiHojasDeVida}/hojas-de-vida/evaluaciones/postulacion/${postulacionId}/detalle`
    );
  }

  calculaAprobacion(postulacion: HistorialPostulacion): boolean {
    if (!postulacion) {
      return false;
    }
    
    const puntajeFinal = postulacion.puntajeFinal || 0;
    
    if (postulacion.ofertaLaboral && postulacion.ofertaLaboral.totalRequisitos) {
      const totalRequisitos = postulacion.ofertaLaboral.totalRequisitos;
      const umbral = totalRequisitos * 0.6;
      const calculoLocal = puntajeFinal >= umbral;
      if (postulacion.aprueba !== null && postulacion.aprueba !== undefined) {
        if (postulacion.aprueba === calculoLocal) {
          return postulacion.aprueba;
        } else {
          return calculoLocal;
        }
      }
      
      return calculoLocal;
    }
    
    if (postulacion.aprueba !== null && postulacion.aprueba !== undefined) {
      return postulacion.aprueba;
    }
    
    return false;
  }

  getNombreCompleto(postulacion: HistorialPostulacion): string {
    if (postulacion.nombreCompleto) return postulacion.nombreCompleto;
    return 'Sin información';
  }

  getAprobacionTexto(postulacion: HistorialPostulacion): string {
    // Retornar adjetivos consistentes con la UI y otras comprobaciones ('APROBADO' / 'NO APROBADO')
    return this.calculaAprobacion(postulacion) ? 'APROBADO' : 'NO APROBADO';
  }

  recalcularEvaluacionesOferta(ofertaId: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiHojasDeVida}/hojas-de-vida/ofertas/${ofertaId}/recalcular-evaluaciones`,
      {}
    );
  }

  recalcularTodasLasEvaluaciones(): Observable<any> {
    return this.http.post<any>(
      `${environment.apiHojasDeVida}/hojas-de-vida/ofertas/recalcular-evaluaciones`,
      {}
    );
  }
}
