import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface UsoLaboratorioView {
  id: string;
  identificacion?: string;
  fechaUso: string;
  horaInicio: string;
  horaFin: string | null;
  laboratorioId: string;
  laboratorioNombre: string;
  semestre: string;
  genero: string;
  rol: string;
  programa: string;
  facultad: string;
  observaciones?: string;
  motivo?: string;
}

export interface DashboardFila {
  etiqueta: string;
  minutos: number;
  usos: number;
  horas: number;
  asistentes?: number;
  personas?: number;
}

export interface DashboardTendencia {
  fecha: string;
  clases: number;
  asistencias: number;
}

export interface DashboardKpis {
  totalUsos: number;
  totalAsistencias: number;
  totalMinutos: number;
  totalHoras: number;
  promedioMin: number;
  promedioHoras: number;
  laboratoriosUnicos: number;
  promedioAsistentesPorClase: number;
  personasUnicas: number;
}

export interface DashboardUsabilidadResponse {
  kpis: DashboardKpis;
  totalRegistros: number;
  filasLaboratorio: DashboardFila[];
  filasPrograma: DashboardFila[];
  filasFacultad: DashboardFila[];
  filasSemestre: DashboardFila[];
  filasGenero: DashboardFila[];
  filasMateria: DashboardFila[];
  filasDiaSemana: DashboardFila[];
  filasMotivo: DashboardFila[];
  datosTendencia: DashboardTendencia[];
}

export interface InformeResumenResponse {
  resumenRows: Array<Record<string, string | number>>;
  resumenColumnas: string[];
  resumenSubLabel: string;
  resumenDetalle: Record<string, Array<{ subLabel: string; count: number; totalHoras: number; promedioHoras: number }>>;
  totalRegistros: number;
  totalHoras: number;
}

@Injectable({ providedIn: 'root' })
export class UsosLaboratorioQueryService {
  private readonly base = `${environment.apilaboratoriosLocal}/usos-laboratorio`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<UsoLaboratorioView[]> {
    return this.http.get<UsoLaboratorioView[]>(this.base);
  }

  porRangoFechas(desde: string, hasta: string, laboratorioId?: string): Observable<UsoLaboratorioView[]> {
    return this.listarTodos().pipe(
      map(rows => {
        let filtered = rows.filter(r => {
          const fecha = (r as any).fechaUso ?? (r as any).fecha_uso ?? '';
          return fecha >= desde && fecha <= hasta;
        });
        if (laboratorioId) {
          filtered = filtered.filter(r => this.matchLabId(r, laboratorioId));
        }
        return filtered;
      })
    );
  }

  porLaboratorio(laboratorioId: string): Observable<UsoLaboratorioView[]> {
    return this.listarTodos().pipe(
      map(rows => rows.filter(r => this.matchLabId(r, laboratorioId)))
    );
  }

  porFecha(fecha: string): Observable<UsoLaboratorioView[]> {
    return this.listarTodos().pipe(
      map(rows => rows.filter(r => {
        const f = (r as any).fechaUso ?? (r as any).fecha_uso ?? '';
        return f === fecha;
      }))
    );
  }



  consultarUsos(opts: {
    desde?: string;
    hasta?: string;
    laboratorioId?: string;
    fechaExacta?: string;
  }): Observable<UsoLaboratorioView[]> {
    const { desde, hasta, laboratorioId, fechaExacta } = opts ?? {};

    if (desde && hasta) {
      return this.porRangoFechas(desde, hasta, laboratorioId);
    }

    if (laboratorioId && fechaExacta) {
      return this.porFecha(fechaExacta).pipe(
        map(rows => rows.filter(r => this.matchLabId(r, laboratorioId)))
      );
    }

    if (laboratorioId) {
      return this.porLaboratorio(laboratorioId);
    }

    if (fechaExacta) {
      return this.porFecha(fechaExacta);
    }

    return this.listarTodos();
  }

  getDashboard(desde?: string, hasta?: string): Observable<DashboardUsabilidadResponse> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<DashboardUsabilidadResponse>(`${this.base}/dashboard`, { params });
  }

  /**
   * Informe filtrado: el backend aplica todos los filtros y devuelve registros
   * ya enriquecidos con el nombre del laboratorio. Reemplaza listarTodos() + filtrado en memoria.
   */
  getInforme(opts: {
    desde?: string; hasta?: string; laboratorioId?: string;
    genero?: string; facultad?: string; rol?: string;
    programa?: string; semestre?: string;
  } = {}): Observable<UsoLaboratorioView[]> {
    let params = new HttpParams();
    if (opts.desde)        params = params.set('desde',        opts.desde);
    if (opts.hasta)        params = params.set('hasta',        opts.hasta);
    if (opts.laboratorioId) params = params.set('laboratorioId', opts.laboratorioId);
    if (opts.genero)       params = params.set('genero',       opts.genero);
    if (opts.facultad)     params = params.set('facultad',     opts.facultad);
    if (opts.rol)          params = params.set('rol',          opts.rol);
    if (opts.programa)     params = params.set('programa',     opts.programa);
    if (opts.semestre)     params = params.set('semestre',     opts.semestre);
    return this.http.get<UsoLaboratorioView[]>(`${this.base}/informe`, { params });
  }

  /**
   * Resumen agregado para el informe. El backend hace el agrupado y devuelve
   * filas listas para mostrar en la tabla de resumen.
   */
  getInformeResumen(opts: {
    desde?: string; hasta?: string; laboratorioId?: string;
    genero?: string; facultad?: string; rol?: string;
    programa?: string; semestre?: string;
    reportMode?: string; groupBy?: string[];
  } = {}): Observable<InformeResumenResponse> {
    let params = new HttpParams();
    if (opts.desde)        params = params.set('desde',        opts.desde);
    if (opts.hasta)        params = params.set('hasta',        opts.hasta);
    if (opts.laboratorioId) params = params.set('laboratorioId', opts.laboratorioId);
    if (opts.genero)       params = params.set('genero',       opts.genero);
    if (opts.facultad)     params = params.set('facultad',     opts.facultad);
    if (opts.rol)          params = params.set('rol',          opts.rol);
    if (opts.programa)     params = params.set('programa',     opts.programa);
    if (opts.semestre)     params = params.set('semestre',     opts.semestre);
    if (opts.reportMode)   params = params.set('reportMode',   opts.reportMode);
    if (opts.groupBy?.length) {
      opts.groupBy.forEach(k => { params = params.append('groupBy', k); });
    }
    return this.http.get<InformeResumenResponse>(`${this.base}/informe/resumen`, { params });
  }

  report(opts: { desde?: string; hasta?: string; laboratorioId?: string; groupBy?: string } = {}): Observable<any[]> {
    let params = new HttpParams();
    if (opts.desde) params = params.set('desde', opts.desde);
    if (opts.hasta) params = params.set('hasta', opts.hasta);
    if (opts.laboratorioId) params = params.set('laboratorioId', opts.laboratorioId);
    if (opts.groupBy) params = params.set('groupBy', opts.groupBy);
    return this.http.get<any[]>(`${this.base}/report`, { params });
  }

  exportReport(opts: { format?: string; desde?: string; hasta?: string; laboratorioId?: string; groupBy?: string; tipoReporte?: string } = {}): Observable<import('@angular/common/http').HttpResponse<Blob>> {
    let params = new HttpParams();
    if (opts.format) params = params.set('format', opts.format);
    if (opts.desde) params = params.set('desde', opts.desde);
    if (opts.hasta) params = params.set('hasta', opts.hasta);
    if (opts.laboratorioId) params = params.set('laboratorioId', opts.laboratorioId);
    if (opts.groupBy) params = params.set('groupBy', opts.groupBy);
    if (opts.tipoReporte) params = params.set('tipoReporte', opts.tipoReporte);
    return this.http.get(`${this.base}/report/export`, { params, responseType: 'blob', observe: 'response' });
  }

  private matchLabId(row: any, laboratorioId: string): boolean {
    const id =
      (row?.laboratorioId ??
        row?.codAula ??
        row?.cod_aula ??
        row?.fk_id_laboratorio ??
        row?.idLaboratorio ??
        row?.laboratorio?.id ??
        '') + '';
    return id === String(laboratorioId);
  }
}
