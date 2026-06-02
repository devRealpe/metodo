import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbReservaEquipoService } from '../../core/services/lb-reserva-equipo.service';
import { LbReservaEquipo } from '../../core/models/lb-reserva-equipo.model';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';

@Component({
  selector: 'app-lb-reserva-equipo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    DatePickerModule,
    CheckboxModule,
    InputTextModule,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-reserva-equipo.component.html',
})
export class LbReservaEquipoComponent implements OnInit {

  private fb               = inject(FormBuilder);
  private destroyRef       = inject(DestroyRef);
  private reservaEquipoSvc = inject(LbReservaEquipoService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private labAulasSvc      = inject(LbLaboratoriosAulasService);
  private equipoAulaSvc    = inject(LbEquipoAulaService);
  private messageService   = inject(MessageService);

  cargando = false;

  // Reserva por días
  reservaPorDias = false;
  minDateFechaFin: Date = this.buildMinDateFechaFin(null);
  diasReservados = 0;

  // Horas como Date para el datepicker de PrimeNG
  horaInicioDate: Date | null = null;
  horaFinDate: Date | null = null;

  // Usuarios Oracle (solo ESTUDIANTE y PROFESOR)
  usuariosTodos: UsuarioOracle[] = [];
  cargandoUsuarios = false;

  usuarioOpciones: { label: string; value: string }[] = [];

  private buildUsuarioOpciones(): void {
    this.usuarioOpciones = [
      { label: 'Seleccionar usuario...', value: '' },
      ...this.usuariosTodos.map(u => ({
        label: `${u.nombre} - ${u.identificacion}`,
        value: u.identificacion,
      })),
    ];
  }

  // Laboratorios y equipos
  laboratorioOpciones: { label: string; value: string }[] = [];
  equiposDisponibles: LbEquipoAula[] = [];
  equiposSeleccionadosIds = new Set<string>();
  cargandoEquipos = false;
  minDateReserva: Date = new Date();

  get laboratorioSeleccionado(): boolean {
    return !!this.form.get('laboratorioId')?.value;
  }

  // Asistentes
  asistentesList: string[] = [];

  asistenteOpciones: { label: string; value: string }[] = [];

  private buildAsistenteOpciones(): void {
    const yaAgregados = new Set(this.asistentesList);
    this.asistenteOpciones = [
      { label: 'Seleccionar asistente...', value: '' },
      ...this.usuariosTodos
        .filter(u => !yaAgregados.has(u.identificacion))
        .map(u => ({ label: u.nombre, value: u.identificacion })),
    ];
  }

  getNombreUsuario(identificacion: string): string {
    const u = this.usuariosTodos.find(x => x.identificacion === identificacion);
    return u ? u.nombre : identificacion;
  }

  form = this.fb.group({
    identificacion: ['', [Validators.required, Validators.maxLength(50)]],
    fecha:          ['', Validators.required],
    fechaFin:       [null as unknown as Date | null],
    horaInicio:     ['', Validators.required],
    horaFin:        ['', Validators.required],
    laboratorioId:  [''],
    asistente:      [''],
  });

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarLaboratorios();

    // Pre-cargar hora de inicio con la hora actual
    const ahora = new Date();
    this.horaInicioDate = ahora;
    this.form.get('horaInicio')?.setValue(this.formatTime(ahora));

    this.form.get('laboratorioId')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged()
    ).subscribe(idLab => {
      this.onLaboratorioChange(idLab ?? '');
    });

    this.form.get('fecha')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => {
      this.minDateFechaFin = this.buildMinDateFechaFin(val as unknown as Date | null);
      this.recalcularDias();
    });

    this.form.get('fechaFin')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.recalcularDias();
    });
  }

  private buildMinDateFechaFin(fechaVal: Date | null): Date {
    const base = fechaVal instanceof Date ? new Date(fechaVal) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + 1);
    return base;
  }

  private recalcularDias(): void {
    const inicio = this.form.get('fecha')?.value as unknown;
    const fin    = this.form.get('fechaFin')?.value as unknown;
    if (inicio instanceof Date && fin instanceof Date) {
      const d1 = new Date(inicio); d1.setHours(0, 0, 0, 0);
      const d2 = new Date(fin);    d2.setHours(0, 0, 0, 0);
      const ms = d2.getTime() - d1.getTime();
      this.diasReservados = ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : 0;
    } else {
      this.diasReservados = 0;
    }
  }

  onReservaPorDiasChange(): void {
    const ctrl = this.form.get('fechaFin');
    if (this.reservaPorDias) {
      ctrl?.setValidators([Validators.required]);
    } else {
      ctrl?.clearValidators();
      ctrl?.setValue(null);
    }
    ctrl?.updateValueAndValidity();
  }

  onHoraInicioChange(date: Date | null): void {
    this.horaInicioDate = date;
    this.form.get('horaInicio')?.setValue(date ? this.formatTime(date) : '');
    this.form.get('horaInicio')?.markAsTouched();
  }

  onHoraFinChange(date: Date | null): void {
    this.horaFinDate = date;
    this.form.get('horaFin')?.setValue(date ? this.formatTime(date) : '');
    this.form.get('horaFin')?.markAsTouched();
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  toggleEquipo(id: string): void {
    if (this.equiposSeleccionadosIds.has(id)) {
      this.equiposSeleccionadosIds.delete(id);
    } else {
      this.equiposSeleccionadosIds.add(id);
    }
  }

  estaSeleccionado(id: string): boolean {
    return this.equiposSeleccionadosIds.has(id);
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios = true;
    this.usuariosOracleSvc.getAll().subscribe({
      next: data => {
        this.usuariosTodos = data.filter(u => {
          const cargo = u.cargo?.toUpperCase() ?? '';
          return cargo === 'ESTUDIANTE' || cargo === 'PROFESOR';
        });
        this.cargandoUsuarios = false;
        this.buildUsuarioOpciones();
        this.buildAsistenteOpciones();
      },
      error: () => {
        this.cargandoUsuarios = false;
        this.mostrarError('No se pudo cargar la lista de usuarios.');
      },
    });
  }

  cargarLaboratorios(): void {
    this.labAulasSvc.getAll().subscribe({
      next: data => {
        this.laboratorioOpciones = [
          { label: 'Seleccionar laboratorio...', value: '' },
          ...data.map(l => ({ label: `${l.nomAula} (${l.codAula})`, value: l.id })),
        ];
      },
      error: () => this.mostrarError('No se pudo cargar la lista de laboratorios.'),
    });
  }

  onLaboratorioChange(idLab: string): void {
    this.equiposDisponibles = [];
    this.equiposSeleccionadosIds = new Set();
    if (!idLab) return;
    this.cargandoEquipos = true;
    this.equipoAulaSvc.getByLaboratorio(idLab).subscribe({
      next: data => {
        this.equiposDisponibles = data.filter(e => e.equipoUnidad?.id);
        this.cargandoEquipos = false;
      },
      error: () => {
        this.cargandoEquipos = false;
        this.mostrarError('No se pudo cargar los equipos del laboratorio.');
      },
    });
  }

  agregarAsistente(): void {
    const id = this.form.get('asistente')?.value as string;
    if (!id) return;
    if (!this.asistentesList.includes(id)) {
      this.asistentesList = [...this.asistentesList, id];
      this.buildAsistenteOpciones();
    }
    this.form.get('asistente')?.setValue('');
  }

  eliminarAsistente(i: number): void {
    this.asistentesList = this.asistentesList.filter((_, idx) => idx !== i);
    this.buildAsistenteOpciones();
  }

  limpiarFormulario(): void {
    this.asistentesList = [];
    this.equiposDisponibles = [];
    this.equiposSeleccionadosIds = new Set();
    this.horaInicioDate = null;
    this.horaFinDate = null;
    this.reservaPorDias = false;
    this.diasReservados = 0;
    this.form.get('fechaFin')?.clearValidators();
    this.form.get('fechaFin')?.updateValueAndValidity();
    this.form.reset({}, { emitEvent: false });
    this.form.markAsUntouched();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;

    const fechaRaw = v.fecha as unknown;
    let fechaStr = '';
    if (fechaRaw instanceof Date) {
      const y = fechaRaw.getFullYear();
      const mo = String(fechaRaw.getMonth() + 1).padStart(2, '0');
      const d = String(fechaRaw.getDate()).padStart(2, '0');
      fechaStr = `${y}-${mo}-${d}`;
    } else {
      fechaStr = (fechaRaw as string) ?? '';
    }

    const payload: LbReservaEquipo = {
      identificacion: v.identificacion ?? '',
      fecha: fechaStr,
      horaInicio: v.horaInicio ?? '',
      horaFin: v.horaFin ?? '',
      detalles: [...this.equiposSeleccionadosIds].map(id => ({ equipoUnidad: { id } })),
      asistentes: this.asistentesList.map(identificacion => ({ identificacion })),
    };

    if (this.reservaPorDias) {
      const fechaFinRaw = v.fechaFin as unknown;
      if (fechaFinRaw instanceof Date) {
        const y = fechaFinRaw.getFullYear();
        const mo = String(fechaFinRaw.getMonth() + 1).padStart(2, '0');
        const d = String(fechaFinRaw.getDate()).padStart(2, '0');
        payload.fechaFin = `${y}-${mo}-${d}`;
      }
    }

    this.cargando = true;
    this.reservaEquipoSvc.create(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Exito', detail: 'Reserva creada correctamente.' });
        this.cargando = false;
        this.limpiarFormulario();
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.mensaje ?? 'Error al guardar la reserva.';
        this.mostrarError(msg);
      },
    });
  }

  esInvalido(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c && c.invalid && c.touched);
  }

  private mostrarError(msg: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }
}
