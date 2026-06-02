import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, Output, EventEmitter, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { RubroPresupuestalService } from '../../core/services/rubro-presupuestal.service';
import { RubroPresupuestal, TipoRubro, RubroPresupuestalList, RubroPresupuestalCreation } from '../../core/models/rubros-presupuestales.model';
import { FormUtilsService } from '../../core/services/form-utils.service';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '@microfrontends/shared-services';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InfoTableComponent, TableColumn, TableAction, InputComponent, SelectComponent, MultiselectComponent, InputNumberComponent } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-rubros-presupuestales',
  standalone: true,
  templateUrl: './rubros-presupuestales.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    InputNumberModule,
    InfoTableComponent,
    InputComponent,
    SelectComponent,
    MultiselectComponent,
    InputNumberComponent
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RubrosPresupuestalesComponent implements OnInit, OnChanges {
  @Input({ required: true }) movilidadId!: string;
  @Input() readonly: boolean = false;
  @Input() isEditMode: boolean = false;
  @Output() onSaved = new EventEmitter<RubroPresupuestal[]>();
  @Output() onChanged = new EventEmitter<RubroPresupuestal[]>();
  @Output() onError = new EventEmitter<string>();

  private readonly fb = inject(FormBuilder);
  readonly service = inject(RubroPresupuestalService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formUtils = inject(FormUtilsService);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);

  rubrosPresupuestales = signal<RubroPresupuestal[]>([]);
  tiposRubro = signal<TipoRubro[]>([]);
  todosLosTiposRubro = signal<TipoRubro[]>([]);

  showDialog = signal<boolean>(false);
  dialogMode: 'create' | 'edit' = 'create';
  dialogTitle = signal<string>('Crear Rubro Presupuestal');
  rubroSeleccionado: RubroPresupuestal | null = null;

  showTiposDialog = signal<boolean>(false);
  editTipoMode = signal<boolean>(false);
  dialogTiposTitle = signal<string>('Tipo de Rubro Presupuestal');
  tipoSeleccionado: TipoRubro | null = null;

  showNuevoTipoForm = signal<boolean>(false);

  form: FormGroup = this.buildForm();
  tipoForm: FormGroup = this.buildTipoForm();

  tiposSeleccionados = signal<TipoRubro[]>([]);
  numeroControls = signal<FormControl[]>([]);

  // Estado temporal para cambios pendientes
  private cambiosPendientes: {
    crear: RubroPresupuestalCreation[],
    actualizar: { id: string, data: any }[],
    eliminar: string[]
  } = { crear: [], actualizar: [], eliminar: [] };

  onTiposChange(event: any): void {
    const selectedIds = event.value || [];
    const tipos = this.tiposRubro().filter((tipo: TipoRubro) => selectedIds.includes(tipo.id));
    this.tiposSeleccionados.set(tipos);

    // Sync form control so validation passes
    this.form.get('tipoRubroIds')?.setValue(selectedIds);

    // Crear controles dinámicos para números
    const numeroControls: FormControl[] = [];

    tipos.forEach((tipo: TipoRubro) => {
      numeroControls.push(new FormControl('', [Validators.required, Validators.min(1), Validators.max(999999)]));
    });

    this.numeroControls.set(numeroControls);
  }

  getNumeroControl(index: number): FormControl {
    return this.numeroControls()[index] || new FormControl('');
  }

  removerTipo(index: number): void {
    const tiposActuales = this.tiposSeleccionados();
    const tiposActualizados = tiposActuales.filter((_, i) => i !== index);
    this.tiposSeleccionados.set(tiposActualizados);

    // Actualizar controles
    const numeroControlsActuales = this.numeroControls().filter((_, i) => i !== index);
    this.numeroControls.set(numeroControlsActuales);

    // Actualizar el multi-select
    const selectedIds = tiposActualizados.map(t => t.id);
    this.form.get('tipoRubroIds')?.setValue(selectedIds);
  }

  // Configuración de la tabla de rubros presupuestales
  columnsRubros: TableColumn[] = [
    { field: 'tipoRubro.nombre', header: 'Tipo de Rubro', sortable: true, type: 'custom' },
    { field: 'numero', header: 'Número', sortable: true }
  ];

  get actionsRubros(): TableAction[] {
    if (this.readonly) return [];
    return [
      { icon: 'pi pi-pencil', tooltip: 'Editar', severity: 'primary', onClick: (row: RubroPresupuestal) => this.abrirDialogoEditar(row) },
      { icon: 'pi pi-trash', tooltip: 'Eliminar', severity: 'danger', onClick: (row: RubroPresupuestal) => this.eliminarRubro(row) }
    ];
  }

  // Configuración de la tabla de tipos de rubro
  columnsTipos: TableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true }
  ];

  actionsTipos: TableAction[] = [
    { icon: 'pi pi-pencil', tooltip: 'Editar', severity: 'primary', onClick: (row: TipoRubro) => this.abrirEditarTipo(row) },
    { icon: 'pi pi-trash', tooltip: 'Eliminar', severity: 'danger', onClick: (row: TipoRubro) => this.eliminarTipoRubro(row) }
  ];

  ngOnInit(): void {
    this.cargarTiposRubro();

    if (this.movilidadId) {
      this.cargarRubrosPresupuestales();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movilidadId'] && this.movilidadId) {
      this.cargarRubrosPresupuestales();
    }
  }

  private cargarTiposRubro(): void {
    this.service.getAllActiveOrdered()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tipos) => {
          this.tiposRubro.set(tipos);
        },
        error: (err) => {
          this.manejarError(this.service.getTipoRubroOperationErrorMessage('load'));
        }
      });
  }

  private cargarRubrosPresupuestales(): Promise<void> {
    this.loading.set(true);
    this.error.set(undefined);

    return new Promise((resolve, reject) => {
      this.service.getRubrosWithTipos(this.movilidadId)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false))
        )
        .subscribe({
          next: (data: RubroPresupuestalList) => {
            this.rubrosPresupuestales.set(data.rubros);
            this.tiposRubro.set(data.tiposDisponibles);
            this.onChanged.emit(data.rubros);
            resolve();
          },
          error: (err) => {
            this.manejarError(this.service.getOperationErrorMessage('load'));
            reject(err);
          }
        });
    });
  }

  abrirDialogoCrear(): void {
    this.dialogMode = 'create';
    this.dialogTitle.set('Crear Rubro Presupuestal');
    this.rubroSeleccionado = null;
    this.form = this.service.buildForm();
    this.tiposSeleccionados.set([]);
    this.numeroControls.set([]);
    this.showNuevoTipoForm.set(false);
    this.showDialog.set(true);
  }

  abrirDialogoEditar(rubro: RubroPresupuestal): void {
    this.dialogMode = 'edit';
    this.dialogTitle.set('Editar Rubro Presupuestal');
    this.rubroSeleccionado = rubro;
    this.form = this.service.buildFormWithData(rubro);
    this.tiposSeleccionados.set(rubro.tipoRubro ? [rubro.tipoRubro] : []);
    this.numeroControls.set([new FormControl(rubro.numero || '', [Validators.required, Validators.min(1), Validators.max(999999)])]);
    this.showDialog.set(true);
  }
  cerrarDialogo(): void {
    this.showDialog.set(false);
    this.form.reset();
    this.tiposSeleccionados.set([]);
    this.numeroControls.set([]);
    this.showNuevoTipoForm.set(false);
    this.rubroSeleccionado = null;
  }

  abrirTiposDialog(): void {
    this.editTipoMode.set(false);
    this.tipoSeleccionado = null;
    this.cargarTodosLosTiposRubro();
    this.showTiposDialog.set(true);
  }

  cerrarTiposDialog(): void {
    this.showTiposDialog.set(false);
    this.tipoForm.reset();
    this.tipoSeleccionado = null;
    this.editTipoMode.set(false);
  }

  abrirEditarTipo(tipo: TipoRubro): void {
    this.editTipoMode.set(true);
    this.tipoSeleccionado = tipo;
    this.tipoForm = this.service.buildTipoRubroFormWithData(tipo);
  }

  limpiarTipoForm(): void {
    this.editTipoMode.set(false);
    this.tipoSeleccionado = null;
    this.tipoForm.reset();
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
      activo: true
    };

    this.service.createTipoRubro(tipoData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (tipo) => {
          this.todosLosTiposRubro.update(tipos => [...tipos, tipo]);
          this.cargarTiposRubro(); // to refresh tiposRubro
          this.showNuevoTipoForm.set(false);
          this.tipoForm.reset();
        },
        error: (err) => this.manejarError(this.service.getTipoRubroOperationErrorMessage('save'))
      });
  }

  guardarTipoRubro(): void {
    if (!this.tipoForm.valid) {
      this.formUtils.markFormGroupTouched(this.tipoForm);
      this.manejarError(this.service.getValidationErrorMessage('form'), false);
      return;
    }

    this.loading.set(true);
    const tipoData = this.tipoForm.value;
    const existingId = this.tipoSeleccionado?.id;

    const operation = existingId
      ? this.service.updateTipoRubro(existingId, tipoData)
      : this.service.createTipoRubro(tipoData);

    operation.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (tipo) => {
        this.cargarTodosLosTiposRubro();
        this.cargarTiposRubro(); 
        this.editTipoMode.set(false);
        this.tipoSeleccionado = null;
        this.tipoForm.reset();
      },
      error: (err) => {
        this.manejarError(err.message || this.service.getTipoRubroOperationErrorMessage('save'));
      }
    });
  }

  eliminarTipoRubro(tipo: TipoRubro): void {
    if (!tipo.id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el tipo "${tipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.set(true);
        this.service.deleteTipoRubro(tipo.id!)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false))
          )
          .subscribe({
            next: () => {
              this.cargarTodosLosTiposRubro();
              this.cargarTiposRubro();
            },
            error: (err) => {
              console.error('Error al eliminar tipo de rubro:', err);
              this.manejarError(err.message || this.service.getTipoRubroOperationErrorMessage('delete'));
            }
          });
      }
    });
  }

  private cargarTodosLosTiposRubro(): void {
    this.service.getTiposRubro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tipos) => {
          this.todosLosTiposRubro.set(tipos);
        },
        error: (err) => {
          this.manejarError(err.message || this.service.getTipoRubroOperationErrorMessage('load'));
        }
      });
  }

  guardarRubro(): void {
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
    // Crear múltiples rubros basados en los tipos seleccionados
    const tiposSeleccionados = this.tiposSeleccionados();

    tiposSeleccionados.forEach((tipo, index) => {
      const numero = this.getNumeroControl(index).value;

      const nuevoRubro: RubroPresupuestalCreation = {
        movilidadId: this.movilidadId,
        tipoRubroId: tipo.id,
        numero: numero
      };

      // Agregar a cambios pendientes en lugar de guardar directamente
      this.cambiosPendientes.crear.push(nuevoRubro);

      // Agregar a la lista local para mostrar en UI (con ID temporal)
      const rubroTemporal: RubroPresupuestal = {
        id: `temp-${Date.now()}-${index}`,
        tipoRubro: tipo,
        numero: numero
      };

      const rubrosActuales = this.rubrosPresupuestales();
      this.rubrosPresupuestales.set([...rubrosActuales, rubroTemporal]);
    });

    this.loading.set(false);
    this.cerrarDialogo();
    this.onChanged.emit(this.rubrosPresupuestales());
  }

  private guardarEdicion(): void {
    if (!this.rubroSeleccionado) {
      this.manejarError('No se encontró el rubro a editar', false);
      return;
    }

    const numero = this.form.get('numero')?.value;
    const tipoRubroId = this.form.get('tipoRubroIds')?.value;

    // Validar que no exista otro rubro con el mismo tipo
    if (tipoRubroId && tipoRubroId !== this.rubroSeleccionado.tipoRubro?.id && this.service.existeRubroTipo(this.rubrosPresupuestales(), tipoRubroId)) {
      const tipoNombre = this.tiposRubro().find(t => t.id === tipoRubroId)?.nombre || tipoRubroId;
      this.manejarError(`Ya existe un rubro del tipo "${tipoNombre}" para esta movilidad.`, false);
      return;
    }

    const updateData = {
      numero,
      tipoRubroId
    };

    // Actualizar la lista localmente primero (optimistic update)
    const rubroActualizadoLocal = {
      ...this.rubroSeleccionado!,
      tipoRubro: this.tiposRubro().find(t => t.id === tipoRubroId) || this.rubroSeleccionado!.tipoRubro,
      numero: numero
    };

    const rubrosActuales = this.rubrosPresupuestales();
    const index = rubrosActuales.findIndex(r => r.id === this.rubroSeleccionado!.id);
    if (index !== -1) {
      rubrosActuales[index] = rubroActualizadoLocal;
      this.rubrosPresupuestales.set([...rubrosActuales]);
      this.onChanged.emit(this.rubrosPresupuestales());
    }

    // Agregar a cambios pendientes en lugar de guardar directamente
    if (!this.rubroSeleccionado!.id!.startsWith('temp-')) {
      // Solo agregar a cambios pendientes si no es un item temporal
      this.cambiosPendientes.actualizar.push({
        id: this.rubroSeleccionado!.id!,
        data: updateData
      });
    } else {
      // Si es temporal, actualizar el objeto en la lista de creación
      const index = this.cambiosPendientes.crear.findIndex(c =>
        c.tipoRubroId === tipoRubroId
      );
      if (index !== -1) {
        this.cambiosPendientes.crear[index] = { ...this.cambiosPendientes.crear[index], ...updateData };
      }
    }

    // Cerrar diálogo inmediatamente
    this.loading.set(false);
    this.cerrarDialogo();
  }

  private crearRubrosSecuencialmente(rubros: RubroPresupuestalCreation[]): void {
    if (rubros.length === 0) {
      this.manejarGuardadoExitosoMultiple();
      return;
    }

    const rubro = rubros[0];
    this.service.create(rubro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rubroCreado) => {
          this.rubrosPresupuestales.update(rubrosActuales => [...rubrosActuales, rubroCreado]);
          this.crearRubrosSecuencialmente(rubros.slice(1));
        },
        error: (err) => {
          this.loading.set(false);
          this.manejarError('Error al crear uno de los rubros presupuestales', false);
        }
      });
  }

  private manejarGuardadoExitosoMultiple(): void {
    this.loading.set(false);
    this.cerrarDialogo();
    this.onChanged.emit(this.rubrosPresupuestales());
  }

  private validarFormulario(): boolean {
    // Validar que se hayan seleccionado tipos
    if (!this.form.get('tipoRubroIds')?.value || this.form.get('tipoRubroIds')?.value.length === 0) {
      this.manejarError('Debe seleccionar al menos un tipo de rubro', false);
      return false;
    }

    // Validar controles dinámicos
    const tiposSeleccionados = this.tiposSeleccionados();
    for (let i = 0; i < tiposSeleccionados.length; i++) {
      const numeroControl = this.getNumeroControl(i);

      // Marcar como touched para mostrar errores
      numeroControl.markAsTouched();

      // Validar número requerido
      if (!numeroControl.value) {
        this.manejarError(`El número es requerido para el tipo "${tiposSeleccionados[i].nombre}"`, false);
        return false;
      }

      // Validar que no exista un rubro de este tipo
      if (this.service.existeRubroTipo(this.rubrosPresupuestales(), tiposSeleccionados[i].id)) {
        this.manejarError(`Ya existe un rubro del tipo "${tiposSeleccionados[i].nombre}" para esta movilidad.`, false);
        return false;
      }
    }

    return true;
  }

  private manejarGuardadoExitoso(rubro: RubroPresupuestal): void {
    this.cargarRubrosPresupuestales().then(() => {
      this.cerrarDialogo();
      this.onSaved.emit(this.rubrosPresupuestales());
    }).catch((error) => {
      this.manejarError(this.service.getOperationErrorMessage('load'));
    });
  }

  private manejarErrorEnGuardado(): void {
    this.manejarError(this.service.getOperationErrorMessage('save'));
    this.onError.emit('Error al guardar el rubro presupuestal');
  }

  eliminarRubro(rubro: RubroPresupuestal): void {
    if (!rubro.id) return;

    this.ejecutarEliminacion(rubro);
  }

  private ejecutarEliminacion(rubro: RubroPresupuestal): void {
    if (!rubro.id) return;

    // Actualizar lista local
    const rubrosActuales = this.rubrosPresupuestales();
    this.rubrosPresupuestales.set(rubrosActuales.filter(r => r.id !== rubro.id));

    // Agregar a cambios pendientes solo si no es temporal
    if (!rubro.id.startsWith('temp-')) {
      this.cambiosPendientes.eliminar.push(rubro.id);
      // Quitar de actualizaciones pendientes si existía
      this.cambiosPendientes.actualizar = this.cambiosPendientes.actualizar.filter(u => u.id !== rubro.id);
    } else {
      // Si es temporal, quitarlo de la lista de creación
      this.cambiosPendientes.crear = this.cambiosPendientes.crear.filter(c => {
        // Buscar por tipo de rubro ya que los temporales no tienen ID real
        return c.tipoRubroId !== rubro.tipoRubro?.id;
      });
    }

    this.onChanged.emit(this.rubrosPresupuestales());
  }

  tipoRubroYaUsado(tipoRubroId: string): boolean {
    return this.rubrosPresupuestales().some(rubro => rubro.tipoRubro?.id === tipoRubroId);
  }

  getTiposDisponibles(): TipoRubro[] {
    const tiposDisponibles = this.tiposRubro().filter(tipo => {
      if (this.dialogMode === 'edit' && this.rubroSeleccionado?.tipoRubro?.id === tipo.id) {
        return true;
      }
      // En modo creación, excluir tipos ya usados
      return this.dialogMode === 'create' ? !this.service.existeRubroTipo(this.rubrosPresupuestales(), tipo.id) : true;
    });
    return tiposDisponibles;
  }

  private buildForm(): FormGroup {
    return this.service.buildForm();
  }

  private buildFormWithData(rubro: RubroPresupuestal): FormGroup {
    return this.service.buildFormWithData(rubro);
  }

  private buildTipoForm(): FormGroup {
    return this.service.buildTipoRubroForm();
  }

  private manejarError(mensaje: string, mostrarNotificacion: boolean = true): void {
    this.error.set(mensaje);
    if (mostrarNotificacion) {
      this.notificationService.showNotification('error', mensaje);
    }
  }

  private hayCambiosPendientes(): boolean {
    return this.cambiosPendientes.crear.length > 0 ||
           this.cambiosPendientes.actualizar.length > 0 ||
           this.cambiosPendientes.eliminar.length > 0;
  }

  private limpiarCambiosPendientes(): void {
    this.cambiosPendientes = { crear: [], actualizar: [], eliminar: [] };
  }

  // Método público para persistir todos los cambios pendientes
  async actualizar(mostrarMensaje: boolean = true): Promise<void> {
    if (!this.hayCambiosPendientes()) {
      return Promise.resolve();
    }

    this.loading.set(true);
    this.error.set(undefined);

    try {
      // Ejecutar eliminaciones primero
      for (const id of this.cambiosPendientes.eliminar) {
        await this.service.delete(id).toPromise();
      }

      // Ejecutar actualizaciones
      for (const update of this.cambiosPendientes.actualizar) {
        await this.service.update(update.id, update.data).toPromise();
      }

      // Ejecutar creaciones
      for (const create of this.cambiosPendientes.crear) {
        // Use the current movilidadId as fallback in case the item was queued before the movilidad was created
        const createData = { ...create, movilidadId: create.movilidadId || this.movilidadId };
        await this.service.create(createData).toPromise();
      }

      // Limpiar cambios pendientes y recargar datos
      this.limpiarCambiosPendientes();
      this.cargarRubrosPresupuestales();

      if (mostrarMensaje) {
        this.notificationService.showNotification('success', 'Rubros presupuestales guardados correctamente');
      }
      this.onSaved.emit(this.rubrosPresupuestales());

    } catch (error) {
      this.manejarError('Error al guardar los cambios en rubros presupuestales');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}