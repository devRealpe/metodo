import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormsModule } from '@angular/forms';
import {
  InputComponent,
  DatepickerComponent,
  SelectComponent,
} from '@microfrontends/shared-ui';
import { EquiposComputoService } from '../../core/services/equipos-computo.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { map } from 'rxjs';
import { EquiposComputo } from '../../core/models/equipos-computo.model';
import { Laboratorio } from '../../core/models/laboratorio.model';

interface OpcionSelect {
  label: string;
  value: string;
}


@Component({
  selector: 'app-equipos-computo.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    FormsModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './equipos-computo.component.html'
})
export class EquiposComputoComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private equiposComputoService = inject(EquiposComputoService);
  private laboratoriosService = inject(LaboratoriosService);
  private listasValoresService = inject(ListasValoresService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  cargando = false;
  modoEdicion = false;
  equipoSeleccionado: EquiposComputo | null = null;
  laboratorios = signal<Laboratorio[]>([]);
 
  mostrarNotificacionExitoVisual = false;
  ultimoEquipoGuardado = '';

  tiposEquipo: OpcionSelect[] = [{ label: 'Seleccionar tipo...', value: '' }];
  cargandoTipos = false;

  marcasEquipo: OpcionSelect[] = [{ label: 'Seleccionar marca...', value: '' }];
  cargandoMarcas = false;

  modelosEquipo: OpcionSelect[] = [{ label: 'Seleccionar modelo...', value: '' }];
  cargandoModelos = false;

  filter: boolean = true;

  ubicacionesEquipo = computed<OpcionSelect[]>(() => {
    const labs = this.laboratorios() || [];
    const opcionesLabs = labs.map(lab => ({
      label: lab.nombre,
      value: lab.nombre
    }));
    return [
      { label: 'Seleccionar ubicación...', value: '' },
      ...opcionesLabs
    ];
  });

  form = this.formBuilder.group({
    nombre: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100)
    ]],
    tipo: ['', [Validators.required]],
    marca: ['', [Validators.maxLength(50)]],
    modelo: ['', [Validators.maxLength(50)]],
    serial: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]],
    ubicacion: ['', [Validators.maxLength(100)]],
    fechaAdq: [null as unknown as Date | string, [Validators.required]]
  });

  ngOnInit(): void {
    this.cargarOpcionesDesdeBackend();
    this.cargarLaboratorios();
  }

  cargarLaboratorios(): void {
    this.laboratoriosService.getAll().subscribe({
      next: (laboratorios) => {
        this.laboratorios.set(Array.isArray(laboratorios) ? laboratorios : []);
      },
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los laboratorios',
          key: 'equipos-computo'
        });
      }
    });
  }

  async cargarOpcionesDesdeBackend(): Promise<void> {
    await Promise.allSettled([
      this.cargarTiposEquipo(),
      this.cargarMarcasEquipo(),
      this.cargarModelosEquipo()
    ]).catch(() => {});
  }

  cargarTiposEquipo(): Promise<void> {
    this.cargandoTipos = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService
        .getDropdownByTipo('COM')
        .pipe(
          map((response: any[]) =>
            response
              .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'equipos de computo')
              .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id }))
          )
        )
        .subscribe({
          next: (options) => {
            this.tiposEquipo = [{ label: 'Seleccionar tipo...', value: '' }, ...options];
            this.cargandoTipos = false;
            resolve();
          },
          error: (err) => {
            this.cargandoTipos = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tipos de equipo', key: 'equipos-computo' });
            reject(err);
          }
        });
    });
  }

  cargarMarcasEquipo(): Promise<void> {
    this.cargandoMarcas = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService
        .getDropdownByTipo('MAR')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'marca equipo de computo')
          .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id })))
        )
        .subscribe({
          next: (options) => {
            this.marcasEquipo = [{ label: 'Seleccionar marca...', value: '' }, ...options];
            this.cargandoMarcas = false;
            resolve();
          },
          error: (err) => {
            this.cargandoMarcas = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las marcas de equipo', key: 'equipos-computo' });
            reject(err);
          }
        });
    });
  }

  cargarModelosEquipo(): Promise<void> {
    this.cargandoModelos = true;
    return new Promise((resolve, reject) => {
      this.listasValoresService
        .getDropdownByTipo('MOD')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'modelo equipo de computo')
          .map((item) => ({ label: item.nombre, value: item.abreviatura ?? item.nombre ?? item.id })))
        )
        .subscribe({
          next: (options) => {
            this.modelosEquipo = [{ label: 'Seleccionar modelo...', value: '' }, ...options];
            this.cargandoModelos = false;
            resolve();
          },
          error: (err) => {
            this.cargandoModelos = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los modelos', key: 'equipos-computo' });
            reject(err);
          }
        });
    });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos obligatorios',
        key: 'equipos-computo'
      });
      return;
    }

    try {
      this.cargando = true;
      const datosFormulario = this.form.value;
      
      const fechaAdqISO = datosFormulario.fechaAdq ? this.convertirFechaAISO(datosFormulario.fechaAdq) : '';

      const fechaPayload = fechaAdqISO ? `${fechaAdqISO}T12:00:00Z` : '';

      const payload: Omit<EquiposComputo, 'id' | 'creadoEn' | 'actualizadoEn'> = {
        nombre: datosFormulario.nombre || '',
        tipo: datosFormulario.tipo || '',
        marca: datosFormulario.marca || undefined,
        modelo: datosFormulario.modelo || undefined,
        serial: datosFormulario.serial || '',
        ubicacion: datosFormulario.ubicacion || undefined,
        fechaAdq: fechaPayload
      };

      if (this.modoEdicion && this.equipoSeleccionado) {
        await this.equiposComputoService.update(this.equipoSeleccionado.id, payload).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: 'Equipo actualizado',
          detail: `El equipo "${payload.nombre}" ha sido actualizado correctamente`,
          key: 'equipos-computo'
        });
      } else {
        await this.equiposComputoService.create(payload).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: 'Equipo registrado',
          detail: `El equipo "${payload.nombre}" ha sido registrado correctamente`,
          key: 'equipos-computo'
        });
      }

      this.ultimoEquipoGuardado = payload.nombre;
      this.mostrarNotificacionExitoVisual = true;
      setTimeout(() => this.cerrarNotificacionExito(), 4000);

      this.limpiarFormulario();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.modoEdicion ? 
          'No se pudo actualizar el equipo' : 
          'No se pudo registrar el equipo',
        key: 'equipos-computo'
      });
    } finally {
      this.cargando = false;
    }
  }

  editarEquipo(equipo: EquiposComputo): void {
    this.modoEdicion = true;
    this.equipoSeleccionado = equipo;
    
    const fechaAdqDate = equipo.fechaAdq ? this.parsearFechaLocal(equipo.fechaAdq) : '';

    this.form.patchValue({
      nombre: equipo.nombre,
      tipo: equipo.tipo,
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      serial: equipo.serial,
      ubicacion: equipo.ubicacion || '',
      fechaAdq: fechaAdqDate
    });
  }

  confirmarEliminar(equipo: EquiposComputo): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el equipo "${equipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminarEquipo(equipo.id)
    });
  }

  async eliminarEquipo(id: string): Promise<void> {
    try {
      await this.equiposComputoService.delete(id).toPromise();
      this.messageService.add({
        severity: 'success',
        summary: 'Equipo eliminado',
        detail: 'El equipo ha sido eliminado correctamente',
        key: 'equipos-computo'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar el equipo',
        key: 'equipos-computo'
      });
    }
  }

  limpiarFormulario(): void {
    this.form.reset({
      nombre: '',
      tipo: '',
      marca: '',
      modelo: '',
      serial: '',
      ubicacion: '',
      fechaAdq: null
    });
    this.form.markAsUntouched();
    this.modoEdicion = false;
    this.equipoSeleccionado = null;
  }

  esInvalido(nombreCampo: string): boolean {
    const control = this.form.get(nombreCampo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(nombreCampo: string): string {
    const control = this.form.get(nombreCampo);
    if (!control || !control.errors) return '';

    const errores = control.errors;
    if (errores['required']) return 'Este campo es obligatorio';
    if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  cerrarNotificacionExito(): void {
    this.mostrarNotificacionExitoVisual = false;
  }

  agregarNuevaMarca(marca: string): void {
    if (marca && marca.trim() && !this.marcasEquipo.find(m => m.value === marca.trim())) {
      this.marcasEquipo.push({ label: marca.trim(), value: marca.trim() });
    }
  }

  agregarNuevoModelo(modelo: string): void {
    if (modelo && modelo.trim() && !this.modelosEquipo.find(m => m.value === modelo.trim())) {
      this.modelosEquipo.push({ label: modelo.trim(), value: modelo.trim() });
    }
  }

  obtenerLabelTipo(value: string): string {
    return this.tiposEquipo.find(t => t.value === value)?.label ?? value;
  }

  obtenerLabelMarca(value: string): string {
    return this.marcasEquipo.find(m => m.value === value)?.label ?? value;
  }

  obtenerLabelModelo(value: string): string {
    return this.modelosEquipo.find(m => m.value === value)?.label ?? value;
  }

  obtenerModelosPorMarca(): OpcionSelect[] {
    return this.modelosEquipo;
  }

  get nombreInvalido(): boolean {
    return this.esInvalido('nombre');
  }

  get tipoInvalido(): boolean {
    return this.esInvalido('tipo');
  }

  get serialInvalido(): boolean {
    return this.esInvalido('serial');
  }

  get fechaAdqInvalida(): boolean {
    return this.esInvalido('fechaAdq');
  }

  private convertirFechaAISO(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';

    try {
      if (typeof fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
        fecha = new Date(fecha);
      }

      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';

      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  private parsearFechaLocal(fecha: string | Date | null | undefined): Date | '' {
    if (!fecha) return '';

    if (fecha instanceof Date) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }

    const s = String(fecha || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d);
    }

    const tMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (tMatch) {
      const parts = tMatch[1].split('-');
      const y = Number(parts[0]);
      const mo = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      return new Date(y, mo, d);
    }

    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}
