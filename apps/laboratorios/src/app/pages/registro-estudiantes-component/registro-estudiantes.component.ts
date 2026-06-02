import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { UsuarioExterno } from '../../core/models/usuario-externos.model';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { UsosLaboratorioService, EntradaPayload, SalidaPayload } from '../../core/services/usos-laboratorio.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { OraAulas } from '../../core/models/ora-aulas.model';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { InputComponent, SelectComponent, TextareaComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { TipoPracticaService } from '../../core/services/tipo-practica.service';
import { TipoPractica } from '../../core/models/tipo-practica.model';


interface DatosEntrada {
  identificacion: string;
  laboratorioId: string;
  laboratorioNombre: string;
  fechaUso: string;
  horaInicio: string;
  motivo: string;
  observaciones: string;
  nombreUsuario: string;
  datosUsuario: {
    genero: string;
    rol: string;
    programa: string;
    facultad: string;
    semestre: string;
  };
}

@Component({
  selector: 'app-registro-estudiantes',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    StepperModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    DatepickerComponent,
    DividerModule,
    TagModule
  ],
  providers: [MessageService],
  templateUrl: './registro-estudiantes.component.html'
})
export class RegistroEstudiantesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosOracleService = inject(UsuariosOracleService);
  private readonly usuariosExternosService = inject(UsuariosExternosService);
  private readonly laboratoriosService = inject(LaboratoriosService);
  private readonly oraAulasService = inject(OraAulasService);
  private readonly lbLaboratoriosAulasService = inject(LbLaboratoriosAulasService);
  private readonly usosLaboratorioService = inject(UsosLaboratorioService);
  private readonly messageService = inject(MessageService);
  private readonly tipoPracticaService = inject(TipoPracticaService);
  private readonly destroy$ = new Subject<void>();

  step = 1;

  generos = [
    { label: 'Seleccionar...', value: '' },
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' }
  ];

  roles = [
    { label: 'Seleccionar...', value: '' },
    { label: 'Estudiante', value: 'Estudiante' },
    { label: 'Docente', value: 'Docente' },
    { label: 'Administrativo', value: 'Administrativo' },
    { label: 'Externo', value: 'Externo' }
  ];

  programas = [{ label: 'Seleccionar...', value: '' }];
  facultades = [{ label: 'Seleccionar...', value: '' }];

  todosTiposPractica: TipoPractica[] = [];
  cargandoTipoPractica = false;
  tiposCategorias: { label: string; value: string }[] = [];
  practicasDisponibles: { label: string; value: string }[] = [];
  mostrarCampoOtro = false;

  // Modal de devolución de consumibles al marcar salida
  mostrarModalDevolucion = false;
  consumiblesParaDevolver: { suministroAulaId: string; nombre: string; cantidadReservada: number; cantidadDevuelta: number }[] = [];
  private pendienteSalidaId: string | null = null; // identificacion pendiente en modal

  ocupacionesExterno = [
    { label: 'Profesional', value: 'Profesional' },
    { label: 'Técnico', value: 'Técnico' },
    { label: 'Investigador', value: 'Investigador' },
    { label: 'Consultor', value: 'Consultor' },
    { label: 'Estudiante de otra institución', value: 'Estudiante de otra institución' },
    { label: 'Otro', value: 'Otro' }
  ];

  tiposUsuarioExterno = [
    { label: 'Externo', value: 'Externo' },
    { label: 'Visitante', value: 'Visitante' },
    { label: 'Terceros', value: 'Terceros' }
  ];

  generosExterno = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'Otro' }
  ];

  laboratorios: Laboratorio[] = [];
  cuposDisponibles = new Map<string, number>();
  estadoLab = new Map<string, string>();

  laboratorioSeleccionadoId: string | null = null;
  nombreUsuario = '';
  usoActivo = false;
  registrandoUsuarioExterno = false;
  mostrarBotonRegistroExternos = false;
  mostrarModalRegistroExternos = false;

  datosEntradaPendientes = new Map<string, DatosEntrada>();

  private temporizadorActualizacionHoraFin: ReturnType<typeof setInterval> | null = null;

  formUsuario = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9]+$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    genero: ['', Validators.required],
    rol: ['', Validators.required],
    programa: ['', [Validators.required, Validators.maxLength(100)]],
    facultad: ['', [Validators.required, Validators.maxLength(100)]],
    semestre: ['']
  });

  formUso = this.fb.group({
    fecha_uso: [null as Date | null, Validators.required],
    hora_inicio: ['', [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
    hora_fin: [''],
    laboratorio_id: ['', Validators.required],
    motivo: ['', Validators.required],
    observaciones: ['', Validators.maxLength(255)]
  });

  formUsuarioExterno = this.fb.group({
    genero: ['', Validators.required],
    ocupacion: ['', [Validators.required, Validators.maxLength(100)]],
    empresa: ['', [Validators.maxLength(150)]],
    tipoUsuario: ['', [Validators.required, Validators.maxLength(100)]]
  });

  tipoCategoriaCtrl = this.fb.control('', Validators.required);
  tipoPracticaCtrl = this.fb.control('', Validators.required);
  motivoOtroCtrl = this.fb.control('');

  private motivoPendientePrecargar: string | null = null;
  private tipoPracticaIdPendiente: string | null = null;

  get tieneUsuarioCargado(): boolean {
    return !!this.nombreUsuario.trim();
  }

  get enModoRegistro(): boolean {
    return this.registrandoUsuarioExterno;
  }

  get laboratorioActualNombre(): string {
    if (!this.laboratorioSeleccionadoId) return '—';
    const lab = this.laboratorios.find(l => String(l.id) === this.laboratorioSeleccionadoId);
    return lab?.nombre ?? '—';
  }

  get laboratorioSelectDeshabilitado(): boolean {
    return this.usoActivo;
  }

  get motivoDeshabilitado(): boolean {
    return false;
  }

  get observacionesDeshabilitadas(): boolean {
    return false;
  }

  ngOnInit(): void {
    const ahora = new Date();
    this.formUso.patchValue({ fecha_uso: ahora, hora_inicio: this.formatearHoraMinuto(ahora) });
    this.cargarLaboratorios();
    this.limpiarDatosAntiguos();
    this.cargarTipoPractica();

    this.formUso.get('observaciones')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(valor => {
      if (valor && typeof valor === 'string' && this.detectarTextoValidacion(valor)) {
        this.messageService.add({ key: 'registro-uso', life: 5000, severity: 'warn', summary: 'Texto autom\u00e1tico detectado', detail: 'Se detect\u00f3 texto de validaci\u00f3n autom\u00e1tica en las observaciones. Se limpiar\u00e1 al guardar.' });
      }
    });

    // Se usa un solo select de práctica con label=nombre y value=id
    this.tipoPracticaCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => this.onTipoPracticaChange(val || ''));
    this.motivoOtroCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (this.mostrarCampoOtro) {
        this.formUso.patchValue({ motivo: (val || '').trim() }, { emitEvent: false });
      }
    });

    const laboratorioControl = this.formUso.get('laboratorio_id');
    if (laboratorioControl) {
      laboratorioControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(nuevoValor => {
        if (this.usoActivo) {
          this.formUso.patchValue({ laboratorio_id: this.laboratorioSeleccionadoId }, { emitEvent: false });
          return;
        }

        const nuevoLaboratorioId = nuevoValor ? String(nuevoValor) : null;
        if (!nuevoLaboratorioId) {
          this.laboratorioSeleccionadoId = null;
          this.formUso.patchValue({ motivo: '' }, { emitEvent: false });
          return;
        }

        const estado = (this.estadoLab.get(nuevoLaboratorioId) ?? '').toLowerCase();
        const cupos = this.cuposDisponibles.get(nuevoLaboratorioId) ?? 0;

        if (estado === 'ocupado' || estado === 'mantenimiento' || cupos <= 0) {
          const detalle = estado === 'ocupado' ? 'Este laboratorio está ocupado.' : estado === 'mantenimiento' ? 'Este laboratorio está en mantenimiento.' : 'Este laboratorio no tiene cupos disponibles.';
          this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'No disponible', detail: detalle });
          this.formUso.patchValue({ laboratorio_id: this.laboratorioSeleccionadoId ?? '' }, { emitEvent: false });
          return;
        }

        this.laboratorioSeleccionadoId = nuevoLaboratorioId;
      });
    }
  }

  ngOnDestroy(): void {
    this.detenerTemporizadorHoraFin();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalizarGeneroParaFormulario(genero: string): string {
    const g = (genero || '').trim().toUpperCase();
    if (g === 'M') return 'Masculino';
    if (g === 'F') return 'Femenino';
    return genero;
  }

  private normalizarGeneroParaBD(genero: string): string {
    return (genero || '').trim();
  }

  private formatearHoraMinuto(fecha: Date): string {
    const h = String(fecha.getHours()).padStart(2, '0');
    const m = String(fecha.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private formatearAnioMesDia(fecha: Date): string {
    const y = fecha.getFullYear();
    const mo = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  private formatearHoraMinutoSegundo(hhmm: string): string {
    return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  }

  private convertirHoraAMinutos(hora: string): number | null {
    const [h, m] = (hora || '').split(':').map(p => Number(p));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  private horaFinEsValida(horaInicio: string, horaFin: string): boolean {
    const inicioMin = this.convertirHoraAMinutos(horaInicio);
    const finMin = this.convertirHoraAMinutos(horaFin);
    if (inicioMin === null || finMin === null) return false;
    return finMin - inicioMin >= 1;
  }

  private obtenerCuposInicialesDeLaboratorio(l: Laboratorio): number {
    const labRecord = l as unknown as Record<string, unknown>;
    return Number(labRecord['cuposDisponibles'] ?? labRecord['capacidadDisponible'] ?? labRecord['cupos'] ?? l.capacidad ?? 0);
  }

  private actualizarCuposYEstado(laboratorioId: string, variacion: number): void {
    const prev = this.cuposDisponibles.get(laboratorioId) ?? 0;
    const curr = Math.max(0, prev + variacion);
    this.cuposDisponibles.set(laboratorioId, curr);

    const estadoActual = (this.estadoLab.get(laboratorioId) ?? 'disponible').toLowerCase();
    if (estadoActual !== 'mantenimiento') {
      this.estadoLab.set(laboratorioId, curr <= 0 ? 'ocupado' : 'disponible');
    }
  }

  private cargarLaboratorios(): void {
    this.oraAulasService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: aulasOracle => {
          
          // Filtrar solo laboratorios (igual que lista-laboratorio)
          const aulasLaboratorios = (aulasOracle ?? []).filter(aula => {
            const esLaboratorio = aula.tipoAula?.toLowerCase().includes('laboratorio');
            const noEsVirtual = aula.nomAula?.toLowerCase() !== 'virtual';
            const cumpleFiltro = esLaboratorio && noEsVirtual;
            
            return cumpleFiltro;
          });

          // Sincronizar con PostgreSQL PRIMERO (bloquear hasta completar)
          if (aulasLaboratorios.length > 0) {
            this.lbLaboratoriosAulasService.sincronizarDesdeOracle(aulasLaboratorios)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: resultado => {
                  
                  // DESPUÉS de sincronizar, mapear y mostrar
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
                },
                error: err => {
                  console.error('❌ Error al sincronizar laboratorios:', err);
                  this.messageService.add({ 
                    key: 'registro-uso', 
                    life: 6000, 
                    severity: 'error', 
                    summary: 'Error de sincronización', 
                    detail: 'No se pudieron sincronizar los laboratorios. Intente recargar.' 
                  });
                }
              });
          } else {
            // Si no hay laboratorios para sincronizar, mostrar mensaje
            this.messageService.add({ 
              key: 'registro-uso', 
              life: 4000, 
              severity: 'warn', 
              summary: 'Sin laboratorios', 
              detail: 'No se encontraron laboratorios disponibles.' 
            });
          }
        },
        error: () => this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los laboratorios desde Oracle.' })
      });
  }

  mostrarRegistroExternos(): void {
    this.mostrarModalRegistroExternos = true;
    this.mostrarBotonRegistroExternos = false;
    this.formUsuarioExterno.patchValue({ genero: '', ocupacion: '', empresa: '', tipoUsuario: 'Externo' });
  }

  cancelarRegistroExterno(): void {
    this.mostrarModalRegistroExternos = false;
    this.mostrarBotonRegistroExternos = true;
    this.formUsuarioExterno.reset();
  }

  async guardarUsuarioExternoInline(): Promise<void> {
    if (this.formUsuarioExterno.invalid) {
      this.formUsuarioExterno.markAllAsTouched();
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Formulario incompleto', detail: 'Complete todos los campos requeridos.' });
      return;
    }

    const v = this.formUsuarioExterno.value;
    const identificacion = this.formUsuario.value.identificacion?.trim();

    if (!identificacion) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: 'No se encontró la identificación.' });
      return;
    }

    const nuevoUsuarioExterno: UsuarioExterno = {
      identificacion,
      nombre: identificacion,
      genero: this.normalizarGeneroParaBD(v.genero || ''),
      cargo: v.ocupacion || null,
      tipoUsuario: v.tipoUsuario || 'Externo'
    };

    try {
      await this.usuariosExternosService.crearUsuarioExterno(nuevoUsuarioExterno).toPromise();
      this.actualizarValidacionesFormulario(true);
      this.nombreUsuario = identificacion;

      const generoNormalizado = this.normalizarGeneroParaFormulario(v.genero || '');
      this.formUsuario.patchValue({
        nombre: identificacion,
        genero: generoNormalizado,
        rol: 'Externo',
        programa: v.ocupacion,
        facultad: v.tipoUsuario,
        semestre: ''
      });

      this.mostrarModalRegistroExternos = false;
      this.mostrarBotonRegistroExternos = false;
      this.registrandoUsuarioExterno = false;

      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'success', summary: 'Usuario registrado', detail: 'Usuario externo registrado exitosamente. Puede continuar con el registro de uso.' });

      this.verificarEstadoYConfigurarFormulario(identificacion);
    } catch {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error de registro', detail: 'No se pudo registrar el usuario externo. Intente nuevamente.' });
    }
  }

  private actualizarValidacionesFormulario(esUsuarioExterno = false): void {
    const semestre = this.formUsuario.get('semestre');
    if (esUsuarioExterno) semestre?.clearValidators();
    else semestre?.setValidators([Validators.required, Validators.min(1), Validators.max(15)]);
    semestre?.updateValueAndValidity();
  }

  buscarIdentificacion(): void {
    const identificacion = this.formUsuario.value.identificacion?.trim();
    if (!identificacion) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Atención', detail: 'Ingrese una identificación válida.' });
      return;
    }
    if (this.formUsuario.get('identificacion')?.invalid) {
      this.formUsuario.get('identificacion')?.markAsTouched();
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Formato inválido', detail: 'La identificación debe tener entre 4 y 20 caracteres alfanuméricos.' });
      return;
    }

    this.detenerTemporizadorHoraFin();
    this.usoActivo = false;
    this.registrandoUsuarioExterno = false;
    this.mostrarBotonRegistroExternos = false;
    this.mostrarModalRegistroExternos = false;
    this.laboratorioSeleccionadoId = null;
    this.nombreUsuario = '';
    this.formUsuarioExterno.reset();

    this.usuariosOracleService.getByCodigo(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarioOracle: UsuarioOracle | null) => {
          if (usuarioOracle) this.procesarUsuarioOracle(usuarioOracle, identificacion);
          else this.buscarEnUsuariosExternos(identificacion);
        },
        error: () => this.buscarEnUsuariosExternos(identificacion)
      });
  }

  private procesarUsuarioOracle(usuarioOracle: UsuarioOracle, identificacion: string): void {
    this.registrandoUsuarioExterno = false;
    this.mostrarBotonRegistroExternos = false;
    this.mostrarModalRegistroExternos = false;
    this.actualizarValidacionesFormulario(false);

    const normalizado = this.normalizarUsuarioDesdeOracle(usuarioOracle);
    this.nombreUsuario = normalizado.nombre;

    const usuarioRecord = usuarioOracle as unknown as Record<string, unknown>;
    this.formUsuario.patchValue({
      nombre: normalizado.nombre,
      genero: normalizado.genero,
      rol: normalizado.rol,
      programa: normalizado.programa,
      facultad: normalizado.facultad,
      semestre: String(usuarioRecord['semestre'] ?? '')
    });

    this.agregarOpcionSiNoExiste(this.programas, normalizado.programa);
    this.agregarOpcionSiNoExiste(this.facultades, normalizado.facultad);

    this.verificarEstadoYConfigurarFormulario(identificacion);
    this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'success', summary: 'Usuario encontrado', detail: 'Usuario encontrado en base de datos institucional.' });
  }

  private buscarEnUsuariosExternos(identificacion: string): void {
    this.usuariosExternosService.getByCodigo(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarioExterno: UsuarioExterno | null) => {
          if (usuarioExterno) this.procesarUsuarioExterno(usuarioExterno, identificacion);
          else this.usuarioNoEncontrado();
        },
        error: () => this.usuarioNoEncontrado()
      });
  }

  private procesarUsuarioExterno(usuarioExterno: UsuarioExterno, identificacion: string): void {
    this.registrandoUsuarioExterno = false;
    this.mostrarBotonRegistroExternos = false;
    this.mostrarModalRegistroExternos = false;
    this.actualizarValidacionesFormulario(true);

    const normalizado = this.normalizarUsuarioDesdeExternos(usuarioExterno);
    this.nombreUsuario = normalizado.nombre;

    this.formUsuario.patchValue({
      nombre: normalizado.nombre,
      genero: normalizado.genero,
      rol: normalizado.rol,
      programa: normalizado.programa,
      facultad: normalizado.facultad,
      semestre: ''
    });

    this.agregarOpcionSiNoExiste(this.programas, normalizado.programa);
    this.agregarOpcionSiNoExiste(this.facultades, normalizado.facultad);

    this.verificarEstadoYConfigurarFormulario(identificacion);
    this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'success', summary: 'Usuario externo encontrado', detail: 'Usuario encontrado en base de datos de externos.' });
  }

  private usuarioNoEncontrado(): void {
    this.registrandoUsuarioExterno = true;
    this.mostrarBotonRegistroExternos = true;
    this.actualizarValidacionesFormulario(true);

    this.formUsuario.patchValue({
      nombre: '',
      genero: '',
      rol: 'Externo',
      programa: '',
      facultad: '',
      semestre: ''
    });

    this.messageService.add({ key: 'registro-uso', life: 6000, severity: 'info', summary: 'Usuario no encontrado', detail: 'Complete los datos para registrar un nuevo usuario externo o use el botón para ir al registro completo.' });
  }

  private verificarEstadoYConfigurarFormulario(identificacion: string): void {
    this.usosLaboratorioService.estado(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        if (estado.activo && estado.laboratorioId) {
          this.usoActivo = true;
          this.laboratorioSeleccionadoId = String(estado.laboratorioId);

          const datosGuardados = this.datosEntradaPendientes.get(identificacion);
          
          this.formUso.patchValue({
            laboratorio_id: this.laboratorioSeleccionadoId,
            fecha_uso: estado.fechaUso ? new Date(estado.fechaUso) : new Date(),
            hora_inicio: (estado.horaInicio || '08:00').slice(0, 5),
            hora_fin: this.formatearHoraMinuto(new Date()),
            motivo: datosGuardados?.motivo || '',
            observaciones: datosGuardados?.observaciones || ''
          }, { emitEvent: false });

          if (datosGuardados?.motivo) {
            this.prePopularMotivoEnCascada(datosGuardados.motivo);
          }

          this.iniciarTemporizadorHoraFin();
          
          const motivoMensaje = datosGuardados?.motivo ? ` Motivo registrado: ${datosGuardados.motivo}` : '';
          this.messageService.add({ 
            key: 'registro-uso', 
            life: 4000, 
            severity: 'info', 
            summary: 'Sesión activa', 
            detail: `Este usuario está dentro de ${datosGuardados?.laboratorioNombre || 'un laboratorio'}.${motivoMensaje}` 
          });
        } else {
          this.usoActivo = false;
          this.detenerTemporizadorHoraFin();
          const ahora = new Date();
          this.formUso.patchValue({
            fecha_uso: ahora,
            hora_inicio: this.formatearHoraMinuto(ahora),
            hora_fin: '',
            laboratorio_id: '',
            motivo: '',
            observaciones: ''
          }, { emitEvent: false });
        }
      });
  }

  private registrarNuevoUsuarioExterno(): Promise<boolean> {
    return new Promise(resolve => {
      const v = this.formUsuario.value;
      const identificacion = v.identificacion ?? '';
      const genero = (v.genero ?? 'Otro') as 'Masculino' | 'Femenino' | 'Otro';
      
      const nuevoUsuarioExterno: UsuarioExterno = {
        nombre: v.nombre ?? identificacion,
        identificacion,
        genero,
        cargo: v.programa || null,
        tipoUsuario: v.facultad || 'Externo'
      };

      this.usuariosExternosService.crearUsuarioExterno(nuevoUsuarioExterno)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.nombreUsuario = v.nombre || identificacion;
            this.registrandoUsuarioExterno = false;
            this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'success', summary: 'Usuario registrado', detail: 'Usuario externo registrado exitosamente.' });
            resolve(true);
          },
          error: () => {
            this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error de registro', detail: 'No se pudo registrar el usuario externo.' });
            resolve(false);
          }
        });
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

  private normalizarUsuarioDesdeExternos(usuario: UsuarioExterno) {
    const genero = (usuario.genero || '').trim();
    const rol = 'Externo';
    const programa = (usuario.cargo || 'No especificado').trim();
    const facultad = (usuario.tipoUsuario || 'Externo').trim();

    return { nombre: usuario.nombre || usuario.identificacion, genero, rol, programa, facultad };
  }

  private agregarOpcionSiNoExiste(lista: Array<{ label: string; value: string }>, valor?: string): void {
    const val = (valor ?? '').trim();
    if (!val) return;
    if (!lista.some(o => o.value === val)) lista.push({ label: val, value: val });
  }

  async marcarEntrada(): Promise<void> {
    if (this.formUsuario.invalid || this.formUso.invalid) {
      this.formUsuario.markAllAsTouched();
      this.formUso.markAllAsTouched();
      this.tipoCategoriaCtrl.markAsTouched();
      this.tipoPracticaCtrl.markAsTouched();
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Revisa', detail: 'Completa los campos requeridos.' });
      return;
    }

    const identificacion = this.formUsuario.value.identificacion?.trim();
    if (!identificacion) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Atención', detail: 'Primero carga la identificación.' });
      return;
    }

    if (this.registrandoUsuarioExterno) {
      const ok = await this.registrarNuevoUsuarioExterno();
      if (!ok) return;
    }

    const laboratorioId = String(this.formUso.value.laboratorio_id || '').trim();
    if (!laboratorioId) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Atención', detail: 'Seleccione un laboratorio.' });
      return;
    }

    const estado = (this.estadoLab.get(laboratorioId) ?? '').toLowerCase();
    const cupos = this.cuposDisponibles.get(laboratorioId) ?? 0;

    if (estado === 'ocupado' || estado === 'mantenimiento' || cupos <= 0) {
      const detalle = estado === 'ocupado'
        ? 'Este laboratorio está ocupado.'
        : estado === 'mantenimiento'
        ? 'Este laboratorio está en mantenimiento.'
        : 'Este laboratorio no tiene cupos disponibles.';
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'No disponible', detail: detalle });
      return;
    }

    const ahora = new Date();
    const horaInicio = this.formatearHoraMinuto(ahora);
    this.formUso.patchValue({ hora_inicio: horaInicio, hora_fin: '' });

    const observacionesEntrada = this.limpiarObservaciones(this.formUso.value.observaciones || '');
    
    const datosEntrada = {
      identificacion,
      laboratorioId,
      laboratorioNombre: this.laboratorioActualNombre,
      fechaUso: this.formatearAnioMesDia(this.formUso.value.fecha_uso as Date),
      horaInicio: this.formatearHoraMinutoSegundo(horaInicio),
      motivo: this.formUso.value.motivo || '',
      observaciones: observacionesEntrada,
      nombreUsuario: this.nombreUsuario,
      datosUsuario: {
        genero: this.formUsuario.value.genero || '',
        rol: this.formUsuario.value.rol || '',
        programa: this.formUsuario.value.programa || '',
        facultad: this.formUsuario.value.facultad || '',
        semestre: this.formUsuario.value.semestre || ''
      }
    };

    const payloadEntrada: EntradaPayload = {
      identificacion,
      laboratorioId,
      fechaUso: datosEntrada.fechaUso,
      horaInicio: datosEntrada.horaInicio
    };

    this.usosLaboratorioService.marcarEntrada(payloadEntrada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.datosEntradaPendientes.set(identificacion, datosEntrada);
          
          this.actualizarCuposYEstado(laboratorioId, -1);
          this.cargarLaboratorios();
          
          this.messageService.add({ 
            key: 'registro-uso', 
            life: 4000, 
            severity: 'success', 
            summary: 'Entrada registrada', 
            detail: `Entrada marcada para ${this.nombreUsuario} en ${this.laboratorioActualNombre}. Motivo: ${datosEntrada.motivo}` 
          });
          
          this.reiniciarParaNuevoRegistro();
        },
        error: (err) => {
          if (err?.status === 409) {
            this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Ya está dentro', detail: 'El estudiante sigue dentro de un laboratorio.' });
            this.reiniciarParaNuevoRegistro();
          } else {
            const detalle = (err?.error?.message || err?.error?.error || err?.message || 'No se pudo marcar la entrada').toString();
            this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: detalle });
          }
        }
      });
  }

  marcarSalidaYGuardar(): void {
    const identificacion = this.formUsuario.value.identificacion?.trim();
    if (!identificacion) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Atención', detail: 'Ingrese la identificación del usuario que va a salir.' });
      return;
    }

    if (!this.formUso.value.motivo) {
      this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Motivo requerido', detail: 'Debe especificar el motivo del uso antes de marcar la salida.' });
      return;
    }

    this.usosLaboratorioService.estado(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: estado => {
          if (!estado?.activo || !estado.laboratorioId) {
            this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'warn', summary: 'Sin sesión activa', detail: 'Este usuario no tiene una sesión activa en ningún laboratorio.' });
            return;
          }

          let horaFin = this.formUso.value.hora_fin;
          if (!horaFin) {
            horaFin = this.formatearHoraMinuto(new Date());
            this.formUso.patchValue({ hora_fin: horaFin });
          }

          const vu = this.formUsuario.value;
          const fu = this.formUso.value;
          const datosGuardados = this.datosEntradaPendientes.get(identificacion);

          const observacionesLimpias = this.limpiarObservaciones(fu.observaciones || datosGuardados?.observaciones || '');

          const horaInicio = (estado.horaInicio || '00:00').slice(0, 5);
          const horaFinNormalizada = horaFin.slice(0, 5);
          if (!this.horaFinEsValida(horaInicio, horaFinNormalizada)) {
            this.messageService.add({ key: 'registro-uso', life: 6000, severity: 'warn', summary: 'Hora de salida inválida', detail: 'La hora de salida debe ser al menos 1 minuto posterior a la hora de entrada.' });
            return;
          }
          
          const payloadSalida: SalidaPayload = {
            identificacion,
            horaFin: this.formatearHoraMinutoSegundo(horaFin),
            semestre: datosGuardados?.datosUsuario?.semestre || vu.semestre || '',
            genero: datosGuardados?.datosUsuario?.genero || vu.genero || '',
            rol: datosGuardados?.datosUsuario?.rol || vu.rol || '',
            programa: datosGuardados?.datosUsuario?.programa || vu.programa || '',
            facultad: datosGuardados?.datosUsuario?.facultad || vu.facultad || '',
            motivo: fu.motivo || datosGuardados?.motivo || '',
            observaciones: observacionesLimpias || null
          };

          const laboratorioIdAfectado = String(estado.laboratorioId);

          // No hay suministros consumibles de reserva en este flujo
          this.ejecutarSalida(payloadSalida, laboratorioIdAfectado, horaFin);
        },
        error: () => this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudo verificar el estado del usuario.' })
      });
  }

  /** Confirmar salida desde el modal de devolución de consumibles */
  confirmarSalidaConDevolucion(): void {
    const pending = (this as any)._payloadSalidaPendiente;
    if (!pending) return;
    this.mostrarModalDevolucion = false;
    this.ejecutarSalida(pending.payloadSalida, pending.laboratorioIdAfectado, pending.payloadSalida.horaFin.slice(0, 5));
    (this as any)._payloadSalidaPendiente = null;
  }

  cancelarModalDevolucion(): void {
    this.mostrarModalDevolucion = false;
    this.consumiblesParaDevolver = [];
    this.pendienteSalidaId = null;
    (this as any)._payloadSalidaPendiente = null;
  }

  private ejecutarSalida(payloadSalida: SalidaPayload, laboratorioIdAfectado: string, horaFin: string): void {
    const identificacion = payloadSalida.identificacion;
    this.usosLaboratorioService.marcarSalida(payloadSalida)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (laboratorioIdAfectado) this.actualizarCuposYEstado(laboratorioIdAfectado, +1);

          const datosGuardados = this.datosEntradaPendientes.get(identificacion);
          const motivo = payloadSalida.motivo || 'No especificado';
          const laboratorioNombre = datosGuardados?.laboratorioNombre || this.laboratorios.find(l => String(l.id) === laboratorioIdAfectado)?.nombre || 'Laboratorio';
          const nombreUsuario = datosGuardados?.nombreUsuario || identificacion;

          this.messageService.add({
            key: 'registro-uso',
            life: 6000,
            severity: 'success',
            summary: 'Salida registrada',
            detail: `${nombreUsuario} salió de ${laboratorioNombre}. Hora: ${horaFin}. Motivo: ${motivo}`
          });

          this.datosEntradaPendientes.delete(identificacion);
          this.consumiblesParaDevolver = [];
          this.reiniciarParaNuevoRegistro();
          this.cargarLaboratorios();
        },
        error: (err) => {
          const detalle = (err?.error?.message || err?.error?.error || err?.message || 'No se pudo registrar la salida').toString();
          this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: detalle });
        }
      });
  }

  private reiniciarParaNuevoRegistro(): void {
    this.detenerTemporizadorHoraFin();
    this.usoActivo = false;
    this.registrandoUsuarioExterno = false;
    this.mostrarBotonRegistroExternos = false;
    this.mostrarModalRegistroExternos = false;
    this.laboratorioSeleccionadoId = null;
    this.nombreUsuario = '';
    this.actualizarValidacionesFormulario(false);
    this.mostrarModalDevolucion = false;
    this.consumiblesParaDevolver = [];
    this.pendienteSalidaId = null;

    // Restablecer estado del formulario
    this.formUso.get('fecha_uso')?.enable({ emitEvent: false });
    this.formUso.get('laboratorio_id')?.enable({ emitEvent: false });
    this.tipoPracticaCtrl.enable({ emitEvent: false });
    this.tipoCategoriaCtrl.enable({ emitEvent: false });

    this.formUsuario.reset();
    this.formUsuarioExterno.reset();

    const ahora = new Date();
    this.formUso.reset({ fecha_uso: ahora, hora_inicio: this.formatearHoraMinuto(ahora), hora_fin: '', laboratorio_id: '', motivo: '', observaciones: '' });

    this.tipoCategoriaCtrl.reset('', { emitEvent: false });
    this.tipoPracticaCtrl.reset('', { emitEvent: false });
    this.motivoOtroCtrl.reset('', { emitEvent: false });
    this.practicasDisponibles = [];
    this.mostrarCampoOtro = false;

    this.step = 1;
  }

  private iniciarTemporizadorHoraFin(): void {
    this.detenerTemporizadorHoraFin();
    this.temporizadorActualizacionHoraFin = setInterval(() => {
      this.formUso.patchValue({ hora_fin: this.formatearHoraMinuto(new Date()) }, { emitEvent: false });
    }, 1000);
  }

  private detenerTemporizadorHoraFin(): void {
    if (this.temporizadorActualizacionHoraFin) {
      clearInterval(this.temporizadorActualizacionHoraFin);
      this.temporizadorActualizacionHoraFin = null;
    }
  }

  private limpiarDatosAntiguos(): void {
    const ahora = Date.now();
    const unDiaEnMs = 24 * 60 * 60 * 1000;
    
    for (const [identificacion, datos] of this.datosEntradaPendientes.entries()) {
      const fechaEntrada = new Date(datos.fechaUso).getTime();
      if (ahora - fechaEntrada > unDiaEnMs) {
        this.datosEntradaPendientes.delete(identificacion);
      }
    }
  }

  private limpiarObservaciones(observaciones: string): string {
    if (!observaciones || typeof observaciones !== 'string') {
      return '';
    }

    const textoSucio = observaciones.trim();
    
    const patronesARemover = [
      /Validado\s*-\s*Estado:\s*\w+,\s*Match:\s*(true|false)/gi,
      /Estado:\s*DURANTE/gi,
      /Match:\s*(true|false)/gi,
      /Validado\s*-/gi
    ];

    let textoLimpio = textoSucio;
    
    patronesARemover.forEach(patron => {
      textoLimpio = textoLimpio.replace(patron, '').trim();
    });

    textoLimpio = textoLimpio.replace(/\s+/g, ' ').trim();
    
    if (textoLimpio.length === 0 || /^[^a-zA-Z0-9À-ÿñÑ]*$/.test(textoLimpio)) {
      return '';
    }

    return textoLimpio;
  }

  private detectarTextoValidacion(texto: string): boolean {
    if (!texto || typeof texto !== 'string') return false;

    const patronesValidacion = [/Validado\s*-\s*Estado:/i, /Estado:\s*DURANTE/i, /Match:\s*(true|false)/i];
    return patronesValidacion.some(patron => patron.test(texto));
  }

  cargarTipoPractica(): void {
    this.cargandoTipoPractica = true;
    this.tipoPracticaService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TipoPractica[]) => {
          this.todosTiposPractica = response;

          // Cargar el combo de prácticas con label = nombre y value = id
          this.practicasDisponibles = [
            { label: 'Seleccionar práctica...', value: '' },
            ...response.map(item => ({ label: item.nombre, value: item.id }))
          ];

          // Mantener categorías sólo para compatibilidad futura (no se usa en el select activado)
          const tiposUnicos = [...new Set(response.map(item => item.tipo))].filter(Boolean);
          this.tiposCategorias = [
            { label: 'Seleccionar tipo...', value: '' },
            ...tiposUnicos.map(tipo => ({
              label: tipo.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              value: tipo
            }))
          ];

          this.cargandoTipoPractica = false;
          if (this.tipoPracticaIdPendiente || this.motivoPendientePrecargar) {
            this.prePopularMotivoEnCascada(this.motivoPendientePrecargar ?? '', this.tipoPracticaIdPendiente ?? undefined);
            this.motivoPendientePrecargar = null;
            this.tipoPracticaIdPendiente = null;
          }
        },
        error: () => {
          this.cargandoTipoPractica = false;
          this.messageService.add({ key: 'registro-uso', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tipos de práctica' });
        }
      });
  }

  private onTipoCategoriaChange(tipoCategoria: string): void {
    // Limpiar selección de práctica y motivo
    this.tipoPracticaCtrl.setValue('', { emitEvent: false });
    this.formUso.patchValue({ motivo: '' }, { emitEvent: false });
    this.practicasDisponibles = [];
    this.mostrarCampoOtro = false;
    this.motivoOtroCtrl.reset('', { emitEvent: false });
    
    if (!tipoCategoria) return;

    // Filtrar prácticas por el tipo seleccionado
    const practicasFiltradas = this.todosTiposPractica.filter(item => item.tipo === tipoCategoria);
    this.practicasDisponibles = [
      { label: 'Seleccionar práctica...', value: '' },
      ...practicasFiltradas.map(item => ({ label: item.nombre, value: item.id }))
    ];
  }

  private onTipoPracticaChange(tipoPracticaId: string): void {
    this.formUso.patchValue({ motivo: '' }, { emitEvent: false });
    this.mostrarCampoOtro = false;
    this.motivoOtroCtrl.reset('', { emitEvent: false });
    if (!tipoPracticaId) return;

    // Buscar el tipo de práctica seleccionado y establecer su nombre como motivo
    const practicaSeleccionada = this.todosTiposPractica.find(item => item.id === tipoPracticaId);
    if (practicaSeleccionada) {
      this.formUso.patchValue({ motivo: practicaSeleccionada.nombre }, { emitEvent: false });
    }
  }

  private normalizarTexto(s: string): string {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private prePopularMotivoEnCascada(motivo: string, tipoPracticaId?: string): void {
    if (!motivo && !tipoPracticaId) return;
    if (this.todosTiposPractica.length === 0) {
      if (motivo) this.motivoPendientePrecargar = motivo;
      if (tipoPracticaId) this.tipoPracticaIdPendiente = tipoPracticaId;
      return;
    }

    // Búsqueda exacta por ID cuando está disponible, si no por nombre
    const item = tipoPracticaId
      ? this.todosTiposPractica.find(i => i.id === tipoPracticaId)
      : this.todosTiposPractica.find(i => this.normalizarTexto(i.nombre) === this.normalizarTexto(motivo));

    if (item) {
      // Primero seleccionar la categoría
      this.tipoCategoriaCtrl.setValue(item.tipo, { emitEvent: false });

      // Cargar las prácticas de esa categoría
      const practicasFiltradas = this.todosTiposPractica.filter(p => p.tipo === item.tipo);
      this.practicasDisponibles = [
        { label: 'Seleccionar práctica...', value: '' },
        ...practicasFiltradas.map(p => ({ label: p.nombre, value: p.id }))
      ];

      // Luego seleccionar la práctica específica
      this.tipoPracticaCtrl.setValue(item.id, { emitEvent: false });
      this.formUso.patchValue({ motivo: item.nombre }, { emitEvent: false });
    }
  }

  invalidUsuario(controlName: string): boolean {
    const c = this.formUsuario.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  invalidUso(controlName: string): boolean {
    const c = this.formUso.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  invalidUsuarioExterno(controlName: string): boolean {
    const c = this.formUsuarioExterno.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  obtenerMensajeErrorIdentificacion(): string {
    const c = this.formUsuario.get('identificacion');
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'La identificación es requerida';
    if (c.errors['minlength']) return 'Mínimo 4 caracteres';
    if (c.errors['maxlength']) return 'Máximo 20 caracteres';
    if (c.errors['pattern']) return 'Solo se permiten letras y números';
    return 'Formato inválido';
  }

  obtenerMensajeError(nombreControl: string): string {
    const c = this.formUsuario.get(nombreControl) || this.formUso.get(nombreControl);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Este campo es requerido';
    if (c.errors['minlength']) return `Mínimo ${c.errors['minlength'].requiredLength} caracteres`;
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres`;
    if (c.errors['min']) return `Valor mínimo: ${c.errors['min'].min}`;
    if (c.errors['max']) return `Valor máximo: ${c.errors['max'].max}`;
    if (c.errors['pattern']) return 'Formato inválido';
    return 'Campo inválido';
  }
}