import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import {ApoyoEconomico, ApoyoEconomicoCreation,TipoApoyoEconomico, ApoyoEconomicoList} from '../models/apoyo-economico.model';
import { environment } from '@shared/shared-environments';
import { TIPOS_CON_DESCRIPCION } from '../constants/apoyo-economico.constants';

@Injectable({
  providedIn: 'root'
})
export class ApoyoEconomicoService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/apoyo-economico`;
  private readonly tiposApiUrl = `${environment.internacionalizacionApi}/tipo-apoyo-economico`;

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder
  ) {}

  create(apoyo: ApoyoEconomicoCreation): Observable<ApoyoEconomico> {
    const payload = this.mapCreationToEntity(apoyo);
    return this.http.post<ApoyoEconomico>(this.apiUrl, payload)
      .pipe(catchError(this.handleError));
  }


  private mapCreationToEntity(apoyo: ApoyoEconomicoCreation): any {
    const entity: any = {
      movilidad: { id: apoyo.movilidadId },
      tipoApoyoEconomico: { id: apoyo.tipoApoyoId }
    };
    if (apoyo.descripcion !== undefined) {
      entity.descripcion = apoyo.descripcion;
    }
    if (apoyo.presupuestoDisponible !== undefined) {
      entity.presupuestoDisponible = apoyo.presupuestoDisponible;
    }
    if (apoyo.centroCostos !== undefined) {
      entity.centroCostos = apoyo.centroCostos;
    }
    if (apoyo.fuenteFuncion !== undefined) {
      entity.fuenteFuncion = apoyo.fuenteFuncion;
    }
    if (apoyo.concepto !== undefined) {
      entity.concepto = apoyo.concepto;
    }
    return entity;
  }

  getAll(): Observable<ApoyoEconomico[]> {
    return this.http.get<ApoyoEconomico[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<ApoyoEconomico> {
    return this.http.get<ApoyoEconomico>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  update(id: string, apoyo: Partial<ApoyoEconomico>): Observable<ApoyoEconomico> {
    const payload: any = { ...apoyo };
    if ((apoyo as any).tipoApoyoId !== undefined) {
      payload.tipoApoyoEconomico = { id: (apoyo as any).tipoApoyoId };
      delete payload.tipoApoyoId;
    }
    return this.http.put<ApoyoEconomico>(`${this.apiUrl}/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  deleteByMovilidadId(movilidadId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  getByMovilidadId(movilidadId: string): Observable<ApoyoEconomico[]> {
    return this.http.get<ApoyoEconomico[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(
        catchError(error => {
          return of([]);
        })
      );
  }

  getTiposApoyo(): Observable<TipoApoyoEconomico[]> {
    return this.http.get<TipoApoyoEconomico[]>(this.tiposApiUrl)
      .pipe(catchError(this.handleError));
  }

  createTipoApoyo(tipo: Omit<TipoApoyoEconomico, 'id' | 'createdAt' | 'updatedAt'>): Observable<TipoApoyoEconomico> {
    return this.http.post<TipoApoyoEconomico>(this.tiposApiUrl, tipo)
      .pipe(catchError(this.handleError));
  }

  updateTipoApoyo(id: number, tipo: Partial<Omit<TipoApoyoEconomico, 'id' | 'createdAt' | 'updatedAt'>>): Observable<TipoApoyoEconomico> {
    return this.http.put<TipoApoyoEconomico>(`${this.tiposApiUrl}/${id}`, tipo)
      .pipe(catchError(this.handleError));
  }

  deleteTipoApoyo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tiposApiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getTipoApoyoById(id: number): Observable<TipoApoyoEconomico> {
    return this.http.get<TipoApoyoEconomico>(`${this.tiposApiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getApoyosWithTipos(movilidadId: string): Observable<ApoyoEconomicoList> {
    return forkJoin({
      apoyos: this.getByMovilidadId(movilidadId),
      tiposDisponibles: this.getTiposApoyo()
    }).pipe(
      map(({ apoyos, tiposDisponibles }) => {
        const apoyosWithTipos = apoyos.map(apoyo => {
          const tipo = tiposDisponibles.find(t => t.id == (apoyo as any).tipoApoyoId);
          return {
            ...apoyo,
            tipoApoyoEconomico: tipo || apoyo.tipoApoyoEconomico
          };
        });
        return {
          apoyos: apoyosWithTipos,
          tiposDisponibles
        };
      })
    );
  }


  saveApoyoEconomico(movilidadId: string, formValue: any, existingId?: string): Observable<ApoyoEconomico> {
    if (existingId) {
      const apoyoData = this.construirDesdeFormularioParaActualizar(formValue);
      return this.update(existingId, apoyoData);
    } else {
      const apoyoData = this.construirDesdeFormularioParaCrear(movilidadId, formValue);
      return this.create(apoyoData);
    }
  }

  // Construir objeto desde formulario para crear
  construirDesdeFormularioParaCrear(movilidadId: string, formValue: any): ApoyoEconomicoCreation {
    return {
      movilidadId,
      tipoApoyoId: formValue.tipoApoyoId!,
      descripcion: formValue.descripcion?.trim() || undefined,
      presupuestoDisponible: formValue.presupuestoDisponible || false,
      centroCostos: formValue.centroCostos?.trim() || undefined
    };
  }

  construirDesdeFormularioParaActualizar(formValue: Partial<ApoyoEconomico & { tipoApoyoId?: number }>): Partial<ApoyoEconomico> {
    return {
      descripcion: formValue.descripcion?.trim(),
      presupuestoDisponible: formValue.presupuestoDisponible,
      centroCostos: formValue.centroCostos?.trim()
    };
  }

  buildForm(): FormGroup {
    return this.fb.group({
      tipoApoyoIds: [[], [Validators.minLength(1)]],
      descripcion: ['', [Validators.maxLength(500)]],
      presupuestoDisponible: [false],
      centroCostos: ['', [Validators.maxLength(100)]]
    });
  }

  buildTipoApoyoForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  buildTipoApoyoFormWithData(tipo: TipoApoyoEconomico): FormGroup {
    const form = this.buildTipoApoyoForm();
    form.patchValue({
      nombre: tipo.nombre
    });
    return form;
  }

  buildFormWithData(apoyo: ApoyoEconomico): FormGroup {
    const form = this.buildForm();
    form.patchValue({
      tipoApoyoIds: apoyo.tipoApoyoEconomico.id,
      descripcion: apoyo.descripcion || '',
      presupuestoDisponible: apoyo.presupuestoDisponible || false,
      centroCostos: apoyo.centroCostos || ''
    });
    return form;
  }

  tipoRequiereDescripcion(tipoId: number): boolean {
    return TIPOS_CON_DESCRIPCION.some(id => id === tipoId);
  }

  getNombreTipoApoyo(tipo: TipoApoyoEconomico): string {
    return tipo.nombre;
  }

  
  // central error handler for HTTP requests
  private handleError(error: HttpErrorResponse): Observable<never> {
    // keep simple: just forward original error like other lightweight services
    return throwError(() => error);
  }
}