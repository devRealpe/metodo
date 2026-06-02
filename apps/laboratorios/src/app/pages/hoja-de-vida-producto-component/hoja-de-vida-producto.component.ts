import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, map } from 'rxjs';
import { MessageService, SharedModule } from 'primeng/api';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { HojaDeVidaProducto, opcionesEstadoActual, opcionesCalibTipo, opcionesCalibPeriodicidad } from '../../core/models/hoja-de-vida-producto.model';
import { HojaDeVidaProductoService } from '../../core/services/hoja-de-vida-producto.service';
import { EquipoService } from '../../core/services/equipo.service';
import { EquiposComputoService } from '../../core/services/equipos-computo.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { MantenimientosService } from '../../core/services/mantenimientos.service';
import { Equipo } from '../../core/models/equipo.model';
import { EquiposComputo } from '../../core/models/equipos-computo.model';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { Mantenimiento } from '../../core/models/mantenimiento.model';
import { SelectComponent, InputComponent, DatepickerComponent } from "@microfrontends/shared-ui";
import { AuthService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-hoja-de-vida-producto',
  standalone: true, 
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    SelectModule,
    DatePickerModule,
    TableModule,
    SharedModule,
    SelectComponent,
    InputComponent,
    DatepickerComponent
],
  providers: [MessageService],
  templateUrl: './hoja-de-vida-producto.component.html',
  styleUrl: './hoja-de-vida-producto.component.scss',
})
export class HojaDeVidaProductoComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private hojaDeVidaProductoService = inject(HojaDeVidaProductoService);
  private equipoService = inject(EquipoService);
  private equiposComputoService = inject(EquiposComputoService);
  private laboratoriosService = inject(LaboratoriosService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private mantenimientosService = inject(MantenimientosService);
  private listasValoresService = inject(ListasValoresService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  isAdmin = false;

  cargandoEstadosActual = false;
  cargandoCalibTipo = false;
  cargandoCalibPeriodicidad = false;

  form!: FormGroup;

  opcionesEstadoActual: { label: string; value: string }[] = opcionesEstadoActual;
  opcionesCalibTipo: { label: string; value: string }[] = opcionesCalibTipo;
  opcionesCalibPeriodicidad: { label: string; value: string }[] = opcionesCalibPeriodicidad;

  tiposEquipo = [
    { label: 'Maquinaria de laboratorios', value: 'equipo' },
    { label: 'Equipo de Cómputo', value: 'equipo_comp' }
  ];

  equipos: Equipo[] = [];
  equiposComputo: EquiposComputo[] = [];
  equipoSeleccionado: Equipo | EquiposComputo | null = null;
  
  mantenimientos: Mantenimiento[] = [];
  cargandoMantenimientos = false;

  laboratorios: Laboratorio[] = [];
  laboratoriosFiltrados: Laboratorio[] = [];
  mostrarListaLaboratorios = false;
  
  usuarios: UsuarioOracle[] = [];
  usuariosFiltrados: UsuarioOracle[] = [];
  mostrarListaUsuarios = false;
  mostrarListaUsuariosUso = false; 

  hojasDeVida: HojaDeVidaProducto[] = [];
  hojaDeVidaSeleccionada: HojaDeVidaProducto | null = null;

  modoEdicion = false;
  cargando = false;

  ngOnInit(): void {
    this.inicializarFormulario();
    this.configurarValidacionesDinamicas();
    this.cargarDatos();

    try {
      this.isAdmin = this.authService.hasRole('ADMIN');
    } catch {
      this.isAdmin = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      tipoEquipo: ['equipo', Validators.required],
      equipoId: [null],
      equipoComputoId: [null],
      dependencia: ['', Validators.required],
      responsable: ['', Validators.required],
      fechaElaboracion: [new Date(), Validators.required],
      marca: [''],
      modelo: [''],
      referencia: [''],
      numeroSerie: [''],
      accesorios: [''],
      proveedorNombre: [''],
      proveedorTelefono: [''],
      costoAdquisicion: [null],
      caracteristicas: [''],
      requisitosFabricante: [''],
      mantIndicadoFab: [''],
      calibTipo: [''],
      calibPeriodicidad: [''],
      codigoInventario: [''],
      garantiaMeses: [null],
      garantiaInicio: [null],
      garantiaFin: [null],
      anio: [null],
      valorEquipo: [null],
      depreciacion: [null],
      valorActual: [null],
      vidaUtilAnios: [null],
      valorResidual: [null],
      valorDepreciacionAnual: [null],
      valorDepreciacionMensual: [null],
      usuarioResponsable: [''],
      laboratorioUbicacion: [''],
      proyectoAsociado: [''],
      estadoActual: ['Operativo', Validators.required],
      observacionesGenerales: ['']
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    
    this.equipoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.equipos = data;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los equipos'
          });
        }
      });

    this.equiposComputoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: unknown) => {
          if (response && typeof response === 'object' && 'content' in response && Array.isArray((response as { content: unknown }).content)) {
            this.equiposComputo = (response as { content: EquiposComputo[] }).content;
          } else if (Array.isArray(response)) {
            this.equiposComputo = response as EquiposComputo[];
          } else {
            this.equiposComputo = [];
          }
        },
        error: () => {
          this.equiposComputo = [];
        }
      });

    this.hojaDeVidaProductoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.hojasDeVida = data;
          this.cargando = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las hojas de vida'
          });
          this.cargando = false;
        }
      });

    this.laboratoriosService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (laboratorios) => {
          this.laboratorios = laboratorios;
          this.laboratoriosFiltrados = laboratorios;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los laboratorios'
          });
        }
      });

    this.usuariosOracleService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
          const esLaboratorista = (u: UsuarioOracle) => (u.cargo || '').toUpperCase().includes('LABORATORISTA');
          this.usuariosFiltrados = this.usuarios.filter(esLaboratorista);
        },
        error: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar los usuarios. Puede escribir manualmente.'
          });
        }
      });

    Promise.allSettled([
      this.cargarEstadosActuales(),
      this.cargarCalibTipo(),
      this.cargarCalibPeriodicidad()
    ]).catch(() => {});
  }

  configurarValidacionesDinamicas(): void {
    this.form.get('tipoEquipo')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((tipo) => {
        this.onTipoEquipoChange(tipo);
      });

    this.form.get('equipoId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((equipoId) => {
        if (equipoId) {
          this.onEquipoSeleccionado(equipoId);
        }
      });

    this.form.get('equipoComputoId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((equipoCompId) => {
        if (equipoCompId) {
          this.onEquipoComputoSeleccionado(equipoCompId);
        }
      });

    this.form.get('costoAdquisicion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((costo) => {
        if (costo !== null && costo !== undefined && costo !== '') {
          this.form.patchValue({
            valorEquipo: costo
          }, { emitEvent: false }); 
        }
      });
  }

  private onTipoEquipoChange(tipo: 'equipo' | 'equipo_comp'): void {
    const equipoIdControl = this.form.get('equipoId');
    const equipoCompIdControl = this.form.get('equipoComputoId');

    if (tipo === 'equipo') {
      equipoIdControl?.setValidators([Validators.required]);
      equipoCompIdControl?.clearValidators();
      this.form.patchValue({ equipoComputoId: null });
    } else {
      equipoCompIdControl?.setValidators([Validators.required]);
      equipoIdControl?.clearValidators();
      this.form.patchValue({ equipoId: null });
    }

    equipoIdControl?.updateValueAndValidity();
    equipoCompIdControl?.updateValueAndValidity();
    this.equipoSeleccionado = null;
    this.mantenimientos = [];
  }

  private onEquipoSeleccionado(equipoId: string): void {
    const equipo = this.equipos.find(e => e.id === equipoId);
    if (equipo) {
      this.equipoSeleccionado = equipo;
      this.autocompletarDatosEquipo(equipo);
      this.cargarMantenimientosEquipo();
    }
  }

  private onEquipoComputoSeleccionado(equipoCompId: string): void {
    const equipoComputo = this.equiposComputo.find(e => e.id === equipoCompId);
    if (equipoComputo) {
      this.equipoSeleccionado = equipoComputo;
      this.autocompletarDatosEquipo(equipoComputo);
      this.cargarMantenimientosEquipo();
    }
  }

  private cargarMantenimientosEquipo(): void {
    if (!this.equipoSeleccionado) {
      this.mantenimientos = [];
      return;
    }

    this.cargandoMantenimientos = true;
    this.mantenimientos = [];

    let serial = '';
    if ('serial' in this.equipoSeleccionado) {
      serial = this.equipoSeleccionado.serial || '';
    }

    if (!serial) {
      this.cargandoMantenimientos = false;
      return;
    }

    this.mantenimientosService.getMantenimientosBySerial(serial)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mantenimientos) => {
          this.mantenimientos = mantenimientos.sort((a, b) => {
            const fechaA = new Date(a.fechaProgramada).getTime();
            const fechaB = new Date(b.fechaProgramada).getTime();
            return fechaB - fechaA;
          });
          this.cargandoMantenimientos = false;
        },
        error: (error) => {
          this.mantenimientos = [];
          this.cargandoMantenimientos = false;
          
          if (error.status !== 404) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: `No se pudieron cargar los mantenimientos del equipo (${error.status})`
            });
          }
        }
      });
  }

  private autocompletarDatosEquipo(equipo: Equipo | EquiposComputo): void {
    const datosComunes = {
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      numeroSerie: ('serial' in equipo) ? equipo.serial : '',
    };

    if ('placa' in equipo) {
      const equipoRegular = equipo as Equipo;
      this.form.patchValue({
        ...datosComunes,
        codigoInventario: equipoRegular.placa || equipoRegular.codigoInterno || '',
        referencia: equipoRegular.fechaAdq ? this.formatearFecha(equipoRegular.fechaAdq) : '',
        accesorios: equipoRegular.otrosAccesorios || '',
        observacionesGenerales: equipoRegular.observaciones || '',
        dependencia: equipoRegular.ubicacion || '',
        laboratorioUbicacion: equipoRegular.ubicacion || '',
        garantiaInicio: equipoRegular.fechaAdq ? this.parsearFechaLocal(equipoRegular.fechaAdq) : null
      });
    } else {
      const equipoComputo = equipo as EquiposComputo;
      this.form.patchValue({
        ...datosComunes,
        codigoInventario: equipoComputo.serial || '',
        referencia: equipoComputo.fechaAdq ? this.formatearFecha(equipoComputo.fechaAdq) : '',
        dependencia: equipoComputo.ubicacion || '',
        laboratorioUbicacion: equipoComputo.ubicacion || '',
        garantiaInicio: equipoComputo.fechaAdq ? this.parsearFechaLocal(equipoComputo.fechaAdq) : null
      });
    }
  }

  private parsearFechaLocal(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }
    const s = String(fecha || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const tMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (tMatch) {
      const parts = tMatch[1].split('-');
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private formatearFecha(fechaISO: string | Date | null | undefined): string {
    try {
      const fecha = this.parsearFechaLocal(fechaISO as string | Date);
      if (!fecha) return typeof fechaISO === 'string' ? fechaISO : '—';
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}/${mes}/${anio}`;
    } catch (error) {
      return typeof fechaISO === 'string' ? fechaISO : '—';
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete los campos requeridos'
      });
      return;
    }

    const hojaDeVida: HojaDeVidaProducto = this.form.value;

    if (this.modoEdicion && this.hojaDeVidaSeleccionada) {
      this.actualizar(hojaDeVida);
    } else {
      this.crear(hojaDeVida);
    }
  }

  crear(hojaDeVida: HojaDeVidaProducto): void {
    this.cargando = true;

    const prepararFechaISO = (valor: any): string | null => {
      if (!valor) return null;
      if (valor instanceof Date) return this.convertirFechaAISO(valor);
      const s = String(valor).trim();
      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];
      const d = new Date(s);
      if (!isNaN(d.getTime())) return this.convertirFechaAISO(d);
      return null;
    };

    const payload: any = { ...hojaDeVida };

    const tipo = this.form.get('tipoEquipo')?.value;
    const normalizarId = (id: any) => {
      if (id === '' || id === undefined || id === null) return null;
      return id;
    };

    payload.equipoId = normalizarId(payload.equipoId);
    payload.equipoComputoId = normalizarId(payload.equipoComputoId);

    if (tipo === 'equipo') {
      payload.equipoComputoId = null;
    } else if (tipo === 'equipo_comp') {
      payload.equipoId = null;
    }

    payload.fechaElaboracion = prepararFechaISO(payload.fechaElaboracion);
    payload.garantiaInicio = prepararFechaISO(payload.garantiaInicio);
    payload.garantiaFin = prepararFechaISO(payload.garantiaFin);
    payload.fechaMantenimiento = prepararFechaISO(payload.fechaMantenimiento);

    if (payload.costoAdquisicion != null) payload.costoAdquisicion = Number(payload.costoAdquisicion);
    if (payload.valorEquipo != null) payload.valorEquipo = Number(payload.valorEquipo);
    if (payload.valorActual != null) payload.valorActual = Number(payload.valorActual);

    const checkAndCreate = () => {
      this.hojaDeVidaProductoService.create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Hoja de vida de producto creada correctamente' });
            this.hojasDeVida.push(data);
            this.cancelar();
            this.cargando = false;
          },
          error: (err) => {
            if (err && err.status === 400) {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la hoja: ya existe una hoja para este equipo' });
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la hoja de vida de producto' });
            }
            this.cargando = false;
          }
        });
    };

    if (payload.equipoId) {
      this.hojaDeVidaProductoService.getByEquipoId(payload.equipoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Ya existe una hoja de vida para el equipo seleccionado' });
            this.cargando = false;
          },
          error: (err) => {
            if (err && err.status === 404) {
              checkAndCreate();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al verificar existencia de hoja para el equipo' });
              this.cargando = false;
            }
          }
        });
      return;
    }

    if (payload.equipoComputoId) {
      this.hojaDeVidaProductoService.getByEquipoComputoId(payload.equipoComputoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Ya existe una hoja de vida para el equipo de cómputo seleccionado' });
            this.cargando = false;
          },
          error: (err) => {
            if (err && err.status === 404) {
              checkAndCreate();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al verificar existencia de hoja para el equipo de cómputo' });
              this.cargando = false;
            }
          }
        });
      return;
    }

    checkAndCreate();
  }

  actualizar(hojaDeVida: HojaDeVidaProducto): void {
    if (!this.hojaDeVidaSeleccionada?.id) return;

    this.cargando = true;
    this.hojaDeVidaProductoService.update(this.hojaDeVidaSeleccionada.id, hojaDeVida)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Hoja de vida de producto actualizada correctamente'
          });
          const index = this.hojasDeVida.findIndex(h => h.id === this.hojaDeVidaSeleccionada?.id);
          if (index !== -1) {
            this.hojasDeVida[index] = data;
          }
          this.cancelar();
          this.cargando = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la hoja de vida de producto'
          });
          this.cargando = false;
        }
      });
  }

  editar(hojaDeVida: HojaDeVidaProducto): void {
    this.hojaDeVidaSeleccionada = hojaDeVida;
    this.modoEdicion = true;
    
    this.form.patchValue({
      ...hojaDeVida,
      fechaElaboracion: hojaDeVida.fechaElaboracion ? new Date(hojaDeVida.fechaElaboracion) : null,
      garantiaInicio: hojaDeVida.garantiaInicio ? new Date(hojaDeVida.garantiaInicio) : null,
      garantiaFin: hojaDeVida.garantiaFin ? new Date(hojaDeVida.garantiaFin) : null,
      fechaMantenimiento: hojaDeVida.fechaMantenimiento ? new Date(hojaDeVida.fechaMantenimiento) : null,
    });
  }

  eliminar(hojaDeVida: HojaDeVidaProducto): void {
    if (!hojaDeVida.id) return;

    if (!confirm('¿Está seguro de eliminar esta hoja de vida de producto?')) {
      return;
    }

    this.cargando = true;
    this.hojaDeVidaProductoService.delete(hojaDeVida.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Hoja de vida de producto eliminada correctamente'
          });
          this.hojasDeVida = this.hojasDeVida.filter(h => h.id !== hojaDeVida.id);
          this.cargando = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la hoja de vida de producto'
          });
          this.cargando = false;
        }
      });
  }

  cancelar(): void {
    this.form.reset({
      tipoEquipo: 'equipo',
      fechaElaboracion: new Date(),
      estadoActual: 'Operativo'
    });
    this.hojaDeVidaSeleccionada = null;
    this.equipoSeleccionado = null;
    this.mantenimientos = [];
    this.modoEdicion = false;
  }

  esInvalido(nombre: string): boolean {
    const ctrl = this.form.get(nombre);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  calcularDepreciacion(): void {
    const valorEquipo = this.form.get('valorEquipo')?.value;
    const vidaUtilAnios = this.form.get('vidaUtilAnios')?.value;

    if (valorEquipo && vidaUtilAnios && vidaUtilAnios > 0) {
      this.hojaDeVidaProductoService.calcularDepreciacionesCompletas(valorEquipo, vidaUtilAnios)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (resultado) => {
            this.form.patchValue({
              valorResidual: resultado.valorResidual,
              valorDepreciacionAnual: resultado.depreciacionAnual,
              valorDepreciacionMensual: resultado.depreciacionMensual,
              depreciacion: resultado.depreciacionTotal5Años
            });
          },
          error: () => {
            const valorResidual = this.form.get('valorResidual')?.value || 0;
            const depreciacionAnual = (valorEquipo - valorResidual) / vidaUtilAnios;
            const depreciacionMensual = depreciacionAnual / 12;
            const depreciacionAcumulada5Años = depreciacionAnual * Math.min(5, vidaUtilAnios);

            this.form.patchValue({
              valorDepreciacionAnual: depreciacionAnual,
              valorDepreciacionMensual: depreciacionMensual,
              depreciacion: depreciacionAcumulada5Años
            });

            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Se calculó la depreciación localmente (el servidor no está disponible)'
            });
          }
        });
    }
  }

  calcularGarantiaFin(): void {
    const garantiaInicio = this.form.get('garantiaInicio')?.value;
    const garantiaMeses = this.form.get('garantiaMeses')?.value;

    if (garantiaInicio && garantiaMeses) {
      const fechaInicioISO = this.convertirFechaAISO(garantiaInicio);
      
      this.hojaDeVidaProductoService.calcularFechaFinGarantia(fechaInicioISO, garantiaMeses)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (fechaFinISO) => {
            const fechaFin = new Date(fechaFinISO);
            this.form.patchValue({
              garantiaFin: fechaFin
            });
          },
          error: () => {
            const fecha = new Date(garantiaInicio);
            fecha.setMonth(fecha.getMonth() + garantiaMeses);
            this.form.patchValue({
              garantiaFin: fecha
            });
            
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Se calculó la fecha localmente (el servidor no está disponible)'
            });
          }
        });
    }
  }

  trasladarCostoAValorEquipo(): void {
    const costoAdquisicion = this.form.get('costoAdquisicion')?.value;
    
    if (costoAdquisicion !== null && costoAdquisicion !== undefined && costoAdquisicion !== '') {
      this.form.patchValue({
        valorEquipo: costoAdquisicion
      });
    }
  }

  private convertirFechaAISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  filtrarLaboratorios(event: Event): void {
    const input = event.target as HTMLInputElement;
    const termino = input.value.toLowerCase();
    
    if (termino.length > 0) {
      this.laboratoriosFiltrados = this.laboratorios.filter(lab =>
        lab.nombre.toLowerCase().includes(termino) ||
        lab.ubicacion?.toLowerCase().includes(termino)
      );
      this.mostrarListaLaboratorios = true;
    } else {
      this.laboratoriosFiltrados = this.laboratorios;
      this.mostrarListaLaboratorios = false;
    }
  }

  seleccionarLaboratorio(laboratorio: Laboratorio): void {
    this.form.patchValue({
      dependencia: laboratorio.nombre,
      laboratorioUbicacion: laboratorio.ubicacion || laboratorio.nombre
    });
    this.mostrarListaLaboratorios = false;
  }

  ocultarListaLaboratorios(): void {
    setTimeout(() => {
      this.mostrarListaLaboratorios = false;
    }, 200);
  }

  filtrarUsuarios(event: Event): void {
    const input = event.target as HTMLInputElement;
    const termino = input.value.toLowerCase();

    const esLaboratorista = (u: UsuarioOracle) => (u.cargo || '').toUpperCase().includes('LABORATORISTA');

    if (termino.length > 0) {
      this.usuariosFiltrados = this.usuarios.filter(user =>
        esLaboratorista(user) && (
          user.nombre.toLowerCase().includes(termino) ||
          user.identificacion.toLowerCase().includes(termino) ||
          (user.cargo || '').toLowerCase().includes(termino)
        )
      );
      this.mostrarListaUsuarios = true;
    } else {
      this.usuariosFiltrados = this.usuarios.filter(esLaboratorista);
      this.mostrarListaUsuarios = false;
    }
  }

  cargarEstadosActuales(): Promise<void> {
    this.cargandoEstadosActual = true;
    return new Promise((resolve) => {
      this.listasValoresService.getDropdownByTipo('ESE')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'tipo de estado equipo')
          .map((item) => ({ label: item.nombre, value: (item.nombre ?? '').toString().trim() })))
        )
        .subscribe({
          next: (options) => {
            if (options && options.length) {
              this.opcionesEstadoActual = options;

              const control = this.form.get('estadoActual');
              if (control) {
                const current = control.value as string || '';
                const exists = options.some(o => (o.value || '').toString() === current);
                if (!exists && current) {
                  const match = options.find(o => ((o.label || '') as string).toLowerCase() === current.toString().toLowerCase());
                  if (match) {
                    control.setValue(match.value);
                  } else {
                    control.setValue('');
                  }
                }
              }
            }
            this.cargandoEstadosActual = false;
            resolve();
          },
          error: () => {
            this.cargandoEstadosActual = false;
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar los estados desde la base' });
            resolve();
          }
        });
    });
  }

  cargarCalibTipo(): Promise<void> {
    this.cargandoCalibTipo = true;
    return new Promise((resolve) => {
      this.listasValoresService.getDropdownByTipo('TCA')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'tipo de calibracion')
          .map((item) => ({ label: item.nombre, value: (item.nombre ?? '').toString().trim() })))
        )
        .subscribe({
          next: (options) => {
            if (options && options.length) {
              this.opcionesCalibTipo = options;

              const control = this.form.get('calibTipo');
              if (control) {
                const current = control.value as string || '';
                const exists = options.some(o => (o.value || '').toString() === current);
                if (!exists && current) {
                  const match = options.find(o => ((o.label || '') as string).toLowerCase() === current.toString().toLowerCase());
                  if (match) control.setValue(match.value);
                  else control.setValue('');
                }
              }
            }
            this.cargandoCalibTipo = false;
            resolve();
          },
          error: () => {
            this.cargandoCalibTipo = false;
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar los tipos de calibración desde la base' });
            resolve();
          }
        });
    });
  }

  cargarCalibPeriodicidad(): Promise<void> {
    this.cargandoCalibPeriodicidad = true;
    return new Promise((resolve) => {
      this.listasValoresService.getDropdownByTipo('PER')
        .pipe(
          map((response: any[]) => response
          .filter((item) => ((item.nombre || '') as string).toLowerCase() !== 'periodicidad')
          .map((item) => ({ label: item.nombre, value: (item.nombre ?? '').toString().trim() })))
        )
        .subscribe({
          next: (options) => {
            if (options && options.length) {
              this.opcionesCalibPeriodicidad = options;

              const control = this.form.get('calibPeriodicidad');
              if (control) {
                const current = control.value as string || '';
                const exists = options.some(o => (o.value || '').toString() === current);
                if (!exists && current) {
                  const match = options.find(o => ((o.label || '') as string).toLowerCase() === current.toString().toLowerCase());
                  if (match) control.setValue(match.value);
                  else control.setValue('');
                }
              }
            }
            this.cargandoCalibPeriodicidad = false;
            resolve();
          },
          error: () => {
            this.cargandoCalibPeriodicidad = false;
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar las periodicidades de calibración desde la base' });
            resolve();
          }
        });
    });
  }

  seleccionarUsuario(usuario: UsuarioOracle): void {
    this.form.patchValue({
      responsable: usuario.nombre,
      usuarioResponsable: usuario.nombre
    });
    this.mostrarListaUsuarios = false;
  }

  ocultarListaUsuarios(): void {
    setTimeout(() => {
      this.mostrarListaUsuarios = false;
    }, 200);
  }

  filtrarUsuariosUso(event: Event): void {
    const input = event.target as HTMLInputElement;
    const termino = input.value.toLowerCase();
    
    if (termino.length > 0) {
      this.usuariosFiltrados = this.usuarios.filter(user =>
        user.nombre.toLowerCase().includes(termino) ||
        user.identificacion.toLowerCase().includes(termino) ||
        user.cargo?.toLowerCase().includes(termino)
      );
      this.mostrarListaUsuariosUso = true;
    } else {
      this.usuariosFiltrados = this.usuarios;
      this.mostrarListaUsuariosUso = false;
    }
  }

  seleccionarUsuarioUso(usuario: UsuarioOracle): void {
    this.form.patchValue({
      usuarioResponsable: usuario.nombre
    });
    this.mostrarListaUsuariosUso = false;
  }

  ocultarListaUsuariosUso(): void {
    setTimeout(() => {
      this.mostrarListaUsuariosUso = false;
    }, 200);
  }
}
