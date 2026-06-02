import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface HorarioItem {
    codAula: string;
    diaSemana: string;
    nomAula?: string;
    horaInicio: string;
    horaFin: string;
    materia?: string;
    docente?: string;
}

export interface HorarioResumen {
    codAula: string;
    primeraHora: string;
    ultimaHora: string;
    totalFranjas: number;
    nomAula?: string;
    diaSemana?: string;
}

@Injectable({ providedIn: 'root' })

export class HorariosOracleService {
    private readonly base = `${((environment as any).apiOracle ??
        (environment as any).apiOracle ??
        '')
        .toString()
        .replace(/\/+$/, '')
        }/horarios-oracle`;

    constructor(private http: HttpClient) { }

    getHoras(dia?: string): Observable<HorarioItem[]> {
        const params = dia?.trim() ? new HttpParams().set('dia', dia.trim()) : undefined;
        return this.http.get<HorarioItem[]>(`${this.base}/horas`, { params });
    }

    getHorasByAula(codAula: string, dia?: string): Observable<HorarioItem[]> {
        const params = dia?.trim() ? new HttpParams().set('dia', dia.trim()) : undefined;
        return this.http.get<HorarioItem[]>(
            `${this.base}/aula/${encodeURIComponent(codAula)}/horas`,
            { params }
        );
    }

    getAulas(): Observable<string[]> {
        return this.http.get<string[]>(`${this.base}/aulas/nombres`);
    }

    getAulasNombres(): Observable<string[]> {
        return this.getAulas();
    }

    getDocentes(): Observable<string[]> {
        return this.http.get<string[]>(`${this.base}/docentes`);
    }

    getHorasByAulaResumen(codAula: string): Observable<HorarioResumen[]> {
        return this.http.get<HorarioResumen[]>(
            `${this.base}/aula/${encodeURIComponent(codAula)}/horas/resumen`
        );
    }
    getHorasResumen(): Observable<any> {
        return this.http.get<any>(`${this.base}/horas/resumen`);
    }

    getCalendar(): Observable<any> {
        return this.http.get<any>(`${this.base}/calendar`);

    }

    getHorasPorNombreAula(nombre: string): Observable<HorarioItem[]> {
        const params = new HttpParams().set('nombre', nombre);
        return this.http.get<HorarioItem[]>(`${this.base}/aulas/por-nombre/horas`, { params });
    }
    getAulasDetalle(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/aulas/detalle`);
    }
}
