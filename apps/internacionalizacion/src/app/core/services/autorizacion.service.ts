import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { Autorizacion, AprobacionNivel, AprobadorDTO } from '../models/autorizacion.model';
import { environment } from '@shared/shared-environments';
import { AuthService } from '@microfrontends/shared-services';
import { EstudianteService } from './estudiante.service';
import { PostulanteService } from './postulante.service';

@Injectable({
  providedIn: 'root'
})
export class AutorizacionService {
  private apiUrl = `${environment.internacionalizacionApi}/autorizaciones`;
  private aprobacionesUrl = `${environment.internacionalizacionApi}/autorizaciones`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private estudianteService: EstudianteService,
    private postulanteService: PostulanteService
  ) {
  }

  getAutorizaciones(): Observable<Autorizacion[]> {
    return this.http.get<Autorizacion[]>(this.apiUrl);
  }

  getAutorizacionesAprobadas(): Observable<Autorizacion[]> {
    return this.http.get<Autorizacion[]>(`${this.apiUrl}?estado=aprobado`);
  }

  getAutorizacionesPorMovilidad(movilidadId: string): Observable<Autorizacion|null> {
    return this.http.get<Autorizacion>(`${this.apiUrl}/movilidad/${movilidadId}`).pipe(
      // treat 404 as "no authorization yet" rather than propagate
      catchError(error => {
        if (error && error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

 
  getAutorizacionPorMovilidadOrNull(movilidadId: string): Observable<Autorizacion | null> {
    return this.getAutorizacionesPorMovilidad(movilidadId).pipe(
      map(aut => aut || null),
      catchError(err => {
        if (err && err.status === 404) return of(null);
        throw err;
      })
    );
  }


  cancelOrCreateForMovilidad(movilidadId: string, tipo: 'POSTULANTE' | 'ESTUDIANTE' = 'POSTULANTE'): Observable<Autorizacion> {
    const payload: Partial<Autorizacion> = tipo === 'ESTUDIANTE'
      ? { estado: 'cancelado', movilidadEstudianteId: movilidadId }
      : { estado: 'cancelado', movilidadPostulanteId: movilidadId };

    return this.getAutorizacionPorMovilidadOrNull(movilidadId).pipe(
      switchMap(existing => {
        if (existing && existing.id) {
          return this.update(existing.id!, { estado: 'cancelado' });
        }
        // No existe → crear una nueva autorización con el identificador apropiado
        return this.createOrUpdate(payload as Autorizacion);
      })
    );
  }

  eliminarAutorizacionesPorMovilidad(movilidadId: string): Observable<any> {
   return this.http.delete(`${this.apiUrl}/movilidad/${movilidadId}`);
  }

  create(autorizacion: Autorizacion): Observable<Autorizacion> {
  
    return this.http.post<Autorizacion>(this.apiUrl, autorizacion).pipe(
      tap(response => {
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  update(id: string, autorizacion: Partial<Autorizacion>): Observable<Autorizacion> {
   return this.http.put<Autorizacion>(`${this.apiUrl}/${id}`, autorizacion);
  }

  createOrUpdate(autorizacion: Autorizacion): Observable<Autorizacion> {
    const movilidadId = autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId;

    // Primero verificar si existe una autorización para esta movilidad
    return this.getAutorizacionesPorMovilidad(movilidadId!).pipe(
      map(autorizacionExistente => {
        if (autorizacionExistente && autorizacionExistente.id) {
          return { existente: autorizacionExistente, crear: false };
        } else {
          return { existente: null, crear: true };
        }
      }),
      catchError((error) => {
        return of({ existente: null, crear: true });
      }),
      // Luego crear o actualizar según corresponda
      map(resultado => {
        if (resultado.crear) {
          return this.create(autorizacion);
        } else {
          return this.update(resultado.existente!.id!, autorizacion);
        }
      }),
      // Aplanar el observable anidado
      switchMap(obs => obs)
    );
  }

  // ========== APROBACIONES INDIVIDUALES POR NIVEL ==========

  // Crear aprobaciones para todos los niveles de una movilidad
  crearAprobacionesAutomaticas(movilidadId: string, totalNiveles: number, tipoPostulante: string, tipoMovilidad: 'POSTULANTE' | 'ESTUDIANTE'): Observable<AprobacionNivel[]> {
    const body = { movilidadId, totalNiveles, tipoPostulante, tipoMovilidad };
    return this.http.post<AprobacionNivel[]>(`${this.aprobacionesUrl}/crear-automaticas`, body);
  }

  // Obtener todas las aprobaciones de una movilidad usando el endpoint que ya existe
  getAprobacionesPorMovilidad(movilidadId: string): Observable<AprobacionNivel[]> {
    return this.getAutorizacionesPorMovilidad(movilidadId).pipe(
      // el observable puede entregar `null` si no existe autorización
      map((autorizacion: Autorizacion | null) => {
        if (!autorizacion) return [];
        const lista: AprobacionNivel[] = [];

        // Mapear explícitamente los campos del objeto embebido NivelAprobacion
        // (backend devuelve `nivelN` con propiedades { rol, rolKeycloak, estado, nombre, identificacion, email, comentario, fecha })
        for (let i = 1; i <= 7; i++) {
          const src: any = (autorizacion as any)[`nivel${i}`];
          if (!src) continue;

          lista.push({
            id: `auth-${autorizacion.id}-nivel-${i}`,
            movilidadPostulanteId: (autorizacion as any).movilidadPostulanteId || undefined,
            movilidadEstudianteId: (autorizacion as any).movilidadEstudianteId || undefined,
            autorizacionId: autorizacion.id,
            nivel: i,
            rolRequerido: src.rol || src.rolRequerido || undefined,
            rolKeycloak: src.rolKeycloak || undefined,
            aprobadorCargo: src.rol || src.rolRequerido || undefined,
            estado: src.estado || 'pendiente',
            // Mapear nombres/identificación/email desde el embebido NivelAprobacion
            aprobadorNombre: src.nombre || src.aprobadorNombre || undefined,
            aprobadorIdentificacion: src.identificacion || src.aprobadorIdentificacion || undefined,
            aprobadorEmail: src.email || src.aprobadorEmail || undefined,
            comentario: src.comentario || undefined,
            fechaAsignacion: src.fechaAsignacion || undefined,
            fechaAprobacion: src.fecha || src.fechaAprobacion || undefined,
            fechaCreacion: autorizacion.fechaCreacion,
            fechaActualizacion: autorizacion.fechaActualizacion
          });
        }

        return lista;
      }),
      catchError(() => of([]))
    );
  }

  // Obtener todas las aprobaciones
  getAprobaciones(): Observable<AprobacionNivel[]> {
    return this.http.get<AprobacionNivel[]>(this.aprobacionesUrl);
  }

  // Eliminar una autorización por ID
  deleteById(autorizacionId: string): Observable<any> {
    if (!autorizacionId || autorizacionId === 'undefined') {
      return of({ error: 'ID de autorización inválido' });
    }
    return this.http.delete(`${this.apiUrl}/${autorizacionId}`).pipe(
      tap({
        next: () => {},
        error: (error) => console.error(`[AutorizacionService] Error al eliminar autorización:`, error)
      })
    );
  }

  aprobarNivel(autorizacionId: string, nivel: number, comentario?: string, apoyosEconomicosSeleccionados?: string[]): Observable<any> {
    // Mantener por compatibilidad; preferir usar aprobarNivelValidado desde la UI
    if (!autorizacionId || autorizacionId === 'undefined') {
      console.error(`[AutorizacionService] Error: autorizacionId inválido: ${autorizacionId}`);
      return of({ error: 'ID de autorización inválido' });
    }

    const p = this.buildApproverPayloadFromAuth();
    return this.http.post(`${this.apiUrl}/${autorizacionId}/aprobar/${nivel}`, {
      nombre: p.nombre,
      identificacion: p.identificacion,
      comentario,
      aprobadorEmail: p.email,
      rolesUsuario: p.roles,
      apoyosEconomicosSeleccionados: apoyosEconomicosSeleccionados || []
    }).pipe(
      tap({ next: () => {}, error: (error) => console.error(`[AutorizacionService] Error al aprobar:`, error) })
    );
  }

  // Aprobar con validación de roles/turno (uso recomendado por la UI)
  aprobarNivelValidado(autorizacionId: string, nivel: number, comentario?: string, apoyosEconomicosSeleccionados?: string[]): Observable<any> {
    if (!autorizacionId || autorizacionId === 'undefined') {
      console.error(`[AutorizacionService] Error: autorizacionId inválido: ${autorizacionId}`);
      return of({ error: 'ID de autorización inválido' });
    }

    const p = this.buildApproverPayloadFromAuth();

    return this.http.post(`${this.apiUrl}/${autorizacionId}/aprobar-validado/${nivel}`, {
      identificacion: p.identificacion,
      nombre: p.nombre,
      roles: p.roles,
      comentario,
      email: p.email,
      apoyosEconomicosSeleccionados: apoyosEconomicosSeleccionados || []
    }).pipe(
      tap({ next: () => {}, error: (error) => console.error(`[AutorizacionService] Error al aprobar validado:`, error) })
    );
  }

  // Rechazar con validación de roles/turno (uso recomendado por la UI)
  rechazarNivelValidado(autorizacionId: string, nivel: number, comentario?: string): Observable<any> {
    if (!autorizacionId || autorizacionId === 'undefined') {
      console.error(`[AutorizacionService] Error: autorizacionId inválido: ${autorizacionId}`);
      return of({ error: 'ID de autorización inválido' });
    }

    const p = this.buildApproverPayloadFromAuth();

    return this.http.post(`${this.apiUrl}/${autorizacionId}/rechazar-validado/${nivel}`, {
      identificacion: p.identificacion,
      nombre: p.nombre,
      roles: p.roles,
      comentario
    }).pipe(
      tap({ next: () => {}, error: (error) => console.error(`[AutorizacionService] Error al rechazar validado:`, error) })
    );
  }

  rechazarNivel(autorizacionId: string, nivel: number, comentario?: string): Observable<any> {
    if (!autorizacionId || autorizacionId === 'undefined') {
      console.error(`[AutorizacionService] Error: autorizacionId inválido: ${autorizacionId}`);
      return of({ error: 'ID de autorización inválido' });
    }

    // Construir payload localmente a partir del usuario/token (no modificar librerías compartidas)
    const p = this.buildApproverPayloadFromAuth();

    return this.http.post(`${this.apiUrl}/${autorizacionId}/rechazar/${nivel}`, {
      nombre: p.nombre,
      identificacion: p.identificacion,
      comentario
    }).pipe(
      tap({ next: () => {}, error: (error) => console.error(`[AutorizacionService] Error al rechazar:`, error) })
    );
  }

  // Obtener aprobaciones pendientes de un usuario
  getAprobacionesPendientes(identificacionAprobador: string): Observable<AprobacionNivel[]> {
    return this.http.get<AprobacionNivel[]>(`${this.aprobacionesUrl}/pendientes/${identificacionAprobador}`);
  }

  // Obtener configuración de aprobadores desde el backend
  getAprobadores(tipoMovilidad?: string, tipoPostulante?: string): Observable<AprobadorDTO[]> {
    let params = new HttpParams();
    if (tipoMovilidad) params = params.set('tipoMovilidad', tipoMovilidad);
    if (tipoPostulante) params = params.set('tipoPostulante', tipoPostulante);

    return this.http.get<AprobadorDTO[]>(`${this.apiUrl}/aprobadores`, { params });
  }

  /** Construye localmente el payload de aprobador a partir del usuario en memoria o del token */
  private buildApproverPayloadFromAuth(): { nombre: string; identificacion: string; roles: string[]; email: string } {
    const current = this.authService.getCurrentUser() as any || {};
    const tokenInfo = this.authService.getUserInfo() || {} as any;

    const nombre = tokenInfo?.name || current?.username || current?.email || '';
    const identificacion = current?.identificacion || tokenInfo?.preferred_username || current?.username || '';
    const roles = current?.roles || tokenInfo?.realm_access?.roles || [];
    const email = current?.email || tokenInfo?.email || '';

    return { nombre, identificacion, roles, email };
  }

  // Obtener estado global de una movilidad desde el backend
  obtenerEstadoGlobalMovilidad(movilidadId: string): Observable<'aprobado' | 'rechazado' | 'pendiente' | 'parcial'> {
    return this.http.get<{estadoGlobal: 'aprobado' | 'rechazado' | 'pendiente' | 'parcial', movilidadId: string}>(`${this.apiUrl}/estado-global/${movilidadId}`).pipe(
      map((response: {estadoGlobal: 'aprobado' | 'rechazado' | 'pendiente' | 'parcial', movilidadId: string}) => response.estadoGlobal),
      catchError(error => {
        console.error(`Error al obtener estado global para movilidad ${movilidadId}:`, error);
        return of('pendiente' as 'aprobado' | 'rechazado' | 'pendiente' | 'parcial');
      })
    );
  }


  solicitarOCancelarAutorizacion(movilidadId: string, solicitar: boolean, tipo: 'POSTULANTE' | 'ESTUDIANTE' = 'POSTULANTE', movilidadPostulanteId?: string): Observable<void> {
    // Importar servicios de participantes dinámicamente para evitar romper la inyección circular en tests
    const updateFlag = (movId: string, value: boolean) => {
      if (tipo === 'ESTUDIANTE') {
        // Actualizar tabla movilidad_estudiante
        return this.estudianteService.updateAutorizacionForMovilidad(movId, value);
      }
      return this.postulanteService.updateAutorizacionForMovilidad(movId, value);
    };

    if (solicitar) {
      const autorizacion: Partial<Autorizacion> = tipo === 'ESTUDIANTE'
        ? { estado: 'pendiente', movilidadEstudianteId: movilidadId }
        : { estado: 'pendiente', movilidadPostulanteId: movilidadPostulanteId ?? movilidadId };

      // Crear o actualizar autorización, crear aprobaciones automáticas (si aplica) y actualizar flags
      return this.createOrUpdate(autorizacion as Autorizacion).pipe(
        switchMap(() => {
          const crearAprobaciones$ = movilidadPostulanteId
            ? this.crearAprobacionesAutomaticas(movilidadPostulanteId, 7, tipo, tipo).pipe(catchError(() => of([])))
            : of([]);

          return crearAprobaciones$.pipe(
            switchMap(() => updateFlag(movilidadId, true)),
            map(() => undefined)
          );
        })
      );
    }

    // CANCELAR: comprobar aprobaciones y, si no hay niveles aprobados, cancelar + actualizar flags
    const buscarId = movilidadPostulanteId || movilidadId;
    return this.getAprobacionesPorMovilidad(buscarId).pipe(
      switchMap((aprobaciones) => {
        const hayNivelesAprobados = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
        if (hayNivelesAprobados) {
          throw new Error('EXISTEN_NIVELES_APROBADOS');
        }
        return this.cancelOrCreateForMovilidad(buscarId, tipo);
      }),
      switchMap(() => updateFlag(movilidadId, false)),
      map(() => undefined)
    );
  }
}
