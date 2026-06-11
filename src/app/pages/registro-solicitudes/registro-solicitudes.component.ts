import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { ViewChild } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';

import { ConfirmarIndividualModalComponent } from '../modals/modal-confirmar-individual/confirmar-individual-modal.component';
import { ConfirmarMasivoModalComponent } from '../modals/modal-confirmar-masivo/confirmar-masivo-modal.component';

import {
  SelectComponent,
  FileManagerComponent,
  FileUploadConfig,
} from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';

import { SolicitudService } from '../../core/services/solicitud.service';
import { TipoSolicitudService } from '../../core/services/tipo-solicitud.service';
import { UsuarioOracleService } from '../../core/services/usuario-oracle.service';
import {
  CrearSolicitudManualRequest,
  SolicitudResponse,
  ResultadoMasivaResponse,
  ItemResultadoMasivo,
  TipoSolicitudItem,
  UsuarioOracleResponse,
} from '../../core/models/solicitud.models';

/** Rol requerido para registrar solicitudes. */
const ROL_DIRECTOR = 'PLANES_DIRECTOR';

/** Calcula el período académico según el mes actual.
 * Lógica alineada con planes_de_trabajo:
 * - May-Jun → Periodo 2 (inicio de matrícula segundo semestre)
 * - Nov+ → Periodo 1 del año siguiente (inicio matrícula primer semestre)
 * - Resto: 1 si ene-abr, 2 si jul-oct
 */
function calcularPeriodo(): 1 | 2 {
  const mes = new Date().getMonth() + 1; // 1-based
  if (mes >= 5 && mes <= 6) return 2;
  return mes <= 6 ? 1 : 2;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabsModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    TagModule,
    TableModule,
    ProgressSpinnerModule,
    TooltipModule,
    MessageModule,
    SkeletonModule,
    ProgressBarModule,
    InputTextModule,
    SelectComponent,
    FileManagerComponent,
    ConfirmarIndividualModalComponent,
    ConfirmarMasivoModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './registro-solicitudes.component.html',
  styleUrl: './registro-solicitudes.component.scss',
})
export class RegistroSolicitudesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly solicitudService = inject(SolicitudService);
  private readonly tipoSolicitudService = inject(TipoSolicitudService);
  private readonly usuarioOracleService = inject(UsuarioOracleService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  private readonly destroy$ = new Subject<void>();
  private readonly cedulaInput$ = new Subject<string | null>();

  // Opciones de selects 
  tiposSolicitud = signal<TipoSolicitudItem[]>([]);
  readonly tipoSolicitudOptions = computed(() =>
    this.tiposSolicitud().map((t) => ({ label: t.nombre, value: t.uuid }))
  );

  readonly periodoOptions = [
    { label: 'Periodo 1', value: 1 },
    { label: 'Periodo 2', value: 2 },
  ];

  // Datos automáticos 
  readonly anioActual = new Date().getFullYear();
  readonly periodoActual = calcularPeriodo();

  // Director autenticado 
  esDirector = signal(false);
  directorInfo = signal<UsuarioOracleResponse | null>(null);
  cargandoDirector = signal(false);

  // Estado validación estudiante (form individual)
  buscandoEstudiante = signal(false);
  estudianteInfo = signal<UsuarioOracleResponse | null>(null);
  estudianteError = signal<string>('');

  // Estado UI 
  cargandoIndividual = signal(false);
  cargandoMasivo = signal(false);

  solicitudCreada = signal<SolicitudResponse | null>(null);
  resultadoMasivo = signal<ResultadoMasivaResponse | null>(null);

  archivoSeleccionado: File | null = null;
  nombreArchivo = signal<string>('');
  archivoError = signal<string>('');

  // Diálogos de confirmación 
  confirmacionIndividualVisible = signal(false);
  confirmacionMasivoVisible = signal(false);

  formularioIndividual!: FormGroup;
  formularioMasivo!: FormGroup;

  @ViewChild(FileManagerComponent) fileManagerComponent!: FileManagerComponent;

  // Configuración del FileManager
  readonly fileManagerConfig: Partial<FileUploadConfig> = {
    multiple: false,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    accept: '.txt,.csv',
    autoUpload: false,
    showPreview: false,
    showDownload: false,
    showDelete: true,
    moduleName: 'registro_masivo'
  };

  // Etiqueta del período para mostrar (solo lectura)
  get etiquetaPeriodo(): string {
    return `Periodo ${this.periodoActual}`;
  }

  ngOnInit(): void {
    this._inicializarFormularios();
    this._cargarTiposSolicitud();
    this._inicializarDirector();
    this._configurarBusquedaEstudiante();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicialización 

  private _inicializarFormularios(): void {
    this.formularioIndividual = this.fb.group({
      cedula: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
      uuidTipoSolicitud: [null, [Validators.required]],
      anio: [{ value: this.anioActual, disabled: true }],
      periodo: [{ value: this.periodoActual, disabled: true }],
      idPrograma: [{ value: '', disabled: true }],
      idFacultad: [{ value: '', disabled: true }],
    });

    this.formularioMasivo = this.fb.group({
      uuidTipoSolicitud: [null, [Validators.required]],
      anio: [{ value: this.anioActual, disabled: true }],
      periodo: [{ value: this.periodoActual, disabled: true }],
      idPrograma: [{ value: '', disabled: true }],
      idFacultad: [{ value: '', disabled: true }],
    });
  }

  // Método para limpiar formulario individual
  limpiarFormularioIndividual() {
    this.formularioIndividual.reset();
    this.formularioIndividual.patchValue({
      anio: this.anioActual,
      periodo: this.periodoActual,
      idPrograma: '',
      idFacultad: ''
    });
    this.solicitudCreada.set(null);
    this.estudianteInfo.set(null);
    this.estudianteError.set('');
  }

  // Método para limpiar formulario masivo
  limpiarFormularioMasivo() {
    this.formularioMasivo.patchValue({ uuidTipoSolicitud: null });
    this.limpiarArchivo();
    this.resultadoMasivo.set(null);
  }

  private _cargarTiposSolicitud(): void {
    this.tipoSolicitudService.listar().subscribe({
      next: (tipos) => this.tiposSolicitud.set(tipos),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error de carga',
          detail: 'No se pudieron cargar los tipos de solicitud. Recargue la página.',
          life: 7000,
        }),
    });
  }

  private _inicializarDirector(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (!user) return;

        const esDirector = user.roles.includes(ROL_DIRECTOR);
        this.esDirector.set(esDirector);

        if (!esDirector) return;

        // Intentar usar identificacion, o fallback a username si identificacion no está disponible
        const identificacion = user.identificacion || user.username;
        if (!identificacion) return;

        // Obtener el programa del director desde Oracle
        this.cargandoDirector.set(true);
        this.usuarioOracleService
          .getByIdentificacion(identificacion)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (info) => {
              this.cargandoDirector.set(false);
              this.directorInfo.set(info);
              // Pre-llenar programa y facultad del masivo con los del director
              if (info) {
                this.formularioMasivo.patchValue({
                  idPrograma: info.programa,
                  idFacultad: info.facultad,
                });
                const estudiante = this.estudianteInfo();
                if (estudiante) {
                  this._validarProgramaConDirector(estudiante);
                }
              }
            },
            error: () => this.cargandoDirector.set(false),
          });
      });
  }

  private _configurarBusquedaEstudiante(): void {
    this.formularioIndividual.get('cedula')!.valueChanges
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((cedula) => this.cedulaInput$.next(cedula));

    this.cedulaInput$
      .pipe(
        switchMap((cedula) => {
          // Limpiar estado previo
          this.estudianteInfo.set(null);
          this.estudianteError.set('');
          this.formularioIndividual.patchValue({ idPrograma: '', idFacultad: '' });

          const soloDigitos = /^\d{7,10}$/;
          if (!cedula || !soloDigitos.test(String(cedula))) {
            return [];
          }

          this.buscandoEstudiante.set(true);
          return this.usuarioOracleService.getByIdentificacion(String(cedula));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (info) => {
          this.buscandoEstudiante.set(false);
          if (info === null) {
            this.estudianteError.set(
              'No se encontró ningún usuario con esa identificación en el sistema institucional.'
            );
            return;
          }

          if (info.cargo !== 'ESTUDIANTE') {
            this.estudianteError.set(
              `El usuario tiene el cargo "${info.cargo || 'No definido'}". Solo se permite registrar solicitudes para estudiantes.`
            );
            return;
          }

          this.estudianteInfo.set(info);
          this.formularioIndividual.patchValue({
            idPrograma: info.programa,
            idFacultad: info.facultad,
          });
          this._validarProgramaConDirector(info);
        },
        error: () => {
          this.buscandoEstudiante.set(false);
          this.estudianteError.set(
            'Error al consultar la información del usuario. Verifique la conexión.'
          );
        },
      });
  }

  private _validarProgramaConDirector(estudiante: UsuarioOracleResponse): void {
    const director = this.directorInfo();
    if (!director) return;

    const programaDirectorStr = director.programa ?? '';
    const programaEstudianteStr = estudiante.programa ?? '';

    if (!programaDirectorStr || !programaEstudianteStr) return;

    const coinciden = this._programasCoinciden(programaDirectorStr, programaEstudianteStr);

    if (!coinciden) {
      this.estudianteError.set(
        `El estudiante pertenece a un programa diferente al tuyo. ` +
        `Tu programa: "${programaDirectorStr}", Programa del estudiante: "${programaEstudianteStr}".`
      );
    }
  }

  /**
   * Compara dos strings de programa usando la siguiente estrategia en orden de prioridad:
   * 1. Si alguno contiene un código SNIES (número de 4-6 dígitos precedido de "SNIES"),
   *    compara exclusivamente por ese código.
   * 2. Si no, normaliza ambos strings y verifica si uno contiene al otro.
   * 3. Como último recurso, compara por palabras clave significativas (≥4 letras,
   *    excluyendo palabras genéricas como "de", "del", "en", "el", "la", etc.).
   */
  private _programasCoinciden(a: string, b: string): boolean {
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

    // 1. Comparar por código SNIES si está disponible en cualquiera de los strings
    const sniesRegex = /\bsnies\s*(\d{4,6})\b/i;
    const sniesA = sniesRegex.exec(a);
    const sniesB = sniesRegex.exec(b);
    if (sniesA || sniesB) {
      // Si ambos tienen SNIES, comparar directamente
      if (sniesA && sniesB) {
        return sniesA[1] === sniesB[1];
      }
      // Si solo uno tiene SNIES, no podemos comparar por este criterio —
      // continuamos con los métodos siguientes
    }

    const normA = normalize(a);
    const normB = normalize(b);

    // 2. Comparación por contención (uno contiene al otro)
    if (normA.includes(normB) || normB.includes(normA)) {
      return true;
    }

    // 3. Comparación por palabras clave significativas
    const PALABRAS_GENERICAS = new Set([
      'de', 'del', 'en', 'el', 'la', 'los', 'las', 'y', 'a', 'e', 'o', 'u',
      'con', 'sin', 'por', 'para', 'que', 'al', 'un', 'una', 'unos', 'unas',
      'admon', 'administracion', 'ingenieria', 'licenciatura', 'tecnologo',
      'profesional', 'programa',
    ]);

    const extraerPalabrasClave = (str: string): Set<string> => {
      const palabras = normalize(str)
        .replace(/[^a-z0-9\s]/g, ' ')   // quitar puntuación
        .split(/\s+/)
        .filter(p => p.length >= 4 && !PALABRAS_GENERICAS.has(p) && !/^\d+$/.test(p));
      return new Set(palabras);
    };

    const clavesA = extraerPalabrasClave(a);
    const clavesB = extraerPalabrasClave(b);

    if (clavesA.size === 0 || clavesB.size === 0) return false;

    // Calcular intersección
    let coincidencias = 0;
    clavesA.forEach(p => { if (clavesB.has(p)) coincidencias++; });

    // Necesitamos al menos el 50% de las palabras clave del conjunto menor en común
    const minTamano = Math.min(clavesA.size, clavesB.size);
    return coincidencias / minTamano >= 0.5;
  }

  /** Retorna true cuando la cédula ya fue consultada y hay error de programa */
  get hayErrorPrograma(): boolean {
    return !!this.estudianteError() && !!this.estudianteInfo();
  }

  get directorTienePrograma(): boolean {
    return !!this.directorInfo()?.programa?.trim();
  }

  // Registro individual 

  confirmarIndividual(): void {
    if (!this.esDirector()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso restringido',
        detail: 'Solo los directores de programa pueden registrar solicitudes.',
        life: 6000,
      });
      return;
    }

    if (this.formularioIndividual.invalid) {
      this.formularioIndividual.markAllAsTouched();
      return;
    }

    if (this.estudianteError()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación pendiente',
        detail: this.estudianteError(),
        life: 7000,
      });
      return;
    }

    if (!this.estudianteInfo()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario no validado',
        detail: 'Ingrese la cédula del estudiante y espere la validación antes de continuar.',
        life: 6000,
      });
      return;
    }

    this.confirmacionIndividualVisible.set(true);
  }

  onAceptarIndividual(): void {
    this.confirmacionIndividualVisible.set(false);
    this.enviarIndividual();
  }

  onCancelarIndividual(): void {
    this.confirmacionIndividualVisible.set(false);
  }

  private enviarIndividual(): void {
    const v = this.formularioIndividual.getRawValue();
    // Se usa el programa del director (no del estudiante) como idPrograma,
    // para garantizar coincidencia al listar solicitudes por programa del director.
    const programaDirector = this.directorInfo()?.programa?.trim() || v.idPrograma?.trim() || undefined;
    const request: CrearSolicitudManualRequest = {
      cedula: Number(v.cedula),
      uuidTipoSolicitud: v.uuidTipoSolicitud,
      anio: v.anio,
      periodo: v.periodo,
      idPrograma: programaDirector,
      idFacultad: v.idFacultad?.trim() || undefined,
    };

    this.cargandoIndividual.set(true);
    this.solicitudCreada.set(null);

    this.solicitudService.registrarIndividual(request).subscribe({
      next: (resp) => {
        this.cargandoIndividual.set(false);
        this.solicitudCreada.set(resp);
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud creada',
          detail: `Solicitud de paz y salvo registrada exitosamente.`,
          life: 5000,
        });
        this.formularioIndividual.reset();
        this.formularioIndividual.patchValue({
          anio: this.anioActual,
          periodo: this.periodoActual,
          idPrograma: '',
          idFacultad: '',
        });
        this.estudianteInfo.set(null);
        this.estudianteError.set('');
      },
      error: (err) => {
        this.cargandoIndividual.set(false);
        const detalle =
          err?.error?.message ||
          err?.error?.error ||
          'Ocurrió un error al registrar la solicitud.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error al registrar',
          detail: detalle,
          life: 7000,
        });
      },
    });
  }

  // Registro masivo

  onFilesSelected(files: File[]): void {
    if (files && files.length > 0) {
      this.archivoSeleccionado = files[0];
      this.nombreArchivo.set(this.archivoSeleccionado.name);
      this.archivoError.set('');
    } else {
      this.limpiarArchivo();
    }
  }

  onFileDeleted(): void {
    this.limpiarArchivo();
  }

  onUploadError(error: string): void {
    this.archivoError.set(error);
  }

  onCedulaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Solo permitir dígitos
    const soloDigitos = input.value.replace(/\D/g, '');
    if (input.value !== soloDigitos) {
      input.value = soloDigitos;
      this.formularioIndividual.get('cedula')!.setValue(soloDigitos, { emitEvent: true });
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.archivoSeleccionado = null;
      this.nombreArchivo.set('');
      return;
    }

    const file = input.files[0];
    const extensionValida = /\.(txt|csv)$/i.test(file.name);
    const tamanoMaximo = 2 * 1024 * 1024;

    if (!extensionValida) {
      this.archivoError.set('Solo se permiten archivos .txt o .csv');
      this.archivoSeleccionado = null;
      this.nombreArchivo.set('');
      input.value = '';
      return;
    }

    if (file.size > tamanoMaximo) {
      this.archivoError.set('El archivo supera el tamaño máximo de 2 MB');
      this.archivoSeleccionado = null;
      this.nombreArchivo.set('');
      input.value = '';
      return;
    }

    this.archivoError.set('');
    this.archivoSeleccionado = file;
    this.nombreArchivo.set(file.name);
  }

  limpiarArchivo(): void {
    this.archivoSeleccionado = null;
    this.nombreArchivo.set('');
    this.archivoError.set('');
    if (this.fileManagerComponent) {
      this.fileManagerComponent.reset();
    }
  }

  confirmarMasivo(): void {
    if (!this.esDirector()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso restringido',
        detail: 'Solo los directores de programa pueden registrar solicitudes.',
        life: 6000,
      });
      return;
    }

    if (this.formularioMasivo.invalid) {
      this.formularioMasivo.markAllAsTouched();
      return;
    }

    if (!this.archivoSeleccionado) {
      this.archivoError.set('Debe seleccionar un archivo .txt o .csv');
      return;
    }

    if (!this.directorTienePrograma) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Programa no disponible',
        detail: 'Espere a que se cargue el programa del director antes de procesar el archivo.',
        life: 6000,
      });
      return;
    }

    this.confirmacionMasivoVisible.set(true);
  }

  onAceptarMasivo(): void {
    this.confirmacionMasivoVisible.set(false);
    this.enviarMasivo();
  }

  onCancelarMasivo(): void {
    this.confirmacionMasivoVisible.set(false);
    if (this.fileManagerComponent) {
      this.fileManagerComponent.isUploading = false;
    }
  }

  private enviarMasivo(): void {
    if (!this.archivoSeleccionado) return;

    const v = this.formularioMasivo.getRawValue();
    this.cargandoMasivo.set(true);
    this.resultadoMasivo.set(null);

    this.solicitudService
      .registrarMasivo(
        this.archivoSeleccionado,
        v.uuidTipoSolicitud,
        v.anio,
        v.periodo,
        v.idPrograma?.trim() || undefined,
        v.idFacultad?.trim() || undefined
      )
      .subscribe({
        next: (resp) => {
          this.cargandoMasivo.set(false);
          this.resultadoMasivo.set(resp);
          const severity =
            resp.fallidos === 0 ? 'success' : resp.exitosos === 0 ? 'error' : 'warn';
          this.messageService.add({
            severity,
            summary: 'Carga masiva completada',
            detail: `${resp.exitosos} exitosas · ${resp.fallidos} fallidas de ${resp.totalEnArchivo} registros.`,
            life: 7000,
          });
          this.limpiarArchivo();
          this.formularioMasivo.patchValue({ uuidTipoSolicitud: null });
        },
        error: (err) => {
          this.cargandoMasivo.set(false);
          const detalle =
            err?.error?.message ||
            err?.error?.error ||
            'Ocurrió un error al procesar el archivo.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error en carga masiva',
            detail: detalle,
            life: 7000,
          });
          if (this.fileManagerComponent) {
            this.fileManagerComponent.markUploadAsFailed(detalle);
          }
        },
      });
  }

  // Helpers UI

  getSeveridadEstado(estado: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      PENDIENTE: 'warn',
      EN_PROCESO: 'info',
      OBSERVACION: 'warn',
      RECHAZADO: 'danger',
      FINALIZADO: 'success',
    };
    return map[estado] ?? 'secondary';
  }

  getSeveridadItem(estado: string): 'success' | 'danger' {
    return estado === 'EXITOSO' ? 'success' : 'danger';
  }

  get fallidos(): ItemResultadoMasivo[] {
    return this.resultadoMasivo()?.resultados.filter((r) => r.estado === 'FALLIDO') ?? [];
  }

  get exitosos(): ItemResultadoMasivo[] {
    return this.resultadoMasivo()?.resultados.filter((r) => r.estado === 'EXITOSO') ?? [];
  }
}
