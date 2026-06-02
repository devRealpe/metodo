import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { Movilidad, MovilidadExcelParams } from '../models/movilidad.model';
import { environment } from '@shared/shared-environments';
import { ErrorHandlerService } from './error-handler.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({
    providedIn: 'root',
})
export class MovilidadService {
    private readonly apiUrl = `${environment.internacionalizacionApi}/movilidad`;

    private cache = new Map<string, Observable<Movilidad>>();

    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlerService
    ) {}

    /**
     * Función de validación para verificar que la fecha fin sea posterior a la fecha inicio
     */
    static fechaFinDespuesDeInicio(control: AbstractControl): ValidationErrors | null {
        const inicio = control.get('fechaInicio')?.value;
        const fin = control.get('fechaFin')?.value;
        return inicio && fin && new Date(fin) < new Date(inicio) ? { fechaFinInvalida: true } : null;
    }

  
    static parseDateValue(value: unknown): Date | null {
        if (value == null || value instanceof Date) return value as Date | null;
        if (typeof value !== 'string') return null;

        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;

        const m = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(value);
        const p = m && new Date(+m[3], +m[2] - 1, +m[1]);
        return p && !isNaN(p.getTime()) ? p : null;
    }

    getAll(): Observable<Movilidad[]> {
        return this.http.get<Movilidad[]>(this.apiUrl);
    }

    getById(id: string): Observable<Movilidad> {
        if (!id) {
            return throwError(() => new Error('Movilidad id requerido'));
        }

        const cached = this.cache.get(id);
        if (cached) return cached;

        const req$ = this.http.get<Movilidad>(`${this.apiUrl}/${id}`).pipe(
            shareReplay({ bufferSize: 1, refCount: false }),
            catchError(error => {
                this.cache.delete(id);
                return this.errorHandler.handleHttpError(error, 'MovilidadService.getById');
            })
        );

        this.cache.set(id, req$);
        return req$;
    }

    getByIdOrNull(id: string): Observable<Movilidad | null> {
        return this.getById(id).pipe(
            catchError(err => err && err.status === 404 ? of(null) : throwError(() => err)),
            map(m => m || null)
        );
    }
    create(payload: Omit<Movilidad, 'id'>): Observable<Movilidad> {
        return this.http.post<Movilidad>(this.apiUrl, payload);
    }

    createBasic(payload: { nombreMovilidad: string; modalidadId: string; tipoActividad: string; lugarDestino?: string; institucionOrigen?: string; tipoMovilidad?: string; fechaInicio?: Date | string; fechaFin?: Date | string }): Observable<Movilidad> {
        return this.http.post<Movilidad>(`${this.apiUrl}/basic`, payload);
    }
    update(id: string, payload: Partial<Omit<Movilidad, 'id'>>): Observable<Movilidad> {
        return this.http.put<Movilidad>(`${this.apiUrl}/${id}`, payload).pipe(
            tap((mov) => {
                // keep cache in sync after a successful update
                this.cache.set(id, of(mov));
            })
        );
    }

    /** Actualiza solamente el estado de aprobación en el backend (aprobado/rechazado/pending) */
    updateAprobacion(id: string, aprobado: string): Observable<Movilidad> {
        return this.http.patch<Movilidad>(`${this.apiUrl}/${id}/aprobacion`, { aprobado });
    }
    deleteMovilidadWithRelations(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/with-relations`)
            .pipe(
                tap(() => this.cache.delete(id))
            );
    }

    generatePdf(movilidadId: string): Observable<Blob> {
        const url = `${this.apiUrl}/${movilidadId}/pdf`;
        return this.http.get(url, { responseType: 'blob' });
    }

    /**
     * Solicita al backend que genere un Excel para la movilidad indicada.
     */
    generateExcel(movilidadId: string): Observable<Blob> {
        const url = `${this.apiUrl}/${movilidadId}/excel`;
        return this.http.get(url, { responseType: 'blob' });
    }

    /**
     * Solicita al backend que genere un Excel con todas las movilidades.
     */
    generateExcelAll(): Observable<Blob> {
        const url = `${this.apiUrl}/excel`;
        return this.http.get(url, { responseType: 'blob' });
    }

   
    generateExcelFiltered(filters: {[key: string]: any}): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/excel`, { params: filters, responseType: 'blob' as const });
    }

    exportExcel(options: MovilidadExcelParams = {}): void {
        const params = Object.fromEntries(
            Object.entries(options)
                .filter(([, v]) => v != null && v !== '')
                .map(([k, v]) =>
                    k === 'viewMode' && v === 'cerradas' ? ['estadoAprobacion', 'CERRADA'] :
                    (k === 'fechaDesde' || k === 'fechaHasta') ? [k, this.formatApiDate(v as Date)] :
                    [k, v]
                )
        );

        this.http.get(`${this.apiUrl}/excel`, { params, responseType: 'blob' as const })
            .pipe(tap(blob => this.downloadBlob(blob)))
            .subscribe({ error: () => alert('Hubo un error generando el Excel.') });
    }

    private formatApiDate(date: Date): string { return new Date(date).toISOString().substring(0,10); }

    private downloadBlob(blob: unknown): void {
        if (!(blob instanceof Blob)) throw new Error('no-blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movilidades_${new Date().toISOString().replace(/[:\-\.]/g, '').slice(0,15)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Genera un Excel con las relaciones movilidad-postulante (salientes).
     */
    generateExcelSalientes(): Observable<Blob> {
        const url = `${this.apiUrl}/saliente/excel`;
        return this.http.get(url, { responseType: 'blob' });
    }

    
    generateExcelEstudiantes(movilidadId?: string): Observable<Blob> {
        let url = `${this.apiUrl}/estudiante/excel`;
        if (movilidadId) {
            url = `${this.apiUrl}/${movilidadId}/estudiante/excel`;
        }
        return this.http.get(url, { responseType: 'blob' });
    }

    static calcularDiasTotales(fechaInicio: any, fechaFin: any): number | null {
        if (!fechaInicio || !fechaFin) return null;

        try {
            const inicio = this.parseDateValue(fechaInicio);
            const fin = this.parseDateValue(fechaFin);

            if (!inicio || !fin) return null;
            if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return null;

            const diferenciaMs = fin.getTime() - inicio.getTime();
            const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

            return dias >= 0 ? dias : null;
        } catch (error) {
            console.error('Error calculando días totales:', error);
            return null;
        }
    }

    static buildPayloadFromFormData(formData: any): any {
        const dias = this.calcularDiasTotales(formData.fechaInicio, formData.fechaFin);

        const payload = {
            ...formData,
            tipoMovilidad: formData.tipoMovilidad ? { id: formData.tipoMovilidad } : null,
            modalidad: formData.modalidad ? { id: formData.modalidad } : null,
            periodo: formData.periodo ? { id: formData.periodo } : null,
            cobertura: formData.cobertura ? { id: formData.cobertura } : null,
            lineaEstrategica: formData.lineaEstrategica ? { id: formData.lineaEstrategica } : null,
            convenio: formData.convenioAsociado ? { id: formData.convenioAsociado } : null,
            fechaInicio: formData.fechaInicio ? this.formatDateForBackend(formData.fechaInicio) : null,
            fechaFin: formData.fechaFin ? this.formatDateForBackend(formData.fechaFin) : null,
            duracion: dias !== null ? dias.toString() : null,
            estado: 'ACTIVO'
        };
        delete payload.convenioAsociado;

        // Normalize any remaining empty strings to null
        Object.keys(payload).forEach(k => {
            if ((payload as any)[k] === '') (payload as any)[k] = null;
        });

        return payload;
    }

    private static formatDateForBackend(date: any): string | null {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        // Crear fecha local para evitar problemas de zona horaria
        const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return localDate.toISOString().split('T')[0];
    }

    /**
     * Método utilitario para construir payload de movilidad desde form value
     */
    static buildPayloadFromForm(datosFormulario: any, camposBasicos: string[], camposRelaciones: string[]): any {
        const payload: any = { estado: 'ACTIVO' };
        camposBasicos.forEach(k => {
            const v = datosFormulario[k];
            if (v != null && v !== '') payload[k] = String(v);
        });
        camposRelaciones.forEach(k => {
            const v = datosFormulario[k];
            payload[k] = v ? { id: String(v) } : null;
        });
        return payload;
    }

}


