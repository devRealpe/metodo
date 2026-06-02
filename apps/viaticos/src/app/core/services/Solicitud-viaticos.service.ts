import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface DestinoViatico {
  id?: string;
  orden: number;
  
  // ====== SALIDA DEL TRAMO ======
  departamentoSalida?: string;
  municipioSalida?: string;
  fechaSalida?: string | Date;
  
  // ====== LLEGADA DEL TRAMO ======
  departamento: string;
  municipio: string;
  ciudad: string;
  fechaLlegada: string | Date;
  
  // ====== LIQUIDACIÓN DEL TRAMO ======
  liquidacion?: Record<string, ConceptoLiquidacion>;
  valorParcial?: number;
}

export interface ConceptoLiquidacion {
  concepto: string;  // ID del concepto
  conceptoNombre?: string;  // Nombre legible del concepto
  marcado: boolean;
  numeroDiasNoches: number;
  valorUnitario: number;
  subtotal: number;
  valorAprobado?: number;  // Valor aprobado por el aprobador
  observaciones?: string;
  modificadoPorAprobador?: boolean;
  nivelAprobacionModificacion?: number;
  fechaModificacion?: string;
}

export interface CentroCostoViatico {
  id?: string;
  codigoCentroCosto: string;
  nombreCentroCosto?: string;
  fuenteFuncion?: string;
  porcentajeAsignado?: number;
  valorAsignado?: number;
}

export interface SolicitudViaticos {
  id?: string;
  codigoSolicitud?: string;
  fechaSolicitud?: string;
  identificacion?: string;
  cargo?: string;
  categoriaCodigo?: string;
  ciudadOrigen?: string;
  fechaSalida: string;
  conceptoViaje?: string;
  motivoViaje?: string;
  requiereTransporte: boolean;
  valorTotalViaticos?: number;
  estado?: 'borrador' | 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'anulado';
  usuarioCreacion?: string;
  fechaCreacion?: string;
  emailSolicitante?: string;  // 📧 Email del usuario logueado para notificaciones
  
  // Campos de aprobación
  aprobadoDecano?: string;
  aprobadoDirectorOficina?: string;
  aprobadoDirectorPrograma?: string;
  aprobadoDirectorTalentoHumano?: string;
  aprobadoVicerrectorAdministrativo?: string;
  aprobadoRectoria?: string;
  
  // Campos adicionales
  departamentoSalida?: string;
  municipioSalida?: string;
  direccion?: string;
  dv?: string;
  elaboradoPor?: string;
  fechaElaboracion: string;
  fechaModificacion?: string;
  nit: string;
  observaciones?: string;
  primerApellido: string;
  primerNombre: string;
  segundoApellido?: string;
  segundoNombre?: string;
  tipoViaticos: 'permanente' | 'ocasional';
  usuarioModificacion?: string;
  liquidacion?: string | Record<string, unknown> | Array<unknown>;
  
  // ====== NUEVAS RELACIONES ======
  destinos?: DestinoViatico[];
  centrosCosto?: CentroCostoViatico[];
}

export interface EstadisticasViaticos {
  total: number;
  aprobadas: number;
  pendientes: number;
  rechazadas: number;
  pagadas: number;
  porcentajeAprobadas: number;
  porcentajePendientes: number;
  porcentajeRechazadas: number;
}

export interface AprobadorDTO {
  codigo: string;
  nombre: string;
  orden: number;
  campoBase: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudViaticosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiViaticos}/solicitudes`;

  // Obtiene todas las solicitudes
  getAll(): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(this.base);
  }

  // Obtiene solicitud por ID
  getById(id: string): Observable<SolicitudViaticos | null> {
    return this.http
      .get<SolicitudViaticos>(`${this.base}/${id}`)
      .pipe(
        catchError(error => {
          if (error.status === 404) return of(null);
          throw error;
        })
      );
  }

  // Crea nueva solicitud
  create(solicitud: SolicitudViaticos): Observable<SolicitudViaticos> {
    return this.http.post<SolicitudViaticos>(this.base, solicitud);
  }

  // Crea borrador de solicitud
  createBorrador(solicitud: SolicitudViaticos): Observable<SolicitudViaticos> {
    return this.http.post<SolicitudViaticos>(`${this.base}/borrador`, solicitud);
  }

  // Actualiza solicitud existente
  update(id: string, solicitud: Partial<SolicitudViaticos>): Observable<SolicitudViaticos> {
    return this.http.put<SolicitudViaticos>(`${this.base}/${id}`, solicitud);
  }

  // Elimina solicitud
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Obtiene solicitudes por NIT
  getByNit(nit: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/nit/${encodeURIComponent(nit)}`);
  }

  // Obtiene solicitudes por identificación
  getByIdentificacion(identificacion: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/identificacion/${encodeURIComponent(identificacion)}`);
  }

  // Obtiene solicitudes por identificación y estado
  getByIdentificacionYEstado(identificacion: string, estado: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/identificacion/${encodeURIComponent(identificacion)}/estado/${encodeURIComponent(estado)}`);
  }

  // Obtiene solicitudes pendientes por identificación
  getPendientesByIdentificacion(identificacion: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/pendientes/identificacion/${encodeURIComponent(identificacion)}`);
  }

  // Obtiene solicitudes por estado
  getByEstado(estado: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/estado/${encodeURIComponent(estado)}`);
  }

  // Obtiene solicitudes por tipo
  getByTipo(tipo: 'permanente' | 'ocasional'): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/tipo/${tipo}`);
  }

  // Obtiene solicitudes por rango de fechas
  getByFechaRango(inicio: string, fin: string): Observable<SolicitudViaticos[]> {
    const params = new HttpParams()
      .set('inicio', inicio)
      .set('fin', fin);
    return this.http.get<SolicitudViaticos[]>(`${this.base}/fecha-rango`, { params });
  }

  // Obtiene pendientes por NIT
  getPendientesByNit(nit: string): Observable<SolicitudViaticos[]> {
    return this.http.get<SolicitudViaticos[]>(`${this.base}/pendientes/nit/${encodeURIComponent(nit)}`);
  }

  // Obtiene borrador por NIT
  getBorradorByNit(nit: string): Observable<SolicitudViaticos | null> {
    return this.http
      .get<SolicitudViaticos>(`${this.base}/borrador/nit/${encodeURIComponent(nit)}`)
      .pipe(
        catchError(error => {
          if (error.status === 404) return of(null);
          throw error;
        })
      );
  }

  // Actualiza estado de solicitud
  actualizarEstado(
    id: string, 
    estado: string, 
    observaciones?: string
  ): Observable<SolicitudViaticos> {
    let params = new HttpParams().set('estado', estado);
    if (observaciones) {
      params = params.set('observaciones', observaciones);
    }
    return this.http.patch<SolicitudViaticos>(`${this.base}/${id}/estado`, null, { params });
  }
  // Cuenta solicitudes por estado
  contarPorEstado(estado: string): Observable<number> {
    return this.http.get<number>(`${this.base}/estadisticas/${encodeURIComponent(estado)}`);
  }

  // Obtiene estadísticas de viáticos
  getEstadisticas(): Observable<EstadisticasViaticos> {
    return this.http.get<EstadisticasViaticos>(`${this.base}/estadisticas`);
  }

  // Obtiene aprobadores por cargo
  getAprobadores(cargo: string): Observable<AprobadorDTO[]> {
    const params = new HttpParams().set('cargo', cargo);
    return this.http.get<AprobadorDTO[]>(`${this.base}/aprobadores`, { params });
  }

  // Registra aprobación de solicitud
  registrarAprobacion(
    id: string, 
    codigoAprobador: string, 
    nombreAprobador: string
  ): Observable<SolicitudViaticos> {
    const params = new HttpParams()
      .set('codigoAprobador', codigoAprobador)
      .set('nombreAprobador', nombreAprobador);
    
    return this.http.patch<SolicitudViaticos>(`${this.base}/${id}/aprobar`, null, { params });
  }

  // Aprueba solicitud
  aprobar(id: string, aprobador: string, rol: string): Observable<SolicitudViaticos> {
    return this.registrarAprobacion(id, rol, aprobador);
  }

  // Rechaza solicitud
  rechazar(id: string, observaciones: string): Observable<SolicitudViaticos> {
    return this.actualizarEstado(id, 'rechazado', observaciones);
  }

  // Marca solicitud como pagada
  marcarComoPagado(id: string, observaciones?: string): Observable<SolicitudViaticos> {
    return this.actualizarEstado(id, 'pagado', observaciones);
  }

  // Anula una solicitud aprobada (antes de que sea pagada)
  anularSolicitud(codigoSolicitud: string, observaciones?: string, usuarioAnulacion?: string): Observable<any> {
    const body: any = {};
    if (observaciones) {
      body.observaciones = observaciones;
    }
    if (usuarioAnulacion) {
      body.usuarioAnulacion = usuarioAnulacion;
    }
    return this.http.put(`${environment.apiViaticos}/aprobaciones/solicitud/${codigoSolicitud}/anular`, body);
  }

  // Verifica si está completamente aprobada
  estaCompletamenteAprobada(solicitud: SolicitudViaticos, cargo: string): Observable<boolean> {
    return this.getAprobadores(cargo).pipe(
      map(aprobadores => {
        return aprobadores.every(aprobador => {
          const campo = aprobador.campoBase as keyof SolicitudViaticos;
          return solicitud[campo] != null && solicitud[campo] !== '';
        });
      })
    );
  }

  // Obtiene siguiente aprobador pendiente
  getSiguienteAprobador(solicitud: SolicitudViaticos, cargo: string): Observable<AprobadorDTO | null> {
    return this.getAprobadores(cargo).pipe(
      map(aprobadores => {
        for (const aprobador of aprobadores) {
          const campo = aprobador.campoBase as keyof SolicitudViaticos;
          if (!solicitud[campo]) {
            return aprobador;
          }
        }
        return null;
      })
    );
  }

  // ==================== DESTINOS ====================
  
  getDestinosBySolicitud(codigoSolicitud: string): Observable<DestinoViatico[]> {
    return this.http.get<DestinoViatico[]>(`${environment.apiViaticos}/destinos-viaticos/solicitud/${codigoSolicitud}`);
  }

  createDestinos(destinos: DestinoViatico[]): Observable<DestinoViatico[]> {
    return this.http.post<DestinoViatico[]>(`${environment.apiViaticos}/destinos-viaticos/bulk`, destinos);
  }

  deleteDestinosBySolicitud(codigoSolicitud: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiViaticos}/destinos-viaticos/solicitud/${codigoSolicitud}`);
  }

  // ==================== CENTROS DE COSTO ====================
  
  getCentrosCostoBySolicitud(codigoSolicitud: string): Observable<CentroCostoViatico[]> {
    return this.http.get<CentroCostoViatico[]>(`${environment.apiViaticos}/centros-costo-viaticos/solicitud/${codigoSolicitud}`);
  }

  createCentrosCosto(centrosCosto: CentroCostoViatico[]): Observable<CentroCostoViatico[]> {
    return this.http.post<CentroCostoViatico[]>(`${environment.apiViaticos}/centros-costo-viaticos/bulk`, centrosCosto);
  }

  deleteCentrosCostoBySolicitud(codigoSolicitud: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiViaticos}/centros-costo-viaticos/solicitud/${codigoSolicitud}`);
  }

  // ==================== UTILIDADES DE VALIDACIÓN Y CÁLCULO ====================

  /**
   * Calcula el dígito de verificación de un NIT usando el backend.
   * @param nit NIT sin dígito de verificación
   * @returns Observable con el DV calculado
   */
  calcularDigitoVerificacion(nit: string): Observable<string> {
    const params = new HttpParams().set('nit', nit);
    return this.http.get<{ nit: string; dv: string }>(`${this.base}/utilidades/calcular-dv`, { params })
      .pipe(map(response => response.dv));
  }

  /**
   * Calcula días y noches entre dos fechas usando el backend.
   * @param fechaSalida Fecha de salida (formato YYYY-MM-DD)
   * @param fechaLlegada Fecha de llegada (formato YYYY-MM-DD)
   * @returns Observable con días y noches
   */
  calcularDiasYNoches(fechaSalida: string, fechaLlegada: string): Observable<{ dias: number; noches: number }> {
    const params = new HttpParams()
      .set('fechaSalida', fechaSalida)
      .set('fechaLlegada', fechaLlegada);
    return this.http.get<{ dias: number; noches: number }>(`${this.base}/utilidades/calcular-dias`, { params });
  }

  /**
   * Determina el tipo de viático según el cargo usando el backend.
   * @param cargo Cargo del funcionario
   * @returns Observable con el tipo de viático y si es conductor
   */
  determinarTipoViatico(cargo: string): Observable<{ cargo: string; tipoViatico: string; esConductor: string }> {
    const params = new HttpParams().set('cargo', cargo);
    return this.http.get<{ cargo: string; tipoViatico: string; esConductor: string }>(
      `${this.base}/utilidades/tipo-viatico`, 
      { params }
    );
  }

  /**
   * Construye el concepto de viaje completo usando el backend.
   * @param conceptoManual Concepto manual ingresado
   * @param codigosContables Códigos contables separados por coma
   * @returns Observable con el concepto completo
   */
  construirConceptoViaje(conceptoManual?: string, codigosContables?: string): Observable<string> {
    let params = new HttpParams();
    if (conceptoManual) params = params.set('conceptoManual', conceptoManual);
    if (codigosContables) params = params.set('codigosContables', codigosContables);
    
    return this.http.post<{ conceptoCompleto: string }>(
      `${this.base}/utilidades/construir-concepto`, 
      null, 
      { params }
    ).pipe(map(response => response.conceptoCompleto));
  }

  /**
   * Extrae el ID de un concepto usando el backend.
   * @param concepto Concepto completo (ej: "CVIA001 - Comisión")
   * @returns Observable con el ID extraído
   */
  extraerIdConcepto(concepto: string): Observable<string> {
    const params = new HttpParams().set('concepto', concepto);
    return this.http.get<{ conceptoCompleto: string; idExtraido: string }>(
      `${this.base}/utilidades/extraer-id-concepto`, 
      { params }
    ).pipe(map(response => response.idExtraido));
  }

  /**
   * Construye el nombre completo desde las partes usando el backend.
   * @param primerNombre Primer nombre
   * @param segundoNombre Segundo nombre (opcional)
   * @param primerApellido Primer apellido
   * @param segundoApellido Segundo apellido (opcional)
   * @returns Observable con el nombre completo
   */
  construirNombreCompleto(
    primerNombre: string,
    segundoNombre: string | undefined,
    primerApellido: string,
    segundoApellido: string | undefined
  ): Observable<string> {
    let params = new HttpParams()
      .set('primerNombre', primerNombre)
      .set('primerApellido', primerApellido);
    
    if (segundoNombre) params = params.set('segundoNombre', segundoNombre);
    if (segundoApellido) params = params.set('segundoApellido', segundoApellido);
    
    return this.http.post<{ nombreCompleto: string }>(
      `${this.base}/utilidades/construir-nombre`, 
      null, 
      { params }
    ).pipe(map(response => response.nombreCompleto));
  }

  /**
   * Obtiene los conceptos de liquidación parseados desde el backend.
   * 
   * @param solicitudId ID de la solicitud (UUID string)
   * @returns Observable con la lista de conceptos
   */
  obtenerConceptosLiquidacion(solicitudId: string): Observable<ConceptoLiquidacion[]> {
    return this.http.get<ConceptoLiquidacion[]>(`${this.base}/${solicitudId}/conceptos-liquidacion`);
  }

  /**
   * Calcula el total de viáticos desde el backend.
   * 
   * @param solicitudId ID de la solicitud (UUID string)
   * @returns Observable con el total calculado
   */
  calcularTotalViaticos(solicitudId: string): Observable<number> {
    return this.http.get<{ total: number }>(`${this.base}/${solicitudId}/total-viaticos`)
      .pipe(map(response => response.total));
  }

  /**
   * Actualiza solo la liquidación de una solicitud sin tocar destinos/centrosCosto.
   * 
   * @param solicitudId ID de la solicitud (UUID string)
   * @param liquidacion Array de conceptos de liquidación
   * @param valorTotal Valor total calculado
   * @returns Observable con la solicitud actualizada
   */
  actualizarLiquidacion(
    solicitudId: string, 
    liquidacion: unknown, 
    valorTotal: number
  ): Observable<SolicitudViaticos> {
    return this.http.patch<SolicitudViaticos>(
      `${this.base}/${solicitudId}/liquidacion`,
      { liquidacion, valorTotalViaticos: valorTotal }
    );
  }

  /**
   * Obtiene una solicitud con nombres de ubicaciones geográficas resueltos.
   * El backend resuelve los IDs de ubicaciones a nombres legibles.
   * 
   * @param solicitudId ID de la solicitud (UUID string)
   * @returns Observable con la solicitud y un mapa de nombres de ubicaciones
   */
  obtenerConNombresUbicaciones(solicitudId: string): Observable<{
    solicitud: SolicitudViaticos;
    nombresUbicaciones: {
      municipioSalidaNombre?: string;
      departamentoSalidaNombre?: string;
      municipioDestinoNombre?: string;
      departamentoDestinoNombre?: string;
      ciudadDestino?: string;
    };
  }> {
    return this.http.get<{
      solicitud: SolicitudViaticos;
      nombresUbicaciones: {
        municipioSalidaNombre?: string;
        departamentoSalidaNombre?: string;
        municipioDestinoNombre?: string;
        departamentoDestinoNombre?: string;
        ciudadDestino?: string;
      };
    }>(`${this.base}/${solicitudId}/con-nombres-ubicaciones`);
  }

  /**
   * Envía correo de notificación de aprobación con PDF y archivos adjuntos.
   * El PDF es generado automáticamente por el backend usando generarPDFParaCorreo().
   * 
   * @param solicitudId ID de la solicitud (UUID string)
   * @param emailDestino Correo electrónico del destinatario
   * @param identificacionUsuario Identificación del usuario que envía
   * @returns Observable con el resultado del envío
   */
  enviarCorreoAprobacion(
    solicitudId: string,
    emailDestino: string,
    identificacionUsuario?: string
  ): Observable<{
    success: boolean;
    mensaje?: string;
    error?: string;
    cantidadArchivos?: number;
  }> {
    return this.http.post<{
      success: boolean;
      mensaje?: string;
      error?: string;
      cantidadArchivos?: number;
    }>(`${this.base}/${solicitudId}/enviar-correo-aprobacion`, {
      emailDestino,
      identificacionUsuario
    });
  }

  /**
   * Descarga el PDF de una solicitud generado por el backend
   * @param solicitudId ID de la solicitud
   * @returns Observable con el Blob del PDF
   */
  descargarPDF(solicitudId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${solicitudId}/descargar-pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Descarga el PDF con resumen global de liquidación para "Mis Viáticos"
   * @param solicitudId ID de la solicitud
   * @returns Observable con el Blob del PDF
   */
  descargarPDFMisViaticos(solicitudId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${solicitudId}/descargar-pdf-mis-viaticos`, {
      responseType: 'blob'
    });
  }
}
