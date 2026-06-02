import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { HojaDeVidaProducto } from '../models/hoja-de-vida-producto.model';

@Injectable({
  providedIn: 'root'
})
export class HojaDeVidaProductoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apilaboratoriosLocal}/hoja-vida-productos`;

  getAll(): Observable<HojaDeVidaProducto[]> {
    return this.http.get<HojaDeVidaProducto[] | Record<string, unknown>>(this.apiUrl).pipe(
      map(response => {
        
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object') {
          return Object.values(response).filter(item => typeof item === 'object') as HojaDeVidaProducto[];
        }
        return [];
      })
    );
  }

  getById(id: string): Observable<HojaDeVidaProducto> {
    return this.http.get<HojaDeVidaProducto>(`${this.apiUrl}/${id}`);
  }

  create(hojaDeVida: HojaDeVidaProducto): Observable<HojaDeVidaProducto> {
    return this.http.post<HojaDeVidaProducto>(this.apiUrl, hojaDeVida);
  }

  update(id: string, hojaDeVida: HojaDeVidaProducto): Observable<HojaDeVidaProducto> {
    return this.http.put<HojaDeVidaProducto>(`${this.apiUrl}/${id}`, hojaDeVida);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getByEquipoId(equipoId: string): Observable<HojaDeVidaProducto> {
    return this.http.get<HojaDeVidaProducto>(`${this.apiUrl}/equipo/${equipoId}`);
  }

  getByEquipoComputoId(equipoComputoId: string): Observable<HojaDeVidaProducto> {
    return this.http.get<HojaDeVidaProducto>(`${this.apiUrl}/equipo-computo/${equipoComputoId}`);
  }

  getByDependencia(dependencia: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('dependencia', dependencia);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/dependencia`, { params });
  }

  getByResponsable(responsable: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('responsable', responsable);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/responsable`, { params });
  }

  getByMarca(marca: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('marca', marca);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/marca`, { params });
  }

  getByModelo(modelo: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('modelo', modelo);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/modelo`, { params });
  }

  getByNumeroSerie(numeroSerie: string): Observable<HojaDeVidaProducto> {
    return this.http.get<HojaDeVidaProducto>(`${this.apiUrl}/numero-serie/${numeroSerie}`);
  }

  getByCodigoInventario(codigoInventario: string): Observable<HojaDeVidaProducto> {
    return this.http.get<HojaDeVidaProducto>(`${this.apiUrl}/codigo-inventario/${codigoInventario}`);
  }

  getByEstadoActual(estadoActual: string): Observable<HojaDeVidaProducto[]> {
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/estado/${estadoActual}`);
  }

  getByProveedor(proveedor: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('proveedor', proveedor);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/proveedor`, { params });
  }

  getByLaboratorio(laboratorio: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('laboratorio', laboratorio);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/laboratorio`, { params });
  }

  getByProyecto(proyecto: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('proyecto', proyecto);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/proyecto`, { params });
  }

  getByFiltros(filtros: {
    equipoId?: string;
    equipoComputoId?: string;
    dependencia?: string;
    responsable?: string;
    marca?: string;
    modelo?: string;
    estadoActual?: string;
    fechaElaboracionInicio?: string;
    fechaElaboracionFin?: string;
    anio?: number;
    laboratorio?: string;
  }): Observable<HojaDeVidaProducto[]> {
    let params = new HttpParams();
    
    if (filtros.equipoId) params = params.set('equipoId', filtros.equipoId);
    if (filtros.equipoComputoId) params = params.set('equipoComputoId', filtros.equipoComputoId);
    if (filtros.dependencia) params = params.set('dependencia', filtros.dependencia);
    if (filtros.responsable) params = params.set('responsable', filtros.responsable);
    if (filtros.marca) params = params.set('marca', filtros.marca);
    if (filtros.modelo) params = params.set('modelo', filtros.modelo);
    if (filtros.estadoActual) params = params.set('estadoActual', filtros.estadoActual);
    if (filtros.fechaElaboracionInicio) params = params.set('fechaElaboracionInicio', filtros.fechaElaboracionInicio);
    if (filtros.fechaElaboracionFin) params = params.set('fechaElaboracionFin', filtros.fechaElaboracionFin);
    if (filtros.anio) params = params.set('anio', filtros.anio.toString());
    if (filtros.laboratorio) params = params.set('laboratorio', filtros.laboratorio);

    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/filtros`, { params });
  }

  getByFechasElaboracion(fechaInicio: string, fechaFin: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/fechas-elaboracion`, { params });
  }

  getByAnio(anio: number): Observable<HojaDeVidaProducto[]> {
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/anio/${anio}`);
  }

  getByTextoGeneral(texto: string): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('texto', texto);
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/buscar-texto`, { params });
  }

  getEquiposEnGarantia(): Observable<HojaDeVidaProducto[]> {
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/garantia/vigentes`);
  }

  getGarantiaProximaVencer(diasAdelante = 30): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('diasAdelante', diasAdelante.toString());
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/garantia/proximas-vencer`, { params });
  }

  getByCostoAdquisicionRange(costoMin: number, costoMax: number): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams()
      .set('costoMin', costoMin.toString())
      .set('costoMax', costoMax.toString());
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/costo-adquisicion`, { params });
  }

  getByValorActualRange(valorMin: number, valorMax: number): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams()
      .set('valorMin', valorMin.toString())
      .set('valorMax', valorMax.toString());
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/valor-actual`, { params });
  }

  getEquiposVidaUtilRestante(aniosRestantes = 2): Observable<HojaDeVidaProducto[]> {
    const params = new HttpParams().set('aniosRestantes', aniosRestantes.toString());
    return this.http.get<HojaDeVidaProducto[]>(`${this.apiUrl}/vida-util-restante`, { params });
  }

  getEstadisticasPorEstado(): Observable<Array<Record<string, unknown>>> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.apiUrl}/estadisticas/por-estado`);
  }

  getEstadisticasPorDependencia(): Observable<Array<Record<string, unknown>>> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.apiUrl}/estadisticas/por-dependencia`);
  }

  getEstadisticasPorMarca(): Observable<Array<Record<string, unknown>>> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.apiUrl}/estadisticas/por-marca`);
  }

  getValorTotalByDependencia(): Observable<Array<Record<string, unknown>>> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.apiUrl}/estadisticas/valor-por-dependencia`);
  }

  getDepreciacionByAnio(): Observable<Array<Record<string, unknown>>> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.apiUrl}/estadisticas/depreciacion-por-anio`);
  }

  actualizarDepreciacion(id: string, anioActual: number): Observable<HojaDeVidaProducto> {
    const params = new HttpParams().set('anioActual', anioActual.toString());
    return this.http.put<HojaDeVidaProducto>(`${this.apiUrl}/${id}/actualizar-depreciacion`, null, { params });
  }

  cambiarEstado(id: string, nuevoEstado: string): Observable<HojaDeVidaProducto> {
    const params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.http.put<HojaDeVidaProducto>(`${this.apiUrl}/${id}/cambiar-estado`, null, { params });
  }

  calcularFechaFinGarantia(fechaInicio: string, mesesGarantia: number): Observable<string> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('mesesGarantia', mesesGarantia.toString());
    return this.http.get(`${this.apiUrl}/calcular-fecha-fin-garantia`, { 
      params,
      responseType: 'text' 
    });
  }

  actualizarGarantia(id: string, fechaInicio: string, mesesGarantia: number): Observable<HojaDeVidaProducto> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('mesesGarantia', mesesGarantia.toString());
    return this.http.put<HojaDeVidaProducto>(`${this.apiUrl}/${id}/actualizar-garantia`, null, { params });
  }

  calcularDepreciacionTotal5Años(id: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${id}/calcular-depreciacion-5-años`);
  }

  recalcularDepreciacion(id: string): Observable<HojaDeVidaProducto> {
    return this.http.put<HojaDeVidaProducto>(`${this.apiUrl}/${id}/recalcular-depreciacion`, null);
  }

  calcularValorResidual(valorEquipo: number, vidaUtilAnios: number): Observable<number> {
    const params = new HttpParams()
      .set('valorEquipo', valorEquipo.toString())
      .set('vidaUtilAnios', vidaUtilAnios.toString());
    return this.http.get<number>(`${this.apiUrl}/calcular-valor-residual`, { params });
  }

  calcularDepreciacionesCompletas(valorEquipo: number, vidaUtilAnios: number): Observable<{
    valorEquipo: number;
    vidaUtilAnios: number;
    porcentajeValorResidual: string;
    valorResidual: number;
    depreciacionAnual: number;
    depreciacionMensual: number;
    depreciacionTotal5Años: number;
  }> {
    const params = new HttpParams()
      .set('valorEquipo', valorEquipo.toString())
      .set('vidaUtilAnios', vidaUtilAnios.toString());
    return this.http.get<{
      valorEquipo: number;
      vidaUtilAnios: number;
      porcentajeValorResidual: string;
      valorResidual: number;
      depreciacionAnual: number;
      depreciacionMensual: number;
      depreciacionTotal5Años: number;
    }>(`${this.apiUrl}/calcular-depreciaciones`, { params });
  }
}
