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
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbSuministroAulaService } from '../../core/services/lb-suministro-aula.service';
import { LbSuministroAlmacenService } from '../../core/services/lb-suministro-almacen.service';
import { LbListaValoresSuministroService } from '../../core/services/lb-lista-valores-suministro.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { LbSuministroAula, LbSuministroAulaPayload } from '../../core/models/lb-suministro-aula.model';
import { LbListaSuministrosAsignadosComponent } from '../lb-lista-suministros-asignados-component/lb-lista-suministros-asignados.component';
import { LbSuministroAlmacen } from '../../core/models/lb-suministro-almacen.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { OraAulas } from '../../core/models/ora-aulas.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-suministro-aula',
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
    InputNumberModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent,
    LbListaSuministrosAsignadosComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-suministro-aula.component.html',
})
export class LbSuministroAulaComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private suministroAulaService = inject(LbSuministroAulaService);
  private suministroAlmacenService = inject(LbSuministroAlmacenService);
  private laboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private oraAulasService = inject(OraAulasService);
  private listaValoresSuministroService = inject(LbListaValoresSuministroService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // Estado principal
  suministrosAula = signal<LbSuministroAula[]>([]);
  suministrosAlmacen = signal<LbSuministroAlmacen[]>([]);
  oraAulasList = signal<OraAulas[]>([]);
  lbAulasPorCodigo = new Map<string, string>(); // codAula → UUID de LbLaboratoriosAulas

  esReactivo = false;
  estadosOpciones = signal<OpcionSelect[]>([]);

  cargando = false;
  cargandoTabla = false;
  cargandoBusqueda = false;

  modoEdicion = false;
  suministroAulaSeleccionado: LbSuministroAula | null = null;

  // Paso 1: selección de suministro de almacén
  busquedaTexto = signal(' ');
  suministroAlmacenSeleccionado: LbSuministroAlmacen | null = null;

  // Selección jerárquica de aulas
  aulaSeleccionadaCodAula = '';
  hijosDeAulaSeleccionada: LbLaboratoriosAulas[] = [];
  hijoSeleccionadoUUID = '';
  lbAulasList: LbLaboratoriosAulas[] = [];
  lbHijosPorPadreId = new Map<string, LbLaboratoriosAulas[]>();

  private static readonly TIPOS_LABORATORIO = ['Laboratorio', 'Laboratorio De Informática'];

  get laboratoriosRaizOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula...', value: '' },
      ...this.oraAulasList()
        .filter(a => LbSuministroAulaComponent.TIPOS_LABORATORIO.includes(a.tipoAula))
        .map(a => ({ label: a.nomAula, value: a.codAula }))
    ];
  }

  get hijosOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula hija...', value: '' },
      ...this.hijosDeAulaSeleccionada.map(a => ({ label: a.nomAula, value: a.id }))
    ];
  }

  async onAulaChange(codAula: string): Promise<void> {
    this.aulaSeleccionadaCodAula = codAula;
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
    this.formSuministroAula.patchValue({ idLaboratorio: '' });
    if (!codAula) return;
    const hijos = this.lbHijosPorPadreId.get(codAula) ?? [];
    if (hijos.length > 0) {
      this.hijosDeAulaSeleccionada = hijos;
    } else {
      try {
        const uuid = await this.resolverUUIDdeAula(codAula);
        this.formSuministroAula.patchValue({ idLaboratorio: uuid });
      } catch {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo resolver el aula seleccionada' });
      }
    }
  }

  onHijoChange(hijoUUID: string): void {
    this.hijoSeleccionadoUUID = hijoUUID;
    this.formSuministroAula.patchValue({ idLaboratorio: hijoUUID });
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

  suministrosAlmacenFiltrados = computed<LbSuministroAlmacen[]>(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    if (!q) return this.suministrosAlmacen();
    return this.suministrosAlmacen().filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.codigo.toLowerCase().includes(q) ||
      s.categoria.toLowerCase().includes(q) ||
      s.undMedida.toLowerCase().includes(q)
    );
  });

  formSuministroAula = this.formBuilder.group({
    cantidad: [1, [Validators.required, Validators.min(1)]],
    cantidadDisponible: [{ value: 1, disabled: true }],
    fechaVencimiento: [null as unknown as Date | null],
    estado: ['activo', [Validators.required, Validators.maxLength(30)]],
    idLaboratorio: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.formSuministroAula.get('cantidad')?.valueChanges.subscribe(val => {
      if (!this.modoEdicion) {
        this.formSuministroAula.get('cantidadDisponible')?.setValue(val ?? 1, { emitEvent: false });
      }
    });

    this.listaValoresSuministroService.obtenerHijosPorNombrePadre('ESTADOS_SUMINISTRO').subscribe(lista => {
      this.estadosOpciones.set(lista.map(e => ({ label: e.nombre, value: e.nombre })));
    });

    Promise.allSettled([
      this.cargarSuministrosAula(),
      this.cargarSuministrosAlmacen(),
      this.cargarAulas(),
    ]);
  }

  async cargarSuministrosAula(): Promise<void> {
    this.cargandoTabla = true;
    try {
      const lista = await this.suministroAulaService.getAll().toPromise();
      this.suministrosAula.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los suministros de aula' });
    } finally {
      this.cargandoTabla = false;
    }
  }

  private async cargarSuministrosAlmacen(): Promise<void> {
    try {
      const lista = await this.suministroAlmacenService.getAll().toPromise();
      this.suministrosAlmacen.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se pudieron cargar los suministros de almacén' });
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
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se pudieron cargar las aulas' });
    }
  }

  seleccionarSuministroAlmacen(suministro: LbSuministroAlmacen): void {
    this.suministroAlmacenSeleccionado = suministro;
    this.formSuministroAula.patchValue({ cantidad: 1 });
    this.formSuministroAula.get('cantidadDisponible')?.setValue(1, { emitEvent: false });
  }

  cancelarSeleccion(): void {
    this.suministroAlmacenSeleccionado = null;
    this.limpiarFormulario();
  }

  async registrar(): Promise<void> {
    if (!this.suministroAlmacenSeleccionado) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Seleccione primero un suministro del almacén' });
      return;
    }
    if (this.formSuministroAula.invalid) {
      this.formSuministroAula.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formSuministroAula.getRawValue();
      const payload: LbSuministroAulaPayload = {
        cantidad: v.cantidad ?? 1,
        cantidadDisponible: v.cantidadDisponible ?? 1,
        fechaVencimiento: (this.esReactivo && v.fechaVencimiento) ? this.convertirFechaAISO(v.fechaVencimiento) : null,
        tipo: this.esReactivo ? 'Reactivo' : undefined,
        estado: v.estado || 'activo',
      };

      const idLaboratorio = v.idLaboratorio || '';

      if (this.modoEdicion && this.suministroAulaSeleccionado) {
        await this.suministroAulaService
          .update(this.suministroAulaSeleccionado.id, this.suministroAlmacenSeleccionado.id, idLaboratorio, payload)
          .toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Suministro de aula actualizado correctamente' });
      } else {
        await this.suministroAulaService
          .create(this.suministroAlmacenSeleccionado.id, idLaboratorio, payload)
          .toPromise();
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Suministro asignado al aula correctamente' });
      }

      this.limpiarFormulario();
      await this.cargarSuministrosAula();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la asignación' });
    } finally {
      this.cargando = false;
    }
  }

  editar(item: LbSuministroAula): void {
    this.modoEdicion = true;
    this.suministroAulaSeleccionado = item;
    this.suministroAlmacenSeleccionado = item.suministroAlmacen;

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

    this.esReactivo = item.tipo === 'Reactivo';
    this.formSuministroAula.patchValue({
      cantidad: item.cantidad,
      fechaVencimiento: item.fechaVencimiento ? this.parsearFechaLocal(item.fechaVencimiento) as Date : null,
      estado: item.estado || 'activo',
      idLaboratorio: lab?.id || '',
    });
    this.formSuministroAula.get('cantidadDisponible')?.setValue(item.cantidadDisponible, { emitEvent: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Dialog devolver
  mostrarDialogDevolver = false;
  itemParaDevolver: LbSuministroAula | null = null;
  cantidadADevolver = 1;

  confirmarDevolver(item: LbSuministroAula): void {
    this.itemParaDevolver = item;
    this.cantidadADevolver = 1;
    this.mostrarDialogDevolver = true;
  }

  async ejecutarDevolver(): Promise<void> {
    if (!this.itemParaDevolver) return;
    const id = this.itemParaDevolver.id;
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

  limpiarFormulario(): void {
    this.formSuministroAula.reset({
      cantidad: 1, fechaVencimiento: null,
      estado: 'activo', idLaboratorio: '',
    });
    this.formSuministroAula.get('cantidadDisponible')?.setValue(1, { emitEvent: false });
    this.esReactivo = false;
    this.formSuministroAula.markAsUntouched();
    this.modoEdicion = false;
    this.suministroAulaSeleccionado = null;
    this.suministroAlmacenSeleccionado = null;
    this.aulaSeleccionadaCodAula = '';
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
  }

  esInvalido(campo: string): boolean {
    const control = this.formSuministroAula.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formSuministroAula.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
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
      const y = fecha.getFullYear();
      const mo = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    } catch {
      return '';
    }
  }
}
