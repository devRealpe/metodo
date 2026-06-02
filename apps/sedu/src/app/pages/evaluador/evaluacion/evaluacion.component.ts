import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { EscalasService } from '../../../core/services/escalas.service';
import { SeccionesItemsService } from '../../../core/services/secciones-items.service';
import { Evaluacion, Escala, EvaluationResponse, ResponseItem, Seccion, Item } from '../../../core/models';
import { forkJoin, of, switchMap } from 'rxjs';

interface SeccionConItems extends Seccion {
  items: Item[];
}

@Component({
  selector: 'app-evaluacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TextareaModule,
    RadioButtonModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    DividerModule,
    PanelModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './evaluacion.component.html',
})
export class EvaluacionComponent implements OnInit {
  evaluacion = signal<Evaluacion | null>(null);
  escalas = signal<Escala[]>([]);
  secciones = signal<SeccionConItems[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  enviando = signal(false);

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private evaluacionesService: EvaluacionesService,
    private escalasService: EscalasService,
    private seccionesItemsService: SeccionesItemsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      evaluacion: this.evaluacionesService.getById(id),
      escalas: this.escalasService.list(),
      respuestas: this.evaluacionesService.getResponses(id),
    }).pipe(
      switchMap(({ evaluacion, escalas, respuestas }) => {
        this.evaluacion.set(evaluacion);
        this.escalas.set(escalas);
        return this.seccionesItemsService.listSecciones(evaluacion.formatoVersionId).pipe(
          switchMap((secciones) => {
            if (secciones.length === 0) return of({ secciones: [] as SeccionConItems[], respuestas });
            return forkJoin(
              secciones.map((s) =>
                this.seccionesItemsService.listItems(s.id).pipe(
                  switchMap((items) => of({ ...s, items } as SeccionConItems))
                )
              )
            ).pipe(switchMap((secConItems) => of({ secciones: secConItems, respuestas })));
          })
        );
      })
    ).subscribe({
      next: ({ secciones, respuestas }) => {
        this.secciones.set(secciones);
        this.buildForm(secciones, respuestas);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la evaluación' });
        this.cargando.set(false);
      },
    });
  }

  private buildForm(secciones: SeccionConItems[], respuestas: EvaluationResponse[]): void {
    const respMap = new Map(respuestas.map((r) => [r.itemId, r]));
    const seccionesArray = secciones.map((s) => {
      const items = s.items.map((item) => {
        const resp = respMap.get(item.id);
        return this.fb.group({
          itemId: [item.id],
          escalaId: [resp?.escalaId || '', Validators.required],
          valor: [resp?.valor ?? null],
          observacion: [resp?.observacion || ''],
        });
      });
      return this.fb.group({ items: this.fb.array(items) });
    });
    this.form = this.fb.group({
      secciones: this.fb.array(seccionesArray),
    });
  }

  get seccionesArray(): FormArray {
    return this.form.get('secciones') as FormArray;
  }

  getItemsArray(seccionIdx: number): FormArray {
    return this.seccionesArray.at(seccionIdx).get('items') as FormArray;
  }

  get esEditable(): boolean {
    const estado = this.evaluacion()?.estado;
    return estado === 'BORRADOR' || estado === 'EN_PROCESO' || estado === 'DEVUELTA';
  }

  private buildResponses(): ResponseItem[] {
    const items: ResponseItem[] = [];
    for (let i = 0; i < this.seccionesArray.length; i++) {
      const itemsArr = this.getItemsArray(i);
      for (let j = 0; j < itemsArr.length; j++) {
        const val = itemsArr.at(j).value;
        items.push({ itemId: val.itemId, escalaId: val.escalaId || undefined, valor: val.valor ?? undefined, observacion: val.observacion || undefined });
      }
    }
    return items;
  }

  guardarBorrador(): void {
    this.guardando.set(true);
    const id = this.evaluacion()!.id;
    const req = { respuestas: this.buildResponses() };
    this.evaluacionesService.saveResponses(id, req).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Borrador guardado correctamente' });
        this.guardando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
        this.guardando.set(false);
      },
    });
  }

  firmarEvaluador(): void {
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Complete todos los ítems antes de firmar' });
      return;
    }
    this.confirmationService.confirm({
      message: '¿Firmar y enviar la evaluación al evaluado? Una vez firmada no podrá modificarla.',
      header: 'Confirmar Firma',
      icon: 'pi pi-pen-to-square',
      accept: () => {
        this.enviando.set(true);
        const id = this.evaluacion()!.id;
        const req = { respuestas: this.buildResponses() };
        this.evaluacionesService.saveResponses(id, req).subscribe({
          next: () => {
            this.evaluacionesService.firmarEvaluador(id).subscribe({
              next: (updated) => {
                this.evaluacion.set(updated);
                this.messageService.add({ severity: 'success', summary: 'Firmada', detail: 'Evaluación firmada y enviada al evaluado' });
                this.enviando.set(false);
              },
              error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al firmar la evaluación' });
                this.enviando.set(false);
              },
            });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar las respuestas' });
            this.enviando.set(false);
          },
        });
      },
    });
  }

  irAPlanMejoramiento(): void {
    this.router.navigate(['/app/evaluador/plan-mejoramiento', this.evaluacion()!.id]);
  }

  volver(): void {
    this.router.navigate(['/app/evaluador/dashboard']);
  }

  getSeveridadEstado(estado?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'CERRADA': return 'success';
      case 'FIRMADO_EVALUADOR': case 'FIRMADO_EVALUADO': return 'warn';
      case 'EN_PROCESO': case 'BORRADOR': return 'info';
      case 'DEVUELTA': return 'danger';
      case 'ANULADA': return 'danger';
      default: return 'secondary';
    }
  }
}

