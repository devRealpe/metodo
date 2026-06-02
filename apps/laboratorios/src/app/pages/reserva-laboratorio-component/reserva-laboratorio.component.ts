import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { Subject, of, forkJoin, takeUntil } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { UsuarioExterno } from '../../core/models/usuario-externos.model';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { TipoPracticaService } from '../../core/services/tipo-practica.service';
import { TipoPractica } from '../../core/models/tipo-practica.model';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { ReservaAula, ReservaAsistente, ReservaEquipo, ReservaSuministro } from '../../core/models/reserva-aula.model';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbSuministroAulaService } from '../../core/services/lb-suministro-aula.service';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { LbSuministroAula } from '../../core/models/lb-suministro-aula.model';
import { LbAsistenciaHorarioService, LbAsistenciaHorario, ConflictoResponse, RangosLibresResponse } from '../../core/services/lb-asistencia-horario.service';

interface EquipoCategoriaGrupo {
  categoria: string;
  totalDisponible: number;
  totalStock: number;
  items: LbEquipoAula[];
}

@Component({
  selector: 'app-reserva-laboratorio',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    StepperModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    TagModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent
  ],
  providers: [MessageService],
  templateUrl: './reserva-laboratorio.component.html'
})
export class ReservaLaboratorioComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosOracleService = inject(UsuariosOracleService);
  private readonly usuariosExternosService = inject(UsuariosExternosService);
  private readonly laboratoriosService = inject(LaboratoriosService);
  private readonly oraAulasService = inject(OraAulasService);
  private readonly lbLaboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private readonly messageService = inject(MessageService);
  private readonly tipoPracticaService = inject(TipoPracticaService);
  private readonly reservasSvc = inject(ReservasAulaService);
  private readonly equipoAulaSvc = inject(LbEquipoAulaService);
  private readonly suministroAulaSvc = inject(LbSuministroAulaService);
  private readonly asistenciaHorarioSvc = inject(LbAsistenciaHorarioService);
  private readonly destroy$ = new Subject<void>();

  stepReserva = 1;
  hoy = new Date();
  aulasOptionsReserva: { label: string; value: string; numCapacidad: number }[] = [];
  aulaReservaSeleccionada: { value: string; numCapacidad: number } | null = null;
  lbAulas: LbLaboratoriosAulas[] = [];
  conflictoHorario = false;
  mensajeConflicto = '';
  cargandoReserva = false;
  reservasSolapadasCount = 0;
  cuposOcupados = 0;
  cargandoDisponibilidad = false;
  usuarioReserva: { nombre: string; identificacion: string } | null = null;

  // Opciones de hora en intervalos de 30 min
  todasLasHoras: { label: string; value: string }[] = this.generarTodasLasHoras();

  equiposLab: LbEquipoAula[] = [];
  suministrosLab: LbSuministroAula[] = [];
  private equiposLabOriginal: LbEquipoAula[] = [];
  private suministrosLabOriginal: LbSuministroAula[] = [];
  equiposSeleccionados: { equipoAula: LbEquipoAula; cantidad: number }[] = [];
  suministrosSeleccionados: { suministroAula: LbSuministroAula; cantidad: number }[] = [];
  equiposGrupoSel: Map<string, number> = new Map();
  cargandoInventario = false;

  laboratorios: Laboratorio[] = [];
  cuposDisponibles = new Map<string, number>();
  estadoLab = new Map<string, string>();

  aulasHijas: LbLaboratoriosAulas[] = [];
  aulasHijasOptions: { label: string; value: string; numCapacidad: number }[] = [];
  aulaHijaSeleccionada: LbLaboratoriosAulas | null = null;
  cargandoHijos = false;

  todosTiposPractica: TipoPractica[] = [];
  cargandoTipoPractica = false;
  practicasDisponibles: { label: string; value: string }[] = [];
  tipoPracticaReservaCtrl = this.fb.control('');

  // ─── PARTICIPANTES ──────────────────────────────────────────────────────────
  participantes: { nombre: string; identificacion: string }[] = [];
  formParticipante = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9]+$/)]]
  });
  cargandoParticipante = false;

  // ─── CARGA MASIVA EXCEL ─────────────────────────────────────────────────────
  @ViewChild('excelFileInput') excelFileInput!: ElementRef<HTMLInputElement>;
  cargandoExcel = false;
  excelResultado: { tipo: 'success' | 'warn' | 'error'; mensaje: string } | null = null;

  // ─── HORARIOS DEL DÍA ──────────────────────────────────────────────────────
  /** Clases Oracle activas para el aula y fecha seleccionados (calculadas por el backend) */
  horariosOcupados: { horaInicio: string; horaFin: string; materia?: string }[] = [];
  /** Rangos de tiempo libres para reservar (calculados por el backend) */
  rangosLibres: { inicio: string; fin: string }[] = [];

  // ─── ASISTENCIA DEL LAB (para reserva) ────────────────────────────────────
  asistenciaSemanasReserva: LbAsistenciaHorario[] = [];
  cargandoAsistenciaReserva = false;
  mostrarTablaAsistencia = true;

  /** Rangos de horas disponibles para reservar (calculados por el backend: Oracle + no-uso) */
  get rangosDisponibles(): { inicio: string; fin: string; inicioLabel: string; finLabel: string }[] {
    const rangos = this.rangosLibres.map(r => {
      const [ih, im] = r.inicio.split(':').map(Number);
      const [fh, fm] = r.fin.split(':').map(Number);
      return {
        inicio: r.inicio,
        fin: r.fin,
        inicioLabel: this.formatLabel(ih || 0, im || 0),
        finLabel: this.formatLabel(fh || 0, fm || 0)
      };
    });

    // Filtrar si es hoy: solo rangos cuyo fin sea mayor a la hora actual
    const fecha = this.formReserva.get('fecha')?.value as Date | null;
    if (fecha && this.esHoy(fecha instanceof Date ? fecha : new Date(fecha))) {
      const ahora = new Date();
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
      return rangos.filter(r => this.toMin24(r.fin) > minutosActuales);
    }

    return rangos;
  }

  private formatLabel(h: number, m: number): string {
    const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  formReservaId = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9]+$/)]]
  });

  formReserva = this.fb.group({
    laboratorioId: ['', Validators.required],
    fecha: [new Date() as Date | null, Validators.required],
    horaInicio: ['', Validators.required],
    horaFin: ['', Validators.required],
    observacion: ['']
  });

  get equiposAgrupados(): EquipoCategoriaGrupo[] {
    const map = new Map<string, EquipoCategoriaGrupo>();
    const originales = this.equiposLabOriginal;
    for (const eq of this.equiposLab) {
      const cat = (eq.equipoUnidad?.categoria ?? '').trim() || 'Sin categoría';
      if (!map.has(cat)) {
        map.set(cat, { categoria: cat, totalDisponible: 0, totalStock: 0, items: [] });
      }
      const grupo = map.get(cat);
      if (grupo) {
        const orig = originales.find(o => o.id === eq.id);
        grupo.totalStock += orig?.cantidadDisponible ?? eq.cantidadDisponible ?? 0;
        grupo.totalDisponible += eq.cantidadDisponible ?? 0;
        grupo.items.push(eq);
      }
    }
    return [...map.values()];
  }

  getGrupoReservados(grp: EquipoCategoriaGrupo): number {
    return grp.totalStock - grp.totalDisponible;
  }

  ngOnInit(): void {
    this.cargarLaboratorios();
    this.cargarTipoPractica();

    const labCtrl       = this.formReserva.get('laboratorioId')!;
    const fechaCtrl     = this.formReserva.get('fecha')!;
    const horaInicioCtrl = this.formReserva.get('horaInicio')!;
    const horaFinCtrl   = this.formReserva.get('horaFin')!;

    const actualizarHoraInicio = () => {
      (labCtrl.value && fechaCtrl.value)
        ? horaInicioCtrl.enable({ emitEvent: false })
        : horaInicioCtrl.disable({ emitEvent: false });
    };

    labCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => actualizarHoraInicio());
    fechaCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => actualizarHoraInicio());
    horaInicioCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      val ? horaFinCtrl.enable({ emitEvent: false }) : horaFinCtrl.disable({ emitEvent: false });
    });

    horaInicioCtrl.disable({ emitEvent: false });
    horaFinCtrl.disable({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────────

  private hms(hhmm: string): string {
    return hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  }

  private generarTodasLasHoras(): { label: string; value: string }[] {
    const horas: { label: string; value: string }[] = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 22 && m > 0) break;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const value = `${hh}:${mm}`;
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${h12}:${mm} ${ampm}`;
        horas.push({ label, value });
      }
    }
    return horas;
  }

  private toMin24(hhmm: string): number {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  get horasInicioOptions(): { label: string; value: string }[] {
    let horas = this.todasLasHoras;
    const fecha = this.formReserva.get('fecha')?.value as Date | null;
    if (fecha && this.esHoy(fecha)) {
      const ahora = new Date();
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
      horas = horas.filter(h => this.toMin24(h.value) > minutosActuales);
    }
    // Solo permitir horas dentro de los rangos disponibles
    const rangos = this.rangosDisponibles;
    if (rangos.length > 0) {
      horas = horas.filter(h => {
        const min = this.toMin24(h.value);
        return rangos.some(r => min >= this.toMin24(r.inicio) && min < this.toMin24(r.fin));
      });
    }
    return horas;
  }

  get horasFinOptions(): { label: string; value: string }[] {
    const horaInicio = this.formReserva.get('horaInicio')?.value as string;
    if (!horaInicio) return [];
    const inicioMin = this.toMin24(horaInicio);
    // Encontrar el rango al que pertenece la hora de inicio
    const rangoActual = this.rangosDisponibles.find(r =>
      inicioMin >= this.toMin24(r.inicio) && inicioMin < this.toMin24(r.fin)
    );
    // Solo permitir horas fin dentro del mismo rango disponible
    const finMax = rangoActual ? this.toMin24(rangoActual.fin) : 22 * 60;
    return this.todasLasHoras.filter(h => {
      const min = this.toMin24(h.value);
      return min > inicioMin && min <= finMax;
    });
  }

  onHoraInicioChange(): void {
    this.formReserva.patchValue({ horaFin: '' });
    this.verificarDisponibilidad();
  }

  onFechaChange(): void {
    // Si la hora inicio seleccionada ya no está disponible (pasó), limpiarla
    const horaInicio = this.formReserva.get('horaInicio')?.value as string;
    if (horaInicio && !this.horasInicioOptions.some(h => h.value === horaInicio)) {
      this.formReserva.patchValue({ horaInicio: '', horaFin: '' });
    }
    this.cargarDisponibilidadYAsistencia();
    this.verificarDisponibilidad();
  }

  private toMin(hhmm: string): number {
    if (!hhmm) return 0;
    const upper = hhmm.trim().toUpperCase();
    const isPM = upper.includes('PM');
    const isAM = upper.includes('AM');
    const clean = upper.replace('AM', '').replace('PM', '').trim();
    const [hPart, mPart] = clean.split(':');
    let h = parseInt(hPart, 10);
    const m = parseInt(mPart, 10);
    if (isNaN(h)) return 0;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + (isNaN(m) ? 0 : m);
  }

  private getDiaNombreES(d: Date): string {
    return ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][d.getDay()];
  }

  private horaFinEsValida(horaInicio: string, horaFin: string): boolean {
    const inicioMin = this.toMin(horaInicio);
    const finMin = this.toMin(horaFin);
    if (inicioMin === 0 && finMin === 0) return false;
    return finMin - inicioMin >= 1;
  }

  private obtenerCuposInicialesDeLaboratorio(l: Laboratorio): number {
    const labRecord = l as unknown as Record<string, unknown>;
    return Number(labRecord['cuposDisponibles'] ?? labRecord['capacidadDisponible'] ?? labRecord['cupos'] ?? l.capacidad ?? 0);
  }

  invalidReserva(ctrl: string): boolean {
    const c = this.formReserva.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  invalidReservaId(ctrl: string): boolean {
    const c = this.formReservaId.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  // ─── CARGAR DATOS ─────────────────────────────────────────────────────────────

  private cargarLaboratorios(): void {
    this.oraAulasService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: aulasOracle => {
          const aulasLaboratorios = (aulasOracle ?? []).filter(aula => {
            const esLaboratorio = aula.tipoAula?.toLowerCase().includes('laboratorio');
            const noEsVirtual = aula.nomAula?.toLowerCase() !== 'virtual';
            return esLaboratorio && noEsVirtual;
          });

          if (aulasLaboratorios.length > 0) {
            this.lbLaboratoriosAulasService.sincronizarDesdeOracle(aulasLaboratorios)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.laboratorios = aulasLaboratorios.map(aula => ({
                    id: aula.codAula,
                    nombre: aula.nomAula,
                    capacidad: aula.numCapacidad,
                    estado: 'Disponible',
                    tipo: aula.tipoAula,
                    bloque: aula.nomBloque,
                    ubicacion: `${aula.nomBloque} - ${aula.codAula}`
                  } as Laboratorio));

                  this.laboratorios.forEach(lab => {
                    const idStr = String(lab.id);
                    const cuposLibres = this.obtenerCuposInicialesDeLaboratorio(lab);
                    this.cuposDisponibles.set(idStr, cuposLibres);
                    const estadoRaw = String(lab.estado ?? 'disponible').toLowerCase();
                    const estadoCalculado = (estadoRaw === 'disponible' && cuposLibres <= 0) ? 'ocupado' : estadoRaw;
                    this.estadoLab.set(idStr, estadoCalculado);
                  });
                  this.buildAulasOptionsReserva();
                },
                error: () => {
                  this.messageService.add({
                    key: 'reserva-toast', life: 6000, severity: 'error',
                    summary: 'Error de sincronización',
                    detail: 'No se pudieron sincronizar los laboratorios. Intente recargar.'
                  });
                }
              });
          } else {
            this.messageService.add({
              key: 'reserva-toast', life: 4000, severity: 'warn',
              summary: 'Sin laboratorios',
              detail: 'No se encontraron laboratorios disponibles.'
            });
          }
        },
        error: () => this.messageService.add({
          key: 'reserva-toast', life: 4000, severity: 'error',
          summary: 'Error', detail: 'No se pudieron cargar los laboratorios desde Oracle.'
        })
      });
  }

  cargarTipoPractica(): void {
    this.cargandoTipoPractica = true;
    this.tipoPracticaReservaCtrl.disable({ emitEvent: false });
    this.tipoPracticaService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TipoPractica[] | any) => {
          const items: TipoPractica[] = Array.isArray(response) ? response : (response?.content ?? []);
          this.todosTiposPractica = items;
          this.practicasDisponibles = [
            { label: 'Seleccionar práctica...', value: '' },
            ...items.map(item => ({ label: item.nombre, value: item.id }))
          ];
          this.cargandoTipoPractica = false;
          this.tipoPracticaReservaCtrl.enable({ emitEvent: false });
        },
        error: () => {
          this.cargandoTipoPractica = false;
          this.tipoPracticaReservaCtrl.enable({ emitEvent: false });
          this.messageService.add({
            key: 'reserva-toast', life: 4000, severity: 'error',
            summary: 'Error', detail: 'No se pudieron cargar los tipos de práctica'
          });
        }
      });
  }

  // ─── RESERVA ──────────────────────────────────────────────────────────────────

  private buildAulasOptionsReserva(): void {
    this.aulasOptionsReserva = this.laboratorios
      .map(l => ({
        label: `${l.id} - ${l.nombre} (Cap: ${l.capacidad})`,
        value: String(l.id),
        numCapacidad: l.capacidad ?? 0
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    this.lbLaboratoriosAulasService.getAll()
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe(lb => {
        const raw = lb as unknown as any;
        this.lbAulas = Array.isArray(raw) ? raw : (raw?.content ?? []);
      });
  }

  onAulaReservaChange(codAula: string): void {
    const opt = this.aulasOptionsReserva.find(a => a.value === codAula);
    this.aulaReservaSeleccionada = opt ?? null;
    this.conflictoHorario = false;
    this.mensajeConflicto = '';
    this.formReserva.patchValue({ horaInicio: '', horaFin: '' });
    this.equiposSeleccionados = [];
    this.suministrosSeleccionados = [];
    this.equiposGrupoSel.clear();
    this.aulasHijas = [];
    this.aulasHijasOptions = [];
    this.aulaHijaSeleccionada = null;

    // Cargar hijos directamente por codAula (no depende de que lbAulas esté cargado)
    this.cargandoHijos = true;
    this.lbLaboratoriosAulasService.getAulasHijas(codAula)
      .pipe(takeUntil(this.destroy$), catchError(() => of([] as LbLaboratoriosAulas[])))
      .subscribe(hijas => {
        this.aulasHijas = hijas;
        this.aulasHijasOptions = hijas.map(h => ({
          label: `${h.codAula} - ${h.nomAula} (Cap: ${h.numCapacidad})`,
          value: h.id,
          numCapacidad: h.numCapacidad ?? 0
        }));
        this.cargandoHijos = false;
      });

    const lbAula = this.lbAulas.find(a => a.codAula === codAula);
    if (lbAula) {
      this.cargarInventarioLab(lbAula.id);
    } else {
      this.equiposLab = [];
      this.suministrosLab = [];
    }
    this.cargarDisponibilidadYAsistencia();
    setTimeout(() => this.verificarDisponibilidad(), 10);
  }

  onAulaHijaChange(hijaId: string): void {
    this.aulaHijaSeleccionada = this.aulasHijas.find(h => h.id === hijaId) ?? null;
  }

  private cargarInventarioLab(labId: string): void {
    this.cargandoInventario = true;
    this.equiposLab = [];
    this.suministrosLab = [];
    this.equiposLabOriginal = [];
    this.suministrosLabOriginal = [];

    forkJoin({
      equipos: this.equipoAulaSvc.getByLaboratorio(labId).pipe(catchError(() => of([] as LbEquipoAula[]))),
      suministros: this.suministroAulaSvc.getByLaboratorio(labId).pipe(catchError(() => of([] as LbSuministroAula[])))
    }).pipe(takeUntil(this.destroy$)).subscribe(({ equipos, suministros }) => {
      this.equiposLabOriginal = (equipos ?? []).map(e => ({ ...e }));
      this.suministrosLabOriginal = (suministros ?? []).filter(su => (su.cantidadDisponible ?? 0) > 0).map(s => ({ ...s }));
      this.equiposLab = this.equiposLabOriginal.map(e => ({ ...e }));
      this.suministrosLab = this.suministrosLabOriginal.map(s => ({ ...s }));
      this.cargandoInventario = false;
      this.ajustarDisponibilidadPorReservas();
    });
  }

  private ajustarDisponibilidadPorReservas(): void {
    const codAula = this.formReserva.get('laboratorioId')?.value;
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    const horaIni = this.formReserva.get('horaInicio')?.value as string;
    const horaFin = this.formReserva.get('horaFin')?.value as string;

    if (!codAula || !fechaVal || !horaIni || !horaFin) {
      // Sin datos completos, mostrar inventario original
      this.equiposLab = this.equiposLabOriginal.map(e => ({ ...e }));
      this.suministrosLab = this.suministrosLabOriginal.map(s => ({ ...s }));
      this.reservasSolapadasCount = 0;
      this.cuposOcupados = 0;
      return;
    }

    const lbAula = this.lbAulas.find(a => a.codAula === codAula);
    if (!lbAula) return;

    const fecha = fechaVal instanceof Date ? fechaVal : new Date(fechaVal);
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const horaInicioHms = this.hms(horaIni);
    const horaFinHms = this.hms(horaFin);

    this.cargandoDisponibilidad = true;
    this.reservasSvc.getReservasSolapadas(lbAula.id, fechaStr, horaInicioHms, horaFinHms).pipe(
      takeUntil(this.destroy$), catchError(() => of([] as ReservaAula[])),
      finalize(() => this.cargandoDisponibilidad = false)
    ).subscribe((reservas: ReservaAula[]) => {
      this.reservasSolapadasCount = reservas.length;
      this.cuposOcupados = reservas.reduce((sum, r) => sum + (r.cantidadAsistentes ?? 0), 0);

      // Sumar cantidades reservadas por equipo y suministro
      const equipoReservado = new Map<string, number>();
      const suministroReservado = new Map<string, number>();

      for (const r of reservas) {
        for (const re of (r.equipos ?? [])) {
          const id = re.equipoAula?.id;
          if (id) equipoReservado.set(id, (equipoReservado.get(id) ?? 0) + (re.cantidad ?? 0));
        }
        for (const rs of (r.suministros ?? [])) {
          const id = rs.suministroAula?.id;
          if (id) suministroReservado.set(id, (suministroReservado.get(id) ?? 0) + (rs.cantidad ?? 0));
        }
      }

      // Ajustar cantidades disponibles restando lo ya reservado
      this.equiposLab = this.equiposLabOriginal
        .map(e => ({
          ...e,
          cantidadDisponible: Math.max(0, (e.cantidadDisponible ?? 0) - (equipoReservado.get(e.id) ?? 0))
        }));

      this.suministrosLab = this.suministrosLabOriginal
        .map(s => ({
          ...s,
          cantidadDisponible: Math.max(0, (s.cantidadDisponible ?? 0) - (suministroReservado.get(s.id) ?? 0))
        }));

      // Limpiar selecciones que ya no tienen disponibilidad
      this.equiposSeleccionados = this.equiposSeleccionados.filter(sel => {
        const actual = this.equiposLab.find(e => e.id === sel.equipoAula.id);
        if (!actual || (actual.cantidadDisponible ?? 0) <= 0) return false;
        sel.equipoAula = actual;
        sel.cantidad = Math.min(sel.cantidad, actual.cantidadDisponible ?? 1);
        return true;
      });

      this.suministrosSeleccionados = this.suministrosSeleccionados.filter(sel => {
        const actual = this.suministrosLab.find(s => s.id === sel.suministroAula.id);
        if (!actual) return false;
        sel.suministroAula = actual;
        sel.cantidad = Math.min(sel.cantidad, actual.cantidadDisponible ?? 1);
        return true;
      });

      // Recalcular grupos de equipos seleccionados
      for (const [categoria, cant] of this.equiposGrupoSel) {
        const grp = this.equiposAgrupados.find(g => g.categoria === categoria);
        if (!grp || grp.totalDisponible <= 0) {
          this.equiposGrupoSel.delete(categoria);
        } else if (cant > grp.totalDisponible) {
          this.equiposGrupoSel.set(categoria, grp.totalDisponible);
        }
      }
      this.sincronizarEquiposSeleccionados();
    });
  }

  verificarDisponibilidad(): void {
    const codAula = this.formReserva.get('laboratorioId')?.value;
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    const horaIni = this.formReserva.get('horaInicio')?.value as string;
    const horaFin = this.formReserva.get('horaFin')?.value as string;
    if (!codAula || !fechaVal || !horaIni || !horaFin) return;
    const fecha = fechaVal instanceof Date ? fechaVal : new Date(fechaVal);
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

    this.asistenciaHorarioSvc.verificarConflicto(codAula, fechaStr, horaIni, horaFin)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: ConflictoResponse) => {
        this.conflictoHorario = result.conflicto;
        this.mensajeConflicto = result.mensaje;
        this.ajustarDisponibilidadPorReservas();
      });
  }

  // ─── EQUIPOS Y SUMINISTROS ────────────────────────────────────────────────────

  toggleEquipo(eq: LbEquipoAula): void {
    const idx = this.equiposSeleccionados.findIndex(e => e.equipoAula.id === eq.id);
    if (idx >= 0) this.equiposSeleccionados.splice(idx, 1);
    else this.equiposSeleccionados.push({ equipoAula: eq, cantidad: 1 });
  }

  toggleSuministro(su: LbSuministroAula): void {
    const idx = this.suministrosSeleccionados.findIndex(s => s.suministroAula.id === su.id);
    if (idx >= 0) this.suministrosSeleccionados.splice(idx, 1);
    else this.suministrosSeleccionados.push({ suministroAula: su, cantidad: 1 });
  }

  isEquipoSelected(eq: LbEquipoAula): boolean {
    return this.equiposSeleccionados.some(e => e.equipoAula.id === eq.id);
  }

  isSuministroSelected(su: LbSuministroAula): boolean {
    return this.suministrosSeleccionados.some(s => s.suministroAula.id === su.id);
  }

  getEquipoCantidad(eq: LbEquipoAula): number {
    return this.equiposSeleccionados.find(e => e.equipoAula.id === eq.id)?.cantidad ?? 0;
  }

  setEquipoCantidad(eq: LbEquipoAula, cant: number): void {
    const item = this.equiposSeleccionados.find(e => e.equipoAula.id === eq.id);
    if (item) { item.cantidad = Math.max(1, Math.min(cant, eq.cantidadDisponible ?? 1)); }
  }

  isGrupoEquipoSelected(categoria: string): boolean {
    return this.equiposGrupoSel.has(categoria);
  }

  toggleGrupoEquipo(grp: EquipoCategoriaGrupo): void {
    if (this.equiposGrupoSel.has(grp.categoria)) {
      this.equiposGrupoSel.delete(grp.categoria);
    } else {
      this.equiposGrupoSel.set(grp.categoria, 1);
    }
    this.sincronizarEquiposSeleccionados();
  }

  getGrupoEquipoCantidad(categoria: string): number {
    return this.equiposGrupoSel.get(categoria) ?? 0;
  }

  setGrupoEquipoCantidad(grp: EquipoCategoriaGrupo, cant: number): void {
    this.equiposGrupoSel.set(grp.categoria, Math.max(1, Math.min(cant, grp.totalDisponible)));
    this.sincronizarEquiposSeleccionados();
  }

  private sincronizarEquiposSeleccionados(): void {
    this.equiposSeleccionados = [];
    for (const [categoria, cantidadTotal] of this.equiposGrupoSel) {
      const grp = this.equiposAgrupados.find(g => g.categoria === categoria);
      if (!grp) continue;
      const disponibles = grp.items.filter(eq => (eq.cantidadDisponible ?? 0) > 0);
      disponibles.slice(0, cantidadTotal).forEach(eq => {
        this.equiposSeleccionados.push({ equipoAula: eq, cantidad: 1 });
      });
    }
  }

  getSuministroStock(su: LbSuministroAula): number {
    const orig = this.suministrosLabOriginal.find(o => o.id === su.id);
    return orig?.cantidadDisponible ?? su.cantidadDisponible ?? 0;
  }

  getSuministroReservados(su: LbSuministroAula): number {
    return this.getSuministroStock(su) - (su.cantidadDisponible ?? 0);
  }

  getSuministroCantidad(su: LbSuministroAula): number {
    return this.suministrosSeleccionados.find(s => s.suministroAula.id === su.id)?.cantidad ?? 0;
  }

  setSuministroCantidad(su: LbSuministroAula, cant: number): void {
    const item = this.suministrosSeleccionados.find(s => s.suministroAula.id === su.id);
    if (item) { item.cantidad = Math.max(1, Math.min(cant, su.cantidadDisponible ?? 1)); }
  }

  // ─── BUSCAR USUARIO ───────────────────────────────────────────────────────────

  buscarUsuarioReserva(): void {
    const id = this.formReservaId.get('identificacion')?.value?.trim();
    if (!id) return;
    this.cargandoReserva = true;
    this.usuarioReserva = null;
    this.usuariosOracleService.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuario) => {
        if (usuario) {
          const normalizado = this.normalizarUsuarioDesdeOracle(usuario);
          this.usuarioReserva = { nombre: normalizado.nombre, identificacion: id };
          this.cargandoReserva = false;
        } else {
          this.buscarUsuarioExternoReserva(id);
        }
      },
      error: () => this.buscarUsuarioExternoReserva(id)
    });
  }

  private buscarUsuarioExternoReserva(id: string): void {
    this.usuariosExternosService.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ext) => {
        if (ext) {
          this.usuarioReserva = { nombre: ext.nombre || id, identificacion: id };
        } else {
          this.messageService.add({
            key: 'reserva-toast', life: 4000, severity: 'warn',
            summary: 'No encontrado', detail: 'Identificación no registrada en el sistema.'
          });
        }
        this.cargandoReserva = false;
      },
      error: () => {
        this.messageService.add({
          key: 'reserva-toast', life: 4000, severity: 'error',
          summary: 'Error', detail: 'No se pudo buscar la identificación.'
        });
        this.cargandoReserva = false;
      }
    });
  }

  private normalizarUsuarioDesdeOracle(usuario: UsuarioOracle) {
    let genero = (usuario.genero || '').trim();
    let rol = (usuario.cargo || '').trim();
    let programa = (usuario.programa || '').trim();
    let facultad = (usuario.facultad || '').trim();

    const generosValidos = ['Masculino', 'Femenino', 'Otro'];
    const rolesValidos = ['Estudiante', 'Docente', 'Administrativo', 'Externo'];

    if (!generosValidos.includes(genero) && generosValidos.includes(programa)) [genero, programa] = [programa, genero];
    if (!rolesValidos.includes(rol) && rolesValidos.includes(facultad)) [rol, facultad] = [facultad, rol];

    return { nombre: (usuario.nombre || '').trim(), genero, rol, programa, facultad };
  }

  // ─── PARTICIPANTES ────────────────────────────────────────────────────────────

  buscarParticipante(): void {
    const id = this.formParticipante.get('identificacion')?.value?.trim();
    if (!id) return;

    // No agregar duplicados ni al usuario principal
    if (this.usuarioReserva && id === this.usuarioReserva.identificacion) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'warn', summary: 'Duplicado', detail: 'Esta identificación corresponde al usuario principal de la reserva.' });
      return;
    }
    if (this.participantes.some(p => p.identificacion === id)) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'warn', summary: 'Duplicado', detail: 'Este participante ya fue agregado.' });
      return;
    }

    this.cargandoParticipante = true;
    this.usuariosOracleService.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuario) => {
        if (usuario) {
          const normalizado = this.normalizarUsuarioDesdeOracle(usuario);
          this.participantes.push({ nombre: normalizado.nombre, identificacion: id });
          this.formParticipante.reset();
          this.cargandoParticipante = false;
        } else {
          this.buscarParticipanteExterno(id);
        }
      },
      error: () => this.buscarParticipanteExterno(id)
    });
  }

  private buscarParticipanteExterno(id: string): void {
    this.usuariosExternosService.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ext) => {
        if (ext) {
          this.participantes.push({ nombre: ext.nombre || id, identificacion: id });
          this.formParticipante.reset();
        } else {
          this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'warn', summary: 'No encontrado', detail: 'Identificación no registrada en el sistema.' });
        }
        this.cargandoParticipante = false;
      },
      error: () => {
        this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudo buscar la identificación.' });
        this.cargandoParticipante = false;
      }
    });
  }

  eliminarParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  // ─── CARGA MASIVA EXCEL ────────────────────────────────────────────────────────

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      this.excelResultado = { tipo: 'error', mensaje: 'Formato no válido. Solo se permiten archivos .xlsx o .xls' };
      input.value = '';
      return;
    }

    this.cargandoExcel = true;
    this.excelResultado = null;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Extraer identificaciones de la primera columna, ignorando cabecera si existe
        const identificaciones: string[] = [];
        for (const row of rows) {
          const val = String(row[0] ?? '').trim();
          if (!val || val.toLowerCase() === 'identificacion' || val.toLowerCase() === 'identificación'
            || val.toLowerCase() === 'cedula' || val.toLowerCase() === 'cédula'
            || val.toLowerCase() === 'documento' || val.toLowerCase() === 'id') continue;
          if (/^[a-zA-Z0-9]{4,20}$/.test(val)) {
            identificaciones.push(val);
          }
        }

        if (identificaciones.length === 0) {
          this.excelResultado = { tipo: 'error', mensaje: 'No se encontraron identificaciones válidas en el archivo.' };
          this.cargandoExcel = false;
          input.value = '';
          return;
        }

        this.procesarIdentificacionesMasivas(identificaciones, input);
      } catch {
        this.excelResultado = { tipo: 'error', mensaje: 'Error al leer el archivo Excel.' };
        this.cargandoExcel = false;
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private procesarIdentificacionesMasivas(ids: string[], input: HTMLInputElement): void {
    const nuevos = ids.filter(id =>
      id !== this.usuarioReserva?.identificacion &&
      !this.participantes.some(p => p.identificacion === id)
    );

    if (nuevos.length === 0) {
      this.excelResultado = { tipo: 'warn', mensaje: 'Todas las identificaciones ya están agregadas o son duplicadas.' };
      this.cargandoExcel = false;
      input.value = '';
      return;
    }

    let procesados = 0;
    let agregados = 0;
    let noEncontrados: string[] = [];

    const procesarSiguiente = () => {
      if (procesados >= nuevos.length) {
        this.cargandoExcel = false;
        input.value = '';
        if (agregados > 0 && noEncontrados.length > 0) {
          this.excelResultado = { tipo: 'warn', mensaje: `${agregados} participante(s) agregado(s). ${noEncontrados.length} no encontrado(s): ${noEncontrados.slice(0, 5).join(', ')}${noEncontrados.length > 5 ? '...' : ''}` };
        } else if (agregados > 0) {
          this.excelResultado = { tipo: 'success', mensaje: `${agregados} participante(s) agregado(s) exitosamente.` };
        } else {
          this.excelResultado = { tipo: 'error', mensaje: `Ninguna identificación fue encontrada en el sistema.` };
        }
        return;
      }

      const id = nuevos[procesados];
      this.usuariosOracleService.getByCodigo(id).pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe(usuario => {
        if (usuario) {
          const normalizado = this.normalizarUsuarioDesdeOracle(usuario);
          if (!this.participantes.some(p => p.identificacion === id)) {
            this.participantes.push({ nombre: normalizado.nombre, identificacion: id });
            agregados++;
          }
          procesados++;
          procesarSiguiente();
        } else {
          this.usuariosExternosService.getByCodigo(id).pipe(
            takeUntil(this.destroy$),
            catchError(() => of(null))
          ).subscribe(ext => {
            if (ext) {
              if (!this.participantes.some(p => p.identificacion === id)) {
                this.participantes.push({ nombre: ext.nombre || id, identificacion: id });
                agregados++;
              }
            } else {
              noEncontrados.push(id);
            }
            procesados++;
            procesarSiguiente();
          });
        }
      });
    };

    procesarSiguiente();
  }

  // ─── ASISTENCIA DEL LAB ────────────────────────────────────────────────────

  get lunesSemanaReserva(): string {
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    if (!fechaVal) return '';
    return this.lunesDeSemanaIso(fechaVal instanceof Date ? fechaVal : new Date(fechaVal));
  }

  private lunesDeSemanaIso(d: Date): string {
    const ref = new Date(d);
    ref.setHours(0, 0, 0, 0);
    const dow = ref.getDay() === 0 ? 7 : ref.getDay();
    ref.setDate(ref.getDate() - (dow - 1));
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`;
  }

  /**
   * Carga en paralelo los rangos libres (backend) y la asistencia semanal (tabla).
   * Si el endpoint de rangos no está disponible, calcula los rangos localmente
   * desde asistenciaSemanasReserva para que el front nunca quede sin datos.
   */
  private cargarDisponibilidadYAsistencia(): void {
    const codAula = this.formReserva.get('laboratorioId')?.value as string;
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    if (!codAula || !fechaVal) {
      this.horariosOcupados = [];
      this.rangosLibres = [];
      this.asistenciaSemanasReserva = [];
      this.cargandoAsistenciaReserva = false;
      return;
    }
    const fecha = fechaVal instanceof Date ? fechaVal : new Date(fechaVal);
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const lunes = this.lunesDeSemanaIso(fecha);
    const codAulaUpper = codAula.trim().toUpperCase();

    this.cargandoAsistenciaReserva = true;

    forkJoin({
      asistencia: this.asistenciaHorarioSvc.getBySemana(lunes).pipe(
        catchError(() => of([] as LbAsistenciaHorario[]))
      ),
      rangos: this.asistenciaHorarioSvc.getRangosLibres(codAula, fechaStr).pipe(
        catchError(() => of(null as RangosLibresResponse | null))
      )
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ asistencia, rangos }) => {
      // Poblar tabla "Clases programadas hoy"
      this.asistenciaSemanasReserva = (asistencia ?? [])
        .filter(r => (r.codAula ?? '').trim().toUpperCase() === codAulaUpper)
        .sort((a, b) => {
          const fa = (a.fechaClase ?? '') + (a.horaInicio ?? '');
          const fb = (b.fechaClase ?? '') + (b.horaInicio ?? '');
          return fa.localeCompare(fb);
        });
      this.cargandoAsistenciaReserva = false;

      if (rangos !== null) {
        // El backend nuevo está activo: usar rangos calculados en el servidor
        this.rangosLibres = rangos.rangos ?? [];
        this.horariosOcupados = rangos.horariosOcupados ?? [];
      } else {
        // Fallback: calcular rangos localmente desde los registros de asistencia
        this.computarRangosDesdeAsistenciaLocal(fechaStr);
      }

      // Limpiar horas seleccionadas si ya no son válidas
      const horaIni = this.formReserva.get('horaInicio')?.value as string;
      if (horaIni && !this.horasInicioOptions.some(opt => opt.value === horaIni)) {
        this.formReserva.patchValue({ horaInicio: '', horaFin: '' });
      } else {
        const horaFin = this.formReserva.get('horaFin')?.value as string;
        if (horaFin && !this.horasFinOptions.some(opt => opt.value === horaFin)) {
          this.formReserva.patchValue({ horaFin: '' });
        }
      }
    });
  }

  /**
   * Fallback: calcula rangos libres desde los registros de asistencia ya cargados
   * (Oracle sincronizado en BD), sin necesitar el nuevo endpoint del backend.
   */
  /** Normaliza un valor de fechaClase a "YYYY-MM-DD" sin importar si viene como
   *  string ISO, array [y,m,d] (Jackson timestamps) o string con hora. */
  private normFecha(v: unknown): string {
    if (!v) return '';
    if (Array.isArray(v)) {
      const [y, m, d] = v as number[];
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return String(v).substring(0, 10);
  }

  private computarRangosDesdeAsistenciaLocal(fechaIso: string): void {
    const clasesActivas = this.asistenciaSemanasReserva
      .filter(r => this.normFecha(r.fechaClase) === fechaIso && r.asistio !== false);

    this.horariosOcupados = clasesActivas.map(r => ({
      horaInicio: Array.isArray(r.horaInicio)
        ? this.minToHhmm((r.horaInicio as unknown as number[])[0] * 60 + ((r.horaInicio as unknown as number[])[1] ?? 0))
        : (r.horaInicio ?? ''),
      horaFin: Array.isArray(r.horaFin)
        ? this.minToHhmm((r.horaFin as unknown as number[])[0] * 60 + ((r.horaFin as unknown as number[])[1] ?? 0))
        : (r.horaFin ?? ''),
      materia: r.materia ?? undefined
    }));

    this.rangosLibres = this.calcularRangosLocal(this.horariosOcupados);
  }

  private calcularRangosLocal(
    ocupados: { horaInicio: string; horaFin: string }[]
  ): { inicio: string; fin: string }[] {
    const APERTURA = 6 * 60;
    const CIERRE   = 22 * 60;

    if (ocupados.length === 0) {
      return [{ inicio: '06:00', fin: '22:00' }];
    }

    const franjas = ocupados
      .map(h => ({ ini: this.toMin(h.horaInicio), fin: this.toMin(h.horaFin) }))
      .filter(f => f.fin > f.ini)
      .sort((a, b) => a.ini - b.ini);

    const merged: { ini: number; fin: number }[] = [];
    for (const f of franjas) {
      const last = merged[merged.length - 1];
      if (last && f.ini <= last.fin) {
        last.fin = Math.max(last.fin, f.fin);
      } else {
        merged.push({ ...f });
      }
    }

    const rangos: { inicio: string; fin: string }[] = [];
    let cursor = APERTURA;
    for (const f of merged) {
      if (cursor < f.ini) {
        rangos.push({ inicio: this.minToHhmm(cursor), fin: this.minToHhmm(f.ini) });
      }
      cursor = Math.max(cursor, f.fin);
    }
    if (cursor < CIERRE) {
      rangos.push({ inicio: this.minToHhmm(cursor), fin: this.minToHhmm(CIERRE) });
    }
    return rangos;
  }

  private minToHhmm(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  /** @deprecated Usa cargarDisponibilidadYAsistencia() */
  private cargarAsistenciaDelLab(): void {
    this.cargarDisponibilidadYAsistencia();
  }

  /** Registros de asistencia filtrados para la fecha seleccionada.
   *  Si es hoy, oculta las clases cuyo horario ya terminó. */
  get asistenciaDiaReserva(): LbAsistenciaHorario[] {
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    if (!fechaVal) return [];
    const d = fechaVal instanceof Date ? fechaVal : new Date(fechaVal);
    const fechaIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const registros = this.asistenciaSemanasReserva.filter(r => r.fechaClase === fechaIso);

    if (this.esHoy(d)) {
      const ahora = new Date();
      const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
      return registros.filter(r => {
        const [hF, mF] = (r.horaFin || '00:00').split(':').map(Number);
        return ((hF || 0) * 60 + (mF || 0)) > ahoraMin;
      });
    }

    return registros;
  }

  /** Convierte "HH:mm" o "HH:mm:ss" a formato 12h, ej: "2:30 PM" */
  a12h(hhmm: string): string {
    if (!hhmm) return '—';
    const parts = hhmm.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] ?? '0', 10);
    if (isNaN(h) || isNaN(m)) return hhmm;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  estadoTagAsistencia(asistio: boolean | null | undefined): 'success' | 'danger' | 'secondary' {
    if (asistio === false) return 'success';  // no-uso = libre para reservar
    if (asistio === true)  return 'danger';   // asistió = ocupado
    return 'secondary';                        // pendiente
  }

  estadoLabelAsistencia(asistio: boolean | null | undefined): string {
    if (asistio === false) return 'Libre para reservar';
    if (asistio === true)  return 'Clase confirmada';
    return 'Pendiente';
  }

  // ─── HORARIO DEL DÍA ─────────────────────────────────────────────────────────

  /**
   * Solicita al backend los rangos libres y las clases Oracle activas para el aula y fecha.
   * Reemplaza la lógica anterior que llamaba Oracle directamente desde el frontend.
   */
  /** @deprecated Usa cargarDisponibilidadYAsistencia() */
  private cargarRangosYHorarios(): void {
    this.cargarDisponibilidadYAsistencia();
  }

  esConflictoConHorario(h: { horaInicio: string; horaFin: string; materia?: string }): boolean {
    const horaIni = this.formReserva.get('horaInicio')?.value as string;
    const horaFin = this.formReserva.get('horaFin')?.value as string;
    if (!horaIni || !horaFin) return false;
    const iniMin = this.toMin(horaIni);
    const finMin = this.toMin(horaFin);
    return this.toMin(h.horaInicio) < finMin && this.toMin(h.horaFin) > iniMin;
  }

  // ─── CREAR RESERVA ────────────────────────────────────────────────────────────

  crearReserva(): void {
    if (this.formReserva.invalid) { this.formReserva.markAllAsTouched(); return; }
    if (!this.usuarioReserva) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'error', summary: 'Error', detail: 'Sin usuario seleccionado.' });
      return;
    }
    if (this.conflictoHorario) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'warn', summary: 'Conflicto de horario', detail: this.mensajeConflicto });
      return;
    }
    const codAula = this.formReserva.get('laboratorioId')?.value ?? '';
    const lbAula = this.lbAulas.find(a => a.codAula === codAula);
    if (!lbAula) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'error', summary: 'Laboratorio no sincronizado', detail: 'El laboratorio no está en el sistema local.' });
      return;
    }
    const fechaVal = this.formReserva.get('fecha')?.value as Date;
    const fechaStr = `${fechaVal.getFullYear()}-${String(fechaVal.getMonth() + 1).padStart(2, '0')}-${String(fechaVal.getDate()).padStart(2, '0')}`;
    const horaInicio = this.hms(this.formReserva.get('horaInicio')?.value as string);
    const horaFin = this.hms(this.formReserva.get('horaFin')?.value as string);
    if (!this.horaFinEsValida(horaInicio, horaFin)) {
      this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'warn', summary: 'Horario inválido', detail: 'La hora de fin debe ser posterior a la hora de inicio.' });
      return;
    }
    const tipoPracticaId = this.tipoPracticaReservaCtrl.value || '';
    const practica = this.todosTiposPractica.find(t => t.id === tipoPracticaId);
    const motivo = practica?.nombre || undefined;
    const observacion = (this.formReserva.get('observacion')?.value ?? '').trim() || undefined;

    const equipos: ReservaEquipo[] = this.equiposSeleccionados.map(e => ({
      equipoAula: { id: e.equipoAula.id },
      cantidad: e.cantidad
    }));
    const suministros: ReservaSuministro[] = this.suministrosSeleccionados.map(s => ({
      suministroAula: { id: s.suministroAula.id },
      cantidad: s.cantidad
    }));

    // Construir lista de asistentes: usuario principal + participantes adicionales
    const asistentes: ReservaAsistente[] = [
      { identificacion: this.usuarioReserva.identificacion },
      ...this.participantes.map(p => ({ identificacion: p.identificacion }))
    ];

    const reserva: ReservaAula = {
      laboratorio: { id: lbAula.id },
      subLaboratorio: this.aulaHijaSeleccionada ? { id: this.aulaHijaSeleccionada.id } : null,
      identificacion: this.usuarioReserva.identificacion,
      fecha: fechaStr,
      horaInicio,
      horaFin,
      cantidadAsistentes: asistentes.length,
      cantidadEquipos: equipos.reduce((sum, e) => sum + e.cantidad, 0),
      cantidadSuministros: suministros.reduce((sum, s) => sum + s.cantidad, 0),
      aprobado: undefined,
      motivo,
      observacion,
      tipoPractica: tipoPracticaId || undefined,
      asistentes,
      equipos: equipos.length > 0 ? equipos : undefined,
      suministros: suministros.length > 0 ? suministros : undefined
    };
    this.cargandoReserva = true;
    this.reservasSvc.create(reserva).pipe(finalize(() => this.cargandoReserva = false)).subscribe({
      next: () => {
        this.messageService.add({ key: 'reserva-toast', life: 5000, severity: 'success', summary: 'Reserva creada', detail: 'El laboratorio fue reservado correctamente.' });
        this.reiniciarReserva();
      },
      error: (e) => this.messageService.add({ key: 'reserva-toast', life: 4000, severity: 'error', summary: 'Error al reservar', detail: e?.error?.mensaje ?? 'No se pudo crear la reserva.' })
    });
  }

  reiniciarReserva(): void {
    this.stepReserva = 1;
    this.usuarioReserva = null;
    this.conflictoHorario = false;
    this.mensajeConflicto = '';
    this.aulaReservaSeleccionada = null;
    this.equiposLab = [];
    this.suministrosLab = [];
    this.equiposLabOriginal = [];
    this.suministrosLabOriginal = [];
    this.equiposSeleccionados = [];
    this.suministrosSeleccionados = [];
    this.equiposGrupoSel.clear();
    this.cargandoInventario = false;
    this.reservasSolapadasCount = 0;
    this.cuposOcupados = 0;
    this.cargandoDisponibilidad = false;
    this.participantes = [];
    this.aulasHijas = [];
    this.aulasHijasOptions = [];
    this.aulaHijaSeleccionada = null;
    this.cargandoHijos = false;
    this.horariosOcupados = [];
    this.rangosLibres = [];
    this.excelResultado = null;
    this.formParticipante.reset();
    this.formReservaId.reset();
    this.formReserva.reset({ laboratorioId: '', fecha: new Date(), horaInicio: '', horaFin: '', observacion: '' });
    this.tipoPracticaReservaCtrl.reset('', { emitEvent: false });
  }
}
