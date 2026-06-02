import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbEquipoUnidadService } from '../../core/services/lb-equipo-unidad.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbEquipoAula, LbEquipoAulaPayload } from '../../core/models/lb-equipo-aula.model';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbEquipoUnidad } from '../../core/models/lb-equipo-unidad.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { OraAulas } from '../../core/models/ora-aulas.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-equipo-aula.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    TooltipModule,
    DialogModule,
    InputNumberModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-equipo-aula.component.html',
})
export class LbEquipoAulaComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private equipoAulaService = inject(LbEquipoAulaService);
  private equipoAlmacenService = inject(LbEquipoAlmacenService);
  private equipoUnidadService = inject(LbEquipoUnidadService);
  private laboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private oraAulasService = inject(OraAulasService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private messageService = inject(MessageService);

  // Estado principal
  equiposAlmacen = signal<LbEquipoAlmacen[]>([]);
  oraAulasList = signal<OraAulas[]>([]);
  lbAulasPorCodigo = new Map<string, string>();
  laboratoristasOpciones = signal<OpcionSelect[]>([]);

  cargando = false;
  cargandoBusqueda = false;

  modoEdicion = false;
  equipoAulaSeleccionado: LbEquipoAula | null = null;

  // Estado del diálogo de devolución
  mostrarDialogDevolver = false;
  itemParaDevolver: LbEquipoAula | null = null;
  cantidadADevolver = 1;

  // Paso 1: selecciÃ³n de equipo de almacÃ©n
  busquedaTexto = signal('');
  equipoAlmacenSeleccionado: LbEquipoAlmacen | null = null;

  // Unidades disponibles del modelo seleccionado
  unidadesDisponibles = signal<LbEquipoUnidad[]>([]);
  unidadesSeleccionadas: LbEquipoUnidad[] = [];
  cargandoUnidades = false;

  // Selección jerárquica de aula
  aulaSeleccionadaCodAula = '';
  hijosDeAulaSeleccionada: LbLaboratoriosAulas[] = [];
  hijoSeleccionadoUUID = '';
  lbAulasList: LbLaboratoriosAulas[] = [];
  lbHijosPorPadreId = new Map<string, LbLaboratoriosAulas[]>();

  private static readonly TIPOS_LABORATORIO = ['Laboratorio', 'Laboratorio De InformÃ¡tica'];

  get laboratoriosRaizOpciones(): OpcionSelect[] {
    return [
      { label: 'Seleccionar aula...', value: '' },
      ...this.oraAulasList()
        .filter(a => LbEquipoAulaComponent.TIPOS_LABORATORIO.includes(a.tipoAula))
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
    this.formEquipoAula.patchValue({ idLaboratorio: '' });
    if (!codAula) return;
    const hijos = this.lbHijosPorPadreId.get(codAula) ?? [];
    if (hijos.length > 0) {
      this.hijosDeAulaSeleccionada = hijos;
    } else {
      try {
        const uuid = await this.resolverUUIDdeAula(codAula);
        this.formEquipoAula.patchValue({ idLaboratorio: uuid });
      } catch {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo resolver el aula seleccionada' });
      }
    }
  }

  onHijoChange(hijoUUID: string): void {
    this.hijoSeleccionadoUUID = hijoUUID;
    this.formEquipoAula.patchValue({ idLaboratorio: hijoUUID });
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

  equiposAlmacenFiltrados = computed<LbEquipoAlmacen[]>(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    if (!q) return this.equiposAlmacen();
    return this.equiposAlmacen().filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q) ||
      (e.marca || '').toLowerCase().includes(q) ||
      (e.modelo || '').toLowerCase().includes(q)
    );
  });

  formEquipoAula = this.formBuilder.group({
    responsable: ['', [Validators.maxLength(150)]],
    idLaboratorio: ['', [Validators.required]],
  });

  ngOnInit(): void {
    Promise.allSettled([
      this.cargarEquiposAlmacen(),
      this.cargarAulas(),
      this.cargarLaboratoristas(),
    ]);
  }

  private async cargarLaboratoristas(): Promise<void> {
    try {
      const lista = await this.usuariosOracleService.getByCargo('LABORATORISTA').toPromise();
      const opciones: OpcionSelect[] = [
        { label: 'Seleccionar responsable...', value: '' },
        ...((Array.isArray(lista) ? lista : []) as UsuarioOracle[]).map(u => ({ label: u.nombre, value: u.nombre }))
      ];
      this.laboratoristasOpciones.set(opciones);
    } catch { /* silencioso */ }
  }

  private async cargarEquiposAlmacen(): Promise<void> {
    try {
      const lista = await this.equipoAlmacenService.getAll().toPromise();
      this.equiposAlmacen.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se pudieron cargar los equipos de almacÃ©n' });
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

  async seleccionarEquipoAlmacen(equipo: LbEquipoAlmacen): Promise<void> {
    this.equipoAlmacenSeleccionado = equipo;
    this.unidadesSeleccionadas = [];
    this.unidadesDisponibles.set([]);
    this.cargandoUnidades = true;
    try {
      const todas = await this.equipoUnidadService.getByAlmacen(equipo.id).toPromise();
      const disponibles = (Array.isArray(todas) ? todas : []).filter(u => u.estado === 'disponible');
      this.unidadesDisponibles.set(disponibles);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se pudieron cargar las unidades disponibles' });
    } finally {
      this.cargandoUnidades = false;
    }
  }

  toggleUnidad(unidad: LbEquipoUnidad): void {
    const idx = this.unidadesSeleccionadas.findIndex(u => u.id === unidad.id);
    if (idx >= 0) {
      this.unidadesSeleccionadas = this.unidadesSeleccionadas.filter(u => u.id !== unidad.id);
    } else {
      this.unidadesSeleccionadas = [...this.unidadesSeleccionadas, unidad];
    }
  }

  estaSeleccionada(unidad: LbEquipoUnidad): boolean {
    return this.unidadesSeleccionadas.some(u => u.id === unidad.id);
  }

  cancelarSeleccion(): void {
    this.equipoAlmacenSeleccionado = null;
    this.limpiarFormulario();
  }

  async registrar(): Promise<void> {
    if (!this.equipoAlmacenSeleccionado) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Seleccione primero un equipo del almacÃ©n' });
      return;
    }
    if (this.formEquipoAula.invalid) {
      this.formEquipoAula.markAllAsTouched();
      return;
    }

    const idLaboratorio = this.formEquipoAula.value.idLaboratorio || '';

    if (this.modoEdicion && this.equipoAulaSeleccionado) {
      const unidadId = this.equipoAulaSeleccionado.equipoUnidad?.id ?? '';
      this.cargando = true;
      try {
        const payload: LbEquipoAulaPayload = { responsable: this.formEquipoAula.value.responsable || undefined };
        await this.equipoAulaService.update(this.equipoAulaSeleccionado.id, idLaboratorio, unidadId, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'AsignaciÃ³n actualizada correctamente' });
        this.limpiarFormulario();
        await this.cargarEquiposAlmacen();
      } catch (err: unknown) {
        const serverMsg = (err as { error?: { error?: string } })?.error?.error;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo actualizar la asignaciÃ³n' });
      } finally {
        this.cargando = false;
      }
      return;
    }

    if (this.unidadesSeleccionadas.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Seleccione al menos una unidad de la lista' });
      return;
    }

    this.cargando = true;
    let exitosos = 0;
    let fallidos = 0;
    const payload: LbEquipoAulaPayload = { responsable: this.formEquipoAula.value.responsable || undefined };

    for (const unidad of this.unidadesSeleccionadas) {
      try {
        await this.equipoAulaService
          .create(this.equipoAlmacenSeleccionado.id, idLaboratorio, unidad.id, payload)
          .toPromise();
        exitosos++;
      } catch (err: unknown) {
        const serverMsg = (err as { error?: { error?: string } })?.error?.error;
        this.messageService.add({
          severity: 'error', summary: `Unidad ${unidad.placa || unidad.serial || unidad.id.substring(0, 8)}`,
          detail: serverMsg || 'No se pudo asignar'
        });
        fallidos++;
      }
    }

    this.cargando = false;
    if (exitosos > 0) {
      this.messageService.add({
        severity: 'success', summary: 'Registrado',
        detail: `${exitosos} unidad(es) asignada(s) correctamente` + (fallidos > 0 ? `, ${fallidos} con error` : '')
      });
    }
    this.limpiarFormulario();
    await this.cargarEquiposAlmacen();
  }

  limpiarFormulario(): void {
    this.formEquipoAula.reset({ responsable: '', idLaboratorio: '' });
    this.formEquipoAula.markAsUntouched();
    this.modoEdicion = false;
    this.equipoAulaSeleccionado = null;
    this.equipoAlmacenSeleccionado = null;
    this.unidadesDisponibles.set([]);
    this.unidadesSeleccionadas = [];
    this.aulaSeleccionadaCodAula = '';
    this.hijosDeAulaSeleccionada = [];
    this.hijoSeleccionadoUUID = '';
  }

  esInvalido(campo: string): boolean {
    const control = this.formEquipoAula.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  abrirDialogDevolver(item: LbEquipoAula): void {
    this.itemParaDevolver = item;
    this.cantidadADevolver = 1;
    this.mostrarDialogDevolver = true;
  }

  async confirmarDevolucion(): Promise<void> {
    if (!this.itemParaDevolver) return;
    this.cargando = true;
    try {
      await this.equipoAulaService.devolver(this.itemParaDevolver.id, this.cantidadADevolver).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Devuelto', detail: `${this.cantidadADevolver} unidad(es) devuelta(s) al almacén` });
      this.mostrarDialogDevolver = false;
      this.itemParaDevolver = null;
      await this.cargarEquiposAlmacen();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo devolver el equipo' });
    } finally {
      this.cargando = false;
    }
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formEquipoAula.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }
}
