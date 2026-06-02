import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, catchError, map, tap, timer, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import { HojaVidaEstadoApiService } from './hoja-vida-estado-api.service';
import { AuthService } from '@microfrontends/shared-services';
import { 
  HojaVidaSeccionEstadoDTO, 
  ROUTE_TO_SECCION_MAP, 
  SECCION_TO_ROUTE_MAP 
} from '../models/hoja-vida-estado.model';

export interface SectionStatus {
  route: string;
  completed: boolean;
  recordCount: number;
  hasRequiredData: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class HojaVidaStatusService {
  
  private apiService = inject(HojaVidaEstadoApiService);
  private readonly STORAGE_KEY = 'hojaVidaStatuses';
  
  private sectionsStatus = new BehaviorSubject<Map<string, SectionStatus>>(new Map());
  private syncInProgress = new BehaviorSubject<boolean>(false);

  public sectionsStatus$: Observable<Map<string, SectionStatus>> = this.sectionsStatus.asObservable();
  public syncInProgress$: Observable<boolean> = this.syncInProgress.asObservable();

  constructor() {
    this.initializeStatuses();
  }

  private initializeStatuses(): void {
    const authService = inject(AuthService);
    const token = authService.getAccessToken();
    
    if (!token) {
      this.sectionsStatus.next(this.getDefaultStatuses());
      return;
    }
    this.apiService.obtenerTodosLosEstados().pipe(
      map(estados => this.convertDTOsToStatusMap(estados)),
      catchError(error => {
        return of(this.getDefaultStatuses());
      })
    ).subscribe({
      next: statusMap => {
        const TOTAL_SECCIONES_ESPERADAS = 8;
        
        if (statusMap.size === 0) {
          this.apiService.inicializarEstados().subscribe({
            next: estadosInicializados => {
              const initializedMap = this.convertDTOsToStatusMap(estadosInicializados);
              this.sectionsStatus.next(initializedMap);
              },
            error: err => {
              this.sectionsStatus.next(this.getDefaultStatuses());
            }
          });
        } else if (statusMap.size < TOTAL_SECCIONES_ESPERADAS) {
          this.apiService.inicializarEstados().subscribe({
            next: (estadosInicializados: HojaVidaSeccionEstadoDTO[]) => {
              const syncedMap = this.convertDTOsToStatusMap(estadosInicializados);
              this.sectionsStatus.next(syncedMap);
            },
            error: (err: any) => {
              const defaultStatuses = this.getDefaultStatuses();
              const mergedMap = new Map(defaultStatuses);
              statusMap.forEach((value, key) => {
                mergedMap.set(key, value);
              });
              
              this.sectionsStatus.next(mergedMap);
              }
          });
        } else {
          this.sectionsStatus.next(statusMap);
        }
      },
      error: err => {
        this.sectionsStatus.next(this.getDefaultStatuses());
      }
    });
  }

  private convertDTOsToStatusMap(dtos: HojaVidaSeccionEstadoDTO[]): Map<string, SectionStatus> {
    const statusMap = new Map<string, SectionStatus>(this.getDefaultStatuses());
    
    if (!Array.isArray(dtos)) {
      return statusMap;
    }
    
    dtos.forEach(dto => {
      const route = SECCION_TO_ROUTE_MAP[dto.seccion];
      if (route) {
        statusMap.set(route, {
          route,
          completed: dto.completada,
          recordCount: dto.cantidadRegistros,
          hasRequiredData: dto.tieneDatosRequeridos
        });
      } else {
      }
    });
    
    return statusMap;
  }

  private convertStatusToDTO(route: string, status: SectionStatus): HojaVidaSeccionEstadoDTO {
    const porcentaje = status.completed ? 100 : 0;
    
    return this.apiService.crearDTO(
      route,
      status.completed,
      status.recordCount,
      porcentaje
    );
  }

  private loadStatusesFromStorageFallback(): Map<string, SectionStatus> {
    try {
      const authUsuarioId = localStorage.getItem('authUsuarioId');
      if (!authUsuarioId) {
        return this.getDefaultStatuses();
      }

      const storageKey = `${this.STORAGE_KEY}_${authUsuarioId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const statusMap = new Map<string, SectionStatus>();
        
        Object.keys(parsed).forEach(key => {
          statusMap.set(key, parsed[key]);
        });
        
        return statusMap;
      }
    } catch (error) {
    }
    
    return this.getDefaultStatuses();
  }

  private loadStatusesFromStorage(): Map<string, SectionStatus> {
    try {
      const authUsuarioId = localStorage.getItem('authUsuarioId');
      if (!authUsuarioId) {
        return this.getDefaultStatuses();
      }

      const storageKey = `${this.STORAGE_KEY}_${authUsuarioId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const statusMap = new Map<string, SectionStatus>();
        
        Object.keys(parsed).forEach(key => {
          statusMap.set(key, parsed[key]);
        });
        
        return statusMap;
      }
    } catch (error) {
    }
    
    return this.getDefaultStatuses();
  }

  private saveStatusToBackend(route: string, status: SectionStatus): void {
    const porcentaje = status.completed ? 100 : 0;
    
    this.apiService.actualizarEstado(
      route,
      status.completed,
      status.recordCount,
      porcentaje
    ).pipe(
      catchError(error => {
        this.saveStatusesToStorageFallback(new Map([[route, status]]));
        return of(null);
      })
    ).subscribe({
      next: (updated) => {
        if (updated) {
        }
      }
    });
  }

  private saveStatusesToStorageFallback(statuses: Map<string, SectionStatus>): void {
    try {
      const authUsuarioId = localStorage.getItem('authUsuarioId');
      if (!authUsuarioId) {
        return;
      }

      const storageKey = `${this.STORAGE_KEY}_${authUsuarioId}`;
      
      const statusObject: { [key: string]: SectionStatus } = {};
      statuses.forEach((value, key) => {
        statusObject[key] = value;
      });
      
      localStorage.setItem(storageKey, JSON.stringify(statusObject));
    } catch (error) {
    }
  }

  private saveStatusesToStorage(statuses: Map<string, SectionStatus>): void {
    try {
      const authUsuarioId = localStorage.getItem('authUsuarioId');
      if (!authUsuarioId) {
        return;
      }

      const storageKey = `${this.STORAGE_KEY}_${authUsuarioId}`;
      
      const statusObject: { [key: string]: SectionStatus } = {};
      statuses.forEach((value, key) => {
        statusObject[key] = value;
      });
      
      localStorage.setItem(storageKey, JSON.stringify(statusObject));
      } catch (error) {
    }
  }
  private getDefaultStatuses(): Map<string, SectionStatus> {
    return new Map([
      ['informacion-personal', { route: 'informacion-personal', completed: false, recordCount: 0, hasRequiredData: false }],
      ['informacion-academica', { route: 'informacion-academica', completed: false, recordCount: 0, hasRequiredData: false }],
      ['informacion-laboral', { route: 'informacion-laboral', completed: false, recordCount: 0, hasRequiredData: false }],
      ['informacion-familiar', { route: 'informacion-familiar', completed: false, recordCount: 0, hasRequiredData: false }],
      ['referencias-personales', { route: 'referencias-personales', completed: false, recordCount: 0, hasRequiredData: false }],
      ['competencias', { route: 'competencias', completed: false, recordCount: 0, hasRequiredData: false }],
      ['afiliaciones', { route: 'afiliaciones', completed: false, recordCount: 0, hasRequiredData: false }],
      ['documentos-soporte', { route: 'documentos-soporte', completed: false, recordCount: 0, hasRequiredData: false }]
    ]);
  }

  private getStatusesSummary(): string {
    const statuses = this.sectionsStatus.value;
    const summary: string[] = [];
    statuses.forEach((status, route) => {
      summary.push(`${route}: ${status.completed ? '✅' : '⏳'} (${status.recordCount} registros)`);
    });
    return summary.join(', ');
  }

  updateSectionByRecordCount(route: string, recordCount: number): void {
    const currentStatuses = this.sectionsStatus.value;
    const status = currentStatuses.get(route);
    
    
    if (status) {
      const minRecords = route === 'informacion-personal' ? 0 : 1;
      const completed = recordCount >= minRecords;
      const hasChanged = status.completed !== completed || status.recordCount !== recordCount;
      
      if (!hasChanged) {
        return;
      }
      
      const updatedStatus: SectionStatus = {
        ...status,
        recordCount,
        completed,
        hasRequiredData: completed
      };
      
      currentStatuses.set(route, updatedStatus);
      
      this.sectionsStatus.next(new Map(currentStatuses));
      this.saveStatusToBackend(route, updatedStatus); 
      
    } else {
    }
  }

  updateInformacionPersonalStatus(hasAllRequiredFields: boolean): void {
    const currentStatuses = this.sectionsStatus.value;
    const status = currentStatuses.get('informacion-personal');
    
    if (status) {
      const hasChanged = status.completed !== hasAllRequiredFields;
      
      if (!hasChanged) {
        return;
      }
      
      const updatedStatus: SectionStatus = {
        ...status,
        completed: hasAllRequiredFields,
        hasRequiredData: hasAllRequiredFields,
        recordCount: hasAllRequiredFields ? 1 : 0
      };
      
      currentStatuses.set('informacion-personal', updatedStatus);
      
      this.sectionsStatus.next(new Map(currentStatuses));
      this.saveStatusToBackend('informacion-personal', updatedStatus); 
      
      }
  }
  getSectionStatus(route: string): SectionStatus | undefined {
    return this.sectionsStatus.value.get(route);
  }

  isDatosPersonalesCompleted(): boolean {
    const status = this.sectionsStatus.value.get('informacion-personal');
    return status?.completed ?? false;
  }

  getSectionStatus$(route: string): Observable<SectionStatus | undefined> {
    return new Observable(observer => {
      const subscription = this.sectionsStatus$.subscribe(statuses => {
        observer.next(statuses.get(route));
      });
      return () => subscription.unsubscribe();
    });
  }

  resetAllStatuses(): void {
    this.apiService.reiniciarTodosLosEstados().pipe(
      catchError(error => {
        const defaultStatuses = this.getDefaultStatuses();
        this.sectionsStatus.next(defaultStatuses);
        return of(void 0);
      })
    ).subscribe({
      next: () => {
        this.apiService.obtenerTodosLosEstados().subscribe({
          next: estados => {
            const resetStatuses = this.convertDTOsToStatusMap(estados);
            this.sectionsStatus.next(resetStatuses);
          },
          error: err => {
            const defaultStatuses = this.getDefaultStatuses();
            this.sectionsStatus.next(defaultStatuses);
          }
        });
      }
    });
  }

  reloadFromBackend(forceUpdate: boolean = false): Observable<Map<string, SectionStatus>> {
    this.syncInProgress.next(true);
    
    return this.apiService.obtenerTodosLosEstados().pipe(
      map(estados => {
        const statusMap = this.convertDTOsToStatusMap(estados);
        
        const currentStatuses = this.sectionsStatus.value;
        const hasChanges = this.hasStatusChanges(currentStatuses, statusMap);
        
        if (hasChanges || forceUpdate) {
          this.sectionsStatus.next(statusMap);
        } else {
          }
        
        this.syncInProgress.next(false);
        return statusMap;
      }),
      catchError(error => {
        this.syncInProgress.next(false);
        return of(this.sectionsStatus.value);
      })
    );
  }

  private hasStatusChanges(
    current: Map<string, SectionStatus>, 
    updated: Map<string, SectionStatus>
  ): boolean {
    if (current.size !== updated.size) return true;
    
    for (const [route, updatedStatus] of updated.entries()) {
      const currentStatus = current.get(route);
      if (!currentStatus) return true;
      
      if (currentStatus.completed !== updatedStatus.completed ||
          currentStatus.recordCount !== updatedStatus.recordCount ||
          currentStatus.hasRequiredData !== updatedStatus.hasRequiredData) {
        return true;
      }
    }
    
    return false;
  }

  clearStoredStatuses(): void {
    try {
      const authUsuarioId = localStorage.getItem('authUsuarioId');
      if (authUsuarioId) {
        const storageKey = `${this.STORAGE_KEY}_${authUsuarioId}`;
        localStorage.removeItem(storageKey);
        }
    } catch (error) {
    }
  }

  getCompletedSections(): string[] {
    const completed: string[] = [];
    this.sectionsStatus.value.forEach((status, route) => {
      if (status.completed) {
        completed.push(route);
      }
    });
    return completed;
  }

  getCompletionPercentage(): number {
    const totalSections = this.sectionsStatus.value.size;
    const completedSections = this.getCompletedSections().length;
    return totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  }

  syncWithBackend(): Observable<void> {
    return this.reloadFromBackend(true).pipe(
      map(() => void 0)
    );
  }

  isSyncing(): boolean {
    return this.syncInProgress.value;
  }
}
