import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';
import { RubroPresupuestal, TipoRubro, RubroPresupuestalCreation, RubroPresupuestalList } from '../models/rubros-presupuestales.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class RubroPresupuestalService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/rubros-presupuestales`;
  private readonly tiposApiUrl = `${environment.internacionalizacionApi}/tipo-rubro`;

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder
  ) {}


  create(rubro: RubroPresupuestalCreation): Observable<RubroPresupuestal> {
    return this.http.post<RubroPresupuestal>(this.apiUrl, rubro)
      .pipe(catchError(this.handleError));
  }

  getAll(): Observable<RubroPresupuestal[]> {
    return this.http.get<RubroPresupuestal[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<RubroPresupuestal> {
    return this.http.get<RubroPresupuestal>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  update(id: string, rubro: Partial<RubroPresupuestal>): Observable<RubroPresupuestal> {
    return this.http.put<RubroPresupuestal>(`${this.apiUrl}/${id}`, rubro)
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

  getByMovilidadId(movilidadId: string): Observable<RubroPresupuestal[]> {
    return this.http.get<RubroPresupuestal[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(
        catchError(error => {
          console.warn(`No se encontraron rubros para movilidad ${movilidadId}:`, error.status);
          return of([]);
        })
      );
  }

  getTiposRubro(): Observable<TipoRubro[]> {
    return this.http.get<TipoRubro[]>(this.tiposApiUrl)
      .pipe(catchError(this.handleError));
  }

  getAllActiveOrdered(): Observable<TipoRubro[]> {
    return this.http.get<TipoRubro[]>(`${this.tiposApiUrl}`)
      .pipe(catchError(this.handleError));
  }

  createTipoRubro(tipo: Omit<TipoRubro, 'id'>): Observable<TipoRubro> {
    return this.http.post<TipoRubro>(this.tiposApiUrl, tipo)
      .pipe(catchError(this.handleError));
  }

  updateTipoRubro(id: string, tipo: Partial<Omit<TipoRubro, 'id'>>): Observable<TipoRubro> {
    return this.http.put<TipoRubro>(`${this.tiposApiUrl}/${id}`, tipo)
      .pipe(catchError(this.handleError));
  }

  deleteTipoRubro(id: string): Observable<void> {
    return this.http.delete<void>(`${this.tiposApiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getTipoRubroById(id: string): Observable<TipoRubro> {
    return this.http.get<TipoRubro>(`${this.tiposApiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getRubrosWithTipos(movilidadId: string): Observable<RubroPresupuestalList> {
    return forkJoin({
      rubros: this.getByMovilidadId(movilidadId),
      tiposDisponibles: this.getAllActiveOrdered()
    }).pipe(
      map(({ rubros, tiposDisponibles }) => {
        const rubrosWithTipos = rubros.map(rubro => {
          const tipo = tiposDisponibles.find(t => t.id == (rubro as any).tipoRubroId);
          return {
            ...rubro,
            tipoRubro: tipo || rubro.tipoRubro
          };
        });
        return {
          rubros: rubrosWithTipos,
          tiposDisponibles
        };
      })
    );
  }

  saveRubroPresupuestal(movilidadId: string, formValue: any, existingId?: string): Observable<RubroPresupuestal> {
    if (existingId) {
      const rubroData = this.construirDesdeFormularioParaActualizar(formValue);
      return this.update(existingId, rubroData);
    } else {
      const rubroData = this.construirDesdeFormularioParaCrear(movilidadId, formValue);
      return this.create(rubroData);
    }
  }

  construirDesdeFormularioParaCrear(movilidadId: string, formValue: any): RubroPresupuestalCreation {
    return {
      movilidadId,
      tipoRubroId: formValue.tipoRubroId!,
      numero: formValue.numero
    };
  }

  construirDesdeFormularioParaActualizar(formValue: Partial<RubroPresupuestal & { tipoRubroId?: string }>): Partial<RubroPresupuestal> {
    return {
      numero: formValue.numero
    };
  }

  buildForm(): FormGroup {
    return this.fb.group({
      tipoRubroIds: [[], [Validators.required]],
      numero: [null, [Validators.required, Validators.min(1)]]
    });
  }

  buildTipoRubroForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  buildTipoRubroFormWithData(tipo: TipoRubro): FormGroup {
    const form = this.buildTipoRubroForm();
    form.patchValue({
      nombre: tipo.nombre
    });
    return form;
  }

  buildFormWithData(rubro: RubroPresupuestal): FormGroup {
    const form = this.buildForm();
    form.patchValue({
      tipoRubroIds: rubro.tipoRubro?.id,
      numero: rubro.numero
    });
    return form;
  }

  getNombreTipoRubro(tipo: TipoRubro): string {
    return tipo.nombre;
  }

 
  getSuccessMessage(): string {
    return 'Rubro presupuestal guardado correctamente.';
  }

  getValidationErrorMessage(type: 'form' | 'tipo' | 'numero'): string {
    switch (type) {
      case 'form':
        return 'Por favor complete todos los campos requeridos.';
      case 'tipo':
        return 'Debe seleccionar un tipo de rubro.';
      case 'numero':
        return 'El número debe ser mayor a cero.';
      default:
        return 'Error de validación desconocido.';
    }
  }

  getOperationErrorMessage(operation: 'load' | 'save' | 'delete'): string {
    switch (operation) {
      case 'load':
        return 'Error al cargar los rubros presupuestales.';
      case 'save':
        return 'Error al guardar el rubro presupuestal.';
      case 'delete':
        return 'Error al eliminar el rubro presupuestal.';
      default:
        return 'Error en la operación con rubros presupuestales.';
    }
  }

  // Obtener mensaje de error para operaciones con tipos de rubro
  getTipoRubroOperationErrorMessage(operation: 'load' | 'save' | 'delete'): string {
    switch (operation) {
      case 'load':
        return 'Error al cargar los tipos de rubro.';
      case 'save':
        return 'Error al guardar el tipo de rubro.';
      case 'delete':
        return 'Error al eliminar el tipo de rubro.';
      default:
        return 'Error en la operación con tipos de rubro.';
    }
  }

  // Obtener mensaje de éxito para tipos de rubro
  getTipoRubroSuccessMessage(operation: 'create' | 'update' | 'delete'): string {
    switch (operation) {
      case 'create':
        return 'Tipo de rubro creado correctamente.';
      case 'update':
        return 'Tipo de rubro actualizado correctamente.';
      case 'delete':
        return 'Tipo de rubro eliminado correctamente.';
      default:
        return 'Operación completada correctamente.';
    }
  }

  // Validar formulario de rubro presupuestal
  validarRubroPresupuestal(formValue: any): boolean {
    if (!formValue.tipoRubroId || !formValue.numero || formValue.numero < 1) {
      return false;
    }
    return true;
  }

  filtrarPorMovilidad(rubros: RubroPresupuestal[], movilidadId: string): RubroPresupuestal[] {
    return rubros.filter(rubro => rubro.movilidad?.id === movilidadId);
  }

  existeRubroTipo(rubros: RubroPresupuestal[], tipoId: string): boolean {
    return rubros.some(rubro => rubro.tipoRubro?.id === tipoId);
  }


  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          errorMessage = 'Datos inválidos. Verifique la información enviada.';
          break;
        case 404:
          errorMessage = 'Rubro presupuestal no encontrado.';
          break;
        case 409:
          errorMessage = 'Conflicto: El rubro presupuestal ya existe o está en uso.';
          break;
        case 422:
          errorMessage = 'Datos no procesables. Verifique el formato.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente más tarde.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Servicio no disponible. Intente más tarde.';
          break;
        default:
          errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
      }
    }

   
    return throwError(() => new Error(errorMessage));
  }
}
