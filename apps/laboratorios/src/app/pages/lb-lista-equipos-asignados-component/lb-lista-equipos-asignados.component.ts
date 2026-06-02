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
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbEquipoAula, LbEquipoAulaPayload } from '../../core/models/lb-equipo-aula.model';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { OraAulas } from '../../core/models/ora-aulas.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-lista-equipos-asignados',
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
    InputComponent,
    SelectComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-lista-equipos-asignados.component.html',
})
export class LbListaEquiposAsignadosComponent implements OnInit {

  private formBuilder             = inject(FormBuilder);
  private equipoAulaService       = inject(LbEquipoAulaService);
  private equipoAlmacenService    = inject(LbEquipoAlmacenService);
  private laboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private oraAulasService         = inject(OraAulasService);
  private usuariosOracleService   = inject(UsuariosOracleService);
  private confirmationService     = inject(ConfirmationService);
  private messageService          = inject(MessageService);

  equiposAula      = signal<LbEquipoAula[]>([]);
  equiposAlmacen   = signal<LbEquipoAlmacen[]>([]);
  oraAulasList     = signal<OraAulas[]>([]);
  laboratoristasOpciones = signal<OpcionSelect[]>([]);

  cargando         = false;
  guardandoEdicion = false;
  mostrarModal     = false;
  filter           = true;
  itemSeleccionado: LbEquipoAula | null = null;

  // Datos de aulas para el modal
  lbAulasPorCodigo    = new Map<string, string>();
  lbAulasList: LbLaboratoriosAulas[] = [];
  lbHijosPorPadreId   = new Map<string, LbLaboratoriosAulas[]>();

  // Estado del selector jerárquico en el modal
  aulaSeleccionadaCodAula = '';
  hijosDeAulaSeleccionada: LbLaboratoriosAulas[] = [];
  hijoSeleccionadoUUID    = '';

  // Filtros
  filtroPlaca           = '';
  filtroAulaId          = '';
  filtroResponsableVal  = '';
  filtroTipo            = '';

  private static readonly TIPOS_LABORATORIO = ['Laboratorio', 'Laboratorio De Informática'];

  get laboratoriosRaizOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula...', value: '' },
      ...this.oraAulasList()
        .filter(a => LbListaEquiposAsignadosComponent.TIPOS_LABORATORIO.includes(a.tipoAula))
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
    for (const item of this.equiposAula()) {
      const id  = item.laboratorio?.id;
      const nom = item.laboratorio?.nomAula;
      if (id && nom && !vistos.has(id)) {
        vistos.add(id);
        opciones.push({ label: nom, value: id });
      }
    }
    return opciones.sort((a, b) => a.label.localeCompare(b.label));
  });

  responsableOpciones = computed<OpcionSelect[]>(() => {
    const vistos = new Set<string>();
    const opciones: OpcionSelect[] = [{ label: 'Todos los responsables', value: '' }];
    for (const item of this.equiposAula()) {
      const r = item.responsable;
      if (r && !vistos.has(r)) {
        vistos.add(r);
        opciones.push({ label: r, value: r });
      }
    }
    return opciones.sort((a, b) => a.label.localeCompare(b.label));
  });

  tipoOpciones = computed<OpcionSelect[]>(() => {
    const vistos = new Set<string>();
    const opciones: OpcionSelect[] = [{ label: 'Todos los tipos', value: '' }];
    for (const e of this.equiposAlmacen()) {
      if (e.tipo && !vistos.has(e.tipo)) {
        vistos.add(e.tipo);
        opciones.push({ label: e.tipo, value: e.tipo });
      }
    }
    return opciones.sort((a, b) => a.label.localeCompare(b.label));
  });

  get equiposFiltrados(): LbEquipoAula[] {
    let lista = this.equiposAula();
    if (this.filtroPlaca)
      lista = lista.filter(a =>
        (a.equipoUnidad?.placa ?? '').toLowerCase().includes(this.filtroPlaca.toLowerCase().trim())
      );
    if (this.filtroAulaId)
      lista = lista.filter(a => a.laboratorio?.id === this.filtroAulaId);
    if (this.filtroResponsableVal)
      lista = lista.filter(a => a.responsable === this.filtroResponsableVal);
    if (this.filtroTipo)
      lista = lista.filter(a => a.equipoAlmacen?.tipo === this.filtroTipo);
    return lista;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroPlaca || this.filtroAulaId || this.filtroResponsableVal || this.filtroTipo);
  }

  formularioEdicion = this.formBuilder.group({
    responsable:   ['', [Validators.maxLength(150)]],
    idLaboratorio: ['', [Validators.required]],
  });

  ngOnInit(): void {
    Promise.allSettled([
      this.cargarEquiposAula(),
      this.cargarEquiposAlmacen(),
      this.cargarAulas(),
      this.cargarLaboratoristas(),
    ]);
  }

  async cargarEquiposAula(): Promise<void> {
    this.cargando = true;
    try {
      const lista = await this.equipoAulaService.getAll().toPromise();
      this.equiposAula.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos asignados' });
    } finally {
      this.cargando = false;
    }
  }

  private async cargarEquiposAlmacen(): Promise<void> {
    try {
      const lista = await this.equipoAlmacenService.getAll().toPromise();
      this.equiposAlmacen.set(Array.isArray(lista) ? lista : []);
    } catch { /* silencioso */ }
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

  private async cargarLaboratoristas(): Promise<void> {
    try {
      const lista = await this.usuariosOracleService.getByCargo('LABORATORISTA').toPromise();
      const opciones: OpcionSelect[] = [
        { label: 'Sin responsable', value: '' },
        ...((Array.isArray(lista) ? lista : []) as UsuarioOracle[]).map(u => ({ label: u.nombre, value: u.nombre })),
      ];
      this.laboratoristasOpciones.set(opciones);
    } catch { /* silencioso */ }
  }

  // ─── Aula selection logic ────────────────────────────────────────────────────

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

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  abrirEdicion(item: LbEquipoAula): void {
    this.itemSeleccionado = item;
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
      responsable:   item.responsable || '',
      idLaboratorio: lab?.id || '',
    });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.itemSeleccionado = null;
    this.formularioEdicion.reset({ responsable: '', idLaboratorio: '' });
    this.aulaSeleccionadaCodAula = '';
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.itemSeleccionado) return;
    this.guardandoEdicion = true;
    try {
      const v = this.formularioEdicion.value;
      const idLaboratorio = v.idLaboratorio ?? '';
      const payload: LbEquipoAulaPayload = { responsable: v.responsable || undefined };
      await this.equipoAulaService
        .update(this.itemSeleccionado.id, idLaboratorio, this.itemSeleccionado.equipoUnidad?.id ?? '', payload)
        .toPromise();
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Asignación actualizada correctamente' });
      this.cerrarModal();
      await this.cargarEquiposAula();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo actualizar la asignación' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  confirmarEliminar(item: LbEquipoAula): void {
    const placa = item.equipoUnidad?.placa || item.equipoUnidad?.serial || item.equipoUnidad?.id?.substring(0, 8);
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la asignación del equipo "${item.equipoAlmacen?.nombre}" (${placa}) del aula "${item.laboratorio?.nomAula}"? La unidad volverá a estado disponible.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(item.id),
    });
  }

  confirmarDevolver(item: LbEquipoAula): void {
    const placa = item.equipoUnidad?.placa || item.equipoUnidad?.serial || item.equipoUnidad?.id?.substring(0, 8);
    this.confirmationService.confirm({
      message: `¿Devolver la unidad "${placa}" del equipo "${item.equipoAlmacen?.nombre}" al almacén? Quedará disponible para nuevas asignaciones.`,
      header: 'Devolver al almacén',
      icon: 'pi pi-undo',
      acceptLabel: 'Sí, devolver',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(item.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.equipoAulaService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Asignación eliminada y unidad liberada correctamente' });
      await this.cargarEquiposAula();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la asignación' });
    }
  }

  limpiarFiltros(): void {
    this.filtroPlaca          = '';
    this.filtroAulaId         = '';
    this.filtroResponsableVal = '';
    this.filtroTipo           = '';
  }

  esInvalido(campo: string): boolean {
    const control = this.formularioEdicion.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
