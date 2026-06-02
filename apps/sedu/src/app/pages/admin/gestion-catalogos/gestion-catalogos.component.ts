import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { FormatosService } from '../../../core/services/formatos.service';
import { SeccionesItemsService } from '../../../core/services/secciones-items.service';
import { EscalasService } from '../../../core/services/escalas.service';
import { Formato, FormatoVersion, Seccion, Item, Escala } from '../../../core/models';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-gestion-catalogos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    TabsModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
    ToggleSwitchModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gestion-catalogos.component.html',
})
export class GestionCatalogosComponent implements OnInit {
  // ── Formatos ──
  formatos = signal<Formato[]>([]);
  cargandoFormatos = signal(false);
  mostrarModalFormato = signal(false);
  modoEdicionFormato = signal(false);
  formatoEditando = signal<Formato | null>(null);
  formFormato!: FormGroup;

  // ── Secciones ──
  secciones = signal<Seccion[]>([]);
  cargandoSecciones = signal(false);
  formatoSeccionSeleccionado = signal<string | null>(null);
  mostrarModalSeccion = signal(false);
  modoEdicionSeccion = signal(false);
  seccionEditando = signal<Seccion | null>(null);
  formSeccion!: FormGroup;

  // ── Items ──
  items = signal<Item[]>([]);
  cargandoItems = signal(false);
  seccionItemSeleccionada = signal<string | null>(null);
  mostrarModalItem = signal(false);
  modoEdicionItem = signal(false);
  itemEditando = signal<Item | null>(null);
  formItem!: FormGroup;

  // ── Versiones ──
  versiones = signal<FormatoVersion[]>([]);
  cargandoVersiones = signal(false);
  formatoVersionSeleccionado = signal<string | null>(null);

  // ── Escalas ──
  escalas = signal<Escala[]>([]);
  cargandoEscalas = signal(false);
  mostrarModalEscala = signal(false);
  modoEdicionEscala = signal(false);
  escalaEditando = signal<Escala | null>(null);
  formEscala!: FormGroup;

  constructor(
    private formatosService: FormatosService,
    private seccionesItemsService: SeccionesItemsService,
    private escalasService: EscalasService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.formFormato = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: [''],
    });
    this.formSeccion = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: [''],
      orden: [1, Validators.required],
    });
    this.formItem = this.fb.group({
      numeroItem: [1, Validators.required],
      nombre: ['', Validators.required],
      descripcion: [''],
    });
    this.formEscala = this.fb.group({
      codigo: ['', Validators.required],
      etiqueta: ['', Validators.required],
      peso: [0, Validators.required],
      orden: [1, Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarFormatos();
    this.cargarEscalas();
  }

  // ── FORMATOS ──
  cargarFormatos(): void {
    this.cargandoFormatos.set(true);
    this.formatosService.list().subscribe({
      next: (data) => { this.formatos.set(data); this.cargandoFormatos.set(false); },
      error: () => { this.msg('error', 'Error cargando formatos'); this.cargandoFormatos.set(false); },
    });
  }

  abrirCrearFormato(): void {
    this.modoEdicionFormato.set(false);
    this.formFormato.reset();
    this.mostrarModalFormato.set(true);
  }

  abrirEditarFormato(f: Formato): void {
    this.modoEdicionFormato.set(true);
    this.formatoEditando.set(f);
    this.formFormato.patchValue(f);
    this.mostrarModalFormato.set(true);
  }

  guardarFormato(): void {
    if (this.formFormato.invalid) return;
    const val = this.formFormato.value;
    if (this.modoEdicionFormato() && this.formatoEditando()) {
      this.formatosService.update(this.formatoEditando()!.id, val).subscribe({
        next: () => { this.msg('success', 'Formato actualizado'); this.mostrarModalFormato.set(false); this.cargarFormatos(); },
        error: () => this.msg('error', 'Error actualizando formato'),
      });
    } else {
      this.formatosService.create(val).subscribe({
        next: () => { this.msg('success', 'Formato creado'); this.mostrarModalFormato.set(false); this.cargarFormatos(); },
        error: () => this.msg('error', 'Error creando formato'),
      });
    }
  }

  // ── SECCIONES ──
  onFormatoSeccionChange(formatoId: string): void {
    this.formatoSeccionSeleccionado.set(formatoId);
    this.secciones.set([]);
    this.items.set([]);
    this.seccionItemSeleccionada.set(null);
    if (formatoId) this.cargarSecciones(formatoId);
  }

  cargarSecciones(formatoId: string): void {
    this.cargandoSecciones.set(true);
    this.seccionesItemsService.listSecciones(formatoId).subscribe({
      next: (data) => { this.secciones.set(data); this.cargandoSecciones.set(false); },
      error: () => { this.msg('error', 'Error cargando secciones'); this.cargandoSecciones.set(false); },
    });
  }

  abrirCrearSeccion(): void {
    this.modoEdicionSeccion.set(false);
    this.formSeccion.reset({ orden: 1 });
    this.mostrarModalSeccion.set(true);
  }

  abrirEditarSeccion(s: Seccion): void {
    this.modoEdicionSeccion.set(true);
    this.seccionEditando.set(s);
    this.formSeccion.patchValue(s);
    this.mostrarModalSeccion.set(true);
  }

  guardarSeccion(): void {
    if (this.formSeccion.invalid || !this.formatoSeccionSeleccionado()) return;
    const val = this.formSeccion.value;
    if (this.modoEdicionSeccion() && this.seccionEditando()) {
      this.seccionesItemsService.updateSeccion(this.seccionEditando()!.id, val).subscribe({
        next: () => { this.msg('success', 'Sección actualizada'); this.mostrarModalSeccion.set(false); this.cargarSecciones(this.formatoSeccionSeleccionado()!); },
        error: () => this.msg('error', 'Error actualizando sección'),
      });
    } else {
      this.seccionesItemsService.createSeccion({ ...val, formatoVersionId: this.formatoSeccionSeleccionado()! }).subscribe({
        next: () => { this.msg('success', 'Sección creada'); this.mostrarModalSeccion.set(false); this.cargarSecciones(this.formatoSeccionSeleccionado()!); },
        error: () => this.msg('error', 'Error creando sección'),
      });
    }
  }

  // ── ITEMS ──
  onSeccionItemChange(seccionId: string): void {
    this.seccionItemSeleccionada.set(seccionId);
    this.items.set([]);
    if (seccionId) this.cargarItems(seccionId);
  }

  cargarItems(seccionId: string): void {
    this.cargandoItems.set(true);
    this.seccionesItemsService.listItems(seccionId).subscribe({
      next: (data) => { this.items.set(data); this.cargandoItems.set(false); },
      error: () => { this.msg('error', 'Error cargando ítems'); this.cargandoItems.set(false); },
    });
  }

  abrirCrearItem(): void {
    this.modoEdicionItem.set(false);
    this.formItem.reset({ numeroItem: 1 });
    this.mostrarModalItem.set(true);
  }

  abrirEditarItem(it: Item): void {
    this.modoEdicionItem.set(true);
    this.itemEditando.set(it);
    this.formItem.patchValue(it);
    this.mostrarModalItem.set(true);
  }

  guardarItem(): void {
    if (this.formItem.invalid || !this.seccionItemSeleccionada()) return;
    const val = this.formItem.value;
    if (this.modoEdicionItem() && this.itemEditando()) {
      this.seccionesItemsService.updateItem(this.itemEditando()!.id, val).subscribe({
        next: () => { this.msg('success', 'Ítem actualizado'); this.mostrarModalItem.set(false); this.cargarItems(this.seccionItemSeleccionada()!); },
        error: () => this.msg('error', 'Error actualizando ítem'),
      });
    } else {
      this.seccionesItemsService.createItem({ ...val, seccionId: this.seccionItemSeleccionada()! }).subscribe({
        next: () => { this.msg('success', 'Ítem creado'); this.mostrarModalItem.set(false); this.cargarItems(this.seccionItemSeleccionada()!); },
        error: () => this.msg('error', 'Error creando ítem'),
      });
    }
  }

  // ── ESCALAS ──
  cargarEscalas(): void {
    this.cargandoEscalas.set(true);
    this.escalasService.list().subscribe({
      next: (data) => { this.escalas.set(data); this.cargandoEscalas.set(false); },
      error: () => { this.msg('error', 'Error cargando escalas'); this.cargandoEscalas.set(false); },
    });
  }

  abrirCrearEscala(): void {
    this.modoEdicionEscala.set(false);
    this.formEscala.reset({ peso: 0, orden: 1 });
    this.mostrarModalEscala.set(true);
  }

  abrirEditarEscala(e: Escala): void {
    this.modoEdicionEscala.set(true);
    this.escalaEditando.set(e);
    this.formEscala.patchValue(e);
    this.mostrarModalEscala.set(true);
  }

  guardarEscala(): void {
    if (this.formEscala.invalid) return;
    const val = this.formEscala.value;
    if (this.modoEdicionEscala() && this.escalaEditando()) {
      this.escalasService.update(this.escalaEditando()!.id, val).subscribe({
        next: () => { this.msg('success', 'Escala actualizada'); this.mostrarModalEscala.set(false); this.cargarEscalas(); },
        error: () => this.msg('error', 'Error actualizando escala'),
      });
    } else {
      this.escalasService.create(val).subscribe({
        next: () => { this.msg('success', 'Escala creada'); this.mostrarModalEscala.set(false); this.cargarEscalas(); },
        error: () => this.msg('error', 'Error creando escala'),
      });
    }
  }

  // ── VERSIONES ──
  onFormatoVersionChange(formatoId: string): void {
    this.formatoVersionSeleccionado.set(formatoId);
    this.versiones.set([]);
    if (formatoId) this.cargarVersiones(formatoId);
  }

  cargarVersiones(formatoId: string): void {
    this.cargandoVersiones.set(true);
    this.formatosService.listVersiones(formatoId).subscribe({
      next: (data) => { this.versiones.set(data); this.cargandoVersiones.set(false); },
      error: () => { this.msg('error', 'Error cargando versiones'); this.cargandoVersiones.set(false); },
    });
  }

  crearVersion(): void {
    const formatoId = this.formatoVersionSeleccionado();
    if (!formatoId) return;
    this.formatosService.crearVersion({ formatoId }).subscribe({
      next: () => { this.msg('success', 'Versión creada'); this.cargarVersiones(formatoId); },
      error: () => this.msg('error', 'Error creando versión'),
    });
  }

  activarVersion(versionId: string): void {
    this.confirmationService.confirm({
      message: '¿Activar esta versión? Esto desactivará las demás versiones del formato.',
      header: 'Confirmar Activación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Activar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.formatosService.activarVersion(versionId).subscribe({
          next: () => {
            this.msg('success', 'Versión activada');
            if (this.formatoVersionSeleccionado()) this.cargarVersiones(this.formatoVersionSeleccionado()!);
          },
          error: () => this.msg('error', 'Error activando versión'),
        });
      },
    });
  }

  eliminarFormato(formato: Formato): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el formato "${formato.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.formatosService.delete(formato.id).subscribe({
          next: () => { this.msg('success', 'Formato eliminado'); this.cargarFormatos(); },
          error: () => this.msg('error', 'Error eliminando formato'),
        });
      },
    });
  }

  private msg(severity: string, detail: string): void {
    this.messageService.add({ severity, summary: severity === 'error' ? 'Error' : 'Éxito', detail });
  }
}
