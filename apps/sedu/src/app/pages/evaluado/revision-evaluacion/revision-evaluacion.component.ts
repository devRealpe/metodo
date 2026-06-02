import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { MessageService } from 'primeng/api';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { SeccionesItemsService } from '../../../core/services/secciones-items.service';
import { Evaluacion, EvaluationResponse, Seccion, Item } from '../../../core/models';
import { forkJoin, of, switchMap } from 'rxjs';

interface SeccionConItems extends Seccion {
  items: Item[];
}

@Component({
  selector: 'app-revision-evaluacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    DividerModule,
    PanelModule,
  ],
  providers: [MessageService],
  templateUrl: './revision-evaluacion.component.html',
})
export class RevisionEvaluacionComponent implements OnInit {
  evaluacion = signal<Evaluacion | null>(null);
  secciones = signal<SeccionConItems[]>([]);
  respuestas = signal<EvaluationResponse[]>([]);
  cargando = signal(true);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private evaluacionesService: EvaluacionesService,
    private seccionesItemsService: SeccionesItemsService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      evaluacion: this.evaluacionesService.getById(id),
      respuestas: this.evaluacionesService.getResponses(id),
    }).pipe(
      switchMap(({ evaluacion, respuestas }) => {
        this.evaluacion.set(evaluacion);
        this.respuestas.set(respuestas);
        return this.seccionesItemsService.listSecciones(evaluacion.formatoVersionId).pipe(
          switchMap((secciones) => {
            if (secciones.length === 0) return of([] as SeccionConItems[]);
            return forkJoin(
              secciones.map((s) =>
                this.seccionesItemsService.listItems(s.id).pipe(
                  switchMap((items) => of({ ...s, items } as SeccionConItems))
                )
              )
            );
          })
        );
      })
    ).subscribe({
      next: (secciones) => {
        this.secciones.set(secciones);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la evaluación' });
        this.cargando.set(false);
      },
    });
  }

  getRespuesta(itemId: string): EvaluationResponse | undefined {
    return this.respuestas().find((r) => r.itemId === itemId);
  }

  getSeveridadEstado(estado?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'CERRADA': return 'success';
      case 'FIRMADO_EVALUADOR': return 'warn';
      case 'FIRMADO_EVALUADO': return 'warn';
      case 'EN_PROCESO': case 'BORRADOR': return 'info';
      case 'DEVUELTA': return 'danger';
      case 'ANULADA': return 'danger';
      default: return 'secondary';
    }
  }

  volver(): void {
    this.router.navigate(['/app/evaluado/dashboard']);
  }
}

