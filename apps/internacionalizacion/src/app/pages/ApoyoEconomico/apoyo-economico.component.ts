import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, Output, EventEmitter, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, FormControl } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ApoyoEconomicoService } from '../../core/services/apoyo-economico.service';
import { ApoyoEconomico, TipoApoyoEconomico, ApoyoEconomicoList, ApoyoEconomicoCreation } from '../../core/models/apoyo-economico.model';
import { FormUtilsService } from '../../core/services/form-utils.service';
import { CentrosCostoOracleService, CentroCostoOracle } from '../../core/services/centros-costo-oracle.service';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { NotificationService } from '@microfrontends/shared-services';
import { InfoTableComponent, TableColumn, TableAction, InputComponent, TextareaComponent, SelectComponent, MultiselectComponent } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-apoyo-economico',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    ToastModule,
    DialogModule,
    TooltipModule,
    AutoCompleteModule,
    InfoTableComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
    MultiselectComponent
  ],
  templateUrl: './apoyo-economico.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApoyoEconomicoComponent implements OnInit, OnChanges {
  @Input({ required: true }) movilidadId!: string;
  @Input() readonly: boolean = false;
  @Input() isEditMode: boolean = false;
  @Output() onSaved = new EventEmitter<ApoyoEconomico[]>();
  @Output() onChanged = new EventEmitter<ApoyoEconomico[]>();
  @Output() onError = new EventEmitter<string>();

  private readonly fb = inject(FormBuilder);
  readonly service = inject(ApoyoEconomicoService);
  private readonly notificationService = inject(NotificationService);
  private readonly formUtils = inject(FormUtilsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly centrosCostoService = inject(CentrosCostoOracleService);

  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);

  centrosCostoSugerencias = signal<CentroCostoOracle[]>([]);

  apoyosEconomicos = signal<ApoyoEconomico[]>([]);
  tiposApoyoDisponibles = signal<TipoApoyoEconomico[]>([]);
  todosLosTiposApoyo = signal<TipoApoyoEconomico[]>([]);

  // Estado temporal para cambios pendientes
  private cambiosPendientes: {
    crear: ApoyoEconomicoCreation[],
    actualizar: { id: string, data: any }[],
    eliminar: string[]
  } = { crear: [], actualizar: [], eliminar: [] };

  // Estado para el área principal (lista vs formulario)
  mainAreaMode = signal<'list' | 'create_apoyo' | 'edit_apoyo'>('list');

  // Estado para el diálogo de tipos
  tiposDialogVisible = signal<boolean>(false);
  editTipoMode = signal<boolean>(false);
  dialogTiposTitle = signal<string>('Tipo de Apoyo Económico');

  showDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  dialogTitle = signal<string>('Agregar Apoyo Económico');
  apoyoSeleccionado: ApoyoEconomico | null = null;

  showTiposDialog = signal<boolean>(false);
  tipoSeleccionado: TipoApoyoEconomico | null = null;

  showNuevoTipoForm = signal<boolean>(false);

  form: FormGroup = this.service.buildForm();
  tipoForm: FormGroup = this.service.buildTipoApoyoForm();

  tiposSeleccionados = signal<TipoApoyoEconomico[]>([]);
  centrosCostos = signal<FormControl[]>([]);
  descripciones = signal<FormControl[]>([]);

  onTiposChange(event: any): void {
    const selectedIds = event.value || [];
    const tipos = this.tiposApoyoDisponibles().filter((tipo: TipoApoyoEconomico) => selectedIds.includes(tipo.id));
    this.tiposSeleccionados.set(tipos);

    // Sync form control so validation passes
    this.form.get('tipoApoyoIds')?.setValue(selectedIds);

    // Crear controles dinámicos para centros de costos y descripciones
    const centrosControls: FormControl[] = [];
    const descripcionControls: FormControl[] = [];

    tipos.forEach((tipo: TipoApoyoEconomico, index: number) => {
      centrosControls.push(new FormControl('', [Validators.maxLength(100)]));
      descripcionControls.push(new FormControl('', [Validators.maxLength(500)]));
    });

    this.centrosCostos.set(centrosControls);
    this.descripciones.set(descripcionControls);
  }

  getCentroCostosControl(index: number): FormControl {
    return this.centrosCostos()[index] || new FormControl('');
  }

  getDescripcionControl(index: number): FormControl {
    return this.descripciones()[index] || new FormControl('');
  }

  removerTipo(index: number): void {
    const tiposActuales = this.tiposSeleccionados();
    const tiposActualizados = tiposActuales.filter((_, i) => i !== index);
    this.tiposSeleccionados.set(tiposActualizados);

    // Actualizar controles
    const centrosActuales = this.centrosCostos().filter((_, i) => i !== index);
    const descripcionesActuales = this.descripciones().filter((_, i) => i !== index);
    this.centrosCostos.set(centrosActuales);
    this.descripciones.set(descripcionesActuales);

    // Actualizar el multi-select
    const selectedIds = tiposActualizados.map(t => t.id);
    this.form.get('tipoApoyoIds')?.setValue(selectedIds);
  }

  buscarCentrosCosto(event: { query: string }): void {
    const query = event.query?.trim();
    if (!query || query.length < 2) {
      this.centrosCostoSugerencias.set([]);
      return;
    }
    this.centrosCostoService.buscar(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultados) => this.centrosCostoSugerencias.set(resultados),
        error: () => this.centrosCostoSugerencias.set([])
      });
  }

  onCentroCostoSelect(event: any, control?: FormControl): void {
    const centro: CentroCostoOracle = event.value ?? event;
    const valor = `${centro.centroCosto} - ${centro.nombreCentroCosto}`;
    if (control) {
      control.setValue(valor);
    } else {
      this.form.get('centroCostos')?.setValue(valor);
    }
  }

  // Configuración de la tabla de apoyos económicos
  columnsApoyos: TableColumn[] = [
    { field: 'tipoApoyoEconomico.nombre', header: 'Tipo de Apoyo', sortable: true, type: 'custom' },
    { field: 'descripcion', header: 'Descripción', sortable: false },
    { field: 'centroCostos', header: 'Centro de Costos', sortable: false },
    { field: 'presupuestoDisponible', header: 'Presupuesto', sortable: false, type: 'custom' }
  ];

  get actionsApoyos(): TableAction[] {
    if (this.readonly) return [];
    return [
      { icon: 'pi pi-pencil', tooltip: 'Editar', severity: 'primary', onClick: (row: ApoyoEconomico) => this.abrirDialogoEditar(row) },
      { icon: 'pi pi-trash text-red-500', tooltip: 'Eliminar', severity: 'danger', onClick: (row: ApoyoEconomico) => this.eliminarApoyo(row) }
    ];
  }

  // Configuración de la tabla de tipos de apoyo
  columnsTipos: TableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true }
  ];

  actionsTipos: TableAction[] = [
    { icon: 'pi pi-pencil', tooltip: 'Editar', severity: 'primary', onClick: (row: TipoApoyoEconomico) => this.abrirEditarTipo(row) },
    { icon: 'pi pi-trash text-red-500', tooltip: 'Eliminar', severity: 'danger', onClick: (row: TipoApoyoEconomico) => this.eliminarTipoApoyo(row) }
  ];

  ngOnInit(): void {
    this.cargarTodosLosTipos();
    if (this.movilidadId) {
      this.cargarApoyosEconomicos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movilidadId'] && this.movilidadId) {
      this.cargarApoyosEconomicos();
    }
  }

  private cargarTodosLosTipos(): void {
    this.service.getTiposApoyo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tipos) => {
          this.todosLosTiposApoyo.set(tipos);
          // also populate disponibles so dropdown has values immediately
          this.tiposApoyoDisponibles.set(tipos);
        },
        error: (err) => this.manejarError('Error al cargar los tipos de apoyo económico.')
      });
  }

  private cargarApoyosEconomicos(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.service.getApoyosWithTipos(this.movilidadId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: ApoyoEconomicoList) => {
          this.apoyosEconomicos.set(data.apoyos);
          this.tiposApoyoDisponibles.set(data.tiposDisponibles);
          this.onChanged.emit(data.apoyos);
        },
        error: (err) => this.manejarError('Error al cargar los tipos de apoyo económico.')
      });
  }

  abrirDialogoCrear(): void {
    this.dialogMode = 'create';
    this.dialogTitle.set('Agregar Apoyo Económico');
    this.apoyoSeleccionado = null;
    this.form.reset();
    this.tiposSeleccionados.set([]);
    this.centrosCostos.set([]);
    this.descripciones.set([]);
    this.showNuevoTipoForm.set(false);
    this.showDialog = true;
    this.mainAreaMode.set('create_apoyo');
  }

  abrirDialogoEditar(apoyo: ApoyoEconomico): void {
    this.dialogMode = 'edit';
    this.dialogTitle.set('Editar Apoyo Económico');
    this.apoyoSeleccionado = apoyo;
    this.form = this.service.buildFormWithData(apoyo);
    this.showNuevoTipoForm.set(false);
    this.showDialog = true;
    this.mainAreaMode.set('edit_apoyo');
  }

  volverAListaApoyos(): void {
    this.mainAreaMode.set('list');
    this.showDialog = false;
    this.form.reset();
    this.tiposSeleccionados.set([]);
    this.centrosCostos.set([]);
    this.descripciones.set([]);
    this.showNuevoTipoForm.set(false);
    this.apoyoSeleccionado = null;
  }

  cerrarDialogo(): void {
    this.showDialog = false;
    this.mainAreaMode.set('list');
    this.form.reset();
    this.tiposSeleccionados.set([]);
    this.centrosCostos.set([]);
    this.descripciones.set([]);
    this.showNuevoTipoForm.set(false);
    this.apoyoSeleccionado = null;
  }

  guardarApoyo(): void {
    if (this.dialogMode === 'create' && !this.validarFormulario()) {
      return;
    }

    this.loading.set(true);
    this.error.set(undefined);

    if (this.dialogMode === 'edit') {
      this.guardarEdicion();
    } else {
      this.guardarCreacion();
    }
  }

  private guardarCreacion(): void {
    // Crear múltiples apoyos basados en los tipos seleccionados
    const tiposSeleccionados = this.tiposSeleccionados();

    tiposSeleccionados.forEach((tipo, index) => {
      const centroCostos = this.getCentroCostosControl(index).value?.trim() || undefined;
      const descripcion = this.getDescripcionControl(index).value?.trim() || undefined;

      const nuevoApoyo: ApoyoEconomicoCreation = {
        movilidadId: this.movilidadId,
        tipoApoyoId: tipo.id,
        descripcion,
        presupuestoDisponible: this.form.get('presupuestoDisponible')?.value || false,
        centroCostos
      };

      // Agregar a cambios pendientes en lugar de guardar directamente
      this.cambiosPendientes.crear.push(nuevoApoyo);

      // Agregar a la lista local para mostrar en UI (con ID temporal)
      const apoyoTemporal: ApoyoEconomico = {
        id: `temp-${Date.now()}-${index}`,
        movilidadId: this.movilidadId,
        tipoApoyoEconomico: tipo,
        descripcion: descripcion || '',
        presupuestoDisponible: nuevoApoyo.presupuestoDisponible,
        centroCostos: centroCostos || ''
      };
      
      const apoyosActuales = this.apoyosEconomicos();
      this.apoyosEconomicos.set([...apoyosActuales, apoyoTemporal]);
    });

    this.loading.set(false);
    this.cerrarDialogo();
    this.onChanged.emit(this.apoyosEconomicos());
  }

  private guardarEdicion(): void {
    if (!this.apoyoSeleccionado) {
      this.loading.set(false);
      this.manejarError('No se encontró el apoyo a editar', false);
      return;
    }

    const centroCostos = this.form.get('centroCostos')?.value?.trim() || undefined;
    const descripcion = this.form.get('descripcion')?.value?.trim() || undefined;
    const presupuestoDisponibleRaw = this.form.get('presupuestoDisponible')?.value;
    // coerce to boolean explicitly (checkbox returns true/false, but could be string)
    const presupuestoDisponible = !!(presupuestoDisponibleRaw === true || presupuestoDisponibleRaw === 'true');
    const tipoApoyoId = this.form.get('tipoApoyoIds')?.value;

    // Validación del tipo de apoyo
    if (!tipoApoyoId) {
      this.loading.set(false);
      this.manejarError('El tipo de apoyo es requerido', false);
      return;
    }

    // Validar que no exista otro apoyo con el mismo tipo
    if (tipoApoyoId !== this.apoyoSeleccionado.tipoApoyoEconomico?.id &&
        this.apoyosEconomicos().some(a => a.tipoApoyoEconomico.id === tipoApoyoId)) {
      const tipoNombre = this.tiposApoyoDisponibles().find(t => t.id === tipoApoyoId)?.nombre || tipoApoyoId;
      this.loading.set(false);
      this.manejarError(`Ya existe un apoyo del tipo "${tipoNombre}" para esta movilidad.`, false);
      return;
    }

    const updateData: any = {
      tipoApoyoId: Number(tipoApoyoId),
      // Preserve boolean audit fields so the backend does not set them to null
      revisado: this.apoyoSeleccionado!.revisado ?? false,
      aprobacionRector: this.apoyoSeleccionado!.aprobacionRector ?? false,
      aprobacionVicerrectoria: this.apoyoSeleccionado!.aprobacionVicerrectoria ?? false,
      presupuestoDisponible: presupuestoDisponible
    };

    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (centroCostos !== undefined) updateData.centroCostos = centroCostos;

    // Actualizar la lista localmente primero (optimistic update)
    const apoyoActualizadoLocal = {
      ...this.apoyoSeleccionado!,
      tipoApoyoEconomico: this.tiposApoyoDisponibles().find(t => t.id === Number(tipoApoyoId)) || this.apoyoSeleccionado!.tipoApoyoEconomico,
      descripcion: descripcion || '',
      presupuestoDisponible: presupuestoDisponible,
      centroCostos: centroCostos || ''
    };

    const apoyosActuales = this.apoyosEconomicos();
    const index = apoyosActuales.findIndex(a => a.id === this.apoyoSeleccionado!.id);
    if (index !== -1) {
      apoyosActuales[index] = apoyoActualizadoLocal;
      this.apoyosEconomicos.set([...apoyosActuales]);
      this.onChanged.emit(this.apoyosEconomicos());
    }

    // Agregar a cambios pendientes en lugar de guardar directamente
    if (!this.apoyoSeleccionado!.id!.startsWith('temp-')) {
      // Solo agregar a cambios pendientes si no es un item temporal
      this.cambiosPendientes.actualizar.push({
        id: this.apoyoSeleccionado!.id!,
        data: updateData
      });
    } else {
      // Si es temporal, actualizar el objeto en la lista de creación
      const index = this.cambiosPendientes.crear.findIndex(c => 
        c.tipoApoyoId === Number(updateData.tipoApoyoId)
      );
      if (index !== -1) {
        this.cambiosPendientes.crear[index] = { ...this.cambiosPendientes.crear[index], ...updateData };
      }
    }

    // Cerrar diálogo inmediatamente
    this.loading.set(false);
    this.cerrarDialogo();
  }

  private crearApoyosSecuencialmente(apoyos: ApoyoEconomicoCreation[]): void {
    if (apoyos.length === 0) {
      this.manejarGuardadoExitosoMultiple();
      return;
    }

    const apoyo = apoyos[0];
    this.service.create(apoyo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (apoyoCreado) => {
          this.crearApoyosSecuencialmente(apoyos.slice(1));
        },
        error: (err) => {
          this.loading.set(false);
          this.manejarError('Error al crear uno de los apoyos económicos', false);
        }
      });
  }

  private manejarGuardadoExitosoMultiple(): void {
    this.loading.set(false);
    this.cargarApoyosEconomicos();
    this.volverAListaApoyos();
    this.onChanged.emit(this.apoyosEconomicos());
  }

  private validarFormulario(): boolean {
    // Validar que se hayan seleccionado tipos
    if (!this.form.get('tipoApoyoIds')?.value || this.form.get('tipoApoyoIds')?.value.length === 0) {
      this.manejarError('Debe seleccionar al menos un tipo de apoyo', false);
      return false;
    }

    // Validar controles dinámicos
    const tiposSeleccionados = this.tiposSeleccionados();
    for (let i = 0; i < tiposSeleccionados.length; i++) {
      const centroCostosControl = this.getCentroCostosControl(i);
      const descripcionControl = this.getDescripcionControl(i);

      // Marcar como touched para mostrar errores
      centroCostosControl.markAsTouched();
      descripcionControl.markAsTouched();

      // Validar descripción requerida si es necesaria
      if (this.service.tipoRequiereDescripcion(tiposSeleccionados[i].id) && !descripcionControl.value?.trim()) {
        this.manejarError(`La descripción es requerida para el tipo "${tiposSeleccionados[i].nombre}"`, false);
        return false;
      }

      // Verificar si ya existe un apoyo de este tipo
      if (this.apoyosEconomicos().some(a => a.tipoApoyoEconomico.id === tiposSeleccionados[i].id)) {
        this.manejarError(`Ya existe un apoyo del tipo "${tiposSeleccionados[i].nombre}" para esta movilidad.`, false);
        return false;
      }
    }

    return true;
  }

  private manejarGuardadoExitoso(apoyo: ApoyoEconomico): void {
    this.cargarApoyosEconomicos();

    this.cerrarDialogo();
    this.onSaved.emit(this.apoyosEconomicos());
  }

  private manejarErrorEnGuardado(): void {
    this.manejarError('Error al guardar el apoyo económico');
    this.onError.emit('Error al guardar el apoyo económico');
  }

  eliminarApoyo(apoyo: ApoyoEconomico): void {
    if (!apoyo.id) return;

    // Actualizar lista local
    const apoyosActuales = this.apoyosEconomicos();
    this.apoyosEconomicos.set(apoyosActuales.filter(a => a.id !== apoyo.id));
    
    // Agregar a cambios pendientes solo si no es temporal
    if (!apoyo.id.startsWith('temp-')) {
      this.cambiosPendientes.eliminar.push(apoyo.id);
      // Quitar de actualizaciones pendientes si existía
      this.cambiosPendientes.actualizar = this.cambiosPendientes.actualizar.filter(u => u.id !== apoyo.id);
    } else {
      // Si es temporal, quitarlo de la lista de creación
      this.cambiosPendientes.crear = this.cambiosPendientes.crear.filter(c => {
        // Buscar por tipo de apoyo ya que los temporales no tienen ID real
        return c.tipoApoyoId !== apoyo.tipoApoyoEconomico?.id;
      });
    }
    
    this.onChanged.emit(this.apoyosEconomicos());
  }

  tipoYaUsado(tipoId: number): boolean {
    return this.apoyosEconomicos().some(a => a.tipoApoyoEconomico.id === tipoId);
  }

  getTiposDisponibles(): TipoApoyoEconomico[] {
    if (this.dialogMode === 'edit') {
      // En modo edición, mostrar todos los tipos excepto los ya usados (excepto el actual)
      return this.tiposApoyoDisponibles().filter(tipo => 
        !this.tipoYaUsado(tipo.id) || tipo.id === this.apoyoSeleccionado?.tipoApoyoEconomico?.id
      );
    }
    // En modo creación, filtrar tipos ya usados
    return this.tiposApoyoDisponibles().filter(tipo => !this.tipoYaUsado(tipo.id));
  }

  toggleNuevoTipoForm(): void {
    this.showNuevoTipoForm.set(!this.showNuevoTipoForm());
    if (this.showNuevoTipoForm()) {
      this.tipoForm.reset();
    }
  }

  guardarNuevoTipo(): void {
    if (!this.tipoForm.valid) {
      this.formUtils.markFormGroupTouched(this.tipoForm);
      this.manejarError('Por favor complete todos los campos requeridos.', false);
      return;
    }

    this.loading.set(true);
    const tipoData = {
      nombre: this.tipoForm.value.nombre,
      descripcion: this.tipoForm.value.descripcion
    };

    this.service.createTipoApoyo(tipoData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (tipo) => {
          this.todosLosTiposApoyo.update(tipos => [...tipos, tipo]);
          this.cargarApoyosEconomicos(); // to refresh tiposDisponibles
          this.showNuevoTipoForm.set(false);
          this.tipoForm.reset();
        },
        error: (err) => this.manejarError('Error al guardar el tipo de apoyo económico')
      });
  }

  private manejarError(mensaje: string, mostrarNotificacion: boolean = true): void {
    this.error.set(mensaje);
    if (mostrarNotificacion) {
      this.notificationService.showNotification('error', mensaje);
    }
  }

  
  abrirTiposDialog(): void {
    this.editTipoMode.set(false);
    this.tipoForm.reset({ activo: false });
    this.tiposDialogVisible.set(true);
  }

  cerrarTiposDialog(): void {
    this.tiposDialogVisible.set(false);
    this.editTipoMode.set(false);
    this.tipoForm.reset();
    this.tipoSeleccionado = null;
  }

  abrirEditarTipo(tipo: TipoApoyoEconomico): void {
    this.editTipoMode.set(true);
    this.tipoSeleccionado = tipo;
    this.tipoForm = this.service.buildTipoApoyoFormWithData(tipo);
  }

  limpiarTipoForm(): void {
    this.editTipoMode.set(false);
    this.tipoSeleccionado = null;
    this.tipoForm.reset();
  }

  guardarTipo(): void {
    if (!this.tipoForm.valid) {
      this.formUtils.markFormGroupTouched(this.tipoForm);
      this.manejarError('Por favor complete todos los campos requeridos.', false);
      return;
    }

    this.loading.set(true);
    const tipoData = {
      nombre: this.tipoForm.value.nombre,
      descripcion: this.tipoForm.value.descripcion
    };

    const operation = this.editTipoMode()
      ? this.service.updateTipoApoyo(this.tipoSeleccionado!.id, tipoData)
      : this.service.createTipoApoyo(tipoData);

    operation.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (tipo) => {
        if (this.editTipoMode()) {
          const tiposActuales = this.todosLosTiposApoyo();
          const index = tiposActuales.findIndex(t => t.id === tipo.id);
          if (index !== -1) {
            tiposActuales[index] = tipo;
            this.todosLosTiposApoyo.set([...tiposActuales]);
          }
          this.cargarApoyosEconomicos();
          this.notificationService.showNotification('success', 'Tipo de apoyo actualizado correctamente.');
        } else {
          this.todosLosTiposApoyo.update(tipos => [...tipos, tipo]);
          this.cargarApoyosEconomicos();
          // this.notificationService.showNotification('success', 'Tipo de apoyo creado correctamente.');
        }
        this.limpiarTipoForm();
      },
      error: (err) => this.manejarError('Error al guardar el tipo de apoyo económico')
    });
  }

  eliminarTipoApoyo(tipo: TipoApoyoEconomico): void {
    if (!tipo.id) return;

    this.loading.set(true);
    this.service.deleteTipoApoyo(tipo.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          const tiposActuales = this.todosLosTiposApoyo();
          this.todosLosTiposApoyo.set(tiposActuales.filter(t => t.id !== tipo.id));

          this.cargarApoyosEconomicos();

          this.notificationService.showNotification('success', 'Tipo de apoyo económico eliminado correctamente.');
        },
      });
  }

  private hayCambiosPendientes(): boolean {
    return this.cambiosPendientes.crear.length > 0 ||
           this.cambiosPendientes.actualizar.length > 0 ||
           this.cambiosPendientes.eliminar.length > 0;
  }

  private limpiarCambiosPendientes(): void {
    this.cambiosPendientes = { crear: [], actualizar: [], eliminar: [] };
  }

  public ensureBudgetInPending(): void {
    const apoyos = this.apoyosEconomicos();
    this.cambiosPendientes.actualizar.forEach(item => {
      if (item.data.presupuestoDisponible === undefined) {
        const apoyo = apoyos.find(a => a.id === item.id);
        if (apoyo) {
          item.data.presupuestoDisponible = !!apoyo.presupuestoDisponible;
        }
      }
    });
  }

  // Método público para persistir todos los cambios pendientes
  async actualizar(mostrarMensaje: boolean = true): Promise<void> {
    if (!this.hayCambiosPendientes()) {
      return Promise.resolve();
    }

    this.loading.set(true);
    this.error.set(undefined);

    try {
      for (const id of this.cambiosPendientes.eliminar) {
        await this.service.delete(id).toPromise();
      }

      for (const update of this.cambiosPendientes.actualizar) {
        await this.service.update(update.id, update.data).toPromise();
      }

      for (const create of this.cambiosPendientes.crear) {
        const createData = { ...create, movilidadId: create.movilidadId || this.movilidadId };
        await this.service.create(createData).toPromise();
      }

      this.limpiarCambiosPendientes();
      this.cargarApoyosEconomicos();

      if (mostrarMensaje) {
        this.notificationService.showNotification('success', 'Apoyos económicos guardados correctamente');
      }
      this.onSaved.emit(this.apoyosEconomicos());

    } catch (error) {
      // error swallowed silently
    } finally {
      this.loading.set(false);
    }
  }
}