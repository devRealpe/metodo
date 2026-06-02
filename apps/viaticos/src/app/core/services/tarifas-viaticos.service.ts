import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface TarifaUbicacion {
  id?: string;
  paisNombre?: string;
  departamentoNombre?: string;
  municipioNombre?: string;
  ubicacionNombre: string;
  categoriaCodigo: string;
  conceptoCodigo: string;
  tipoTransporte?: string;
  valorUnitario: number;
  moneda?: string;
  descripcion?: string;
  activo?: boolean;
  usuarioCreacion?: string;
  fechaCreacion?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
  anioVigencia?: number;
  version?: number;
  tarifaCerrada?: boolean;
  fechaCierre?: string;
  usuarioCierre?: string;
}

/**
 * DTO para solicitar cálculo de concepto específico
 */
export interface CalcularConceptoEspecificoRequest {
  categoriaCodigo: string;
  tipoViatico: 'OCASIONAL' | 'PERMANENTE';
  nombreUbicacion: string;
  codigoConcepto: string;
  fechaSalida: string;
  fechaLlegada: string;
  fechaLlegadaDestinoAnterior?: string;
  porcentajeDescuento?: number;
}

/**
 * DTO de respuesta del cálculo de concepto específico
 */
export interface CalcularConceptoEspecificoResponse {
  codigoConcepto: string;
  nombreConcepto: string;
  valorUnitario: number;
  cantidad: number;
  dias: number;
  noches: number;
  porcentaje: number;
  subtotal: number;
  ajustePorFechaCompartida: number;
  metadatos: {
    nombreUbicacion: string;
    categoria: string;
    tipoViatico: string;
    tipoConcepto: string;
    codigoTarifaUsado: string;
  };
}

/**
 * DTO de respuesta de mapeos centralizados
 */
export interface OpcionDto {
  label: string;
  value: any;
}

export interface MapeosResponse {
  categoriasMap: Record<string, string>;
  conceptosTarifasMap: Record<string, string>;
  tiposViaticosMap: Record<string, string>;
  opcionesTipoTransporte: OpcionDto[];
  opcionesEstado: OpcionDto[];
  opcionesEstadoCierre: OpcionDto[];
  opcionesEstadoActivo: OpcionDto[];
}

@Injectable({ providedIn: 'root' })
export class TarifasViaticosService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiViaticos}/tarifas`;
  private readonly UTILIDADES_URL = `${environment.apiViaticos}/utilidades`;

  // Cache de mapeos para evitar múltiples llamadas
  private mapeosCache$?: Observable<MapeosResponse>;

  /**
   * Obtiene los mapeos centralizados del sistema (con caché)
   */
  obtenerMapeos(): Observable<MapeosResponse> {
    if (!this.mapeosCache$) {
      this.mapeosCache$ = this.http.get<MapeosResponse>(`${this.UTILIDADES_URL}/mapeos`);
    }
    return this.mapeosCache$;
  }

  /**
   * Mapea código de categoría del frontend al backend
   */
  mapearCategoria(categoriaFrontend: string): Observable<string> {
    return this.obtenerMapeos().pipe(
      map(mapeos => mapeos.categoriasMap[categoriaFrontend] || categoriaFrontend)
    );
  }

  /**
   * Mapea tipo de viático al formato del backend
   */
  mapearTipoViatico(tipoFrontend: string): Observable<string> {
    return this.obtenerMapeos().pipe(
      map(mapeos => mapeos.tiposViaticosMap[tipoFrontend.toLowerCase()] || tipoFrontend.toUpperCase())
    );
  }

  /**
   * Calcula la tarifa de un concepto específico de liquidación
   * @param request Datos necesarios para el cálculo
   * @returns Observable con el resultado del cálculo
   */
  calcularConceptoEspecifico(
    request: CalcularConceptoEspecificoRequest
  ): Observable<CalcularConceptoEspecificoResponse> {
    return this.http.post<CalcularConceptoEspecificoResponse>(
      `${this.API_URL}/calcular-concepto`,
      request
    );
  }

  // Obtiene tarifa por parámetros
  getTarifa(
    ubicacionNombre: string,
    categoriaCodigo: string,
    conceptoCodigo: string,
    tipoTransporte?: string
  ): Observable<TarifaUbicacion | null> {
    let params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo)
      .set('conceptoCodigo', conceptoCodigo);

    if (tipoTransporte) params = params.set('tipoTransporte', tipoTransporte);

    return this.http.get<TarifaUbicacion>(`${this.API_URL}`, { params }).pipe(
      catchError(() => of(null))
    );
  }

  // Obtiene tarifa activa por parámetros
  getTarifaActiva(
    ubicacionNombre: string,
    categoriaCodigo: string,
    conceptoCodigo: string,
    tipoTransporte?: string
  ): Observable<TarifaUbicacion | null> {
    let params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo)
      .set('conceptoCodigo', conceptoCodigo);

    if (tipoTransporte) params = params.set('tipoTransporte', tipoTransporte);

    return this.http.get<TarifaUbicacion>(`${this.API_URL}/activa`, { params }).pipe(
      catchError(() => of(null))
    );
  }

  // Obtiene tarifa por ubicación categoría y transporte
  getTarifaActivaPorUbicacionCategoriaTransporte(
    ubicacionNombre: string,
    categoriaCodigo: string,
    tipoTransporte: string
  ): Observable<TarifaUbicacion | null> {
    return this.buscarTarifaManual(ubicacionNombre, categoriaCodigo, tipoTransporte);
  }

  // Busca tarifa manualmente en lista
  private buscarTarifaManual(
    ubicacionNombre: string,
    categoriaCodigo: string,
    tipoTransporte: string
  ): Observable<TarifaUbicacion | null> {
    return this.getAllTarifas().pipe(
      map(tarifas => {
        const normalizar = (str: string | undefined | null): string =>
          (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return (
          tarifas.find(tarifa => {
            const coincideUbicacion =
              normalizar(tarifa.ubicacionNombre) === normalizar(ubicacionNombre);
            const coincideCategoria =
              (tarifa.categoriaCodigo || '').trim() === categoriaCodigo.trim();
            const coincideTransporte =
              normalizar(tarifa.tipoTransporte) === normalizar(tipoTransporte) ||
              (!tarifa.tipoTransporte && tipoTransporte === 'terrestre');
            const estaActiva = tarifa.activo !== false && String(tarifa.activo) !== 'false';
            return coincideUbicacion && coincideCategoria && coincideTransporte && estaActiva;
          }) || null
        );
      }),
      catchError(() => of(null))
    );
  }

  // Obtiene todas las tarifas
  getAllTarifas(): Observable<TarifaUbicacion[]> {
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/todas`).pipe(
      map(tarifas => tarifas || []),
      catchError(() => of([]))
    );
  }

  // Obtiene tarifas activas
  getTarifasActivas(): Observable<TarifaUbicacion[]> {
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/activas`).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene tarifas por ubicación
  getTarifasByUbicacion(ubicacionNombre: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/ubicacion/${ubicacionNombre}`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas activas por ubicación
  getTarifasActivasByUbicacion(ubicacionNombre: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/ubicacion/${ubicacionNombre}/activas`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas por categoría
  getTarifasByCategoria(categoriaCodigo: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/categoria/${categoriaCodigo}`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas activas por categoría
  getTarifasActivasByCategoria(categoriaCodigo: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/categoria/${categoriaCodigo}/activas`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas por concepto
  getTarifasByConcepto(conceptoCodigo: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/concepto/${conceptoCodigo}`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas activas por concepto
  getTarifasActivasByConcepto(conceptoCodigo: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/concepto/${conceptoCodigo}/activas`)
      .pipe(catchError(() => of([])));
  }

  // Obtiene tarifas por tipo de transporte
  getTarifasByTipoTransporte(tipoTransporte: string): Observable<TarifaUbicacion[]> {
    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/transporte/${tipoTransporte}`)
      .pipe(catchError(() => of([])));
  }

  // Filtra tarifas por categoría y concepto
  filtrarTarifas(categoriaCodigo: string, conceptoCodigo: string): Observable<TarifaUbicacion[]> {
    const params = new HttpParams()
      .set('categoriaCodigo', categoriaCodigo)
      .set('conceptoCodigo', conceptoCodigo);

    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/filtrar/categoria-concepto`, { params })
      .pipe(catchError(() => of([])));
  }

  // Filtra tarifas por ubicación y categoría
  filtrarTarifasPorUbicacionCategoria(
    ubicacionNombre: string,
    categoriaCodigo: string
  ): Observable<TarifaUbicacion[]> {
    const params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo);

    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/filtrar/ubicacion-categoria`, { params })
      .pipe(catchError(() => of([])));
  }

  // Filtra tarifas por ubicación y concepto
  filtrarTarifasPorUbicacionConcepto(
    ubicacionNombre: string,
    conceptoCodigo: string
  ): Observable<TarifaUbicacion[]> {
    const params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('conceptoCodigo', conceptoCodigo);

    return this.http
      .get<TarifaUbicacion[]>(`${this.API_URL}/filtrar/ubicacion-concepto`, { params })
      .pipe(catchError(() => of([])));
  }

  // Crea nueva tarifa
  crearTarifa(tarifa: Partial<TarifaUbicacion>): Observable<TarifaUbicacion> {
    return this.http.post<TarifaUbicacion>(this.API_URL, tarifa);
  }

  // Actualiza tarifa existente
  actualizarTarifa(id: string, tarifa: Partial<TarifaUbicacion>): Observable<TarifaUbicacion> {
    return this.http.put<TarifaUbicacion>(`${this.API_URL}/${id}`, tarifa);
  }

  // Desactiva tarifa
  desactivarTarifa(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // Elimina tarifa permanente
  eliminarTarifaPermanente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/permanente`);
  }

  // Obtiene tarifa por ID
  getTarifaById(id: string): Observable<TarifaUbicacion | null> {
    return this.http.get<TarifaUbicacion>(`${this.API_URL}/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  // ============================================================
  // MÉTODOS PARA GESTIÓN DE VIGENCIA Y CIERRE
  // ============================================================

  // Obtiene tarifas abiertas
  getTarifasAbiertas(): Observable<TarifaUbicacion[]> {
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/abiertas`).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene tarifas abiertas por año
  getTarifasAbiertasPorAnio(anio: number): Observable<TarifaUbicacion[]> {
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/abiertas/anio/${anio}`).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene tarifas por año
  getTarifasPorAnio(anio: number): Observable<TarifaUbicacion[]> {
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/anio/${anio}`).pipe(
      catchError(() => of([]))
    );
  }

  // Busca tarifas con filtros (optimizado - filtrado en backend)
  buscarTarifas(
    anio?: number,
    ubicacion?: string,
    categoria?: string,
    concepto?: string,
    tipoTransporte?: string,
    estadoCierre?: boolean | null
  ): Observable<TarifaUbicacion[]> {
    let params = new HttpParams();
    
    if (anio !== undefined && anio !== null) {
      params = params.set('anio', anio.toString());
    }
    if (ubicacion && ubicacion.trim() !== '') {
      params = params.set('ubicacion', ubicacion.trim());
    }
    if (categoria && categoria.trim() !== '') {
      params = params.set('categoria', categoria.trim());
    }
    if (concepto && concepto.trim() !== '') {
      params = params.set('concepto', concepto.trim());
    }
    if (tipoTransporte && tipoTransporte.trim() !== '') {
      params = params.set('tipoTransporte', tipoTransporte.trim());
    }
    if (estadoCierre !== null && estadoCierre !== undefined) {
      params = params.set('estadoCierre', estadoCierre.toString());
    }
    
    return this.http.get<TarifaUbicacion[]>(`${this.API_URL}/buscar`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Valida si se pueden cerrar las tarifas de un año
  validarCierreAnio(anio: number): Observable<any> {
    return this.http.get(`${this.API_URL}/validar-cierre/${anio}`).pipe(
      catchError(() => of({ puedesCerrar: false, motivosBloqueo: ['Error al validar'] }))
    );
  }

  // Cierra todas las tarifas de un año
  cerrarTarifasDelAnio(anio: number, usuarioCierre: string): Observable<any> {
    const params = new HttpParams().set('usuarioCierre', usuarioCierre);
    return this.http.post(`${this.API_URL}/cerrar-anio/${anio}`, null, { params });
  }

  // Cierra una tarifa específica
  cerrarTarifaIndividual(id: string, usuarioCierre: string): Observable<any> {
    const params = new HttpParams().set('usuarioCierre', usuarioCierre);
    return this.http.patch(`${this.API_URL}/${id}/cerrar`, null, { params });
  }

  // Reabre una tarifa cerrada
  reabrirTarifa(id: string, usuarioModificacion: string): Observable<any> {
    const params = new HttpParams().set('usuarioModificacion', usuarioModificacion);
    return this.http.patch(`${this.API_URL}/${id}/reabrir`, null, { params });
  }

  // Duplica tarifas a nuevo año
  duplicarTarifasANuevoAnio(
    anioOrigen: number,
    anioDestino: number,
    usuarioCreacion: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('anioOrigen', anioOrigen.toString())
      .set('anioDestino', anioDestino.toString())
      .set('usuarioCreacion', usuarioCreacion);
    
    return this.http.post(`${this.API_URL}/duplicar-anio`, null, { params });
  }

  // Obtiene estadísticas por año
  getEstadisticasPorAnio(anio: number): Observable<any> {
    return this.http.get(`${this.API_URL}/estadisticas/anio/${anio}`);
  }

  // Valida una tarifa antes de crearla
  validarTarifa(tarifa: Partial<TarifaUbicacion>): Observable<any> {
    return this.http.post(`${this.API_URL}/validar`, tarifa).pipe(
      catchError(() => of({ valida: false, errores: ['Error al validar tarifa'] }))
    );
  }

  // Activa una tarifa
  activarTarifa(id: string): Observable<TarifaUbicacion> {
    return this.http.patch<TarifaUbicacion>(`${this.API_URL}/${id}/activar`, null);
  }

  // Desactiva una tarifa (eliminación lógica)
  desactivarTarifaLogica(id: string): Observable<TarifaUbicacion> {
    return this.http.patch<TarifaUbicacion>(`${this.API_URL}/${id}/desactivar`, null);
  }

  // ============================================================
  // MÉTODOS PARA CARGA AUTOMÁTICA DE TARIFAS
  // ============================================================

  getTarifasSimplificadasParaDestino(
    ubicacionNombre: string,
    categoriaCodigo: string,
    tipoViatico: string
  ): Observable<{ [conceptoCodigo: string]: number }> {
    const params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo)
      .set('tipoViatico', tipoViatico);

    return this.http.get<{ [conceptoCodigo: string]: number }>(`${this.API_URL}/destino/simplificadas`, { params }).pipe(
      catchError(() => of({}))
    );
  }

  getTarifasParaDestino(
    ubicacionNombre: string,
    categoriaCodigo: string,
    tipoTransporte: string,
    tipoViatico: string
  ): Observable<{ [conceptoCodigo: string]: TarifaUbicacion }> {
    const params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo)
      .set('tipoTransporte', tipoTransporte)
      .set('tipoViatico', tipoViatico);

    return this.http.get<{ [conceptoCodigo: string]: TarifaUbicacion }>(`${this.API_URL}/destino`, { params }).pipe(
      catchError(() => of({}))
    );
  }
  
  getTarifasConConcepto(
    ubicacionNombre: string,
    categoriaCodigo: string
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('ubicacionNombre', ubicacionNombre)
      .set('categoriaCodigo', categoriaCodigo);

    return this.http.get<any[]>(`${this.API_URL}/destino/completas`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  cargarTarifasDesdeExcel(file: File): Observable<{ mensaje: string; detalle: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ mensaje: string; detalle: string }>(
      `${this.API_URL}/cargar-excel`,
      formData
    );
  }

  descargarPlantillaExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/descargar-plantilla-excel`, {
      responseType: 'blob'
    });
  }

  // ============================================================
  // MÉTODOS PARA CLASIFICACIÓN Y CIUDADES INTERNACIONALES
  // ============================================================

  /**
   * Clasifica una ubicación como colombiana o internacional
   */
  clasificarUbicacion(nombreUbicacion: string): Observable<{
    ubicacion: string;
    esColombiana: boolean;
    esInternacional: boolean;
    tipo: string;
  }> {
    return this.http.get<{
      ubicacion: string;
      esColombiana: boolean;
      esInternacional: boolean;
      tipo: string;
    }>(`${this.API_URL}/ubicaciones/clasificar/${encodeURIComponent(nombreUbicacion)}`).pipe(
      catchError(() => of({
        ubicacion: nombreUbicacion,
        esColombiana: true,
        esInternacional: false,
        tipo: 'NACIONAL'
      }))
    );
  }

  /**
   * Obtiene lista de ciudades internacionales disponibles
   */
  getCiudadesInternacionales(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/ciudades-internacionales`).pipe(
      catchError(() => of([]))
    );
  }
}
