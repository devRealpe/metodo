import { Component, OnInit, inject, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { LineaEstrategicaService } from '../../core/services/linea-estrategica.service';
import { LineaEstrategica } from '../../core/models/linea-estrategica.model';
import { InternacionalizacionRealtimeService } from '../../core/services/internacionalizacion-realtime.service';

@Component({
  selector: 'app-lineas-estrategicas',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './lineas-estrategicas.component.html',
})
export class LineasEstrategicasComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly messageService = inject(MessageService);
  private readonly lineaEstrategicaService = inject(LineaEstrategicaService);
  private readonly realtimeService = inject(InternacionalizacionRealtimeService);

  lineasEstrategicas: LineaEstrategica[] = [];
  loading = false;

  constructor() {
    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const datos = this.realtimeService.datosGeneralesActualizados();
          if (datos) {
            this.messageService.add({
              severity: 'info',
              summary: 'Datos actualizados',
              detail: datos.message || 'Se han detectado cambios en líneas estratégicas',
              life: 4000
            });
            this.realtimeService.resetSignal('general');
          }
          this.loadLineasEstrategicas();
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadLineasEstrategicas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLineasEstrategicas(): void {
    this.loading = true;
    this.lineaEstrategicaService.getAllActive()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las líneas estratégicas'
          });
          console.error('Error loading lineas estrategicas', error);
          return of([]);
        })
      )
      .subscribe((data: LineaEstrategica[]) => {
        this.lineasEstrategicas = data || [];
        this.loading = false;
      });
  }
}