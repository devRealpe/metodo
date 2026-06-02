import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbSuministroAulaService } from '../../core/services/lb-suministro-aula.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { LbListaValoresSuministroService } from '../../core/services/lb-lista-valores-suministro.service';
import { LbSuministroAula, LbSuministroAulaPayload } from '../../core/models/lb-suministro-aula.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { OraAulas } from '../../core/models/ora-aulas.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-lista-suministros-asignados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ProgressSpinnerModule,
    InputNumberModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-lista-suministros-asignados.component.html',
})
export class LbListaSuministrosAsignadosComponent implements OnInit {

  private formBuilder              = inject(FormBuilder);
  private suministroAulaService    = inject(LbSuministroAulaService);
  private laboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private oraAulasService          = inject(OraAulasService);
  private listaValoresSuministroService = inject(LbListaValoresSuministroService);
  private confirmationService      = inject(ConfirmationService);
  private messageService           = inject(MessageService);

  suministrosAula  = signal<LbSuministroAula[]>([]);
  oraAulasList     = signal<OraAulas[]>([]);
  estadosOpciones  = signal<OpcionSelect[]>([]);

  cargando         = false;
  guardandoEdicion = false;
  mostrarModal     = false;
  filter           = true;
  itemSeleccionado: LbSuministroAula | null = null;

  // Datos de aulas para el modal
  lbAulasPorCodigo    = new Map<string, string>();
  lbAulasList: LbLaboratoriosAulas[] = [];
  lbHijosPorPadreId   = new Map<string, LbLaboratoriosAulas[]>();

  // Estado del selector jerárquico en el modal
  aulaSeleccionadaCodAula = '';
  hijosDeAulaSeleccionada: LbLaboratoriosAulas[] = [];
  hijoSeleccionadoUUID    = '';

  // Campo reactivo fuera del FormGroup (igual que en suministro-aula)
  esReactivo = false;

  // Filtros
  filtroTexto   = '';
  filtroAulaId  = '';
  filtroEstado  = '';

  private static readonly TIPOS_LABORATORIO = ['Laboratorio', 'Laboratorio De Informática'];

  get laboratoriosRaizOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula...', value: '' },
      ...this.oraAulasList()
        .filter(a => LbListaSuministrosAsignadosComponent.TIPOS_LABORATORIO.includes(a.tipoAula))
        .map(a => ({ label: a.nomAula, value: a.codAula })),
    ];
  }

  get hijosOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula hija...', value: '' },
      ...this.hijosDeAulaSeleccionada.map(a => ({ label: a.nomAula, value: a.id })),
    ];
  }

  aulaOpciones = computed<OpcionSelect[]>(() => {
    const vistos = new Set<string>();
    const opciones: OpcionSelect[] = [{ label: 'Todas las aulas', value: '' }];
    for (const item of this.suministrosAula()) {
      const id  = item.laboratorio?.id;
      const nom = item.laboratorio?.nomAula;
      if (id && nom && !vistos.has(id)) {
        vistos.add(id);
        opciones.push({ label: nom, value: id });
      }
    }
    return opciones.sort((a, b) => a.label.localeCompare(b.label));
  });

  estadosFiltroOpciones = computed<OpcionSelect[]>(() => {
    return [
      { label: 'Todos los estados', value: '' },
      ...this.estadosOpciones(),
    ];
  });

  get suministrosFiltrados(): LbSuministroAula[] {
    let lista = this.suministrosAula();
    if (this.filtroTexto) {
      const q = this.filtroTexto.toLowerCase().trim();
      lista = lista.filter(a =>
        (a.suministroAlmacen?.nombre ?? '').toLowerCase().includes(q) ||
        (a.suministroAlmacen?.categoria ?? '').toLowerCase().includes(q) ||
        (a.suministroAlmacen?.codigo ?? '').toLowerCase().includes(q)
      );
    }
    if (this.filtroAulaId)
      lista = lista.filter(a => a.laboratorio?.id === this.filtroAulaId);
    if (this.filtroEstado)
      lista = lista.filter(a => a.estado === this.filtroEstado);
    return lista;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroTexto || this.filtroAulaId || this.filtroEstado);
  }

  formularioEdicion = this.formBuilder.group({
    cantidad:          [1, [Validators.required, Validators.min(1)]],
    cantidadDisponible: [{ value: 1, disabled: true }],
    fechaVencimiento:  [null as unknown as Date | null],
    estado:            ['activo', [Validators.required, Validators.maxLength(30)]],
    idLaboratorio:     ['', [Validators.required]],
  });

  // Dialog devolver
  mostrarDialogDevolver = false;
  itemParaDevolver: LbSuministroAula | null = null;
  cantidadADevolver = 1;

  ngOnInit(): void {
    this.listaValoresSuministroService.obtenerHijosPorNombrePadre('ESTADOS_SUMINISTRO').subscribe(lista => {
      this.estadosOpciones.set(lista.map(e => ({ label: e.nombre, value: e.nombre })));
    });

    Promise.allSettled([
      this.cargarSuministrosAula(),
      this.cargarAulas(),
    ]);
  }

  async cargarSuministrosAula(): Promise<void> {
    this.cargando = true;
    try {
      const lista = await this.suministroAulaService.getAll().toPromise();
      this.suministrosAula.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los suministros asignados' });
    } finally {
      this.cargando = false;
    }
  }

  private async cargarAulas(): Promise<void> {
    try {
      const [oraResult, lbResult] = await Promise.allSettled([
        this.oraAulasService.getAll().toPromise(),
        this.laboratoriosAulasService.getAll().toPromise(),
      ]);
      const oraLista: OraAulas[] = oraResult.status === 'fulfilled' && Array.isArray(oraResult.value) ? oraResult.value : [];
      const lbLista: LbLaboratoriosAulas[] = lbResult.status === 'fulfilled' && Array.isArray(lbResult.value) ? lbResult.value : [];
      this.oraAulasList.set(oraLista);
      this.lbAulasList = lbLista;
      this.lbAulasPorCodigo = new Map(lbLista.map(a => [a.codAula, a.id]));
      this.lbHijosPorPadreId = new Map();
      lbLista.filter(a => a.idPadre).forEach(a => {
        const parentId = a.idPadre as string;
        if (!this.lbHijosPorPadreId.has(parentId)) this.lbHijosPorPadreId.set(parentId, []);
        (this.lbHijosPorPadreId.get(parentId) as LbLaboratoriosAulas[]).push(a);
      });
    } catch { /* silencioso */ }
  }

  // ─── Selector de aula en modal ────────────────────────────────────────────

  async onAulaChange(codAula: string): Promise<void> {
    this.aulaSeleccionadaCodAula = codAula;
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
    this.formularioEdicion.patchValue({ idLaboratorio: '' });
    if (!codAula) return;
    const hijos = this.lbHijosPorPadreId.get(codAula) ?? [];
    if (hijos.length > 0) {
      this.hijosDeAulaSeleccionada = hijos;
    } else {
      try {
        const uuid = await this.resolverUUIDdeAula(codAula);
        this.formularioEdicion.patchValue({ idLaboratorio: uuid });
      } catch {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo resolver el aula seleccionada' });
      }
    }
  }

  onHijoChange(hijoUUID: string): void {
    this.hijoSeleccionadoUUID = hijoUUID;
    this.formularioEdicion.patchValue({ idLaboratorio: hijoUUID });
  }

  private async resolverUUIDdeAula(codAula: string): Promise<string> {
    if (this.lbAulasPorCodigo.has(codAula)) {
      return this.lbAulasPorCodigo.get(codAula) as string;
    }
    const oraAula = this.oraAulasList().find(a => a.codAula === codAula);
    if (!oraAula) throw new Error('Aula no encontrada en Oracle');
    const resultado = await this.laboratoriosAulasService.findOrCreate({
      codAula: oraAula.codAula,
      nomAula: oraAula.nomAula,
      codBloque: oraAula.codBloque,
      nomBloque: oraAula.nomBloque,
      tipoAula: oraAula.tipoAula,
      numCapacidad: oraAula.numCapacidad,
      idPadre: null,
    }).toPromise();
    if (!resultado) throw new Error('Error resolviendo aula en BD local');
    this.lbAulasPorCodigo.set(resultado.codAula, resultado.id);
    this.lbAulasList = [...this.lbAulasList.filter(a => a.codAula !== resultado.codAula), resultado];
    return resultado.id;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  abrirEdicion(item: LbSuministroAula): void {
    this.itemSeleccionado = item;
    this.esReactivo = item.tipo === 'Reactivo';
    const lab = item.laboratorio;
    if (lab) {
      if (lab.idPadre) {
        this.aulaSeleccionadaCodAula = lab.idPadre as string;
        this.hijosDeAulaSeleccionada = this.lbHijosPorPadreId.get(lab.idPadre as string) ?? [];
        this.hijoSeleccionadoUUID = lab.id;
      } else {
        this.aulaSeleccionadaCodAula = lab.codAula;
        this.hijosDeAulaSeleccionada = [];
        this.hijoSeleccionadoUUID = '';
      }
    }
    this.formularioEdicion.patchValue({
      cantidad:         item.cantidad,
      fechaVencimiento: item.fechaVencimiento ? this.parsearFechaLocal(item.fechaVencimiento) as Date : null,
      estado:           item.estado || 'activo',
      idLaboratorio:    lab?.id || '',
    });
    this.formularioEdicion.get('cantidadDisponible')?.setValue(item.cantidadDisponible, { emitEvent: false });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.itemSeleccionado = null;
    this.esReactivo = false;
    this.formularioEdicion.reset({ cantidad: 1, fechaVencimiento: null, estado: 'activo', idLaboratorio: '' });
    this.formularioEdicion.get('cantidadDisponible')?.setValue(1, { emitEvent: false });
    this.aulaSeleccionadaCodAula = '';
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.itemSeleccionado) return;
    this.guardandoEdicion = true;
    try {
      const v = this.formularioEdicion.getRawValue();
      const payload: LbSuministroAulaPayload = {
        cantidad:           v.cantidad ?? 1,
        cantidadDisponible: v.cantidadDisponible ?? 1,
        fechaVencimiento:   (this.esReactivo && v.fechaVencimiento) ? this.convertirFechaAISO(v.fechaVencimiento) : null,
        tipo:               this.esReactivo ? 'Reactivo' : undefined,
        estado:             v.estado || 'activo',
      };
      const idLaboratorio = v.idLaboratorio ?? '';
      await this.suministroAulaService
        .update(this.itemSeleccionado.id, this.itemSeleccionado.suministroAlmacen.id, idLaboratorio, payload)
        .toPromise();
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Asignación actualizada correctamente' });
      this.cerrarModal();
      await this.cargarSuministrosAula();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo actualizar la asignación' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  confirmarEliminar(item: LbSuministroAula): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la asignación del suministro "${item.suministroAlmacen?.nombre}" del aula "${item.laboratorio?.nomAula}"? Se devolverán ${item.cantidad} unidad(es) al almacén.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(item.id),
    });
  }

  confirmarDevolver(item: LbSuministroAula): void {
    this.itemParaDevolver = item;
    this.cantidadADevolver = 1;
    this.mostrarDialogDevolver = true;
  }

  async ejecutarDevolver(): Promise<void> {
    if (!this.itemParaDevolver) return;
    const id    = this.itemParaDevolver.id;
    const delta = this.cantidadADevolver;
    this.mostrarDialogDevolver = false;
    this.itemParaDevolver = null;
    try {
      await this.suministroAulaService.devolver(id, delta).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Devuelto', detail: `${delta} unidad(es) devuelta(s) al almacén correctamente` });
      await this.cargarSuministrosAula();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo devolver el suministro al almacén' });
    }
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.suministroAulaService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Asignación eliminada correctamente' });
      await this.cargarSuministrosAula();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la asignación' });
    }
  }

  limpiarFiltros(): void {
    this.filtroTexto  = '';
    this.filtroAulaId = '';
    this.filtroEstado = '';
  }

  esInvalido(campo: string): boolean {
    const control = this.formularioEdicion.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private parsearFechaLocal(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const s = String(fecha).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private convertirFechaAISO(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';
    try {
      if (typeof fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
        fecha = new Date(fecha);
      }
      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';
      const y  = fecha.getFullYear();
      const mo = String(fecha.getMonth() + 1).padStart(2, '0');
      const d  = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    } catch {
      return '';
    }
  }
}
