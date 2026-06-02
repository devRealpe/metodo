import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { CentrosCostoOracleService } from '../../core/services/centros-costo-oracle.service';
import { UbicacionesGeograficasService, UbicacionGeografica } from '../../core/services/ubicaciones-geograficas.service';
import { SolicitudViaticosService, SolicitudViaticos, AprobadorDTO, ConceptoLiquidacion } from '../../core/services/Solicitud-viaticos.service';
import { TarifasViaticosService, CalcularConceptoEspecificoRequest, CalcularConceptoEspecificoResponse } from '../../core/services/tarifas-viaticos.service';
import { AprobacionViaticoService } from '../../core/services/aprobacion-viatico.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ConceptosLiquidacionCatalogoService } from '../../core/services/conceptos-liquidacion-catalogo.service';
import { FuentesFuncionService, FuenteFuncion } from '../../core/services/fuentes-funcion.service';
import { ListaValor } from '../../core/models/lista-valor.model';
import { ConceptoLiquidacionCatalogo } from '../../core/models/concepto-liquidacion.model';
import { ViaticosUtilidadesService } from '../../core/services/viaticos-utilidades.service';
import { ArchivosUsuariosService } from '../../core/services/archivousuarios.service';
import { ArchivosUsuarios } from '../../core/models/archivousuarios.model';
import { map, forkJoin, of, catchError, Observable, debounceTime } from 'rxjs';
import { InputComponent, SelectComponent, TextareaComponent, FileAttachmentComponent } from "@microfrontends/shared-ui";
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AuthService } from '@microfrontends/shared-services';
import { ViaticosRealtimeService } from '../../core/services/viaticos-realtime.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-solicitud-viaticos.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    CheckboxModule,
    TooltipModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    DatePickerModule,
    MultiSelectModule,
    ChipModule,
    FileAttachmentComponent,
    DialogModule,
    TableModule,
    AutoCompleteModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './solicitud-viaticos.component.html',
  styleUrls: ['./solicitud-viaticos.component.scss'],
})
export class SolicitudViaticosComponent implements OnInit {
  viaticosForm!: FormGroup;
  usuario: UsuarioOracle | null = null;
  maxDateContrato: Date | null = null;
  fechaHoy: Date = new Date(); // Fecha de hoy para restringir el campo de fecha de elaboración
  loadingUsuario = false;
  categoriaAsignada: string | null = null;
  guardandoSolicitud = false;
  guardandoBorrador = false;
  borradorCargado = false;
  codigoBorradorCargado: string | null = null;
  idBorradorCargado: string | null = null;
  todosLosUsuarios: UsuarioOracle[] = [];
  usuariosFiltrados: UsuarioOracle[] = [];
  loadingTodosUsuarios = false;
  usuariosYaCargados = false;
  private messageService = inject(MessageService);
  mapeosCargados = false;
  categoriasMap: Record<string, string> = {};
  conceptosTarifasMap: Record<string, string> = {};
  tiposViaticosMap: Record<string, string> = {};
  departamentos: UbicacionGeografica[] = [];
  departamentosOptions: { label: string; value: string }[] = [];
  loadingDepartamentos = false;
  municipiosSalida: UbicacionGeografica[] = [];
  municipiosSalidaOptions: { label: string; value: string }[] = [];
  loadingMunicipiosSalida = false;
  municipiosDestino: UbicacionGeografica[] = [];
  municipiosDestinoOptions: { label: string; value: string }[] = [];
  loadingMunicipiosDestino = false;
  municipiosDestinos: Record<number | string, UbicacionGeografica[]> = {};
  destinos: Array<{
  departamento: string;
    municipio: string;
    ciudad: string;
    fechaLlegada: string;
    orden: number;
  }> = [];

  esViajeInternacional = false;
  ciudadesInternacionales: { label: string; value: string }[] = [];
  ciudadesInternacionalesFiltradas: string[] = [];
  loadingCiudadesInternacionales = false;
  paises: UbicacionGeografica[] = [];
  paisesOptions: { label: string; value: string }[] = [];
  loadingPaises = false;
  departamentosPorPais: Record<number | string, UbicacionGeografica[]> = {};
  ciudadesPorDepartamentoInt: Record<number | string, UbicacionGeografica[]> = {};
  conceptosViaje: ListaValor[] = [];
  conceptosViajeOptions: { label: string; value: string }[] = [];
  loadingConceptosViaje = false;
  categorias: ListaValor[] = [];
  categoriasOptions: { label: string; value: string }[] = [];
  loadingCategorias = false;
  archivosSoporte: File[] = [];
  archivosGuardadosIds: number[] = []; 
  fileAttachmentConfig = {
    moduleType: 'documento_soporte' as const,
    multiple: true,
    maxFileSize: 10 * 1024 * 1024,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar',
    autoUpload: false,
    showPreview: false,
    showDownload: false,
    showDelete: true,
    renameFiles: false,
    showUploadButton: false
  };

  
  fechaMinima: Date = new Date();
  conceptosLiquidacionData: ConceptoLiquidacionCatalogo[] = [];
  conceptosLiquidacion: Array<{ codigo: string; id: number; label: string; mostrarDias: boolean; tieneTarifaAutomatica: boolean }> = [];
  loadingConceptosLiquidacion = false;
  mostrarDialogoLiquidacion = false;
  destinoSeleccionadoIndex = -1;
  liquidacionGlobalCalculada: Array<{ concepto: string; subtotal: number }> = [];
  mostrarVistaPrevia = false;
  datosVistaPrevia: any = null;
  mostrarCampoOtroConcepto: { [key: string]: boolean } = {};
  loadingTarifa = false;

  private calculandoTarifa = false;
  private tarifaCalculoTimeout: any = null; 

  fechasMinLlegada: (Date | null)[] = []; 
  fuentesFuncion: FuenteFuncion[] = [];
  fuentesFuncionOptions: { label: string; value: string }[] = [];
  loadingFuentesFuncion = false;
  centrosCostoOptions: { label: string; value: string }[] = [];
  loadingCentrosCosto = false;
  
  readonly MAX_LENGTH_NOMBRE_CENTRO_COSTO = 200;
  advertenciaLimiteCentrosCosto = false;
  longitudActualNombreCentrosCosto = 0;
  directoresPrograma: UsuarioOracle[] = [];
  directoresProgramaOptions: { label: string; value: string }[] = [];
  loadingDirectoresPrograma = false;
  decanosODirectores: UsuarioOracle[] = [];
  decanosODirectoresOptions: { label: string; value: string }[] = [];
  loadingDecanosODirectores = false;
  directoresOficina: UsuarioOracle[] = [];
  directoresOficinaOptions: { label: string; value: string }[] = [];
  loadingDirectoresOficina = false;
  directoresTalentoHumano: UsuarioOracle[] = [];
  directoresTalentoHumanoOptions: { label: string; value: string }[] = [];
  loadingDirectoresTalentoHumano = false;
  vicerrectoresAdministrativos: UsuarioOracle[] = [];
  vicerrectoresAdministrativosOptions: { label: string; value: string }[] = [];
  loadingVicerrectoresAdministrativos = false;
  rectores: UsuarioOracle[] = [];
  rectoresOptions: { label: string; value: string }[] = [];
  loadingRectores = false;
  aprobadoresRequeridos: AprobadorDTO[] = [];
  mostrarDirectorPrograma = false;
  mostrarDecano = false;
  mostrarDirectorOficina = false;
  mostrarVicerrectorAdministrativo = false;
  mostrarDirectorTalentoHumano = false;
  loadingAprobadores = false;
  esProfesor = false; // Indicador si el usuario solicitante es PROFESOR

  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosOracleService);
  private readonly centrosCostoService = inject(CentrosCostoOracleService);
  private readonly ubicacionesService = inject(UbicacionesGeograficasService);
  private readonly solicitudViaticosService = inject(SolicitudViaticosService);
  private readonly tarifasService = inject(TarifasViaticosService);
  private readonly listasValoresService = inject(ListasValoresService);
  private readonly conceptosLiquidacionService = inject(ConceptosLiquidacionCatalogoService);
  private readonly fuentesFuncionService = inject(FuentesFuncionService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly viaticosUtilidadesService = inject(ViaticosUtilidadesService);
  private readonly authService = inject(AuthService);
  private readonly archivosUsuariosService = inject(ArchivosUsuariosService);
  private readonly aprobacionService = inject(AprobacionViaticoService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly realtimeService = inject(ViaticosRealtimeService);

  // Inicializa el componente y carga datos
  ngOnInit() {
    this.initializeForm();
    this.cargarDatosIniciales();
    this.setupDepartamentoWatchers();
    this.cargarUsuarioAutenticado();
    this.predefinirNariñoPasto();
  }

  // Redirige al usuario a la página de inicio
  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  // Carga información del usuario autenticado desde el token
  private cargarUsuarioAutenticado() {
    const tokenInfo = this.authService.getUserInfo();

    if (tokenInfo) {
      const identificacion = tokenInfo.identificacion || tokenInfo.preferred_username || '';
      const nombreBasico = tokenInfo.name || tokenInfo.preferred_username || 'Usuario';

      this.viaticosForm.patchValue({
        elaboradoPor: nombreBasico
      });

      if (identificacion) {
        this.usuariosService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle && usuarioOracle.nombre) {
              this.usuario = usuarioOracle;
              this.actualizarMaxDateContrato();

              this.viaticosForm.patchValue({
                elaboradoPor: usuarioOracle.nombre
              });
            }
          },
          error: () => { 
          }
        });
      }
    }
  }

  // Inicializa catálogos y datos requeridos del formulario
  private cargarDatosIniciales() {
    this.cargarMapeos();
    this.cargarDepartamentos();
    this.cargarConceptosViaje();
    this.cargarCategorias();
    this.cargarConceptosLiquidacion();
    this.cargarFuentesFuncion();
    this.cargarCentrosCosto();
    this.cargarUsuariosAprobadores();
    this.cargarTodosLosUsuarios();
  }

  // Carga mapeos de categorías y tipos desde backend
  private cargarMapeos(): void {
    this.tarifasService.obtenerMapeos().subscribe({
      next: (mapeos) => {
        this.categoriasMap = mapeos.categoriasMap;
        this.conceptosTarifasMap = mapeos.conceptosTarifasMap;
        this.tiposViaticosMap = mapeos.tiposViaticosMap;
        this.mapeosCargados = true;
        
      },
      error: (error) => {
        this.mapeosCargados = false;
        this.mostrarMensaje('error', 'Error al cargar configuraciones del sistema. Por favor, recargue la página o contacte al administrador.');
      }
    });
  }

  // Carga listado completo de usuarios sin estudiantes
  private cargarTodosLosUsuarios() {
    if (this.usuariosYaCargados) {
      return;
    }

    this.loadingTodosUsuarios = true;
    this.usuariosService.getAllSinEstudiantes().subscribe({
      next: (usuarios) => {
        this.todosLosUsuarios = usuarios || [];
        this.usuariosYaCargados = true;
        this.loadingTodosUsuarios = false;
      },
      error: (error) => {
        this.loadingTodosUsuarios = false;
      }
    });
  }

  // Carga todos los usuarios aprobadores requeridos
  private cargarUsuariosAprobadores() {
    this.cargarDirectoresPrograma();
    this.cargarDecanosODirectores();
    this.cargarDirectoresOficina();
    this.cargarDirectoresTalentoHumano();
    this.cargarVicerrectoresAdministrativos();
  }

  // Carga listado de decanos y directores
  private cargarDecanosODirectores() {
    this.loadingDecanosODirectores = true;
    this.usuariosService.getDecanosYDirectoresOficina().subscribe({
      next: (usuarios) => {
        this.decanosODirectores = usuarios;
        this.decanosODirectoresOptions = usuarios.map(d => ({
          label: d.nombre,
          value: d.nombre
        }));
        this.loadingDecanosODirectores = false;
      },
      error: () => {
        this.loadingDecanosODirectores = false;
        this.decanosODirectoresOptions = [];
      }
    });
  }

  // Carga listado de decanos solamente (para PROFESORES)
  private cargarSoloDecanos() {
    this.loadingDecanosODirectores = true;
    this.usuariosService.getByMultiplesCargos(['DECANO', 'DECANO (A)']).subscribe({
      next: (usuarios: UsuarioOracle[]) => {
        this.decanosODirectores = usuarios;
        this.decanosODirectoresOptions = usuarios.map((decano: UsuarioOracle) => ({
          label: decano.nombre,
          value: decano.nombre
        }));
        this.loadingDecanosODirectores = false;
      },
      error: () => {
        this.loadingDecanosODirectores = false;
        this.decanosODirectoresOptions = [];
      }
    });
  }

  // Carga listado de directores de oficina y directores (para NO PROFESORES)
  private cargarDirectoresOficina() {
    this.loadingDirectoresOficina = true;
    this.usuariosService.getByMultiplesCargos(['DIRECTOR DE OFICINA', 'DIRECTOR']).subscribe({
      next: (usuarios: UsuarioOracle[]) => {
        this.directoresOficina = usuarios;
        this.directoresOficinaOptions = usuarios.map((director: UsuarioOracle) => ({
          label: director.nombre,
          value: director.nombre
        }));
        this.loadingDirectoresOficina = false;
      },
      error: () => {
        this.loadingDirectoresOficina = false;
        this.directoresOficinaOptions = [];
      }
    });
  }

  // Carga directores de talento humano
  private cargarDirectoresTalentoHumano() {
    this.loadingDirectoresTalentoHumano = true;
    this.usuariosService.getDirectoresTalentoHumano().subscribe({
      next: (directores) => {
        this.directoresTalentoHumano = directores;
        this.directoresTalentoHumanoOptions = directores.map((director: UsuarioOracle) => ({
          label: director.nombre,
          value: director.nombre
        }));
        this.loadingDirectoresTalentoHumano = false;
      },
      error: () => {
        this.loadingDirectoresTalentoHumano = false;
        this.directoresTalentoHumanoOptions = [];
      }
    });
  }

  // Carga vicerrectores administrativos disponibles
  private cargarVicerrectoresAdministrativos() {
    this.loadingVicerrectoresAdministrativos = true;
    this.usuariosService.getVicerrectoresAdministrativos().subscribe({
      next: (vicerrectores) => {
        this.vicerrectoresAdministrativos = vicerrectores;
        this.vicerrectoresAdministrativosOptions = vicerrectores.map((vicerrector: UsuarioOracle) => ({
          label: vicerrector.nombre,
          value: vicerrector.nombre
        }));
        this.loadingVicerrectoresAdministrativos = false;
      },
      error: () => {
        this.loadingVicerrectoresAdministrativos = false;
      }
    });
  }

  // Carga directores de programa académico
  private cargarDirectoresPrograma() {
    this.loadingDirectoresPrograma = true;
    this.usuariosService.getDirectoresPrograma().subscribe({
      next: (directores) => {
        this.loadingDirectoresPrograma = false;
        this.directoresPrograma = directores;
        this.directoresProgramaOptions = directores.map((director: UsuarioOracle) => ({
          label: director.nombre,
          value: director.nombre
        }));
      },
      error: () => {
        this.loadingDirectoresPrograma = false;
        this.directoresProgramaOptions = [];
      }
    });
  }

  // Carga fuentes de función disponibles
  private cargarFuentesFuncion() {
    this.loadingFuentesFuncion = true;
    this.fuentesFuncionService.getAllUnique().subscribe({
      next: (fuentes: FuenteFuncion[]) => {
        this.loadingFuentesFuncion = false;
        this.fuentesFuncion = fuentes;
        const fuentesOrdenadas = fuentes.sort((a, b) => {
          const numA = parseInt(a.fuenteFuncion) || 0;
          const numB = parseInt(b.fuenteFuncion) || 0;
          return numA - numB;
        });

        this.fuentesFuncionOptions = fuentesOrdenadas.map((fuente: FuenteFuncion) => ({
          label: `${fuente.fuenteFuncion} - ${fuente.nombreFuenteFuncion}`,
          value: fuente.fuenteFuncion
        }));
      },
      error: () => {
        this.loadingFuentesFuncion = false;
        this.fuentesFuncionOptions = [];
      }
    });
  }

  // Carga centros de costo activos
  private cargarCentrosCosto() {
    this.loadingCentrosCosto = true;
    this.centrosCostoService.getCentrosCostoActivos().subscribe({
      next: (centros) => {
        this.loadingCentrosCosto = false;
        const centrosOrdenados = centros.sort((a, b) => {
          const numA = parseInt(a.centroCosto) || 0;
          const numB = parseInt(b.centroCosto) || 0;
          return numA - numB;
        });

        this.centrosCostoOptions = centrosOrdenados.map(centro => ({
          label: `${centro.centroCosto} - ${centro.nombreCentroCosto}`,
          value: centro.centroCosto
        }));
      },
      error: (error) => {
        this.loadingCentrosCosto = false;
        this.centrosCostoOptions = [];
        this.mostrarMensaje('error', 'Error al cargar centros de costo');
      }
    });
  }

  // Actualiza nombre concatenado de centros de costo
  private actualizarNombreCentrosCosto(centrosCosto: string[]) {
    if (!centrosCosto || centrosCosto.length === 0) {
      this.viaticosForm.patchValue({ nombreCentroCosto: '' }, { emitEvent: false });
      this.longitudActualNombreCentrosCosto = 0;
      this.advertenciaLimiteCentrosCosto = false;
      return;
    }

    const nombresCentros: string[] = [];
    centrosCosto.forEach(codigoCentro => {
      const centroEncontrado = this.centrosCostoOptions.find(c => c.value === codigoCentro);
      if (centroEncontrado) {
        const partes = centroEncontrado.label.split(' - ');
        if (partes.length > 1) {
          nombresCentros.push(partes.slice(1).join(' - '));
        } else {
          nombresCentros.push(centroEncontrado.label);
        }
      } else {
        nombresCentros.push(codigoCentro);
      }
    });

    const nombreCompleto = nombresCentros.join(' | ');
    this.longitudActualNombreCentrosCosto = nombreCompleto.length;
    
    if (this.longitudActualNombreCentrosCosto > this.MAX_LENGTH_NOMBRE_CENTRO_COSTO) {
      const centrosAnteriores = [...centrosCosto];
      centrosAnteriores.pop(); 
      this.messageService.clear(); 
      this.mostrarMensaje(
        'warn',
        `No se pueden agregar más centros de costo. El nombre concatenado excedería el límite de ${this.MAX_LENGTH_NOMBRE_CENTRO_COSTO} caracteres permitidos.`,
        'Límite de Centros de Costo alcanzado'
      );
      
      this.viaticosForm.patchValue({ centrosCosto: centrosAnteriores }, { emitEvent: false });
      
      this.actualizarNombreCentrosCosto(centrosAnteriores);
      return;
    }
    
    this.advertenciaLimiteCentrosCosto = this.longitudActualNombreCentrosCosto >= (this.MAX_LENGTH_NOMBRE_CENTRO_COSTO * 0.9);
    
    this.viaticosForm.patchValue({ nombreCentroCosto: nombreCompleto }, { emitEvent: false });
  }

  // Elimina un centro de costo específico
  eliminarCentroCosto(codigoCentro: string): void {
    const centrosActuales = this.viaticosForm.get('centrosCosto')?.value || [];
    const centrosActualizados = centrosActuales.filter((codigo: string) => codigo !== codigoCentro);
    this.viaticosForm.patchValue({ centrosCosto: centrosActualizados }, { emitEvent: true });
  }

  // Inicializa el formulario reactivo con validaciones
  private initializeForm() {
    this.viaticosForm = this.fb.group({
      nit: ['', [Validators.required]],
      fechaElaboracion: [this.fechaHoy, [Validators.required]],
      primerApellido: ['', [Validators.required]],
      segundoApellido: [''],
      primerNombre: ['', [Validators.required]],
      segundoNombre: [''],
      tipoViaticos: [''],
      cargo: [''],
      fechaSalida: [''],
      departamentoSalida: [''],
      municipioSalida: [''], 
      esInternacional: [false],
      requiereTransporte: [false, [Validators.required]],
      conceptoViaje: ['', [Validators.required]],
      valorTotalViaticos: [0, [Validators.required, Validators.min(0)]],
      centrosCosto: [[], [Validators.required, this.validadorLongitudCentrosCosto()]],
      nombreCentroCosto: [''],
      fuenteFuncion: ['', [Validators.required]], 
      categoriaCodigo: [''],
      motivoViaje: ['', [Validators.required, Validators.maxLength(150)]],
      liquidacion: this.fb.group({}),
      elaboradoPor: [''],
      aprobadoDecano: [''],
      aprobadoDirectorOficina: [''],
      aprobadoDirectorPrograma: [''],
      aprobadoDirectorTalentoHumano: [''],
      aprobadoVicerrectorAdministrativo: [''],
      destinos: this.fb.array([])
    });

    this.agregarDestino();
  }

  // Retorna la fecha actual en formato YYYY-MM-DD
  private hoyYYYYMMDD(): string {
    const dia = new Date();
    const mes = (dia.getMonth() + 1).toString().padStart(2, '0');
    const anio = dia.getDate().toString().padStart(2, '0');
    return `${dia.getFullYear()}-${mes}-${anio}`;
  }

  // Convierte Date a formato YYYY-MM-DD
  private dateToYYYYMMDD(date: Date): string {
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${mes}-${anio}`;
  }

  // Obtiene fecha mínima de llegada para un destino
  getMinDateForLlegada(index: number): Date {
    if (this.fechasMinLlegada[index]) {
      return this.fechasMinLlegada[index]!;
    }

    const destino = this.destinosFormArray.at(index);
    const fechaSalida = destino?.get('fechaSalida')?.value;
    
    if (fechaSalida) {
      this.fechasMinLlegada[index] = new Date(fechaSalida);
    } else {
      this.fechasMinLlegada[index] = this.fechaMinima;
    }
    
    return this.fechasMinLlegada[index]!;
  }

  // Actualiza fecha mínima de llegada según fecha salida
  private actualizarFechaMinLlegada(index: number): void {
    const destino = this.destinosFormArray.at(index);
    const fechaSalida = destino?.get('fechaSalida')?.value;
    
    if (fechaSalida) {
      this.fechasMinLlegada[index] = new Date(fechaSalida);
    } else {
      this.fechasMinLlegada[index] = this.fechaMinima;
    }
  }

  // Carga listado de departamentos de Colombia
  private cargarDepartamentos() {
    this.loadingDepartamentos = true;
    this.ubicacionesService.getDepartamentosColombia().subscribe({
      next: (departamentos) => {
        this.loadingDepartamentos = false;
        this.departamentos = departamentos;

        const departamentosOrdenados = departamentos.sort((a, b) => {
          if (a.nombre.toLowerCase() === 'nariño') return -1;
          if (b.nombre.toLowerCase() === 'nariño') return 1;
          return a.nombre.localeCompare(b.nombre);
        });

        this.departamentosOptions = departamentosOrdenados
          .map(d => ({ label: d.nombre, value: d.id }));
      },
      error: () => { this.loadingDepartamentos = false; }
    });
  }

  // Carga listado de países disponibles
  private cargarPaises(): void {
    this.loadingPaises = true;
    this.ubicacionesService.getPaises().subscribe({
      next: (paises) => {
        this.loadingPaises = false;
        this.paises = paises;
        this.paisesOptions = paises
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(p => ({ label: p.nombre, value: p.id }));
      },
      error: () => {
        this.loadingPaises = false;
        this.paisesOptions = [];
        this.mostrarMensaje('error', 'Error al cargar países');
      }
    });
  }

  // Carga departamentos de un país específico
  private cargarDepartamentosPorPais(idPais: string, destinoIndex: number): void {
    if (!idPais) {
      this.departamentosPorPais[destinoIndex] = [];
      return;
    }

    this.ubicacionesService.getDepartamentosPorPais(idPais).subscribe({
      next: (departamentos) => {
        this.departamentosPorPais[destinoIndex] = departamentos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: () => {
        this.departamentosPorPais[destinoIndex] = [];
        this.mostrarMensaje('error', 'Error al cargar departamentos del país');
      }
    });
  }

  // Carga ciudades de un departamento internacional
  private cargarCiudadesPorDepartamentoPais(idDepartamento: string, destinoIndex: number): void {
    if (!idDepartamento) {
      this.ciudadesPorDepartamentoInt[destinoIndex] = [];
      return;
    }

    this.ubicacionesService.getMunicipiosByDepartamento(idDepartamento).subscribe({
      next: (ciudades) => {
        this.ciudadesPorDepartamentoInt[destinoIndex] = ciudades.sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: () => {
        this.ciudadesPorDepartamentoInt[destinoIndex] = [];
        this.mostrarMensaje('error', 'Error al cargar ciudades del departamento');
      }
    });
  }

  // Obtiene departamentos internacionales para un destino
  getDepartamentosInternacionalesForDestino(index: number): { label: string; value: string }[] {
    const departamentos = this.departamentosPorPais[index] || [];
    return departamentos.map(d => ({ label: d.nombre, value: d.id }));
  }


  // Obtiene ciudades internacionales para un destino
  getCiudadesInternacionalesForDestino(index: number): { label: string; value: string }[] {
    const ciudades = this.ciudadesPorDepartamentoInt[index] || [];
    return ciudades.map(c => ({ label: c.nombre, value: c.id }));
  }

  // Carga catálogo de conceptos de viaje
  private cargarConceptosViaje() {
    this.loadingConceptosViaje = true;
    this.listasValoresService.obtenerPorTipo('CVIA').pipe(
      map((response: ListaValor[]) => response.filter((item) => item.idPadre !== null).sort((a, b) => (a.orden || 0) - (b.orden || 0)))
    ).subscribe({
      next: (conceptos) => {
        this.loadingConceptosViaje = false;
        this.conceptosViaje = conceptos;
        this.conceptosViajeOptions = conceptos.map(c => ({ label: c.nombre, value: c.id }));
      },
      error: () => {
        this.loadingConceptosViaje = false;
        this.conceptosViajeOptions = [];
      }
    });
  }

  // Carga catálogo de categorías de viáticos
  private cargarCategorias() {
    this.loadingCategorias = true;
    this.listasValoresService.obtenerPorTipo('CAT').pipe(
      map((response: ListaValor[]) => response.filter((item) => item.idPadre !== null).sort((a, b) => (a.orden || 0) - (b.orden || 0)))
    ).subscribe({
      next: (categorias) => {
        this.loadingCategorias = false;
        this.categorias = categorias;
        this.categoriasOptions = categorias.map(c => ({ label: c.nombre, value: c.abreviatura || c.id }));
      },
      error: () => {
        this.loadingCategorias = false;
        this.categoriasOptions = [];
      }
    });
  }

  // Carga conceptos de liquidación según tipo
  private cargarConceptosLiquidacion() {
    this.loadingConceptosLiquidacion = true;
    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';
    const tipoViaticoUpperCase = tipoViatico.toUpperCase();

    this.conceptosLiquidacionService.getConceptosPorTipo(tipoViaticoUpperCase).pipe(
      map((conceptos: ConceptoLiquidacionCatalogo[]) => {
        if (!Array.isArray(conceptos)) {
          throw new Error('La respuesta del servidor no es válida');
        }
        return conceptos
          .filter(c => c.tipo === 'HIJO' && c.activo)
          .sort((a, b) => a.orden - b.orden);
      })
    ).subscribe({
      next: (conceptos) => {
        this.conceptosLiquidacionData = conceptos;

        this.conceptosLiquidacion = conceptos.map(c => ({
          codigo: c.codigo,
          id: c.id,
          label: c.nombre,
          mostrarDias: c.requiereDias,
          tieneTarifaAutomatica: c.tieneTarifaAutomatica
        }));

        this.loadingConceptosLiquidacion = false;
        this.inicializarFormularioLiquidacion();
        this.calcularTarifaAutomatica();
      },
      error: () => {
        this.loadingConceptosLiquidacion = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar conceptos de liquidación '
        });
      }
    });
  }

  // Inicializa controles de formulario de liquidación
  private inicializarFormularioLiquidacion() {
    const liquidacionGroup = this.viaticosForm.get('liquidacion') as FormGroup;
    this.conceptosLiquidacion.forEach(concepto => {
      liquidacionGroup.addControl(concepto.id.toString(), this.fb.group({
        marcado: [false],
        dias: [0],
        valorUnitario: [0],
        porcentajePago: [100],
        subtotal: [0],
        conceptoCodigo: [''],
        tipoConcepto: [concepto.label],
        otroConcepto: ['']
      }));
      this.mostrarCampoOtroConcepto[concepto.id] = false;
    });
    this.setupLiquidacionWatchers();
  }

  // Configura observadores de cambios de departamento
  private setupDepartamentoWatchers() {
    this.viaticosForm.get('centrosCosto')?.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(centrosCosto => {
      this.actualizarNombreCentrosCosto(centrosCosto);
    });


    this.viaticosForm.get('fechaElaboracion')?.valueChanges.subscribe((fecha) => {
      if (fecha && this.usuario?.fechaFinContrato) {
        this.validarFechaContraFinContrato(fecha, 'fecha de elaboración');
      }
    });

    this.setupTarifasWatchers();
  }

  // Configura observadores para cálculo automático de tarifas
  private setupTarifasWatchers() {
    this.viaticosForm.get('categoriaCodigo')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe(() => {
      this.calcularTarifaAutomatica();
    });
    
    this.viaticosForm.get('requiereTransporte')?.valueChanges.subscribe(() => {
      this.limpiarLiquidacion();
      this.calcularTarifaAutomatica();
    });

    this.viaticosForm.get('tipoViaticos')?.valueChanges.subscribe(() => {
      this.limpiarLiquidacion();
      this.cargarConceptosLiquidacion();
    });
  }

  // Calcula tarifas automáticamente según configuración
  private calcularTarifaAutomatica() {
    if (this.tarifaCalculoTimeout) {
      clearTimeout(this.tarifaCalculoTimeout);
      this.tarifaCalculoTimeout = null;
    }

    if (this.calculandoTarifa) {
      return;
    }

    const categoriaCodigo = this.viaticosForm.get('categoriaCodigo')?.value;
    const requiereTransporte = this.viaticosForm.get('requiereTransporte')?.value;
    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';

    if (!categoriaCodigo || requiereTransporte === null || requiereTransporte === undefined) {
      return;
    }

    if (this.destinosFormArray && this.destinosFormArray.length > 0) {
      this.tarifaCalculoTimeout = setTimeout(() => {
        this.calculandoTarifa = true;
        this.cargarYSumarTarifasMultiplesDestinos(categoriaCodigo, tipoViatico);
      }, 800);
    }
  }

  private cargarYSumarTarifasMultiplesDestinos(
    categoriaCodigo: string,
    tipoViatico: string
  ) {
    const categoriaCodigoBD = this.categoriasMap[categoriaCodigo] || categoriaCodigo;
    const tipoViaticoBD = this.tiposViaticosMap[tipoViatico.toLowerCase()] || tipoViatico.toUpperCase();
    const destinos = this.destinosFormArray.controls.map((control, index) => {
      const destino = control.value;
      let nombreUbicacion = '';

      // Verificar si es un regreso al origen, usar el municipio de salida del TRAMO ANTERIOR
      const esRegresoAlOrigen = destino.esRegresoAlOrigen || false;

      if (esRegresoAlOrigen && index > 0) {
        // Obtener el municipio de salida del tramo ANTERIOR para que las tarifas sean iguales
        const destinoAnteriorValue = this.destinosFormArray.at(index - 1).value;
        const municipioIdAnterior = destinoAnteriorValue.municipioSalida;
        
        if (municipioIdAnterior) {
          const municipiosSalidaAnterior = this.municipiosDestinos['salida_' + (index - 1)];
          if (municipiosSalidaAnterior) {
            const municipioEncontrado = municipiosSalidaAnterior.find((m: any) => m.id === municipioIdAnterior);
            nombreUbicacion = municipioEncontrado?.nombre || '';
          }
        }
      } else if (destino.esInternacional) {
        const ciudades = this.ciudadesPorDepartamentoInt[index];
        if (ciudades) {
          const ciudadEncontrada = ciudades.find(c => c.id === destino.ciudad);
          nombreUbicacion = ciudadEncontrada?.nombre || '';
        }
      } else {
        const municipios = this.municipiosDestinos[index];
        if (municipios) {
          const municipioEncontrado = municipios.find(m => m.id === destino.municipio);
          nombreUbicacion = municipioEncontrado?.nombre || '';
        }
      }

      return {
        nombreUbicacion,
        fechaLlegada: destino.fechaLlegada,
        index
      };
    }).filter(d => d.nombreUbicacion);

    if (destinos.length === 0) {
      return;
    }

    // Carga y suma tarifas de múltiples destinos
    this.loadingTarifa = true;
    const tarifasObservables = destinos.map(destino =>
      this.tarifasService.getTarifasSimplificadasParaDestino(
        destino.nombreUbicacion,
        categoriaCodigoBD,
        tipoViaticoBD
      )
    );

    forkJoin(tarifasObservables).subscribe({
      next: (todasLasTarifas) => {
        this.loadingTarifa = false;

        const tarifasSumadas: { [conceptoCodigo: string]: number } = {};

        todasLasTarifas.forEach((tarifas) => {
          Object.entries(tarifas).forEach(([conceptoCodigo, valor]) => {
            if (!tarifasSumadas[conceptoCodigo]) {
              tarifasSumadas[conceptoCodigo] = 0;
            }

            const esConceptoTransporte = conceptoCodigo.includes('_TRANS_') ||
              conceptoCodigo.includes('TRANS_AEREO') ||
              conceptoCodigo.includes('TRANS_TERRESTRE');

            if (esConceptoTransporte) {
              tarifasSumadas[conceptoCodigo] = Math.max(tarifasSumadas[conceptoCodigo] || 0, valor);
            } else {
              tarifasSumadas[conceptoCodigo] += valor;
            }
          });
        });

        if (Object.keys(tarifasSumadas).length === 0) {
          this.mostrarMensaje('warn', 'No se encontraron tarifas para los destinos seleccionados');
          return;
        }

        const diasTotales = this.calcularDiasTotalesDestinos();

        this.aplicarTarifasSumadasMultiplesDestinos(tarifasSumadas, diasTotales);

        const cantidadDestinos = destinos.length;
        const cantidadTarifas = Object.keys(tarifasSumadas).length;
        this.mostrarMensaje(
          'success',
          `Se cargaron tarifas de ${cantidadDestinos} destino(s) (${cantidadTarifas} conceptos) - ${diasTotales.dias} día(s), ${diasTotales.noches} noche(s)`
        );
        this.calculandoTarifa = false;
      },
      error: () => {
        this.loadingTarifa = false;
        this.calculandoTarifa = false;
        this.mostrarMensaje('error', 'Error al cargar tarifas automáticas');
      }
    });
  }

  // Calcula días y noches totales de viaje
  private calcularDiasTotalesDestinos(): { dias: number; noches: number } {
    let fechaSalida = this.viaticosForm.get('fechaSalida')?.value;
    if (!fechaSalida && this.destinosFormArray.length > 0) {
      const primerDestino = this.destinosFormArray.at(0).value;
      fechaSalida = primerDestino?.fechaSalida;
    }

    let diasTotales = 0;
    let nochesTotales = 0;

    if (!fechaSalida) {
      return { dias: 0, noches: 0 };
    }

    this.destinosFormArray.controls.forEach((control, index) => {
      const destino = control.value;
      const fechaLlegada = destino.fechaLlegada;

      if (!fechaLlegada) {
        return;
      }

      const fechaSalidaDestino = index === 0
        ? (destino.fechaSalida || fechaSalida)
        : this.destinosFormArray.at(index - 1).value.fechaLlegada;

      const salida = new Date(fechaSalidaDestino);
      const llegada = new Date(fechaLlegada);
      const unDia = 24 * 60 * 60 * 1000;
      const diferencia = Math.round((llegada.getTime() - salida.getTime()) / unDia);
      
      // Aplicar ajuste por fecha compartida
      let ajustePorFechaCompartida = 0;
      if (index > 0) {
        const destinoAnterior = this.destinosFormArray.at(index - 1);
        const fechaLlegadaAnterior = destinoAnterior.get('fechaLlegada')?.value;
        
        if (fechaLlegadaAnterior) {
          salida.setHours(0, 0, 0, 0);
          const llegadaAnterior = new Date(fechaLlegadaAnterior);
          llegadaAnterior.setHours(0, 0, 0, 0);
          // Comparar solo la fecha (día/mes/año) sin considerar la hora
          if (salida.getTime() === llegadaAnterior.getTime()) {
            ajustePorFechaCompartida = 1;
          }
        }
      }
      
      // Calcular días y noches con ajuste
      const diasAlimentacion = Math.max(1, diferencia + 1 - ajustePorFechaCompartida);
      // Las noches siempre son igual a la diferencia en días (pernoctaciones)
      // Ej: del 20 al 22 = 2 días de diferencia = 2 noches (20-21 y 21-22)
      const diasHospedaje = diferencia;

      diasTotales += diasAlimentacion;
      nochesTotales += diasHospedaje;
    });

    return { dias: diasTotales, noches: nochesTotales };
  }

  // Aplica tarifas sumadas de múltiples destinos
  private aplicarTarifasSumadasMultiplesDestinos(
    tarifasSumadas: { [conceptoCodigo: string]: number },
    diasTotales: { dias: number; noches: number }
  ) {
    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';

    this.conceptosLiquidacionService.obtenerMapeoTarifas(tipoViatico.toUpperCase()).subscribe({
      next: (mapeoConceptoATarifa) => {
        this.conceptosLiquidacion.forEach((concepto) => {
          let valorUnitario = tarifasSumadas[concepto.codigo];

          if (valorUnitario === undefined && mapeoConceptoATarifa[concepto.codigo]) {
            const codigoTarifa = mapeoConceptoATarifa[concepto.codigo];
            valorUnitario = tarifasSumadas[codigoTarifa];
          }

          if (valorUnitario !== undefined) {
            const conceptoGroup = this.viaticosForm.get(['liquidacion', concepto.id.toString()]) as FormGroup;

            if (conceptoGroup) {
              const esConceptoTransporte = concepto.codigo.includes('_TRANS_') ||
                concepto.codigo.includes('TRANS_AEREO') ||
                concepto.codigo.includes('TRANS_TERRESTRE') ||
                concepto.label.toUpperCase().includes('TRANSPORTE');

              let cantidadParaCalculo: number;
              let subtotal: number;

              if (esConceptoTransporte) {
                const numDestinos = this.destinosFormArray.length;
                cantidadParaCalculo = numDestinos;
                subtotal = valorUnitario * cantidadParaCalculo;
              } else {
                cantidadParaCalculo = concepto.mostrarDias ? diasTotales.dias : diasTotales.noches;
                subtotal = valorUnitario * cantidadParaCalculo;
              }

              conceptoGroup.patchValue({
                valorUnitario: valorUnitario,
                dias: cantidadParaCalculo,
                subtotal: subtotal,
                marcado: true
              });
            }
          }
        });
      },
      error: () => {
        this.mostrarMensaje('error', 'Error al obtener mapeo de tarifas');
      }
    });
  }

  // Limpia todos los valores de liquidación
  limpiarLiquidacion() {
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = this.viaticosForm.get(['liquidacion', concepto.id]) as FormGroup;
      conceptoGroup.patchValue({ marcado: false, dias: 0, valorUnitario: 0, subtotal: 0 }, { emitEvent: false });
    });
    this.actualizarValorTotal();
  }

  // Configura observadores de cambios en liquidación
  private setupLiquidacionWatchers() {
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = this.viaticosForm.get(['liquidacion', concepto.id]) as FormGroup;
      conceptoGroup.get('marcado')?.valueChanges.subscribe((marcado) => {
        const conceptoData = this.conceptosLiquidacionData.find(c => c.id === concepto.id);
        const esOtroConcepto = conceptoData?.nombre?.toLowerCase().includes('otro');
        this.mostrarCampoOtroConcepto[concepto.id] = marcado && esOtroConcepto;
        const nombreConcepto = conceptoData?.nombre?.toUpperCase() || '';
        if (nombreConcepto.includes('ALIMENTACION') && marcado) {
          const diasActuales = conceptoGroup.get('dias')?.value || 0;
          if (diasActuales === 1) {
            this.sincronizarHospedajeConAlimentacion(diasActuales);
          }
        }
      });

      conceptoGroup.get('dias')?.valueChanges.subscribe((dias) => {
        this.calcularSubtotal(concepto.id);
        this.actualizarValorTotal();
        const conceptoData = this.conceptosLiquidacionData.find(c => c.id === concepto.id);
        const nombreConcepto = conceptoData?.nombre?.toUpperCase() || '';

        if (nombreConcepto.includes('ALIMENTACION') && dias === 1) {
          this.sincronizarHospedajeConAlimentacion(dias);
        }
      });

      conceptoGroup.get('valorUnitario')?.valueChanges.subscribe(() => {
        this.calcularSubtotal(concepto.id);
        this.actualizarValorTotal();
      });
    });
  }

  // Calcula subtotal de un concepto
  private calcularSubtotal(conceptoId: string | number) {
    const conceptoGroup = this.viaticosForm.get(['liquidacion', conceptoId.toString()]) as FormGroup;
    const dias = conceptoGroup.get('dias')?.value || 0;
    const valorUnitario = conceptoGroup.get('valorUnitario')?.value || 0;
    const subtotal = dias * valorUnitario;
    conceptoGroup.patchValue({ subtotal }, { emitEvent: false });
  }

  // Actualiza valor total de viáticos
  private actualizarValorTotal() {
    const total = this.valorTotalViaticos;
    this.viaticosForm.patchValue({ valorTotalViaticos: total }, { emitEvent: false });
  }

  // Sincroniza hospedaje cuando alimentación es un día
  private sincronizarHospedajeConAlimentacion(diasAlimentacion: number) {
    if (diasAlimentacion !== 1) return;
    const conceptoHospedaje = this.conceptosLiquidacionData.find(c =>
      c.nombre?.toUpperCase().includes('HOSPEDAJE')
    );

    if (!conceptoHospedaje) return;
    const hospedajeGroup = this.viaticosForm.get(['liquidacion', conceptoHospedaje.id.toString()]) as FormGroup;
    if (!hospedajeGroup) return;

    const conceptoAlimentacion = this.conceptosLiquidacionData.find(c =>
      c.nombre?.toUpperCase().includes('ALIMENTACION')
    );

    if (!conceptoAlimentacion) return;

    const alimentacionGroup = this.viaticosForm.get(['liquidacion', conceptoAlimentacion.id.toString()]) as FormGroup;
    const alimentacionMarcado = alimentacionGroup?.get('marcado')?.value;
    if (alimentacionMarcado) {
      const diasActualesHospedaje = hospedajeGroup.get('dias')?.value || 0;

      if (diasActualesHospedaje === 0) {
        hospedajeGroup.get('dias')?.setValue(1, { emitEvent: false });
        hospedajeGroup.get('marcado')?.setValue(true, { emitEvent: false });

        this.calcularSubtotal(conceptoHospedaje.id);
        this.actualizarValorTotal();
      }
    }
  }

  // Calcula el valor total de todos los viáticos
  get valorTotalViaticos(): number {
    let total = 0;
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = this.viaticosForm.get(['liquidacion', concepto.id]) as FormGroup;
      const marcado = conceptoGroup.get('marcado')?.value;
      const subtotal = conceptoGroup.get('subtotal')?.value || 0;
      if (marcado) total += subtotal;
    });
    return total;
  }

  // Filtra usuarios para el autocompletado
  filtrarUsuarios(event: { query: string }) {
    const query = event.query.toLowerCase().trim();

    if (!query) {
      this.usuariosFiltrados = this.todosLosUsuarios.slice(0, 50); 
      return;
    }

    // Dividir el query en palabras individuales
    const palabrasBusqueda = query.split(/\s+/).filter((p: string) => p.length > 0);

    this.usuariosFiltrados = this.todosLosUsuarios.filter(usuario => {
      const identificacion = usuario.identificacion?.toLowerCase() || '';
      const nombre = usuario.nombre?.toLowerCase() || '';
      const cargo = usuario.cargo?.toLowerCase() || '';
      
      // Concatenar todos los campos para buscar
      const textoCompleto = `${identificacion} ${nombre} ${cargo}`;

      // El usuario coincide si TODAS las palabras del query están presentes
      return palabrasBusqueda.every((palabra: string) => textoCompleto.includes(palabra));
    }).slice(0, 50); 
  }

  // Procesa la selección de usuario desde autocompletado
  onUsuarioSeleccionado(event: any) {
    if (!event || !event.value) {
      return;
    }

    const usuario = event.value;

    this.viaticosForm.patchValue({ nit: usuario.identificacion }, { emitEvent: false });
    this.loadingUsuario = true;
    this.solicitudViaticosService.getBorradorByNit(usuario.identificacion).subscribe({
      next: (borrador) => {
        this.loadingUsuario = false;

        if (borrador) {
          this.confirmationService.confirm({
            message: `Se encontró un borrador existente para ${usuario.nombre} (${borrador.codigoSolicitud || 'Sin código'}). ¿Desea cargar este borrador o comenzar una nueva solicitud?`,
            header: 'Borrador Encontrado',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Cargar Borrador',
            rejectLabel: 'Nueva Solicitud',
            accept: () => {
              this.cargarBorradorEnFormulario(borrador);
            },
            reject: () => {
              this.idBorradorCargado = null;
              this.codigoBorradorCargado = null;
              this.borradorCargado = false;
              this.usuario = usuario;
              this.actualizarMaxDateContrato();
              this.procesarUsuarioEncontrado(usuario);
            }
          });
        } else {

          this.usuario = usuario;
          this.actualizarMaxDateContrato();
          this.procesarUsuarioEncontrado(usuario);
        }
      },
      error: () => {
        this.loadingUsuario = false;
        this.usuario = usuario;
        this.actualizarMaxDateContrato();
        this.procesarUsuarioEncontrado(usuario);
      }
    });
  }


  // Formatea visualización de usuario con nombre e identificación
  formatearUsuarioDisplay(usuario: UsuarioOracle | string): string {
    if (typeof usuario === 'string') {
      const usuarioEncontrado = this.todosLosUsuarios.find(u => u.identificacion === usuario);
      return usuarioEncontrado ? `${usuarioEncontrado.nombre} (${usuario})` : usuario;
    }
    
    return usuario.nombre || '';
  }
  // Busca usuario por identificación o código
  buscarUsuario() {
    const valorBusqueda = this.viaticosForm.get('nit')?.value;
    if (typeof valorBusqueda === 'object' && valorBusqueda?.identificacion) {
      return;
    }

    if (!valorBusqueda || valorBusqueda.trim().length === 0) {
      this.mostrarMensaje('warn', 'Por favor seleccione o escriba el nombre de un usuario');
      return;
    }

    const valor = valorBusqueda.trim();
    this.loadingUsuario = true;
    const esNumerico = /^\d+$/.test(valor);

    if (esNumerico) {
      this.buscarPorIdentificacion(valor);
    } else {
      // Dividir el valor de búsqueda en palabras individuales
      const palabrasBusqueda = valor.toLowerCase().split(/\s+/).filter((p: string) => p.length > 0);
      
      const usuariosCoincidentes = this.todosLosUsuarios.filter(u => {
        const nombre = u.nombre?.toLowerCase() || '';
        const identificacion = u.identificacion?.toLowerCase() || '';
        const cargo = u.cargo?.toLowerCase() || '';
        const textoCompleto = `${nombre} ${identificacion} ${cargo}`;
        
        // El usuario coincide si TODAS las palabras de búsqueda están presentes
        return palabrasBusqueda.every((palabra: string) => textoCompleto.includes(palabra));
      });

      this.loadingUsuario = false;

      if (usuariosCoincidentes.length === 0) {
        this.mostrarMensaje('warn', 'No se encontraron usuarios con ese término de búsqueda');
      } else if (usuariosCoincidentes.length === 1) {
        this.onUsuarioSeleccionado({ value: usuariosCoincidentes[0] });
      } else {
        this.mostrarMensaje('info', `Se encontraron ${usuariosCoincidentes.length} usuarios. Por favor seleccione uno de la lista.`);
        this.usuariosFiltrados = usuariosCoincidentes;
      }
    }
  }

  // Busca usuario por número de identificación
  private buscarPorIdentificacion(nit: string) {
    this.solicitudViaticosService.getBorradorByNit(nit).subscribe({
      next: (borrador) => {
        if (borrador) {
          this.loadingUsuario = false;
          this.confirmationService.confirm({
            message: `Se encontró un borrador existente (${borrador.codigoSolicitud || 'Sin código'}). ¿Desea cargar este borrador o comenzar una nueva solicitud desde cero?`,
            header: 'Borrador Encontrado',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Cargar Borrador',
            rejectLabel: 'Nueva Solicitud',
            accept: () => {
              this.cargarBorradorEnFormulario(borrador);
            },
            reject: () => {
              this.idBorradorCargado = null;
              this.codigoBorradorCargado = null;
              this.borradorCargado = false;
              this.loadingUsuario = true;
              this.buscarUsuarioOracle(nit);
            }
          });
        } else {
          this.buscarUsuarioOracle(nit);
        }
      },
      error: () => {
        this.buscarUsuarioOracle(nit);
      }
    });
  }

  // Carga datos de borrador en el formulario
  private cargarBorradorEnFormulario(borrador: SolicitudViaticos) {
    this.cargarDatosBasicosBorrador(borrador);
    this.cargarDestinosBorrador(borrador);
    this.cargarLiquidacionBorrador(borrador);
    this.configurarFormularioDespuesBorrador(borrador);
    this.cargarSoportesDocumentalesBorrador(borrador.codigoSolicitud || '');
    
    this.mostrarMensaje('success', `Borrador cargado: ${borrador.codigoSolicitud || 'Sin código'}. Complete la información faltante.`);
  }

  // Carga archivos de soporte del borrador existente
  private cargarSoportesDocumentalesBorrador(codigoSolicitud: string): void {
    if (!codigoSolicitud) return;

    this.archivosUsuariosService.obtenerPorSolicitud(codigoSolicitud).subscribe({
      next: (archivos: ArchivosUsuarios[]) => {
        if (archivos && archivos.length > 0) {
          this.archivosGuardadosIds = archivos.filter(a => a.id !== undefined).map(a => a.id!);
        }
      },
      error: (error) => {
      }
    });
  }

  // Carga datos básicos del borrador al formulario
  private cargarDatosBasicosBorrador(borrador: SolicitudViaticos) {
    const parsearFecha = (fecha: string | undefined): string =>
      !fecha ? '' :
        fecha.includes('T') ? fecha.split('T')[0] :
          /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : fecha;

    let conceptoViajeId = '';
    if (borrador.conceptoViaje) {
      const partes = borrador.conceptoViaje.split('|');
      const nombreConcepto = partes[0].trim();
      const conceptoEncontrado = this.conceptosViaje.find(c => c.nombre === nombreConcepto);
      conceptoViajeId = conceptoEncontrado ? conceptoEncontrado.id : '';
    }

    const codigosCentrosCosto: string[] = [];
    let fuenteFuncion = '';
    
    if (borrador.centrosCosto && Array.isArray(borrador.centrosCosto) && borrador.centrosCosto.length > 0) {
      borrador.centrosCosto.forEach((centro: any) => {
        if (centro.codigoCentroCosto) {
          codigosCentrosCosto.push(centro.codigoCentroCosto);
        }
        if (!fuenteFuncion && centro.fuenteFuncion) {
          fuenteFuncion = centro.fuenteFuncion;
        }
      });
    }

    this.viaticosForm.patchValue({
      nit: borrador.nit || '',
      fechaElaboracion: parsearFecha(borrador.fechaElaboracion),
      primerApellido: borrador.primerApellido || '',
      segundoApellido: borrador.segundoApellido || '',
      primerNombre: borrador.primerNombre || '',
      segundoNombre: borrador.segundoNombre || '',
      tipoViaticos: borrador.tipoViaticos || '',
      cargo: borrador.cargo || '',
      fechaSalida: parsearFecha(borrador.fechaSalida),
      departamentoSalida: borrador.departamentoSalida || '',
      municipioSalida: borrador.municipioSalida || '',
      requiereTransporte: borrador.requiereTransporte || false,
      conceptoViaje: conceptoViajeId, 
      valorTotalViaticos: borrador.valorTotalViaticos || 0,
      motivoViaje: borrador.motivoViaje || '', 
      categoriaCodigo: borrador.categoriaCodigo || '',
      elaboradoPor: borrador.elaboradoPor || '',
      aprobadoDecano: borrador.aprobadoDecano || '',
      aprobadoDirectorOficina: borrador.aprobadoDirectorOficina || '',
      aprobadoDirectorPrograma: borrador.aprobadoDirectorPrograma || '',
      aprobadoDirectorTalentoHumano: borrador.aprobadoDirectorTalentoHumano || '',
      aprobadoVicerrectorAdministrativo: borrador.aprobadoVicerrectorAdministrativo || '',
      centrosCosto: codigosCentrosCosto, 
      fuenteFuncion: fuenteFuncion 
    });

    if (codigosCentrosCosto.length > 0) {
      this.actualizarNombreCentrosCosto(codigosCentrosCosto);
    }

    this.borradorCargado = true;
    this.codigoBorradorCargado = borrador.codigoSolicitud || null;
    this.idBorradorCargado = borrador.id ? String(borrador.id) : null;
  }

  // Carga destinos desde el borrador
  private cargarDestinosBorrador(borrador: SolicitudViaticos) {
    if (!borrador.destinos || borrador.destinos.length === 0) return;
    while (this.destinosFormArray.length > 0) {
      this.destinosFormArray.removeAt(0);
    }

    borrador.destinos.forEach((destino, index) => {
      const destinoGroup = this.crearDestinoFormGroup();

      const parsearFecha = (fecha: string | Date | undefined): string => {
        if (!fecha) return '';
        const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
        return fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
      };

      const esDestinoInternacional = !destino.departamento ||
        !destino.municipio ||
        destino.departamento === 'PENDIENTE' ||
        destino.municipio === 'PENDIENTE';
      if (esDestinoInternacional && destino.ciudad && destino.ciudad !== 'PENDIENTE') {
        const ciudadExiste = this.ciudadesInternacionales.some(c => c.value === destino.ciudad);
        if (!ciudadExiste) {
          this.ciudadesInternacionales.push({
            label: destino.ciudad,
            value: destino.ciudad
          });
          this.ciudadesInternacionales.sort((a, b) => a.label.localeCompare(b.label));
        }
      }
      destinoGroup.patchValue({
        departamentoSalida: destino.departamentoSalida || '',
        fechaSalida: parsearFecha(destino.fechaSalida), 
        departamento: esDestinoInternacional ? '' : (destino.departamento || ''),
        ciudad: destino.ciudad || '',
        fechaLlegada: parsearFecha(destino.fechaLlegada),
        esInternacional: esDestinoInternacional
      });

      this.destinosFormArray.push(destinoGroup);
      if (destino.departamentoSalida && destino.departamentoSalida !== 'PENDIENTE') {
        this.ubicacionesService.getMunicipiosByDepartamento(destino.departamentoSalida).subscribe({
          next: (municipios) => {
            if (!this.municipiosDestinos['salida_' + index]) {
              this.municipiosDestinos['salida_' + index] = [];
            }
            this.municipiosDestinos['salida_' + index] = municipios;
            destinoGroup.patchValue({
              municipioSalida: destino.municipioSalida || ''
            }, { emitEvent: false });
          }
        });
      }

      if (!esDestinoInternacional && destino.departamento && destino.departamento !== 'PENDIENTE') {
        this.ubicacionesService.getMunicipiosByDepartamento(destino.departamento).subscribe({
          next: (municipios) => {
            if (!this.municipiosDestinos) {
              this.municipiosDestinos = {};
            }
            this.municipiosDestinos[index] = municipios;
            const municipioGuardado = destino.municipio && destino.municipio !== 'PENDIENTE' ? destino.municipio : '';
            
            if (municipioGuardado) {
              const municipioEncontrado = municipios.find(m => m.id === municipioGuardado || m.nombre === municipioGuardado);
              
              if (municipioEncontrado) {
                setTimeout(() => {
                  destinoGroup.patchValue({
                    municipio: municipioEncontrado.id
                  }, { emitEvent: false });
                  
                  setTimeout(() => {
                    destinoGroup.patchValue({
                      municipio: municipioEncontrado.id
                    }, { emitEvent: true });
                    destinoGroup.get('municipio')?.markAsTouched();
                    destinoGroup.get('municipio')?.updateValueAndValidity();
                    
                  }, 200);
                }, 150);
              } 
            }
          },
          error: () => {
          }
        });
      }

      if (destino.liquidacion && Object.keys(destino.liquidacion).length > 0) {
       
        const liquidacionGroup = destinoGroup.get('liquidacion') as FormGroup;
        if (liquidacionGroup) {
          this.conceptosLiquidacion.forEach(concepto => {
            if (!liquidacionGroup.get(concepto.id.toString())) {
              liquidacionGroup.addControl(
                concepto.id.toString(),
                this.fb.group({
                  marcado: [false],
                  dias: [0],
                  valorUnitario: [0],
                  porcentajePago: [100],
                  subtotal: [0]
                })
              );
            }
          });
          
          Object.keys(destino.liquidacion).forEach(conceptoKey => {
            const conceptoValue = (destino.liquidacion as any)[conceptoKey];
            const conceptoControl = liquidacionGroup.get(conceptoKey);
            
            if (conceptoControl) {
              if (typeof conceptoValue === 'object' && conceptoValue !== null) {
                conceptoControl.patchValue(conceptoValue, { emitEvent: true });
              }
            } 
          });
          setTimeout(() => {
            this.calcularValorParcialDestino(index);
          }, 150);
        }
      }
    });

    setTimeout(() => {
      this.calcularLiquidacionGlobal();
    }, 800); 
  }

  // Carga liquidación desde el borrador guardado
  private cargarLiquidacionBorrador(borrador: SolicitudViaticos) {
    const borradorConLiquidacion = borrador as SolicitudViaticos & { liquidacion?: string | Record<string, unknown> };
    if (!borradorConLiquidacion.liquidacion || !this.viaticosForm.get('liquidacion')) return;

    const liquidacionGroup = this.viaticosForm.get('liquidacion') as FormGroup;
    let liquidacionData: Record<string, unknown>;

    if (typeof borradorConLiquidacion.liquidacion === 'string') {
      try {
        liquidacionData = JSON.parse(borradorConLiquidacion.liquidacion);
      } catch {
        liquidacionData = {};
      }
    } else {
      liquidacionData = borradorConLiquidacion.liquidacion;
    }

    Object.keys(liquidacionData).forEach(key => {
      if (liquidacionGroup.get(key)) {
        liquidacionGroup.get(key)?.patchValue(liquidacionData[key]);
      }
    });
  }

  // Configura formulario después de cargar borrador
  private configurarFormularioDespuesBorrador(borrador: SolicitudViaticos) {
    if (borrador.cargo) {
      this.cargarAprobadoresRequeridos(borrador.cargo);
      this.determinarCategoriaPorCargo(borrador.cargo);

      if (borrador.categoriaCodigo) {
        this.categoriaAsignada = this.obtenerNombreCategoria(borrador.categoriaCodigo);
      }

      this.configurarCamposDeshabilitados();
    }
  }

  // Busca usuario en base de datos Oracle
  private buscarUsuarioOracle(nit: string) {
    this.loadingUsuario = true;
    this.usuariosService.getByCodigo(nit).subscribe({
      next: (usuario) => {
        this.loadingUsuario = false;
        this.usuario = usuario;
        this.actualizarMaxDateContrato();
        if (usuario) {
          this.procesarUsuarioEncontrado(usuario);
        } else {
          this.procesarUsuarioNoEncontrado();
        }
      },
      error: () => {
        this.loadingUsuario = false;
        this.clearUserData();
        this.habilitarFormularioParaIngresoManual();
      }
    });
  }

  // Procesa datos cuando usuario es encontrado
  private procesarUsuarioEncontrado(usuario: UsuarioOracle) {
    this.autoFillUserData(usuario);
    if (!this.borradorCargado && usuario.identificacion) {
      this.solicitudViaticosService.getBorradorByNit(usuario.identificacion).subscribe({
        next: (borrador) => {
          if (borrador) {
            this.confirmationService.confirm({
              message: `Se encontró un borrador existente (${borrador.codigoSolicitud}). ¿Desea cargar los datos del borrador?`,
              header: 'Borrador Encontrado',
              icon: 'pi pi-exclamation-triangle',
              acceptLabel: 'Cargar Borrador',
              rejectLabel: 'Continuar Sin Borrador',
              accept: () => {
                this.cargarBorradorEnFormulario(borrador);
              },
              reject: () => {//
              }
            });
          }
        },
        error: () => {//
        }
      });
    }
    if (usuario.fechaFinContrato) {
      this.validarFechaFinContrato(usuario.fechaFinContrato);
    }
  }

  // Maneja caso cuando usuario no es encontrado
  private procesarUsuarioNoEncontrado() {
    this.clearUserData();
    this.habilitarFormularioParaIngresoManual();
    this.mostrarMensaje('info', 'Usuario no encontrado en la base de datos. Por favor complete la información manualmente.');
  }

  // Rellena formulario automáticamente con datos de usuario
  private autoFillUserData(usuario: UsuarioOracle) {
    const nombres = usuario.nombre.trim().split(' ').filter(Boolean);
    const partesNombre = this.extraerPartesNombre(nombres);
    const elaboradoPor = this.viaticosForm.get('elaboradoPor')?.value || usuario.nombre.trim();
    const tipoViaticoVisual = usuario.tipoViatico || 'OCASIONAL';

    this.viaticosForm.patchValue({
      ...partesNombre,
      cargo: usuario.cargo,
      elaboradoPor: elaboradoPor,
      tipoViaticos: tipoViaticoVisual
    });

    this.configurarCamposDeshabilitados();

    if (usuario.cargo) {
      this.determinarCategoriaPorCargo(usuario.cargo);
    } else {
      this.mostrarMensaje('warn', 'Usuario sin cargo asignado. Por favor seleccione la categoría manualmente.');
    }

    this.cargarAprobadoresRequeridos(usuario.cargo);
  }

  // Carga aprobadores necesarios según cargo del usuario
  private cargarAprobadoresRequeridos(cargo: string): void {
    if (!cargo || cargo.trim() === '') {
      return;
    }

    this.loadingAprobadores = true;

    const cargoNormalizado = cargo.toLowerCase().trim();
    this.esProfesor = cargoNormalizado.includes('profesor') || 
                      cargoNormalizado.includes('docente') || 
                      cargoNormalizado.includes('catedrático') ||
                      cargoNormalizado.includes('catedratico');

    // 📋 Cargar usuarios según tipo de cargo
    if (this.esProfesor) {
      // Si es PROFESOR: cargar solo DECANOS
      this.cargarSoloDecanos();
    } else {
      // Si NO es PROFESOR: cargar DIRECTORES DE OFICINA + DIRECTORES
      this.cargarDirectoresOficina();
    }

    this.solicitudViaticosService.getAprobadores(cargo).subscribe({
      next: (aprobadores) => {
        this.loadingAprobadores = false;
        this.aprobadoresRequeridos = aprobadores;

        this.mostrarDirectorPrograma = false;
        this.mostrarDecano = false;
        this.mostrarDirectorOficina = false;
        this.mostrarVicerrectorAdministrativo = false;
        this.mostrarDirectorTalentoHumano = false;
        this.viaticosForm.get('aprobadoDecano')?.clearValidators();
        this.viaticosForm.get('aprobadoDirectorOficina')?.clearValidators();
        this.viaticosForm.get('aprobadoDirectorPrograma')?.clearValidators();
        this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.clearValidators();
        this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.clearValidators();

        aprobadores.forEach(aprobador => {
          switch (aprobador.codigo) {
            case 'director_programa':
              this.mostrarDirectorPrograma = true;
              this.viaticosForm.get('aprobadoDirectorPrograma')?.setValidators([Validators.required]);
              break;
            case 'decano_director':
            case 'decano':
              this.mostrarDecano = true;
              this.viaticosForm.get('aprobadoDecano')?.setValidators([Validators.required]);
              break;
            case 'director_oficina':
              this.mostrarDirectorOficina = true;
              this.viaticosForm.get('aprobadoDirectorOficina')?.setValidators([Validators.required]);
              break;
            case 'vicerrector_administrativo':
              this.mostrarVicerrectorAdministrativo = true;
              this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.setValidators([Validators.required]);
              break;
            case 'director_talento_humano':
              this.mostrarDirectorTalentoHumano = true;
              this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.setValidators([Validators.required]);
              break;
          }
        });
        this.viaticosForm.get('aprobadoDecano')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorOficina')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorPrograma')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.updateValueAndValidity();
      },
      error: () => {
        this.loadingAprobadores = false;

        this.mostrarDirectorPrograma = true;
        this.mostrarDecano = true;
        this.mostrarDirectorOficina = true;
        this.mostrarVicerrectorAdministrativo = true;
        this.mostrarDirectorTalentoHumano = true;
        this.viaticosForm.get('aprobadoDecano')?.setValidators([Validators.required]);
        this.viaticosForm.get('aprobadoDirectorOficina')?.setValidators([Validators.required]);
        this.viaticosForm.get('aprobadoDirectorPrograma')?.setValidators([Validators.required]);
        this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.setValidators([Validators.required]);
        this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.setValidators([Validators.required]); 
        this.viaticosForm.get('aprobadoDecano')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorOficina')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorPrograma')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.updateValueAndValidity();
        this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.updateValueAndValidity();
      }
    });
  }

  // Determina categoría de viáticos según cargo
  private determinarCategoriaPorCargo(cargo: string): void {
    if (!cargo || cargo.trim() === '') {
      this.mostrarMensaje('warn', 'No se puede determinar la categoría sin cargo. Por favor seleccione la categoría manualmente.');
      return;
    }

    this.viaticosUtilidadesService.determinarCategoriaPorCargo(cargo).subscribe({
      next: (response) => {
        if (response && response.codigoCategoria && response.nombreCategoria) {
          this.categoriaAsignada = response.codigoCategoria;
          this.viaticosForm.patchValue({ categoriaCodigo: response.codigoCategoria });
        } else {
          this.mostrarMensaje('warn', 'No se pudo determinar la categoría automáticamente. Por favor seleccione la categoría manualmente.');
        }
      },
      error: () => {
        this.mostrarMensaje('warn', 'Error al determinar la categoría. Por favor seleccione la categoría manualmente.');
      }
    });
  }

  // Extrae partes del nombre completo
  private extraerPartesNombre(nombres: string[]): { primerApellido: string; segundoApellido: string; primerNombre: string; segundoNombre: string } {
    const estructurasNombre = [
      { longitud: 4, mapper: (n: string[]) => ({ primerNombre: n[0], segundoNombre: n[1], primerApellido: n[2], segundoApellido: n[3] }) },
      { longitud: 3, mapper: (n: string[]) => ({ primerNombre: n[0], segundoNombre: '', primerApellido: n[1], segundoApellido: n[2] }) },
      { longitud: 2, mapper: (n: string[]) => ({ primerNombre: n[0], segundoNombre: '', primerApellido: n[1], segundoApellido: '' }) }
    ];
    const estructura = estructurasNombre.find(e => nombres.length >= e.longitud);
    return estructura ? estructura.mapper(nombres) : { primerNombre: nombres[0] || '', segundoNombre: '', primerApellido: '', segundoApellido: '' };
  }

  // Deshabilita campos que no deben ser editables
  private configurarCamposDeshabilitados() {
    this.viaticosForm.enable();
    const camposDeshabilitados = [
      'cargo',
      'facultad',
      'programa',
      'categoriaCodigo',
      'primerApellido',
      'segundoApellido',
      'primerNombre',
      'segundoNombre'
    ];
    camposDeshabilitados.forEach(campo => this.viaticosForm.get(campo)?.disable());
  }

  // Obtiene nombre de categoría por código
  obtenerNombreCategoria(codigo: string | null): string {
    if (!codigo) return '';
    const categoria = this.categorias.find(c => c.abreviatura === codigo || c.id === codigo);
    return categoria?.nombre || codigo;
  }

  // Limpia todos los datos del usuario del formulario
  limpiarDatosUsuario() {
    this.clearUserData();
    this.usuario = null;
    this.maxDateContrato = null;
    this.categoriaAsignada = null;
    this.viaticosForm.enable();
    this.viaticosForm.patchValue({
      nit: '',
      categoriaCodigo: ''
    });

    this.mostrarMensaje('info', 'Datos del usuario limpiados. Puede buscar otro usuario.');
  }

  // Borra datos de usuario del formulario
  private clearUserData() {
    this.viaticosForm.patchValue({
      primerApellido: '',
      segundoApellido: '',
      primerNombre: '',
      segundoNombre: '',
      cargo: ''
    });
    this.borradorCargado = false;
    this.codigoBorradorCargado = null;
    this.idBorradorCargado = null;
    this.archivosSoporte = [];
    this.archivosGuardadosIds = [];
  }

  // Habilita formulario para ingreso manual de datos
  private habilitarFormularioParaIngresoManual() {
    this.viaticosForm.enable();
    this.viaticosForm.get('nit')?.disable();
  }

  // Procesa envío del formulario y validaciones
  onSubmit() {
    this.markFormGroupTouched();
    this.viaticosForm.updateValueAndValidity();

    if (this.usuario?.fechaFinContrato) {
      const fechaFin = new Date(this.usuario.fechaFinContrato);
      const fechaElaboracion = this.viaticosForm.get('fechaElaboracion')?.value;

      if (fechaElaboracion && new Date(fechaElaboracion) > fechaFin) {
        this.messageService.add({
          severity: 'error',
          summary: 'Fecha Inválida',
          detail: `No puede solicitar viáticos después de la fecha fin de contrato: ${this.formatearFechaLegible(this.usuario.fechaFinContrato)}`,
          life: 8000
        });
        return;
      }

      let hayFechasInvalidas = false;
      this.destinosFormArray.controls.forEach((destino, idx) => {
        const destinoGroup = destino as FormGroup;
        const fechaSalida = destinoGroup.get('fechaSalida')?.value;
        const fechaLlegada = destinoGroup.get('fechaLlegada')?.value;

        if (fechaSalida && new Date(fechaSalida) > fechaFin) {
          hayFechasInvalidas = true;
        }
        if (fechaLlegada && new Date(fechaLlegada) > fechaFin) {
          hayFechasInvalidas = true;
        }
      });

      if (hayFechasInvalidas) {
        this.messageService.add({
          severity: 'error',
          summary: 'Fechas Inválidas',
          detail: `Las fechas de viaje no pueden superar la fecha fin de contrato: ${this.formatearFechaLegible(this.usuario.fechaFinContrato)}`,
          life: 8000
        });
        return;
      }
    }

    const aprobadoresFaltantes: string[] = [];
    
    if (this.mostrarDirectorPrograma && !this.viaticosForm.get('aprobadoDirectorPrograma')?.value) {
      aprobadoresFaltantes.push('Director de Programa');
    }
    if (this.mostrarDecano && !this.viaticosForm.get('aprobadoDecano')?.value) {
      aprobadoresFaltantes.push('Decano');
    }
    if (this.mostrarDirectorOficina && !this.viaticosForm.get('aprobadoDirectorOficina')?.value) {
      aprobadoresFaltantes.push('Director de Oficina');
    }
    if (this.mostrarVicerrectorAdministrativo && !this.viaticosForm.get('aprobadoVicerrectorAdministrativo')?.value) {
      aprobadoresFaltantes.push('Vicerrector Administrativo');
    }
    if (this.mostrarDirectorTalentoHumano && !this.viaticosForm.get('aprobadoDirectorTalentoHumano')?.value) {
      aprobadoresFaltantes.push('Director de Talento Humano');
    }

    if (aprobadoresFaltantes.length > 0) {
      const listaAprobadores = aprobadoresFaltantes.map(a => `• ${a}`).join('\n');
      this.messageService.add({
        severity: 'error',
        summary: 'Firmas y Aprobaciones Incompletas',
        detail: `Debe asignar los siguientes responsables de firma:\n${listaAprobadores}`,
        life: 8000
      });
      
      const firmasSection = document.querySelector('[class*="Firmas y Aprobaciones"]')?.parentElement;
      if (firmasSection) {
        firmasSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }

    if (this.viaticosForm.invalid) {
      const camposInvalidos = this.obtenerTodosCamposInvalidos();
      const campoInvalido = this.encontrarPrimerCampoInvalido();

      if (campoInvalido) {
        this.scrollToInvalidField(campoInvalido);

        if (camposInvalidos.length > 1) {
          const listaCampos = camposInvalidos
            .slice(0, 5)
            .map(campo => `• ${this.obtenerNombreCampo(campo)}`)
            .join('\n');

          const mensajeExtra = camposInvalidos.length > 5
            ? `\n...y ${camposInvalidos.length - 5} campo(s) más`
            : '';

          this.mostrarMensaje(
            'warn',
            `Campos incompletos o inválidos:\n${listaCampos}${mensajeExtra}\n\nDesplazándose al primer campo...`,
            'Formulario Incompleto'
          );
        } else {
          this.mostrarMensaje(
            'warn',
            `Por favor complete el campo: ${this.obtenerNombreCampo(campoInvalido)}`,
            'Formulario Incompleto'
          );
        }
      } else {
        this.mostrarMensaje('warn', 'Por favor complete todos los campos requeridos');
      }
      this.guardandoSolicitud = false;
      return;
    }

    if (this.viaticosForm.valid) {
      this.abrirVistaPrevia();
    }
  }

  // Abre modal de vista previa de solicitud
  abrirVistaPrevia() {
    const destinosFormArray = this.viaticosForm.get('destinos') as FormArray;
    let hayErrorFechas = false;
    
    for (let i = 0; i < destinosFormArray.length; i++) {
      const destino = destinosFormArray.at(i) as FormGroup;
      const fechaSalida = destino.get('fechaSalida')?.value;
      const fechaLlegada = destino.get('fechaLlegada')?.value;
      
      if (fechaSalida && fechaLlegada) {
        const salida = new Date(fechaSalida);
        const llegada = new Date(fechaLlegada);
        
        if (llegada < salida) {
          this.mostrarMensaje('error', `La fecha de llegada del destino ${i + 1} no puede ser anterior a la fecha de salida`);
          hayErrorFechas = true;
          break;
        }
      }
    }
    
    if (hayErrorFechas) {
      return; 
    }
    
    this.datosVistaPrevia = this.prepararDatosVistaPrevia();
    this.mostrarVistaPrevia = true;
  }

  // Cierra el diálogo de vista previa
  cerrarVistaPrevia() {
    this.mostrarVistaPrevia = false;
    this.datosVistaPrevia = null;
  }

  
  prepararDatosVistaPrevia() {
    const form = this.viaticosForm.value;
    const destinosFormArray = this.viaticosForm.get('destinos') as FormArray;

    const destinosPreparados = Array.from({ length: destinosFormArray.length }, (_, index) => 
      this.prepararDestinoParaVistaPrevia(destinosFormArray.at(index) as FormGroup, index)
    );

    const aprobadoresPreparados = this.aprobadoresRequeridos.map(aprobador => ({
      campoBase: aprobador.campoBase,
      nombre: aprobador.nombre,
      orden: aprobador.orden
    }));

    return {
      usuario: {
        identificacion: this.usuario?.identificacion,
        nombre: this.usuario?.nombre,
        cargo: this.usuario?.cargo,
        categoria: this.obtenerNombreCategoria(this.categoriaAsignada)
      },
      numeroElaboracion: form.numeroElaboracion,
      fechaElaboracion: form.fechaElaboracion,
      conceptoViaje: this.obtenerNombreOpcion(this.conceptosViajeOptions, form.conceptoViaje),
      otroConcepto: form.otroConcepto,
      motivoViaje: form.motivoViaje,
      justificacionViaje: form.justificacionViaje,
      fuenteFuncion: this.obtenerNombreOpcion(this.fuentesFuncionOptions, form.fuenteFuncion),
      centrosCostoCodigos: (form.centrosCosto || []).join(', '),
      centrosCostoNombres: form.nombreCentroCosto || 'No especificado',
      destinos: destinosPreparados,
      valorTotal: this.calcularValorTotalSolicitud(),
      aprobadores: aprobadoresPreparados,
      numeroArchivos: this.archivosSoporte.length
    };
  }

  private obtenerNombreOpcion(opciones: any[], valor: any): string {
    return opciones.find(opt => opt.value === valor)?.label || valor;
  }

  private prepararDestinoParaVistaPrevia(destinoForm: FormGroup, index: number) {
    const liquidacion = destinoForm.get('liquidacion') as FormGroup;
    const esInternacional = destinoForm.get('esInternacional')?.value;

    return {
      orden: destinoForm.get('orden')?.value || (index + 1),
      ...this.obtenerUbicacionSalida(destinoForm, index),
      ...this.obtenerUbicacionDestino(destinoForm, index, esInternacional),
      esInternacional,
      regresoAlOrigen: destinoForm.get('esRegresoAlOrigen')?.value,
      fechaSalida: destinoForm.get('fechaSalida')?.value,
      horaSalida: destinoForm.get('horaSalida')?.value,
      fechaLlegada: destinoForm.get('fechaLlegada')?.value,
      horaLlegada: destinoForm.get('horaLlegada')?.value,
      valorParcial: destinoForm.get('valorParcial')?.value || 0,
      conceptosLiquidacion: this.obtenerConceptosLiquidacion(liquidacion)
    };
  }

  private obtenerConceptosLiquidacion(liquidacion: FormGroup) {
    return this.conceptosLiquidacion
      .map(concepto => {
        const conceptoGroup = liquidacion.get(concepto.id.toString()) as FormGroup;
        const esMarcado = conceptoGroup?.get('marcado')?.value;
        
        return esMarcado ? {
          nombre: concepto.label,
          dias: conceptoGroup.get('dias')?.value || 0,
          valorUnitario: conceptoGroup.get('valorUnitario')?.value || 0,
          porcentaje: conceptoGroup.get('porcentajePago')?.value || 100,
          subtotal: conceptoGroup.get('subtotal')?.value || 0
        } : null;
      })
      .filter(c => c !== null);
  }

  private obtenerUbicacionSalida(destinoForm: FormGroup, index: number) {
    const departamentoSalidaId = destinoForm.get('departamentoSalida')?.value;
    const municipioSalidaValue = destinoForm.get('municipioSalida')?.value;
    const municipiosSalidaKey = 'salida_' + index;

    return {
      departamentoSalidaId,
      departamentoSalidaNombre: this.obtenerNombreOpcion(this.departamentosOptions, departamentoSalidaId),
      municipioSalidaValue,
      municipioSalidaNombre: this.buscarNombreMunicipio(
        this.municipiosDestinos[municipiosSalidaKey],
        municipioSalidaValue
      )
    };
  }

  private obtenerUbicacionDestino(destinoForm: FormGroup, index: number, esInternacional: boolean) {
    const departamentoDestinoId = destinoForm.get('departamento')?.value;
    const municipioDestinoValue = destinoForm.get('municipio')?.value;
    const ciudadValue = destinoForm.get('ciudad')?.value;

    return esInternacional
      ? this.obtenerUbicacionInternacional(destinoForm, index, departamentoDestinoId, municipioDestinoValue, ciudadValue)
      : this.obtenerUbicacionNacional(index, departamentoDestinoId, municipioDestinoValue, ciudadValue);
  }

  private obtenerUbicacionInternacional(destinoForm: FormGroup, index: number, departamentoDestinoId: any, municipioDestinoValue: any, ciudadValue: any) {
    const paisId = destinoForm.get('pais')?.value;
    const departamentoPaisId = destinoForm.get('departamentoPais')?.value;

    return {
      departamento: departamentoDestinoId,
      departamentoNombre: departamentoDestinoId,
      municipio: municipioDestinoValue,
      municipioNombre: municipioDestinoValue,
      ciudad: ciudadValue,
      paisNombre: this.obtenerNombreOpcion(this.paisesOptions || [], paisId),
      departamentoPaisNombre: this.buscarNombreEnLista(
        this.departamentosPorPais[index],
        departamentoPaisId,
        'nombre'
      ),
      ciudadNombre: this.buscarNombreEnLista(
        this.ciudadesPorDepartamentoInt[index],
        ciudadValue,
        'nombre'
      )
    };
  }

  private obtenerUbicacionNacional(index: number, departamentoDestinoId: any, municipioDestinoValue: any, ciudadValue: any) {
    return {
      departamento: departamentoDestinoId,
      departamentoNombre: this.obtenerNombreOpcion(this.departamentosOptions, departamentoDestinoId),
      municipio: municipioDestinoValue,
      municipioNombre: this.buscarNombreMunicipio(
        this.municipiosDestinos[index],
        municipioDestinoValue
      ),
      ciudad: ciudadValue,
      paisNombre: '',
      departamentoPaisNombre: '',
      ciudadNombre: ciudadValue
    };
  }

  private buscarNombreMunicipio(municipios: any[], valor: any): string {
    const municipioEncontrado = municipios?.find(
      m => m.id === valor || m.nombre === valor
    );
    return municipioEncontrado?.nombre || valor;
  }

  private buscarNombreEnLista(lista: any[], valor: any, campo: string): string {
    const elementoEncontrado = lista?.find(
      item => item.id === valor || item[campo] === valor
    );
    return elementoEncontrado?.[campo] || valor;
  }

  // Confirma y envía solicitud final
  confirmarEnvioSolicitud() {
    this.cerrarVistaPrevia();

    try {
      this.enviarSolicitudFinal();
    } catch {
      this.guardandoSolicitud = false;
      this.mostrarMensaje('error', 'Error al preparar los datos de la solicitud');
    }
  }

  // Calcula duración del viaje entre dos fechas
  calcularDuracionViaje(fechaInicio: string, fechaFin: string): string {
    if (!fechaInicio || !fechaFin) {
      return 'No disponible';
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (dias === 0) {
      return 'Mismo día';
    } else if (dias === 1) {
      return '1 día';
    } else {
      return `${dias} días`;
    }
  }

  private enviarSolicitudFinal() {
    try {
      this.calcularLiquidacionGlobal();
      
      const formData = this.prepararDatosSolicitud();
      this.guardandoSolicitud = true;

      if (this.idBorradorCargado?.trim()) {
        formData.id = this.idBorradorCargado;
        formData.estado = 'pendiente'; 

        this.solicitudViaticosService.update(this.idBorradorCargado, formData).subscribe({
          next: (response) => {
            const codigoSolicitud = response.codigoSolicitud || response.id;

            if (!codigoSolicitud) {
              this.guardandoSolicitud = false;
              this.mostrarMensaje('error', 'No se pudo obtener el código de solicitud');
              return;
            }

            this.borradorCargado = false;
            this.idBorradorCargado = null;
            this.codigoBorradorCargado = null;

            // ✅ Inicializar aprobaciones dinámicas con cargo y facultad
            this.inicializarAprobacionesDinamicas(codigoSolicitud, formData);
          },
          error: (error) => {
            this.guardandoSolicitud = false;
            const msg = this.construirMensajeError(error);
            if (msg) this.mostrarMensaje('error', msg);
          }
        });
      } else {
        this.solicitudViaticosService.create(formData).subscribe({
          next: (response) => {
            const codigoSolicitud = response.codigoSolicitud || response.id;

            if (!codigoSolicitud) {
              this.guardandoSolicitud = false;
              this.mostrarMensaje('error', 'No se pudo obtener el código de solicitud');
              return;
            }

            // ✅ Inicializar aprobaciones dinámicas con cargo y facultad
            this.inicializarAprobacionesDinamicas(codigoSolicitud, formData);
          },
          error: (error) => {
      
            
            this.guardandoSolicitud = false;

            if (error.status === 409 || error.error?.tipo === 'DUPLICADO') {
              this.messageService.add({
                severity: 'error',
                summary: 'Solicitud Duplicada',
                detail: error.error?.mensaje || 'Ya existe una solicitud similar con las mismas fechas y destinos',
                life: 10000,
                sticky: true
              });
            } else {
              const msg = this.construirMensajeError(error);
              if (msg) this.mostrarMensaje('error', msg);
            }
          }
        });
      }
    } catch {
      this.guardandoSolicitud = false;
      this.mostrarMensaje('error', 'Error al preparar los datos de la solicitud');
    }
  }

  // Inicializa aprobaciones dinámicas según cargo y facultad del solicitante
  private inicializarAprobacionesDinamicas(codigoSolicitud: string, formData: SolicitudViaticos) {
    const cargo = (formData as any).cargo;
    const facultad = (formData as any).facultad;

    if (!cargo) {
      this.procesarArchivos(codigoSolicitud);
      return;
    }

    this.aprobacionService.inicializarAprobacionesDinamicas(codigoSolicitud, cargo, facultad).subscribe({
      next: () => {
        this.procesarArchivos(codigoSolicitud);
      },
      error: (error) => {
        // No bloqueamos el flujo ya que la solicitud fue creada exitosamente
        // Las aprobaciones se pueden inicializar manualmente o usar fallback
        this.procesarArchivos(codigoSolicitud);
      }
    });
  }

  // Procesa subida de archivos de soporte
  private procesarArchivos(codigoSolicitud: string) {
    if (this.archivosSoporte.length > 0) {
      this.guardarArchivosConCodigoSolicitud(this.archivosSoporte, codigoSolicitud).subscribe({
        next: () => {
          this.finalizarGuardado(codigoSolicitud);
        },
        error: () => {
          this.guardandoSolicitud = false;
          this.mostrarMensajeExito(
            '¡Solicitud enviada!',
            `Código: ${codigoSolicitud}. Nota: No se pudieron subir los archivos adjuntos.`
          );
          setTimeout(() => { this.onReset(); }, 3000);
        }
      });
    } else {
      this.finalizarGuardado(codigoSolicitud);
    }
  }

  // Finaliza proceso de guardado de solicitud
  private finalizarGuardado(codigoSolicitud: string) {
    this.guardandoSolicitud = false;
    if (this.borradorCargado && this.idBorradorCargado) {
      this.borradorCargado = false;
      this.idBorradorCargado = null;
      this.codigoBorradorCargado = null;
    }
    
    this.realtimeService.triggerRefresh();

    this.mostrarMensajeExito(
      '¡Solicitud enviada exitosamente!',
      `La orden de pago de viáticos ha sido registrada correctamente. Código: ${codigoSolicitud}`
    );
    setTimeout(() => { this.onReset(); }, 3000);
  }

  // Construye mensaje de error desde respuesta HTTP
  private construirMensajeError(error: { status: number; error?: { message?: string; errors?: unknown } }): string {
    if (error.status === 400) {
      const err = error.error;
      if (err?.message) return err.message;
      if (typeof err === 'string') return err;
      if (err?.errors) {
        const errores = Array.isArray(err.errors)
          ? err.errors.map((e: { defaultMessage?: string; message?: string }) => e.defaultMessage || e.message || e).join(', ')
          : JSON.stringify(err.errors);
        return `Errores de validación: ${errores}`;
      }
      return 'Los datos enviados no son válidos. Verifique los campos del formulario.';
    }
    return '';
  }

  // Guarda solicitud como borrador
  guardarBorrador() {
    const identificacion = this.viaticosForm.get('identificacion')?.value;
    if (!identificacion || identificacion.trim() === '') {
      this.mostrarMensaje('error', 'la identificacion es requerida para guardar el borrador');
      return;
    }

    this.guardandoBorrador = true;

    const borrador = this.construirDatosBorrador();
    
    if (this.idBorradorCargado?.trim()) {
      this.actualizarBorrador(borrador as unknown as SolicitudViaticos);
    } else {
      this.crearNuevoBorrador(borrador as unknown as SolicitudViaticos);
    }
  }

  // Construye objeto de datos para borrador
  private construirDatosBorrador(): Record<string, unknown> {
    const formValues = this.viaticosForm.getRawValue();

    const destinos = formValues.destinos?.map((destino: {
      departamentoSalida?: string; municipioSalida?: string; fechaSalida?: string;
      departamento?: string; municipio?: string; ciudad?: string; fechaLlegada?: string;
      esInternacional?: boolean;
      liquidacion?: any; // ✅ Agregar liquidación
    }) => {
      const esInternacional = destino.esInternacional || false;

      return {
        departamentoSalida: destino.departamentoSalida || '',
        municipioSalida: destino.municipioSalida || '',
        fechaSalida: this.formatDate(destino.fechaSalida) || new Date().toISOString().split('T')[0],
        departamento: esInternacional ? 'PENDIENTE' : (destino.departamento || 'PENDIENTE'),
        municipio: esInternacional ? 'PENDIENTE' : (destino.municipio || 'PENDIENTE'),
        ciudad: destino.ciudad || 'PENDIENTE',
        fechaLlegada: this.formatDate(destino.fechaLlegada) || new Date().toISOString().split('T')[0],
        liquidacion: destino.liquidacion || {} // ✅ Incluir liquidación del destino
      };
    }) || [];

    const centrosCosto = formValues.centrosCosto && Array.isArray(formValues.centrosCosto) && formValues.centrosCosto.length > 0
      ? formValues.centrosCosto.map((codigoCentroCosto: string) => ({
        codigoCentroCosto: codigoCentroCosto,
        fuenteFuncion: formValues.fuenteFuncion || ''
      }))
      : [];

    const primerDestino = destinos[0];
    const fechaSalida = primerDestino ? primerDestino.fechaSalida : this.formatDate(formValues.fechaSalida);
    const departamentoSalida = primerDestino ? primerDestino.departamentoSalida : formValues.departamentoSalida;
    const municipioSalida = primerDestino ? primerDestino.municipioSalida : formValues.municipioSalida;

    const codigosContables = this.conceptosLiquidacion
      .filter(concepto => formValues.liquidacion && formValues.liquidacion[concepto.id]?.marcado)
      .map(concepto => {
        const conceptoData = this.conceptosLiquidacionData.find(c => c.id === concepto.id);
        return conceptoData?.codigoContable || concepto.codigo;
      })
      .filter(codigo => codigo);

    const conceptosSeleccionados = [...new Set(codigosContables)].join(',');

    const conceptoViajeEncontrado = this.conceptosViaje.find(c => c.id === formValues.conceptoViaje);
    const nombreConceptoViaje = conceptoViajeEncontrado?.nombre || '';

    const conceptoViajeFormateado = nombreConceptoViaje && conceptosSeleccionados
      ? `${nombreConceptoViaje} | ${conceptosSeleccionados}`
      : nombreConceptoViaje || this.cleanValue(formValues.conceptoViaje);

    return {
      nit: formValues.nit?.trim() || '',
      identificacion: formValues.nit?.trim() || '', 
      estado: 'borrador',
      fechaElaboracion: this.formatDate(formValues.fechaElaboracion) || new Date().toISOString().split('T')[0],
      primerApellido: formValues.primerApellido?.trim() || 'PENDIENTE',
      segundoApellido: this.cleanValue(formValues.segundoApellido),
      primerNombre: formValues.primerNombre?.trim() || 'PENDIENTE',
      segundoNombre: this.cleanValue(formValues.segundoNombre),
      tipoViaticos: formValues.tipoViaticos || 'ocasional',
      cargo: this.cleanValue(formValues.cargo),
      fechaSalida: fechaSalida || new Date().toISOString().split('T')[0],
      departamentoSalida: departamentoSalida,
      municipioSalida: municipioSalida,
      requiereTransporte: formValues.requiereTransporte === true,
      conceptoViaje: conceptoViajeFormateado,
      valorTotalViaticos: formValues.valorTotalViaticos || this.valorTotalViaticos || 0,
      motivoViaje: this.cleanValue(formValues.motivoViaje),
      categoriaCodigo: this.cleanValue(formValues.categoriaCodigo) || this.categoriaAsignada,
      elaboradoPor: this.cleanValue(formValues.elaboradoPor),
      aprobadoDecano: this.cleanValue(formValues.aprobadoDecano),
      aprobadoDirectorPrograma: this.cleanValue(formValues.aprobadoDirectorPrograma),
      aprobadoDirectorTalentoHumano: this.cleanValue(formValues.aprobadoDirectorTalentoHumano),
      aprobadoVicerrectorAdministrativo: this.cleanValue(formValues.aprobadoVicerrectorAdministrativo),
      liquidacion: formValues.liquidacion ? JSON.stringify(formValues.liquidacion) : undefined,
      destinos: destinos,
      centrosCosto: centrosCosto
    };
  }

  // Formatea fecha a YYYY-MM-DD
  private formatDate(date: Date | string | null | undefined): string | undefined {
    if (!date) return undefined;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    const trimmed = (date as string).trim();
    if (!trimmed) return undefined;
    return trimmed.includes('T') ? trimmed.split('T')[0] : (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : trimmed);
  }

  // Limpia valores nulos o vacíos
  private cleanValue(value: string | number | boolean | null | undefined): string | undefined {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  }

  // Actualiza borrador existente en base de datos
  private actualizarBorrador(borrador: SolicitudViaticos) {
    if (!this.idBorradorCargado) return;

    if (this.codigoBorradorCargado) {
      (borrador as unknown as Record<string, unknown>)['codigoSolicitud'] = this.codigoBorradorCargado;
    }

    this.solicitudViaticosService.update(this.idBorradorCargado, borrador).subscribe({
      next: (response) => this.finalizarGuardadoBorrador(response),
      error: (error) => {
        if (error.status === 404) {
          this.reintentarCrearBorrador(borrador);
        } else if (error.status === 409 || error.error?.tipo === 'DUPLICADO') {
          this.guardandoBorrador = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Solicitud Duplicada',
            detail: error.error?.mensaje || 'Ya existe una solicitud similar con las mismas fechas y destinos',
            life: 10000,
            sticky: true
          });
        } else {
          this.guardandoBorrador = false;
        }
      }
    });
  }

  // Crea nuevo borrador en base de datos
  private crearNuevoBorrador(borrador: SolicitudViaticos) {
    this.solicitudViaticosService.createBorrador(borrador).subscribe({
      next: (response) => this.finalizarGuardadoBorrador(response),
      error: (error) => {
        this.guardandoBorrador = false;

        if (error.status === 409 || error.error?.tipo === 'DUPLICADO') {
          this.messageService.add({
            severity: 'error',
            summary: 'Solicitud Duplicada',
            detail: error.error?.mensaje || 'Ya existe una solicitud similar con las mismas fechas y destinos',
            life: 10000,
            sticky: true
          });
        }
      }
    });
  }

  // Reintenta crear borrador con código temporal
  private reintentarCrearBorrador(borrador: SolicitudViaticos) {
    this.idBorradorCargado = null;
    this.borradorCargado = false;
    this.codigoBorradorCargado = null;
    this.crearNuevoBorrador(borrador);
  }

  // Finaliza guardado de borrador con archivos
  private finalizarGuardadoBorrador(response: { codigoSolicitud?: string | null; id?: string | null }) {
    this.borradorCargado = true;
    this.codigoBorradorCargado = response.codigoSolicitud || null;
    this.idBorradorCargado = response.id ? String(response.id) : null;
    
    if (this.archivosSoporte.length > 0 && this.codigoBorradorCargado) {
      this.guardarArchivosEnBaseDatos(this.archivosSoporte, () => {
        this.guardandoBorrador = false;
        const accion = this.idBorradorCargado ? 'actualizado' : 'guardado';
        this.mostrarMensajeExito(
          '¡Borrador guardado exitosamente!', 
          `Su borrador ha sido ${accion} correctamente con ${this.archivosSoporte.length} archivo(s). Código: ${this.codigoBorradorCargado}`
        );
        this.archivosSoporte = []; 
      }, this.codigoBorradorCargado);
    } else {
      this.guardandoBorrador = false;
      const accion = this.idBorradorCargado ? 'actualizado' : 'guardado';
      this.mostrarMensajeExito('¡Borrador guardado exitosamente!', `Su borrador ha sido ${accion} correctamente. Código: ${response.codigoSolicitud || response.id}`);
    }
  }

  // Prepara objeto completo de solicitud para envío
  private prepararDatosSolicitud(): SolicitudViaticos {
    const formValue = this.viaticosForm.getRawValue();
    const valorTotal = this.valorTotalViaticos;
    
    const emailUsuarioLogueado = localStorage.getItem('email') || '';
    
    const codigosContablesSet = new Set<string>();
    
    if (formValue.destinos && Array.isArray(formValue.destinos)) {
      formValue.destinos.forEach((destino: any) => {
        if (destino.liquidacion) {
          Object.keys(destino.liquidacion).forEach(conceptoId => {
            const liquidacionConcepto = destino.liquidacion[conceptoId];
            if (liquidacionConcepto?.marcado) {
              const conceptoData = this.conceptosLiquidacionData.find(c => c.id === parseInt(conceptoId));
              if (conceptoData?.codigoContable) {
                codigosContablesSet.add(conceptoData.codigoContable);
              }
            }
          });
        }
      });
    }
    
    const codigosContables = Array.from(codigosContablesSet);
    const conceptosSeleccionados = codigosContables.join(',');

    if (!formValue.nit?.trim()) throw new Error('El NIT es requerido');
    if (!formValue.primerApellido?.trim()) throw new Error('El primer apellido es requerido');
    if (!formValue.primerNombre?.trim()) throw new Error('El primer nombre es requerido');
    if (!formValue.destinos || !Array.isArray(formValue.destinos) || formValue.destinos.length === 0) {
      throw new Error('Debe agregar al menos un destino');
    }

    const fechaSalidaFinal = formValue.fechaSalida || formValue.destinos[0]?.fechaSalida;
    if (!fechaSalidaFinal) {
      throw new Error('Debe especificar una fecha de salida en el primer destino');
    }

    
    const primerDestino = formValue.destinos[0];
    const departamentoSalidaId = formValue.departamentoSalida || primerDestino?.departamentoSalida;
    const municipioSalidaId = formValue.municipioSalida || primerDestino?.municipioSalida;
    const departamentoSalidaEncontrado = this.departamentos.find(d => d.id === departamentoSalidaId);
    const nombreDepartamentoSalida = departamentoSalidaEncontrado?.nombre || '';
    let nombreMunicipioSalida = '';
    if (municipioSalidaId) {
      const municipioEncontrado = this.municipiosSalida.find(m => m.id === municipioSalidaId) ||
        this.municipiosDestinos['salida_0']?.find(m => m.id === municipioSalidaId);
      nombreMunicipioSalida = municipioEncontrado?.nombre || '';
    }

    const conceptoViajeEncontrado = this.conceptosViaje.find(c => c.id === formValue.conceptoViaje);
    const nombreConceptoViaje = conceptoViajeEncontrado?.nombre || '';
    const solicitud: SolicitudViaticos = {
      nit: formValue.nit.trim(),
      primerApellido: formValue.primerApellido.trim(),
      primerNombre: formValue.primerNombre.trim(),
      tipoViaticos: formValue.tipoViaticos || 'ocasional',
      fechaElaboracion: this.formatearFecha(formValue.fechaElaboracion) || this.hoyYYYYMMDD(),
      fechaSalida: this.formatearFecha(fechaSalidaFinal),
      departamentoSalida: nombreDepartamentoSalida,
      municipioSalida: nombreMunicipioSalida,
      requiereTransporte: formValue.requiereTransporte === true,
      conceptoViaje: [nombreConceptoViaje, conceptosSeleccionados].filter(Boolean).join(' | ') || 'Solicitud de viáticos',
      valorTotalViaticos: valorTotal || this.calcularValorTotalSolicitud() || 0,
      identificacion: formValue.nit.trim(),
      emailSolicitante: emailUsuarioLogueado,  // 📧 Email del usuario logueado para notificaciones
      destinos: [],
      centrosCosto: []
    };


    this.asignarCamposOpcionales(solicitud, formValue);

    const destinosArray = formValue['destinos'] as Array<{
      departamento: string;
      departamentoSalida: string;
      municipio: string;
      municipioSalida: string;
      ciudad: string;
      fechaSalida: string | Date;
      fechaLlegada: string | Date;
      esInternacional: boolean;
      liquidacion: Record<string, unknown>;
      valorParcial: number;
    }>;

    if (Array.isArray(destinosArray) && destinosArray.length > 0) {
      solicitud.destinos = destinosArray.map((destino, index) => {
        let nombreCiudad = '';
        let nombreDepartamento = '';
        let nombreMunicipio = '';
        let nombreDepartamentoSalida = '';
        let nombreMunicipioSalida = '';

        if (destino.esInternacional) {
          // Para destinos internacionales, resolvemos el UUID a nombre antes de guardar
          const ciudades = this.ciudadesPorDepartamentoInt[index];
          if (ciudades && destino.ciudad) {
            const ciudadEncontrada = ciudades.find(c => c.id === destino.ciudad);
            nombreMunicipio = ciudadEncontrada?.nombre || destino.ciudad || '';
          } else {
            nombreMunicipio = destino.ciudad || '';
          }
          nombreDepartamento = 'N/A';
          nombreCiudad = nombreMunicipio;
        } else {
          const departamentoEncontrado = this.departamentos.find(d => d.id === destino.departamento);
          nombreDepartamento = departamentoEncontrado?.nombre || '';
          const municipios = this.municipiosDestinos[index];
          if (municipios && Array.isArray(municipios)) {
            const municipioEncontrado = municipios.find(m => m.id === destino.municipio);
            nombreMunicipio = municipioEncontrado?.nombre || '';
            nombreCiudad = municipioEncontrado?.nombre || '';
          }
        }

        
        const departamentoSalidaEncontrado = this.departamentos.find(d => d.id === destino.departamentoSalida);
        nombreDepartamentoSalida = departamentoSalidaEncontrado?.nombre || '';
        const municipiosSalida = this.municipiosDestinos[`salida_${index}`];
        if (municipiosSalida && Array.isArray(municipiosSalida)) {
          const municipioSalidaEncontrado = municipiosSalida.find(m => m.id === destino.municipioSalida);
          nombreMunicipioSalida = municipioSalidaEncontrado?.nombre || '';
        }

        return {
          departamentoSalida: nombreDepartamentoSalida,
          municipioSalida: nombreMunicipioSalida,
          fechaSalida: this.formatearFecha(destino.fechaSalida),
          departamento: nombreDepartamento,
          municipio: nombreMunicipio,
          ciudad: nombreCiudad,
          fechaLlegada: this.formatearFecha(destino.fechaLlegada),
          orden: index + 1,
          liquidacion: destino.liquidacion as Record<string, ConceptoLiquidacion> || {},
          valorParcial: destino.valorParcial || 0
        };
      });
    }

    const centrosCostoArray = formValue['centrosCosto'];
    const fuenteFuncion = formValue['fuenteFuncion'] as string;
    const nombreCentroCosto = formValue['nombreCentroCosto'] as string;

    if (Array.isArray(centrosCostoArray) && centrosCostoArray.length > 0) {
      solicitud.centrosCosto = centrosCostoArray.map((codigo) => ({
        codigoCentroCosto: codigo,
        nombreCentroCosto: nombreCentroCosto || '',
        fuenteFuncion: fuenteFuncion || '',
        porcentajeAsignado: 100 / centrosCostoArray.length,
        valorAsignado: (solicitud.valorTotalViaticos || 0) / centrosCostoArray.length
      }));
    }

    const solicitudConLiquidacion = solicitud as SolicitudViaticos & { liquidacion?: string };
    if (formValue.liquidacion) {
      solicitudConLiquidacion.liquidacion = JSON.stringify(formValue.liquidacion);
    }

    return solicitudConLiquidacion as SolicitudViaticos;
  }

  // Asigna campos opcionales a la solicitud
  private asignarCamposOpcionales(solicitud: SolicitudViaticos, formValue: Record<string, unknown>) {
    const camposOpcionales = [
       'segundoApellido', 'segundoNombre', 'cargo', 'facultad', 'programa', 'direccion',
      'motivoViaje', 'categoriaCodigo', 'elaboradoPor', 'aprobadoDecano', 'aprobadoDirectorOficina',
      'aprobadoDirectorPrograma', 'aprobadoDirectorTalentoHumano', 'aprobadoVicerrectorAdministrativo'
    ];
    camposOpcionales.forEach(campo => {
      const valor = formValue[campo];
      if (typeof valor === 'string' && (valor as string).trim()) {
        (solicitud as unknown as Record<string, unknown>)[campo] = (valor as string).trim();
      }
    });
  }


  // Formatea fecha desde varios tipos a YYYY-MM-DD
  private formatearFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
    return !isNaN(dateObj.getTime()) ? this.dateToYYYYMMDD(dateObj) : '';
  }

 
  // Convierte fecha ISO a formato legible DD/MM/YYYY
  private formatearFechaLegible(fechaISO: string): string {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return '';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }


  // Acceso al FormArray de destinos
  get destinosFormArray(): FormArray {
    return this.viaticosForm.get('destinos') as FormArray;
  }

  
  // Actualiza fecha máxima de contrato del usuario
  private actualizarMaxDateContrato(): void {
    if (!this.usuario?.fechaFinContrato) {
      this.maxDateContrato = null;
      return;
    }
    this.maxDateContrato = new Date(this.usuario.fechaFinContrato);
  }

  // Obtiene opciones de municipios para dropdown
  getMunicipiosOptionsForDestino(index: number): { label: string; value: string }[] {
    const municipios = this.municipiosDestinos[index];
    if (!municipios || !Array.isArray(municipios)) {
      return [];
    }
    return municipios.map(m => ({ label: m.nombre, value: m.id }));
  }

 
  // Valida que fecha no exceda fin de contrato
  private validarFechaFinContrato(fechaFinContrato: string): void {
    const fechaElaboracion = this.viaticosForm.get('fechaElaboracion')?.value;

    if (!fechaElaboracion) {
      return;
    }

    const fechaFin = new Date(fechaFinContrato);
    const fechaElab = new Date(fechaElaboracion);

    if (fechaElab > fechaFin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha de Contrato Vencida',
        detail: `La fecha de elaboración no puede ser posterior a la fecha fin de contrato (${this.formatearFechaLegible(fechaFinContrato)})`,
        life: 6000
      });
    }
  }

 
  
  // Valida una fecha contra fin de contrato individual
  private validarFechaContraFinContrato(fecha: string | Date, nombreCampo: string): boolean {
    if (!this.usuario?.fechaFinContrato) {
      return true;
    }

    const fechaFin = new Date(this.usuario.fechaFinContrato);
    const fechaValidar = new Date(fecha);

    if (fechaValidar > fechaFin) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha Inválida',
        detail: `La ${nombreCampo} no puede ser posterior a la fecha fin de contrato (${this.formatearFechaLegible(this.usuario.fechaFinContrato)})`,
        life: 6000
      });
      return false;
    }

    return true;
  }


  private validadorFechasDestino(): ValidatorFn {
    return (group: AbstractControl): { [key: string]: any } | null => {
      const fechaSalida = group.get('fechaSalida')?.value;
      const fechaLlegada = group.get('fechaLlegada')?.value;
      if (!fechaSalida || !fechaLlegada) {
        return null;
      }
      const salida = new Date(fechaSalida);
      const llegada = new Date(fechaLlegada);
      if (llegada < salida) {
        return { fechaLlegadaInvalida: true };
      }

      return null;
    };
  }

  // Crea un FormGroup para un nuevo destino
  private crearDestinoFormGroup(): FormGroup {
    const index = this.destinosFormArray.length;
    const orden = index + 1;

    const formGroup = this.fb.group({
      orden: [orden],
      departamentoSalida: ['', index === 0 ? [Validators.required] : []],
      municipioSalida: ['', index === 0 ? [Validators.required] : []],
      fechaSalida: ['', index === 0 ? [Validators.required] : []],
      departamento: ['', [Validators.required]],
      municipio: ['', [Validators.required]],
      pais: [''],
      departamentoPais: [''],
      ciudad: [''],
      fechaLlegada: ['', [Validators.required]],
      esInternacional: [false],
      esRegresoAlOrigen: [false],
      liquidacion: this.fb.group({}),
      valorParcial: [0]
    }, { validators: this.validadorFechasDestino() });

    formGroup.get('departamentoSalida')?.valueChanges.subscribe((departamentoId: string | null) => {
      if (departamentoId) {
        this.cargarMunicipiosSalidaDestino(index, departamentoId);
      }
    });

    formGroup.get('departamento')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe((departamentoId: string | null) => {
      if (departamentoId && !formGroup.get('esInternacional')?.value) {
        this.onDepartamentoDestinoChange(index, departamentoId);
        this.actualizarOrigenSiguienteDestino(index);
      }
      this.calcularTarifaAutomatica();
    });   
    formGroup.get('pais')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe((paisId: string | null) => {
      if (paisId && formGroup.get('esInternacional')?.value) {
        this.onPaisDestinoChange(index, paisId);
      }
      this.calcularTarifaAutomatica();
    });
    formGroup.get('departamentoPais')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe((departamentoId: string | null) => {
      if (departamentoId && formGroup.get('esInternacional')?.value) {
        this.onDepartamentoPaisChange(index, departamentoId);
      }
      this.calcularTarifaAutomatica();
    });
    formGroup.get('municipio')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe(() => {
      this.actualizarOrigenSiguienteDestino(index);
      this.calcularTarifaAutomatica();
    }); 
    formGroup.get('ciudad')?.valueChanges.pipe(
      debounceTime(200)
    ).subscribe(() => {
      if (formGroup.get('esInternacional')?.value) {
        this.actualizarOrigenSiguienteDestino(index);
      }
      this.calcularTarifaAutomatica();
    });

    formGroup.get('fechaLlegada')?.valueChanges.pipe(
      debounceTime(800)
    ).subscribe(() => {
      this.actualizarOrigenSiguienteDestino(index);
      this.calcularTarifaAutomatica();
    });
    formGroup.get('fechaSalida')?.valueChanges.subscribe(() => {
      this.actualizarFechaMinLlegada(index);
    });
    formGroup.get('fechaSalida')?.valueChanges.pipe(
      debounceTime(800)
    ).subscribe(() => {
      this.calcularTarifaAutomatica();
    });

    if (index === 0) {
      const depSalidaGeneral = this.viaticosForm.get('departamentoSalida')?.value;
      const munSalidaGeneral = this.viaticosForm.get('municipioSalida')?.value;
      const fechaSalidaGeneral = this.viaticosForm.get('fechaSalida')?.value;

      if (depSalidaGeneral) {
        formGroup.patchValue({ departamentoSalida: depSalidaGeneral });
      }
      if (munSalidaGeneral) formGroup.patchValue({ municipioSalida: munSalidaGeneral });
      if (fechaSalidaGeneral) formGroup.patchValue({ fechaSalida: fechaSalidaGeneral });
    } else {
      
      const destinoAnterior = this.destinosFormArray.at(index - 1) as FormGroup;
      if (destinoAnterior) {
        const depAnterior = destinoAnterior.get('departamento')?.value;
        const munAnterior = destinoAnterior.get('municipio')?.value;
        const fechaAnterior = destinoAnterior.get('fechaLlegada')?.value;
        formGroup.patchValue({
          departamentoSalida: depAnterior,
          municipioSalida: munAnterior,
          fechaSalida: fechaAnterior
        });
      }
    }
    this.actualizarFechaMinLlegada(index);

    return formGroup;
  }

  // Añade un nuevo destino al formulario
  agregarDestino(): void {
    const nuevoIndex = this.destinosFormArray.length;
    this.destinosFormArray.push(this.crearDestinoFormGroup());
    const nuevoDestino = this.destinosFormArray.at(nuevoIndex) as FormGroup;
    const depSalida = nuevoDestino.get('departamentoSalida')?.value;
    if (depSalida) {
      this.cargarMunicipiosSalidaDestino(nuevoIndex, depSalida);
    }
  }

  // Elimina un destino del formulario
  eliminarDestino(index: number): void {
    if (this.destinosFormArray.length > 1) {
      this.destinosFormArray.removeAt(index);
      this.fechasMinLlegada.splice(index, 1);
      for (let i = index; i < this.destinosFormArray.length; i++) {
        this.actualizarFechaMinLlegada(i);
      }
      this.calcularLiquidacionGlobal();
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debe haber al menos un destino'
      });
    }
  }

  // Maneja cambio de departamento en destino
  onDepartamentoDestinoChange(index: number, departamentoId: string): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    destinoGroup.patchValue({ municipio: '', ciudad: '' });

    if (departamentoId) {
      // Buscar el departamento seleccionado para verificar si es Bogotá D.C.
      const departamentoSeleccionado = this.departamentos.find(d => d.id === departamentoId);
      const esBogotaDC = departamentoSeleccionado?.nombre.toLowerCase().includes('bogotá') || 
                         departamentoSeleccionado?.nombre.toLowerCase().includes('bogota');

      this.ubicacionesService.getMunicipiosByDepartamento(departamentoId).subscribe({
        next: (municipios) => {
          if (!this.municipiosDestinos) {
            this.municipiosDestinos = {};
          }
          this.municipiosDestinos[index] = municipios;

          // Si es Bogotá D.C. y tiene municipios, seleccionar automáticamente el primero (único)
          if (esBogotaDC && municipios.length > 0) {
            destinoGroup.patchValue({ municipio: municipios[0].id });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los municipios de destino'
          });
        }
      });
    }
  }

  // Maneja cambio de departamento de salida
  onDepartamentoSalidaDestinoChange(index: number, departamentoId: string): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    if (destinoGroup) {
      destinoGroup.patchValue({ municipioSalida: '' });
    }

    this.cargarMunicipiosSalidaDestino(index, departamentoId);
  }

  // Carga municipios de salida para un destino
  private cargarMunicipiosSalidaDestino(index: number, departamentoId: string): void {
    if (departamentoId) {
      // Buscar el departamento seleccionado para verificar si es Bogotá D.C.
      const departamentoSeleccionado = this.departamentos.find(d => d.id === departamentoId);
      const esBogotaDC = departamentoSeleccionado?.nombre.toLowerCase().includes('bogotá') || 
                         departamentoSeleccionado?.nombre.toLowerCase().includes('bogota');

      this.ubicacionesService.getMunicipiosByDepartamento(departamentoId).subscribe({
        next: (municipios) => {
          if (!this.municipiosDestinos['salida_' + index]) {
            this.municipiosDestinos['salida_' + index] = [];
          }
          this.municipiosDestinos['salida_' + index] = municipios;

          // Si es Bogotá D.C. y tiene municipios, seleccionar automáticamente el primero (único)
          if (esBogotaDC && municipios.length > 0) {
            const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
            if (destinoGroup) {
              destinoGroup.patchValue({ municipioSalida: municipios[0].id });
            }
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los municipios de salida'
          });
        }
      });
    }
  }

  // Obtiene municipios de salida para destino específico
  getMunicipiosSalidaForDestino(index: number): { label: string; value: string }[] {
    const municipios = this.municipiosDestinos['salida_' + index];
    if (!municipios || !Array.isArray(municipios)) {
      return [];
    }
    return municipios.map(m => ({ label: m.nombre, value: m.id }));
  }

  // Obtiene municipios de destino para dropdown
  getMunicipiosDestinoForDestino(index: number): { label: string; value: string }[] {
    const municipios = this.municipiosDestinos[index];
    if (!municipios || !Array.isArray(municipios)) {
      return [];
    }
    return municipios.map(m => ({ label: m.nombre, value: m.id }));
  }

  // Actualiza origen del siguiente destino automáticamente
  private actualizarOrigenSiguienteDestino(indexActual: number): void {
    const indexSiguiente = indexActual + 1;
    if (indexSiguiente >= this.destinosFormArray.length) {
      return;
    }

    const destinoActual = this.destinosFormArray.at(indexActual) as FormGroup;
    const destinoSiguiente = this.destinosFormArray.at(indexSiguiente) as FormGroup;

    if (!destinoActual || !destinoSiguiente) {
      return;
    }
    const depActual = destinoActual.get('departamento')?.value;
    const munActual = destinoActual.get('municipio')?.value;
    const fechaLlegadaActual = destinoActual.get('fechaLlegada')?.value;
    destinoSiguiente.patchValue({
      departamentoSalida: depActual,
      municipioSalida: munActual,
      fechaSalida: fechaLlegadaActual
    }, { emitEvent: false });
    if (depActual) {
      this.onDepartamentoSalidaDestinoChange(indexSiguiente, depActual);
    }
  }

  // Maneja cambio de tipo internacional en destino
  onEsInternacionalDestinoChange(index: number, esInternacional: boolean): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    
    if (esInternacional) {
      destinoGroup.patchValue({ departamento: '', municipio: '' });
      destinoGroup.get('departamento')?.clearValidators();
      destinoGroup.get('municipio')?.clearValidators();
      destinoGroup.get('pais')?.setValidators([Validators.required]);
      destinoGroup.get('departamentoPais')?.setValidators([Validators.required]);
      destinoGroup.get('ciudad')?.setValidators([Validators.required]);
      
      if (this.paisesOptions.length === 0) {
        this.cargarPaises();
      }
    } else {
      destinoGroup.patchValue({ pais: '', departamentoPais: '', ciudad: '' });
      destinoGroup.get('pais')?.clearValidators();
      destinoGroup.get('departamentoPais')?.clearValidators();
      destinoGroup.get('ciudad')?.clearValidators();  
      destinoGroup.get('departamento')?.setValidators([Validators.required]);
      destinoGroup.get('municipio')?.setValidators([Validators.required]);
    }
    destinoGroup.get('departamento')?.updateValueAndValidity();
    destinoGroup.get('municipio')?.updateValueAndValidity();
    destinoGroup.get('pais')?.updateValueAndValidity();
    destinoGroup.get('departamentoPais')?.updateValueAndValidity();
    destinoGroup.get('ciudad')?.updateValueAndValidity();
  }

  // Maneja cambio de país en destino internacional
  onPaisDestinoChange(index: number, idPais: string): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    
    destinoGroup.patchValue({ departamentoPais: '', ciudad: '' }, { emitEvent: false });
    
    if (idPais) {
      this.cargarDepartamentosPorPais(idPais, index);
    } else {
      this.departamentosPorPais[index] = [];
      this.ciudadesPorDepartamentoInt[index] = [];
    }
  }

  // Maneja cambio de departamento en país internacional
  onDepartamentoPaisChange(index: number, idDepartamento: string): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    
    destinoGroup.patchValue({ ciudad: '' }, { emitEvent: false });
    
    if (idDepartamento) {
      this.cargarCiudadesPorDepartamentoPais(idDepartamento, index);
    } else {
      this.ciudadesPorDepartamentoInt[index] = [];
    }
  }


  // Maneja activación de regreso al origen
  onRegresoAlOrigenChange(index: number, esRegreso: boolean): void {
    if (esRegreso && index > 0) {
      const destinoAnterior = this.destinosFormArray.at(index - 1) as FormGroup;
      const destinoActual = this.destinosFormArray.at(index) as FormGroup;

      if (!destinoAnterior || !destinoActual) {
        return;
      }
      const departamentoDestinoAnterior = destinoAnterior.get('departamento')?.value;
      const municipioDestinoAnterior = destinoAnterior.get('municipio')?.value;
      const ciudadDestinoAnterior = destinoAnterior.get('ciudad')?.value;
      const esInternacionalDestinoAnterior = destinoAnterior.get('esInternacional')?.value;
      const departamentoOrigenAnterior = destinoAnterior.get('departamentoSalida')?.value;
      const municipioOrigenAnterior = destinoAnterior.get('municipioSalida')?.value;
      const ciudadOrigenAnterior = destinoAnterior.get('ciudadSalida')?.value;
      const esInternacionalOrigenAnterior = destinoAnterior.get('esInternacional')?.value;


      if ((!departamentoDestinoAnterior && !ciudadDestinoAnterior) ||
        (!departamentoOrigenAnterior && !ciudadOrigenAnterior && !municipioOrigenAnterior)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Datos Incompletos',
          detail: 'El tramo anterior debe tener origen y destino configurados',
          life: 4000
        });
        destinoActual.patchValue({ esRegresoAlOrigen: false }, { emitEvent: false });
        return;
      }

      const fechaLlegadaAnterior = destinoAnterior.get('fechaLlegada')?.value;
      let fechaSalidaRegreso = fechaLlegadaAnterior;
      if (!fechaSalidaRegreso) {
        fechaSalidaRegreso = new Date().toISOString().split('T')[0];
      }

      
      if (esInternacionalDestinoAnterior && ciudadDestinoAnterior) {
        destinoActual.patchValue({
          departamentoSalida: '',
          municipioSalida: '',
          ciudadSalida: ciudadDestinoAnterior,
          fechaSalida: fechaSalidaRegreso
        }, { emitEvent: false });
      } else if (!esInternacionalDestinoAnterior && departamentoDestinoAnterior && municipioDestinoAnterior) {
        
        destinoActual.patchValue({
          departamentoSalida: departamentoDestinoAnterior,
          ciudadSalida: '',
          fechaSalida: fechaSalidaRegreso,
          esInternacional: false
        }, { emitEvent: false });

        this.ubicacionesService.getMunicipiosByDepartamento(departamentoDestinoAnterior).subscribe({
          next: (municipios) => {
            if (!this.municipiosDestinos['salida_' + index]) {
              this.municipiosDestinos['salida_' + index] = [];
            }
            this.municipiosDestinos['salida_' + index] = municipios;

            destinoActual.patchValue({
              municipioSalida: municipioDestinoAnterior
            }, { emitEvent: false });
          }
        });
      }

    
      if (esInternacionalOrigenAnterior && ciudadOrigenAnterior) {
        destinoActual.patchValue({
          departamento: '',
          municipio: '',
          ciudad: ciudadOrigenAnterior,
          esInternacional: true
        }, { emitEvent: false });

        this.messageService.add({
          severity: 'success',
          summary: 'Regreso Configurado',
          detail: `Regreso configurado hacia ${ciudadOrigenAnterior} con tarifas del municipio de salida`,
          life: 4000
        });

        // Copiar solo valores unitarios del destino anterior (sin marcar conceptos ni calcular días)
        setTimeout(() => {
          this.copiarValoresUnitariosDestinoAnterior(index);
        }, 800);
      } else if (!esInternacionalOrigenAnterior && departamentoOrigenAnterior && municipioOrigenAnterior) {
        destinoActual.patchValue({
          departamento: departamentoOrigenAnterior,
          ciudad: '',
          esInternacional: false
        }, { emitEvent: false });

        this.ubicacionesService.getMunicipiosByDepartamento(departamentoOrigenAnterior).subscribe({
          next: (municipios) => {
            if (!this.municipiosDestinos[index]) {
              this.municipiosDestinos[index] = [];
            }
            this.municipiosDestinos[index] = municipios;

            destinoActual.patchValue({
              municipio: municipioOrigenAnterior
            }, { emitEvent: false });

            const municipioSalidaNombre = this.municipiosDestinos['salida_' + index]?.find((m: any) => m.id === municipioDestinoAnterior)?.nombre || municipioDestinoAnterior;
            const municipioLlegadaNombre = municipios.find((m: any) => m.id === municipioOrigenAnterior)?.nombre || municipioOrigenAnterior;

            this.messageService.add({
              severity: 'success',
              summary: 'Regreso Configurado',
              detail: `Regreso desde ${municipioSalidaNombre} hacia ${municipioLlegadaNombre} con tarifas del origen`,
              life: 4000
            });

            // Copiar solo valores unitarios del destino anterior (sin marcar conceptos ni calcular días)
            setTimeout(() => {
              this.copiarValoresUnitariosDestinoAnterior(index);
            }, 1000);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudieron cargar los municipios del destino'
            });
          }
        });
      }

    } else if (!esRegreso) {
      const destinoActual = this.destinosFormArray.at(index) as FormGroup;
      
      // Limpiar SOLO los campos del destino de llegada (NO los de salida)
      // Esto permite que al re-marcar el checkbox, tengamos los datos de origen disponibles
      destinoActual.patchValue({
        departamento: '',
        municipio: '',
        ciudad: '',
        fechaLlegada: ''
      }, { emitEvent: false });

      // Limpiar las tarifas/liquidación del destino
      this.limpiarLiquidacionDestino(index);
      
      this.messageService.add({
        severity: 'info',
        summary: 'Destino Reiniciado',
        detail: 'Los datos de llegada y tarifas del destino han sido limpiados',
        life: 3000
      });
    }
  }

  // Calcula días entre dos fechas (INCLUYE día de llegada)
  private calcularDiasEntrefechas(fechaSalida: string, fechaLlegada: string): number {
    if (!fechaSalida || !fechaLlegada) return 0;

    const salida = new Date(fechaSalida);
    const llegada = new Date(fechaLlegada);
    const diffTime = llegada.getTime() - salida.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 0;
    }
  
    // Incluir el día de llegada (+1)
    return diffDays + 1;
  }

  // Calcula noches entre dos fechas (días - 1)
  private calcularNochesEntrefechas(fechaSalida: string, fechaLlegada: string): number {
    const dias = this.calcularDiasEntrefechas(fechaSalida, fechaLlegada);
    // Las noches son siempre 1 día menos que los días, mínimo 0
    return dias > 1 ? dias - 1 : 0;
  }

  // Obtiene el nombre de un municipio dado su ID y la clave del diccionario
  private obtenerNombreMunicipio(municipioId: string, clave: string): string {
    const municipios = this.municipiosDestinos[clave];
    if (municipios) {
      const municipio = municipios.find((m: any) => m.id === municipioId);
      return municipio?.nombre || municipioId;
    }
    return municipioId;
  }

  // Copia solo los valores unitarios del destino anterior (para regreso al origen)
  private copiarValoresUnitariosDestinoAnterior(indexDestino: number): void {
    if (indexDestino <= 0) {
      return;
    }

    const destinoAnterior = this.destinosFormArray.at(indexDestino - 1) as FormGroup;
    const destinoActual = this.destinosFormArray.at(indexDestino) as FormGroup;

    if (!destinoAnterior || !destinoActual) {
      return;
    }

    const liquidacionAnterior = destinoAnterior.get('liquidacion') as FormGroup;
    let liquidacionActual = destinoActual.get('liquidacion') as FormGroup;

    if (!liquidacionAnterior || Object.keys(liquidacionAnterior.controls).length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Datos',
        detail: 'El destino anterior no tiene tarifas configuradas para copiar',
        life: 4000
      });
      return;
    }

    if (!liquidacionActual || Object.keys(liquidacionActual.controls).length === 0) {
      this.inicializarLiquidacionDestino(indexDestino);
      liquidacionActual = destinoActual.get('liquidacion') as FormGroup;
    }

   
    // Copiar valores unitarios, días y códigos de concepto (para que el regreso tenga los mismos valores que la ida)
    let conceptosCopiados = 0;
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoAnterior = liquidacionAnterior.get(concepto.id.toString()) as FormGroup;
      const conceptoActual = liquidacionActual.get(concepto.id.toString()) as FormGroup;

      if (conceptoAnterior && conceptoActual) {
        const valorUnitarioAnterior = conceptoAnterior.get('valorUnitario')?.value;
        const conceptoCodigoAnterior = conceptoAnterior.get('conceptoCodigo')?.value;
        const diasAnterior = conceptoAnterior.get('dias')?.value || 0;
        const marcadoAnterior = conceptoAnterior.get('marcado')?.value || false;

        if (valorUnitarioAnterior && valorUnitarioAnterior > 0) {
          conceptoActual.patchValue({
            marcado: marcadoAnterior,           // Copiar el estado de marcado
            dias: diasAnterior,                 // SÍ copiar días del destino anterior
            valorUnitario: valorUnitarioAnterior,
            porcentajePago: 100,
            subtotal: 0,                        // Se calculará al marcar
            conceptoCodigo: conceptoCodigoAnterior,
            tipoConcepto: concepto.label
          }, { emitEvent: false });
          
          // Si está marcado, calcular subtotal inmediatamente
          if (marcadoAnterior && diasAnterior > 0) {
            this.calcularSubtotalConceptoDestino(indexDestino, concepto.id);
          }
          
          conceptosCopiados++;
        }
      }
    });

    
    // Calcular el valor parcial del destino después de copiar
    this.calcularValorParcialDestino(indexDestino);

    this.messageService.add({
      severity: 'success',
      summary: 'Regreso Configurado',
      detail: `Se copiaron los valores y cantidades del destino anterior (${conceptosCopiados} conceptos). El regreso tiene las mismas tarifas que la ida.`,
      life: 4000
    });
  }

  // Calcula días para un destino específico - Uso en template (incluye día de llegada)
  public calcularDiasDestino(fechaSalida: any, fechaLlegada: any, index?: number): number {
    if (!fechaSalida || !fechaLlegada) return 0;

    // Validar si las fechas son objetos Date o strings
    let salida: Date;
    let llegada: Date;

    if (fechaSalida instanceof Date) {
      salida = fechaSalida;
    } else {
      salida = new Date(fechaSalida);
    }

    if (fechaLlegada instanceof Date) {
      llegada = fechaLlegada;
    } else {
      llegada = new Date(fechaLlegada);
    }

    // Normalizar fechas a medianoche para calcular días calendarios
    salida.setHours(0, 0, 0, 0);
    llegada.setHours(0, 0, 0, 0);

    // Calcular la diferencia en días
    const diffTime = llegada.getTime() - salida.getTime();
    const unDia = 24 * 60 * 60 * 1000;
    const diferencia = Math.floor(diffTime / unDia);
    
    // Aplicar ajuste por fecha compartida si se proporciona el índice
    let ajustePorFechaCompartida = 0;
    if (index !== undefined && index > 0 && this.destinosFormArray) {
      const destinoAnterior = this.destinosFormArray.at(index - 1);
      const fechaLlegadaAnterior = destinoAnterior?.get('fechaLlegada')?.value;
      
      if (fechaLlegadaAnterior) {
        const llegadaAnterior = new Date(fechaLlegadaAnterior);
        llegadaAnterior.setHours(0, 0, 0, 0);
        salida.setHours(0, 0, 0, 0);
        
        // Comparar solo la fecha (día/mes/año)
        if (salida.getTime() === llegadaAnterior.getTime()) {
          ajustePorFechaCompartida = 1;
        }
      }
    }
    
    // Días = diferencia + 1 (incluye día de salida y llegada) - ajuste
    const diasCalculados = Math.max(1, diferencia + 1 - ajustePorFechaCompartida);
    return diasCalculados;
  }

  // Calcula noches para un destino específico - Uso en template (día de llegada incluido)
  public calcularNochesDestino(fechaSalida: any, fechaLlegada: any, index?: number): number {
    if (!fechaSalida || !fechaLlegada) return 0;

    // Validar si las fechas son objetos Date o strings
    let salida: Date;
    let llegada: Date;

    if (fechaSalida instanceof Date) {
      salida = fechaSalida;
    } else {
      salida = new Date(fechaSalida);
    }

    if (fechaLlegada instanceof Date) {
      llegada = fechaLlegada;
    } else {
      llegada = new Date(fechaLlegada);
    }

    // Normalizar fechas a medianoche para calcular días calendarios
    salida.setHours(0, 0, 0, 0);
    llegada.setHours(0, 0, 0, 0);

    const diffTime = llegada.getTime() - salida.getTime();
    const unDia = 24 * 60 * 60 * 1000;
    const diferencia = Math.floor(diffTime / unDia);
    
    // Aplicar ajuste por fecha compartida si se proporciona el índice
    let ajustePorFechaCompartida = 0;
    if (index !== undefined && index > 0 && this.destinosFormArray) {
      const destinoAnterior = this.destinosFormArray.at(index - 1);
      const fechaLlegadaAnterior = destinoAnterior?.get('fechaLlegada')?.value;
      
      if (fechaLlegadaAnterior) {
        const llegadaAnterior = new Date(fechaLlegadaAnterior);
        llegadaAnterior.setHours(0, 0, 0, 0);
        const salidaTemp = new Date(fechaSalida);
        salidaTemp.setHours(0, 0, 0, 0);
        
        // Comparar solo la fecha (día/mes/año)
        if (salidaTemp.getTime() === llegadaAnterior.getTime()) {
          ajustePorFechaCompartida = 1;
        }
      }
    }
    
    // Calcular noches con ajuste
    if (ajustePorFechaCompartida === 0) {
      // Sin ajuste: noches = diferencia (ej: 20 a 22 = 2 días diferencia = 2 noches)
      return diferencia;
    } else {
      // Con ajuste: las noches se mantienen = diferencia
      // Ej: 22/02 a 24/02 = 2 días de diferencia = 2 noches (22-23 y 23-24)
      return diferencia;
    }
  }

  // Carga tarifa para un concepto específico
  private cargarTarifaConceptoEspecifico(index: number, concepto: { codigo: string; id: number; label: string; mostrarDias: boolean }): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const categoriaCodigo = this.viaticosForm.get('categoriaCodigo')?.value;

    if (!categoriaCodigo) {
      this.mostrarMensaje('warn', 'Seleccione una categoría primero');
      return;
    }

    const esInternacional = destinoGroup.get('esInternacional')?.value;
    const ubicacion = esInternacional
      ? destinoGroup.get('ciudad')?.value
      : destinoGroup.get('municipio')?.value;

    if (!ubicacion) {
      this.mostrarMensaje('warn', 'Seleccione un destino primero');
      return;
    }

    const fechaSalida = destinoGroup.get('fechaSalida')?.value;
    const fechaLlegada = destinoGroup.get('fechaLlegada')?.value;

    if (!fechaSalida || !fechaLlegada) {
      this.mostrarMensaje('warn', 'Ingrese las fechas del tramo');
      return;
    }

    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';

    const categoriaCodigoBD = this.categoriasMap[categoriaCodigo] || categoriaCodigo;
    const tipoViaticoBD = this.tiposViaticosMap[tipoViatico.toLowerCase()] || tipoViatico.toUpperCase();

    let nombreUbicacion = '';
    if (esInternacional) {
      const ciudades = this.ciudadesPorDepartamentoInt[index];
      if (ciudades) {
        const ciudadData = ciudades.find(c => c.id === ubicacion);
        nombreUbicacion = ciudadData?.nombre || ubicacion;
      } else {
        nombreUbicacion = ubicacion;
      }
    } else {
      const municipioData = this.municipiosDestinos[index]?.find((m: { id: string }) => m.id === ubicacion);
      nombreUbicacion = municipioData?.nombre || ubicacion;
    }

    this.tarifasService.getTarifasSimplificadasParaDestino(nombreUbicacion, categoriaCodigoBD, tipoViaticoBD).subscribe({
      next: (tarifasSimplificadas) => {
        if (Object.keys(tarifasSimplificadas).length === 0) {
          this.mostrarMensaje('warn', `No se encontraron tarifas para ${nombreUbicacion}`);
          return;
        }

        this.aplicarTarifaConceptoEspecifico(index, concepto, tarifasSimplificadas, fechaSalida, fechaLlegada);
      },
      error: () => {
        this.mostrarMensaje('error', 'Error al cargar tarifa');
      }
    });
  }

  // Aplica tarifa calculada a concepto específico
  private aplicarTarifaConceptoEspecifico(
    index: number,
    concepto: { codigo: string; id: number; label: string; mostrarDias: boolean },
    tarifasSimplificadas: { [conceptoCodigo: string]: number },
    fechaSalida: string | Date,
    fechaLlegada: string | Date
  ): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const categoriaCodigo = this.viaticosForm.get('categoriaCodigo')?.value;

    if (!categoriaCodigo) {
      this.mostrarMensaje('warn', 'Seleccione una categoría primero');
      return;
    }

    const ubicacion = this.obtenerNombreUbicacionDestino(index);
    if (!ubicacion) {
      this.mostrarMensaje('warn', 'Seleccione un destino válido');
      return;
    }

    let fechaLlegadaAnterior: string | undefined;
    if (index > 0) {
      const destinoAnterior = this.destinosFormArray.at(index - 1) as FormGroup;
      const fechaAnterior = destinoAnterior.get('fechaLlegada')?.value;
      if (fechaAnterior) {
        fechaLlegadaAnterior = new Date(fechaAnterior).toISOString();
      }
    }

    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';
    const liquidacionGroup = destinoGroup.get('liquidacion') as FormGroup;
    const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
    const porcentajeActual = conceptoGroup?.get('porcentajePago')?.value;
    const request: CalcularConceptoEspecificoRequest = {
      categoriaCodigo: this.categoriasMap[categoriaCodigo] || categoriaCodigo,
      tipoViatico: (this.tiposViaticosMap[tipoViatico.toLowerCase()] || tipoViatico.toUpperCase()) as 'OCASIONAL' | 'PERMANENTE',
      nombreUbicacion: ubicacion,
      codigoConcepto: concepto.codigo,
      fechaSalida: new Date(fechaSalida).toISOString(),
      fechaLlegada: new Date(fechaLlegada).toISOString(),
      fechaLlegadaDestinoAnterior: fechaLlegadaAnterior,
      porcentajeDescuento: porcentajeActual !== null && porcentajeActual !== undefined ? porcentajeActual : 100
    };

    this.tarifasService.calcularConceptoEspecifico(request).subscribe({
      next: (response) => {
        this.aplicarRespuestaCalculoConcepto(index, concepto.id, response);
      },
      error: (error) => {
        this.mostrarMensaje('error', `No se encontró la tarifa para ${concepto.label}`);
      }
    });
  }

 // Aplica respuesta de cálculo a concepto
  private aplicarRespuestaCalculoConcepto(
    index: number,
    conceptoId: number,
    response: CalcularConceptoEspecificoResponse
  ): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destinoGroup.get('liquidacion') as FormGroup;
    const conceptoGroup = liquidacionGroup.get(conceptoId.toString()) as FormGroup;

    if (!conceptoGroup) {
      return;
    }

  
    conceptoGroup.patchValue({
      valorUnitario: response.valorUnitario,
      dias: response.cantidad,
      porcentaje: response.porcentaje,
      subtotal: response.subtotal
    }, { emitEvent: false });

    this.calcularValorParcialDestino(index);
    this.actualizarValorTotalGlobal();
  }

  
  // Obtiene nombre de ubicación del destino
  private obtenerNombreUbicacionDestino(index: number): string | null {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const esInternacional = destinoGroup.get('esInternacional')?.value;

    if (esInternacional) {
      const ciudadId = destinoGroup.get('ciudad')?.value;
      if (!ciudadId) return null;
      
      const ciudad = this.ciudadesPorDepartamentoInt[index]?.find(c => c.id === ciudadId);
      return ciudad?.nombre || null;
    } else {
      const municipioId = destinoGroup.get('municipio')?.value;
      if (!municipioId) return null;
      
      const municipio = this.municipiosDestinos[index]?.find(m => m.id === municipioId);
      return municipio?.nombre || null;
    }
  }


  // Calcula tarifas para un destino específico
  calcularTarifasDestino(index: number): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const categoriaCodigo = this.viaticosForm.get('categoriaCodigo')?.value;

    if (!categoriaCodigo) {
      this.mostrarMensaje('warn', 'Seleccione una categoría primero');
      return;
    }

    const esInternacional = destinoGroup.get('esInternacional')?.value;
    const ubicacion = esInternacional
      ? destinoGroup.get('ciudad')?.value
      : destinoGroup.get('municipio')?.value;

    if (!ubicacion) {
      this.mostrarMensaje('warn', 'Seleccione un destino primero');
      return;
    }

    const fechaSalida = destinoGroup.get('fechaSalida')?.value;
    const fechaLlegada = destinoGroup.get('fechaLlegada')?.value;

    if (!fechaSalida || !fechaLlegada) {
      this.mostrarMensaje('warn', 'Ingrese las fechas del tramo');
      return;
    }

    const tipoViatico = this.viaticosForm.get('tipoViaticos')?.value || 'ocasional';
    const categoriaCodigoBD = this.categoriasMap[categoriaCodigo] || categoriaCodigo;
    const tipoViaticoBD = this.tiposViaticosMap[tipoViatico.toLowerCase()] || tipoViatico.toUpperCase();
    let nombreUbicacion = '';
    if (esInternacional) {
      nombreUbicacion = ubicacion; 
    } else {
      const municipioData = this.municipiosDestinos[index]?.find((m: { id: string }) => m.id === ubicacion);
      nombreUbicacion = municipioData?.nombre || ubicacion;
    }

    this.loadingTarifa = true;
    this.tarifasService.getTarifasSimplificadasParaDestino(nombreUbicacion, categoriaCodigoBD, tipoViaticoBD).subscribe({
      next: (tarifasSimplificadas) => {
        this.loadingTarifa = false;

        if (Object.keys(tarifasSimplificadas).length === 0) {
          this.mostrarMensaje('warn', `No se encontraron tarifas para ${nombreUbicacion}`);
          return;
        }

        // Aplica tarifas simplificadas a destino
        this.aplicarTarifasADestino(index, tarifasSimplificadas, fechaSalida, fechaLlegada);
        this.actualizarValorParcialDestino(index);
        this.actualizarValorTotalGlobal();
        this.mostrarMensaje('success', `Tarifas cargadas para tramo ${index + 1}`);
      },
      error: () => {
        this.loadingTarifa = false;
        this.mostrarMensaje('error', 'Error al cargar tarifas');
      }
    });
  }

  // Aplica tarifas obtenidas a los conceptos del destino
  private aplicarTarifasADestino(
    index: number,
    tarifasSimplificadas: { [conceptoCodigo: string]: number },
    fechaSalida: string | Date,
    fechaLlegada: string | Date
  ): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destinoGroup.get('liquidacion') as FormGroup;
    const salida = new Date(fechaSalida);
    const llegada = new Date(fechaLlegada);
    
    // Normalizar fechas a medianoche para calcular días calendarios
    salida.setHours(0, 0, 0, 0);
    llegada.setHours(0, 0, 0, 0);
    
    const unDia = 24 * 60 * 60 * 1000;
    const diferencia = Math.floor((llegada.getTime() - salida.getTime()) / unDia);
    
    let ajustePorFechaCompartida = 0;
    if (index > 0) {
      const destinoAnterior = this.destinosFormArray.at(index - 1) as FormGroup;
      const fechaLlegadaAnterior = destinoAnterior.get('fechaLlegada')?.value;

      if (fechaLlegadaAnterior) {
        const llegadaAnterior = new Date(fechaLlegadaAnterior);
        llegadaAnterior.setHours(0, 0, 0, 0);
        // Comparar solo la fecha (día/mes/año)
        if (salida.getTime() === llegadaAnterior.getTime()) {
          ajustePorFechaCompartida = 1;
        }
      }
    }

   
    const diasAlimentacion = Math.max(1, diferencia + 1 - ajustePorFechaCompartida);
    let diasHospedaje: number;
    if (ajustePorFechaCompartida === 0) {
      // Sin ajuste: noches = diferencia (ej: del 20 al 22 = 2 días diferencia = 2 noches)
      diasHospedaje = diferencia;
    } else {
      // Con ajuste: las noches se mantienen igual a la diferencia
      // Ej: 22/02 a 24/02 = 2 días de diferencia = 2 noches (22-23 y 23-24)
      diasHospedaje = diferencia;
    }

    this.conceptosLiquidacion.forEach((concepto) => {
      let valorUnitario = tarifasSimplificadas[concepto.codigo];

      if (valorUnitario === undefined && this.conceptosTarifasMap[concepto.codigo]) {
        const codigoTarifa = this.conceptosTarifasMap[concepto.codigo];
        valorUnitario = tarifasSimplificadas[codigoTarifa];
      }

      if (valorUnitario !== undefined) {
        if (!liquidacionGroup.get(concepto.id.toString())) {
          const nuevoConceptoGroup = this.fb.group({
            codigo: [concepto.codigo],
            nombre: [concepto.label],
            marcado: [false],
            dias: [0],
            valorUnitario: [0],
            porcentajePago: [100, [Validators.min(0), Validators.max(100)]],
            subtotal: [0],
            observaciones: ['']
          });

          liquidacionGroup.addControl(concepto.id.toString(), nuevoConceptoGroup);
          nuevoConceptoGroup.get('porcentajePago')?.valueChanges.subscribe(valor => {
            if (valor !== null && valor !== undefined) {
              if (valor > 100) {
                nuevoConceptoGroup.get('porcentajePago')?.setValue(100, { emitEvent: false });
              } else if (valor < 0) {
                nuevoConceptoGroup.get('porcentajePago')?.setValue(0, { emitEvent: false });
              }
            }
          });
        }

        const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
        let cantidadParaCalculo: number;
        const esTransporte = concepto.codigo.includes('TRANS');
        const esHospedaje = concepto.codigo.includes('HOSP') || concepto.codigo.includes('ALOJ');

        if (esTransporte) {
          cantidadParaCalculo = 1; 
        } else if (esHospedaje) {
          cantidadParaCalculo = diasHospedaje;
        } else {
          cantidadParaCalculo = diasAlimentacion; 
        }
        const porcentajeActual = conceptoGroup.get('porcentajePago')?.value;
        const porcentaje = (porcentajeActual !== null && porcentajeActual !== undefined) ? porcentajeActual : 100;
        const subtotalBase = valorUnitario * cantidadParaCalculo;
        const subtotal = (subtotalBase * porcentaje) / 100;
        conceptoGroup.patchValue({
          valorUnitario: valorUnitario,
          dias: cantidadParaCalculo,
          porcentajePago: porcentaje,
          subtotal: subtotal
          
        });
      }
    });
  }

  // Actualiza valor parcial de un destino
  private actualizarValorParcialDestino(index: number): void {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destinoGroup.get('liquidacion') as FormGroup;

    let total = 0;
    Object.keys(liquidacionGroup.controls).forEach(key => {
      const conceptoGroup = liquidacionGroup.get(key) as FormGroup;
      if (conceptoGroup.get('marcado')?.value) {
        total += conceptoGroup.get('subtotal')?.value || 0;
      }
    });

    destinoGroup.patchValue({ valorParcial: total }, { emitEvent: false });
  }


  // Calcula valor total de la solicitud
  calcularValorTotalSolicitud(): number {
    return this.destinosFormArray.controls.reduce((sum, control) => {
      return sum + (control.get('valorParcial')?.value || 0);
    }, 0);
  }

  
  // Actualiza valor total global en el formulario
  private actualizarValorTotalGlobal(): void {
    const total = this.calcularValorTotalSolicitud();
    this.viaticosForm.patchValue({ valorTotalViaticos: total }, { emitEvent: false });
  }

  // Verifica si puede calcular tarifa para destino
  puedeCalcularTarifa(index: number): boolean {
    const destinoGroup = this.destinosFormArray.at(index) as FormGroup;
    const categoriaCodigo = this.viaticosForm.get('categoriaCodigo')?.value;
    const fechaSalida = destinoGroup.get('fechaSalida')?.value;
    const fechaLlegada = destinoGroup.get('fechaLlegada')?.value;
    const esInternacional = destinoGroup.get('esInternacional')?.value;

    const ubicacion = esInternacional
      ? destinoGroup.get('ciudad')?.value
      : destinoGroup.get('municipio')?.value;

    return !!categoriaCodigo && !!fechaSalida && !!fechaLlegada && !!ubicacion;
  }

  

  private predefinirNariñoPasto() {
    const interval = setInterval(() => {
      if (this.departamentos.length > 0 && !this.loadingDepartamentos) {
        clearInterval(interval);

        const narino = this.departamentos.find(d =>
          d.nombre.toLowerCase() === 'nariño'
        );

        if (narino) {
          this.viaticosForm.patchValue({
            departamentoSalida: narino.id
          });
          this.ubicacionesService.getMunicipiosByDepartamento(narino.id).subscribe({
            next: (municipios) => {
              this.municipiosSalida = municipios;

              const municipiosOrdenados = municipios.sort((a, b) => {
                if (a.nombre.toLowerCase() === 'pasto') return -1;
                if (b.nombre.toLowerCase() === 'pasto') return 1;
                return a.nombre.localeCompare(b.nombre);
              });

              this.municipiosSalidaOptions = municipiosOrdenados
                .map(m => ({ label: m.nombre, value: m.id }));

              const pasto = municipios.find(m =>
                m.nombre.toLowerCase() === 'pasto'
              );

              if (pasto) {
                this.viaticosForm.patchValue({
                  municipioSalida: pasto.id
                });
              }
            }
          });
        }
      }
    }, 100);

    setTimeout(() => clearInterval(interval), 5000);
  }

  // Reinicia formulario a estado inicial
  onReset() {
    this.viaticosForm.reset();
    this.viaticosForm.enable();
    this.viaticosForm.patchValue({ fechaElaboracion: this.fechaHoy, requiereTransporte: false, valorTotalViaticos: 0 });
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = this.viaticosForm.get(['liquidacion', concepto.id]) as FormGroup;
      conceptoGroup.patchValue({ marcado: false, dias: 0, valorUnitario: 0, subtotal: 0 });
    });

    this.archivosSoporte = [];
    this.viaticosForm.get('dv')?.disable();
    this.usuario = null;
    this.maxDateContrato = null;
    this.categoriaAsignada = null;
    this.borradorCargado = false;
    this.codigoBorradorCargado = null;
    this.idBorradorCargado = null;
    
    this.cargarUsuarioAutenticado();
    this.predefinirNariñoPasto();
  }

  // Marca todos los campos como tocados
  private markFormGroupTouched() {
    Object.keys(this.viaticosForm.controls).forEach(key => {
      this.viaticosForm.get(key)?.markAsTouched();
    });
  }

  // Verifica si un campo es inválido
  isFieldInvalid(fieldName: string): boolean {
    const field = this.viaticosForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Encuentra el primer campo inválido del formulario
  private encontrarPrimerCampoInvalido(): string | null {
    const controls = this.viaticosForm.controls;
    const camposOrdenados = [
      'nit',
      'primerApellido',
      'primerNombre',
      'tipoViaticos',
      'cargo',
      'fechaSalida',
      'departamentoSalida',
      'municipioSalida',
      'requiereTransporte',
      'conceptoViaje',
      'categoriaCodigo',
      'valorTotalViaticos',
      'centrosCosto',
      'fuenteFuncion'
    ];

    for (const fieldName of camposOrdenados) {
      const control = controls[fieldName];
      if (control && control.invalid) {
        return fieldName;
      }
    }

    for (const fieldName in controls) {
      if (controls[fieldName].invalid) {
        return fieldName;
      }
    }

    const destinosArray = this.destinosFormArray;
    if (destinosArray && destinosArray.invalid) {
      for (let i = 0; i < destinosArray.length; i++) {
        const destinoGroup = destinosArray.at(i);
        if (destinoGroup.invalid) {
          return `destino-${i}`;
        }
      }
    }

    return null;
  }

  // Obtiene listado de todos los campos inválidos
  private obtenerTodosCamposInvalidos(): string[] {
    const camposInvalidos: string[] = [];
    const controls = this.viaticosForm.controls;

    for (const fieldName in controls) {
      if (controls[fieldName].invalid) {
        camposInvalidos.push(fieldName);
      }
    }

    const destinosArray = this.destinosFormArray;
    if (destinosArray && destinosArray.invalid) {
      for (let i = 0; i < destinosArray.length; i++) {
        const destinoGroup = destinosArray.at(i);
        if (destinoGroup.invalid) {
          camposInvalidos.push(`destino-${i}`);
        }
      }
    }

    return camposInvalidos;
  }


  // Hace scroll al campo inválido
  private scrollToInvalidField(fieldName: string): void {
    try {
      if (fieldName.startsWith('destino-')) {
        const element = document.querySelector('.destinos-container');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      const fieldSelectors: Record<string, string> = {
        'nit': '[formControlName="nit"]',
        'primerApellido': '[formControlName="primerApellido"]',
        'primerNombre': '[formControlName="primerNombre"]',
        'tipoViaticos': '[formControlName="tipoViaticos"]',
        'cargo': '[formControlName="cargo"]',
        'fechaSalida': '[formControlName="fechaSalida"]',
        'departamentoSalida': '[formControlName="departamentoSalida"]',
        'municipioSalida': '[formControlName="municipioSalida"]',
        'requiereTransporte': '[formControlName="requiereTransporte"]',
        'conceptoViaje': '[formControlName="conceptoViaje"]',
        'categoriaCodigo': '[formControlName="categoriaCodigo"]',
        'valorTotalViaticos': '[formControlName="valorTotalViaticos"]',
        'centrosCosto': '[formControlName="centrosCosto"]',
        'fuenteFuncion': '[formControlName="fuenteFuncion"]'
      };

      const selector = fieldSelectors[fieldName];
      if (selector) {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const inputElement = element as HTMLElement;
            inputElement.focus();
          }, 500);
        }
      }
    } catch {
      //
    }
  }

  // Traduce nombre técnico a nombre legible
  private obtenerNombreCampo(fieldName: string): string {
    const nombresLegibles: Record<string, string> = {
      'nit': 'NIT / Identificación',
      'primerApellido': 'Primer Apellido',
      'primerNombre': 'Primer Nombre',
      'tipoViaticos': 'Tipo de Viáticos',
      'cargo': 'Cargo',
      'fechaSalida': 'Fecha de Salida',
      'departamentoSalida': 'Departamento de Salida',
      'municipioSalida': 'Municipio de Salida',
      'requiereTransporte': 'Requiere Transporte',
      'conceptoViaje': 'Concepto de Viaje',
      'categoriaCodigo': 'Categoría',
      'valorTotalViaticos': 'Valor Total de Viáticos',
      'centrosCosto': 'Centro(s) de Costo',
      'fuenteFuncion': 'Fuente de Función',
      'motivoViaje': 'Motivo del Viaje'
    };

    if (fieldName.startsWith('destino-')) {
      const index = fieldName.split('-')[1];
      return `Destino ${parseInt(index) + 1}`;
    }

    return nombresLegibles[fieldName] || fieldName;
  }

  // Maneja tecla Enter en campo NIT
  onNitEnter(event: Event) {
    event.preventDefault();
    this.buscarUsuario();
  }

  // Muestra mensaje toast al usuario
  mostrarMensaje(tipo: 'success' | 'info' | 'warn' | 'error', texto: string, titulo?: string) {
    this.messageService.add({
      severity: tipo,
      summary: titulo || this.obtenerTituloDefecto(tipo),
      detail: texto,
      life: 5000
    });
  }

  // Muestra mensaje de éxito personalizado
  mostrarMensajeExito(titulo: string, texto: string) {
    this.messageService.add({
      severity: 'success',
      summary: titulo,
      detail: texto,
      life: 6000
    });
  }

  // Cierra todos los mensajes activos
  cerrarMensaje() {
    this.messageService.clear();
  }

  // Obtiene título por defecto según tipo mensaje
  private obtenerTituloDefecto(tipo: string): string {
    const titulos: Record<string, string> = {
      success: '✓ Éxito',
      info: 'ℹ Información',
      warn: '⚠ Advertencia',
      error: '✕ Error'
    };
    return titulos[tipo] || 'Notificación';
  }

  // Validador para longitud de centros de costo
  private validadorLongitudCentrosCosto(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value || control.value.length === 0) {
        return null; 
      }

      const centrosCosto = control.value as string[];
      const nombresCentros: string[] = [];

      centrosCosto.forEach(codigoCentro => {
        const centroEncontrado = this.centrosCostoOptions.find(c => c.value === codigoCentro);
        if (centroEncontrado) {
          const partes = centroEncontrado.label.split(' - ');
          if (partes.length > 1) {
            nombresCentros.push(partes.slice(1).join(' - '));
          } else {
            nombresCentros.push(centroEncontrado.label);
          }
        } else {
          nombresCentros.push(codigoCentro);
        }
      });

      const nombreCompleto = nombresCentros.join(' | ');
      
      if (nombreCompleto.length > this.MAX_LENGTH_NOMBRE_CENTRO_COSTO) {
        return { 
          longitudExcedida: { 
            longitudActual: nombreCompleto.length,
            longitudMaxima: this.MAX_LENGTH_NOMBRE_CENTRO_COSTO
          }
        };
      }

      return null;
    };
  }

  // Genera tooltip para botón de envío
  getTooltipBoton(): string {
    if (this.guardandoSolicitud) return 'Guardando solicitud en el servidor...';
    if (this.viaticosForm.invalid) return 'Complete todos los campos requeridos para enviar la solicitud';
    return 'Haga clic para enviar la solicitud de viáticos';
  }

  // Maneja selección de archivos de soporte
  onArchivosSeleccionados(archivos: File[]) {
    if (archivos && archivos.length > 0) {
      this.archivosSoporte = [...archivos];
      this.mostrarMensaje('info', `${archivos.length} archivo(s) seleccionado(s). Se subirán al guardar.`);
    }
  }

  // Guarda archivos en base de datos
  private guardarArchivosEnBaseDatos(archivos: File[], onSuccess?: () => void, codigoSolicitud?: string) {
    const nit = this.viaticosForm.get('nit')?.value;

    if (!nit || nit.trim() === '') {
      this.mostrarMensaje('warn', 'Debe ingresar el NIT del usuario antes de subir archivos');
      this.guardandoSolicitud = false;
      this.guardandoBorrador = false;
      return;
    }

    const archivosInvalidos = archivos.filter(file => !this.archivosUsuariosService.validarTamanioArchivo(file));
    if (archivosInvalidos.length > 0) {
      const nombresInvalidos = archivosInvalidos.map(f => `${f.name} (${this.archivosUsuariosService.formatearTamanio(f.size)})`).join(', ');
      this.mostrarMensaje('error', `Los siguientes archivos exceden el tamaño máximo de 20MB: ${nombresInvalidos}`);
      this.guardandoSolicitud = false;
      this.guardandoBorrador = false;
      return;
    }
    const subidasObservables = archivos.map(file =>
      this.archivosUsuariosService.subirArchivo(file, nit.trim(), codigoSolicitud)
    );

    forkJoin(subidasObservables).subscribe({
      next: (archivosGuardados) => {
        const nuevosIds = archivosGuardados
          .map(archivo => archivo.id)
          .filter((id): id is number => id !== undefined && id !== null);
        this.archivosGuardadosIds = [...this.archivosGuardadosIds, ...nuevosIds];

        const mensaje = archivosGuardados.length === 1
          ? 'Archivo guardado correctamente'
          : `${archivosGuardados.length} archivos guardados correctamente`;

        this.mostrarMensaje('success', mensaje);
        this.archivosSoporte = [];

        if (onSuccess) {
          onSuccess();
        }
      },
      error: () => {
        this.mostrarMensaje('error', 'Error al guardar los archivos. Por favor intente nuevamente.');
        this.guardandoSolicitud = false;
        this.guardandoBorrador = false;
      }
    });
  }

  // Guarda archivos con código de solicitud asignado
  private guardarArchivosConCodigoSolicitud(archivos: File[], codigoSolicitud: string): Observable<ArchivosUsuarios[]> {
    const nit = this.viaticosForm.get('nit')?.value;

    if (!nit || nit.trim() === '') {
      return of([]);
    }

    const subidasObservables = archivos.map(file => {
      return this.archivosUsuariosService.subirArchivo(file, nit.trim(), codigoSolicitud).pipe(
        catchError((error: unknown) => {
          throw error;
        })
      );
    });

    return forkJoin(subidasObservables);
  }

  // Maneja entrada de valor unitario de conceptos
  onValorUnitarioInput(event: Event, conceptoId: string | number): void {
    const input = event.target as HTMLInputElement;
    const valorSinFormato = input.value.replace(/[^0-9]/g, '');
    const valorNumerico = parseInt(valorSinFormato, 10) || 0;

    const conceptoGroup = this.viaticosForm.get(['liquidacion', conceptoId.toString()]) as FormGroup;
    if (conceptoGroup) {
      conceptoGroup.patchValue({ valorUnitario: valorNumerico }, { emitEvent: true });
    }
  }

  // Maneja cambio de viaje internacional
  onViajeInternacionalChange(esInternacional: boolean): void {
    this.esViajeInternacional = esInternacional;

    if (esInternacional) {
      this.viaticosForm.get('departamentoDestino')?.disable();
      this.viaticosForm.get('municipioDestino')?.disable();
      this.viaticosForm.get('departamentoDestino')?.clearValidators();
      this.viaticosForm.get('municipioDestino')?.clearValidators();
      this.viaticosForm.get('ciudadInternacional')?.enable();
      this.viaticosForm.get('ciudadInternacional')?.setValidators([Validators.required]);
      this.viaticosForm.patchValue({
        departamentoDestino: '',
        municipioDestino: ''
      }, { emitEvent: false });
    } else {
      this.viaticosForm.get('departamentoDestino')?.enable();
      this.viaticosForm.get('municipioDestino')?.enable();
      this.viaticosForm.get('departamentoDestino')?.setValidators([Validators.required]);
      this.viaticosForm.get('municipioDestino')?.setValidators([Validators.required]);
      this.viaticosForm.get('ciudadInternacional')?.disable();
      this.viaticosForm.get('ciudadInternacional')?.clearValidators();
      this.viaticosForm.patchValue({
        ciudadInternacional: ''
      }, { emitEvent: false });
    }
    this.viaticosForm.get('departamentoDestino')?.updateValueAndValidity();
    this.viaticosForm.get('municipioDestino')?.updateValueAndValidity();
    this.viaticosForm.get('ciudadInternacional')?.updateValueAndValidity();
    this.limpiarLiquidacion();
  }

 
  // Abre diálogo de liquidación para un destino
  abrirDialogoLiquidacion(index: number): void {
    if (!this.conceptosLiquidacion || this.conceptosLiquidacion.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Los conceptos de liquidación aún no se han cargado. Por favor, espere un momento.'
      });
      return;
    }

    this.destinoSeleccionadoIndex = index;
    const destino = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;
    const necesitaInicializacion = !liquidacionGroup || Object.keys(liquidacionGroup.controls).length === 0;
    if (necesitaInicializacion) {
      this.inicializarLiquidacionDestino(index);
     
    }

    // ✅ Sincronizar días de transporte con número de noches al abrir el diálogo
    this.sincronizarTransportesConNoches(index);

    this.mostrarDialogoLiquidacion = true;
  }

  // Cierra diálogo de liquidación
  cerrarDialogoLiquidacion(): void {
    this.mostrarDialogoLiquidacion = false;
    this.destinoSeleccionadoIndex = -1;
    this.calcularLiquidacionGlobal();
  }

  // Inicializa estructura de liquidación para destino
  private inicializarLiquidacionDestino(index: number): void {
    const destino = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = this.fb.group({});
    this.conceptosLiquidacion.forEach(concepto => {
      liquidacionGroup.addControl(concepto.id.toString(), this.fb.group({
        marcado: [false],
        dias: [0],
        valorUnitario: [0],
        porcentajePago: [100],
        subtotal: [0],
        conceptoCodigo: [''],
        tipoConcepto: [concepto.label],
        otroConcepto: ['']
      }));
    });

    destino.setControl('liquidacion', liquidacionGroup);
    this.setupLiquidacionDestinoWatchers(index);
  }

  // Limpia todas las tarifas de un destino específico
  private limpiarLiquidacionDestino(index: number): void {
    const destino = this.destinosFormArray.at(index) as FormGroup;
    if (!destino) return;

    const liquidacionGroup = destino.get('liquidacion') as FormGroup;
    if (!liquidacionGroup || Object.keys(liquidacionGroup.controls).length === 0) {
      return;
    }

    // Limpiar cada concepto de liquidación
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
      if (conceptoGroup) {
        conceptoGroup.patchValue({
          marcado: false,
          dias: 0,
          valorUnitario: 0,
          porcentajePago: 100,
          subtotal: 0,
          conceptoCodigo: '',
          otroConcepto: ''
        }, { emitEvent: false });
      }
    });

    // Recalcular valores
    this.calcularValorParcialDestino(index);
    this.calcularLiquidacionGlobal();
  }

  // Configura observadores de cambios en liquidación
  private setupLiquidacionDestinoWatchers(index: number): void {
    const destino = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;

    // Watcher para calcular días automáticamente cuando cambien las fechas
    const calcularDiasAutomatico = () => {
      // NO recalcular días automáticamente si es un destino de regreso
      // porque debe usar los mismos días del destino anterior
      const esRegresoAlOrigen = destino.get('esRegresoAlOrigen')?.value;
      if (esRegresoAlOrigen) {
        return;
      }

      const fechaSalida = destino.get('fechaSalida')?.value;
      const fechaLlegada = destino.get('fechaLlegada')?.value;

      if (fechaSalida && fechaLlegada) {
        // Usar los métodos con ajuste por fechas compartidas
        const dias = this.calcularDiasDestino(fechaSalida, fechaLlegada, index);
        const noches = this.calcularNochesDestino(fechaSalida, fechaLlegada, index);
        
        // ✅ Sincronizar transportes con noches cuando cambien las fechas
        this.sincronizarTransportesConNoches(index);

        // Para conceptos editables que tengan valor unitario pero no días, calcularlos
        this.conceptosLiquidacion.forEach(concepto => {
          // Solo procesar conceptos editables (no transportes/alimentación/hospedaje)
          const esNoEditable = this.esConceptoNoEditable(concepto);
          if (esNoEditable) return; // Los no editables ya fueron manejados por sincronizarTransportesConNoches
          
          const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
          const valorUnitario = conceptoGroup.get('valorUnitario')?.value || 0;
          const diasActuales = conceptoGroup.get('dias')?.value || 0;
          
          // Solo actualizar si tiene valor unitario pero no tiene días
          if (valorUnitario > 0 && diasActuales === 0) {
            // Para conceptos editables: usar días o noches según el tipo
            const cantidadCalculada = concepto.mostrarDias ? dias : noches;
            conceptoGroup.patchValue({
              dias: cantidadCalculada
            }, { emitEvent: true }); // emitEvent: true para que calcule el subtotal si está marcado
            const tipoMedida = concepto.mostrarDias ? 'días' : 'noches';
          }
        });
      }
    };

    // Suscribir watchers de fechas
    destino.get('fechaSalida')?.valueChanges.subscribe(() => calcularDiasAutomatico());
    destino.get('fechaLlegada')?.valueChanges.subscribe(() => calcularDiasAutomatico());

    // Watchers de conceptos individuales
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
      const conceptoData = this.conceptosLiquidacionData.find(c => c.id === concepto.id);
      const nombreConcepto = conceptoData?.nombre?.toUpperCase() || '';
      conceptoGroup.get('dias')?.valueChanges.subscribe((dias) => {
        this.calcularSubtotalConceptoDestino(index, concepto.id);
        if (nombreConcepto.includes('ALIMENTACION') && dias === 1) {
          this.sincronizarHospedajeConAlimentacionDestino(index, dias);
        }
      });

      conceptoGroup.get('valorUnitario')?.valueChanges.subscribe(() => {
        this.calcularSubtotalConceptoDestino(index, concepto.id);
      });

      conceptoGroup.get('porcentajePago')?.valueChanges.subscribe(() => {
        this.calcularSubtotalConceptoDestino(index, concepto.id);
      });
      conceptoGroup.get('marcado')?.valueChanges.subscribe((marcado: boolean) => {
        if (!marcado) {
          // Al desmarcar, resetear días, valor unitario y subtotal (limpiar todo)
          conceptoGroup.patchValue({
            dias: 0,
            valorUnitario: 0,
            subtotal: 0
          }, { emitEvent: false });
        } else {
          // Al marcar un concepto
          if (nombreConcepto.includes('ALIMENTACION')) {
            const diasActuales = conceptoGroup.get('dias')?.value || 0;
            if (diasActuales === 1) {
              this.sincronizarHospedajeConAlimentacionDestino(index, diasActuales);
            }
          }
          
          // Si ya tiene valorUnitario, calcular subtotal
          const valorUnitarioActual = conceptoGroup.get('valorUnitario')?.value || 0;
          const diasActuales = conceptoGroup.get('dias')?.value || 0;
          
          if (valorUnitarioActual > 0) {
            // Si tiene valor pero no tiene días, intentar calcularlos de las fechas
            if (diasActuales === 0) {
              const fechaSalida = destino.get('fechaSalida')?.value;
              const fechaLlegada = destino.get('fechaLlegada')?.value;
              
              if (fechaSalida && fechaLlegada) {
                // Para conceptos no editables, sincronizarTransportesConNoches se encargará
                // Para conceptos editables, calcular según el tipo
                const esNoEditable = this.esConceptoNoEditable(concepto);
                
                if (!esNoEditable) {
                  // Solo para conceptos editables calcular aquí
                  // Usar métodos con ajuste por fechas compartidas
                  const cantidadCalculada = concepto.mostrarDias 
                    ? this.calcularDiasDestino(fechaSalida, fechaLlegada, index)
                    : this.calcularNochesDestino(fechaSalida, fechaLlegada, index);
                  conceptoGroup.patchValue({ dias: cantidadCalculada }, { emitEvent: true });
                }
              }
            }
            // Ya tiene valor y días, calcular subtotal
            this.calcularSubtotalConceptoDestino(index, concepto.id);
          } else {
            // No tiene valor unitario, cargarlo del backend
            this.cargarTarifaConceptoEspecifico(index, concepto);
          }
          
          // ✅ SINCRONIZAR: Después de marcar, ajustar días de transportes/alimentación/hospedaje
          setTimeout(() => {
            this.sincronizarTransportesConNoches(index);
          }, 100); // Pequeño delay para que la tarifa se cargue primero
        }
      });
    });
  }


  // Calcula subtotal de un concepto en destino
  private calcularSubtotalConceptoDestino(indexDestino: number, conceptoId: number): void {
    const destino = this.destinosFormArray.at(indexDestino) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;
    const conceptoGroup = liquidacionGroup.get(conceptoId.toString()) as FormGroup;
    const dias = Number(conceptoGroup.get('dias')?.value) || 0;
    const valorUnitario = Number(conceptoGroup.get('valorUnitario')?.value) || 0;
    const porcentaje = Number(conceptoGroup.get('porcentajePago')?.value) || 100;
    const subtotalBase = dias * valorUnitario;
    const subtotal = (subtotalBase * porcentaje) / 100;
    conceptoGroup.patchValue({ subtotal }, { emitEvent: false });
    this.calcularValorParcialDestino(indexDestino);
  }


  // Calcula valor parcial sumando conceptos marcados
  private calcularValorParcialDestino(index: number): void {
    const destino = this.destinosFormArray.at(index) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;

    let total = 0;
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
      const marcado = conceptoGroup.get('marcado')?.value;
      const subtotal = Number(conceptoGroup.get('subtotal')?.value) || 0;

      if (marcado) {
        total += subtotal;
      }
    });

    destino.patchValue({ valorParcial: total }, { emitEvent: false });
  }

  // Sincroniza hospedaje cuando alimentación es un día
  private sincronizarHospedajeConAlimentacionDestino(destinoIndex: number, diasAlimentacion: number): void {
    if (diasAlimentacion !== 1) return;
    const destino = this.destinosFormArray.at(destinoIndex) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;
    if (!liquidacionGroup) return;
    const conceptoAlimentacion = this.conceptosLiquidacionData.find(c =>
      c.nombre?.toUpperCase().includes('ALIMENTACION')
    );
    const conceptoHospedaje = this.conceptosLiquidacionData.find(c =>
      c.nombre?.toUpperCase().includes('HOSPEDAJE')
    );

    if (!conceptoAlimentacion || !conceptoHospedaje) return;

    const alimentacionGroup = liquidacionGroup.get(conceptoAlimentacion.id.toString()) as FormGroup;
    const hospedajeGroup = liquidacionGroup.get(conceptoHospedaje.id.toString()) as FormGroup;

    if (!alimentacionGroup || !hospedajeGroup) return;

    const alimentacionMarcado = alimentacionGroup.get('marcado')?.value;
    if (alimentacionMarcado) {
      const diasActualesHospedaje = hospedajeGroup.get('dias')?.value || 0;

      if (diasActualesHospedaje === 0) {
        hospedajeGroup.get('dias')?.setValue(1, { emitEvent: true });
        hospedajeGroup.get('marcado')?.setValue(true, { emitEvent: false });
      }
    }
  }

  /**
   * ✅ Sincroniza los días de los conceptos según las reglas de negocio:
   * - Transporte Interno (TINT): noches
   * - Alimentación: días
   * - Hospedaje: noches
   * Los demás transportes (aéreo, terrestre) se dejan en 1 día por defecto (editables)
   * @param destinoIndex Índice del destino en el FormArray
   */
  private sincronizarTransportesConNoches(destinoIndex: number): void {
    const destino = this.destinosFormArray.at(destinoIndex) as FormGroup;
    const liquidacionGroup = destino.get('liquidacion') as FormGroup;
    
    if (!liquidacionGroup) return;

    // Calcular número de días y noches del viaje
    const fechaSalida = destino.get('fechaSalida')?.value;
    const fechaLlegada = destino.get('fechaLlegada')?.value;
    
    if (!fechaSalida || !fechaLlegada) {
      return;
    }

    // Usar los métodos con ajuste por fechas compartidas
    const dias = this.calcularDiasDestino(fechaSalida, fechaLlegada, destinoIndex);
    const noches = this.calcularNochesDestino(fechaSalida, fechaLlegada, destinoIndex);
  
    // Actualizar SOLO los conceptos que se auto-calculan:
    // - Transporte Interno (TINT): noches
    // - Alimentación: días
    // - Hospedaje: noches
    // Transportes Aéreo y Terrestre NO se auto-calculan (quedan en su valor por defecto)
    this.conceptosLiquidacion.forEach(concepto => {
      const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
      if (!conceptoGroup) return;
      
      const marcado = conceptoGroup.get('marcado')?.value;
      const diasActuales = conceptoGroup.get('dias')?.value || 0;
      
      // Solo actualizar si está marcado o tiene días configurados
      if (!marcado && diasActuales === 0) return;
      
      const labelUpper = concepto.label.toUpperCase();
      const codigoUpper = concepto.codigo.toUpperCase();
      
      // ✅ TRANSPORTE INTERNO (TINT) - usar NOCHES
      if (codigoUpper.includes('TRANS_INTERNO') ||
          codigoUpper.includes('_TINT') ||
          codigoUpper === 'TINT' ||
          (labelUpper.includes('TRANSPORTE') && labelUpper.includes('INTERNO'))) {
        conceptoGroup.patchValue({ dias: noches }, { emitEvent: true });
      }
      // ✅ ALIMENTACIÓN - usar DÍAS
      else if (labelUpper.includes('ALIMENTACION') || labelUpper.includes('ALIMENTACIÓN') || 
          codigoUpper.includes('_ALIM') || codigoUpper.includes('ALIM_')) {
        conceptoGroup.patchValue({ dias: dias }, { emitEvent: true });
      }
      // ✅ HOSPEDAJE - usar NOCHES
      else if (codigoUpper.includes('HOSPEDAJE') || labelUpper.includes('HOSPEDAJE')) {
        conceptoGroup.patchValue({ dias: noches }, { emitEvent: true });
      }
      // Transportes Aéreo, Terrestre y otros NO se sincronizan (quedan en su valor)
    });
  }

  // Obtiene liquidación del destino actualmente seleccionado
  getLiquidacionDestinoActual(): FormGroup | null {
    if (this.destinoSeleccionadoIndex < 0) return null;
    const destino = this.destinosFormArray.at(this.destinoSeleccionadoIndex) as FormGroup;
    return destino.get('liquidacion') as FormGroup;
  }

  // Obtiene valor parcial del destino actual
  getValorParcialDestinoActual(): number {
    if (this.destinoSeleccionadoIndex < 0) return 0;
    const destino = this.destinosFormArray.at(this.destinoSeleccionadoIndex) as FormGroup;
    return Number(destino.get('valorParcial')?.value) || 0;
  }

  /**
   * ✅ Determina si un concepto es de transporte
   * Los conceptos de transporte tienen sus días fijados automáticamente al número de noches
   * @param concepto Concepto de liquidación
   * @returns true si es un concepto de transporte
   */
  esConceptoTransporte(concepto: { codigo: string; label: string }): boolean {
    const codigoUpper = concepto.codigo.toUpperCase();
    const labelUpper = concepto.label.toUpperCase();
    
    // Verificar por código
    if (codigoUpper.includes('_TRANS_') ||
        codigoUpper.includes('TRANS_AEREO') ||
        codigoUpper.includes('TRANS_TERRESTRE') ||
        codigoUpper.includes('TRANS_URBANO') ||
        codigoUpper.includes('TRANS_INTERNO') ||
        codigoUpper.includes('_TINT') ||
        codigoUpper === 'TINT' ||
        codigoUpper.includes('_TURB') ||
        codigoUpper === 'TURB') {
      return true;
    }
    
    // Verificar por label (nombre del concepto)
    if (labelUpper.includes('TRANSPORTE')) {
      return true;
    }
    
    return false;
  }

  /**
   * ✅ Determina si un concepto NO debe ser editable
   * Los siguientes conceptos tienen días no editables:
   * - TODOS los transportes EXCEPTO Transporte Urbano
   * - Alimentación
   * - Hospedaje
   * SOLO Transporte Urbano es editable
   * @param concepto Concepto de liquidación
   * @returns true si el concepto NO debe ser editable
   */
  esConceptoNoEditable(concepto: { codigo: string; label: string }): boolean {
    const codigoUpper = concepto.codigo.toUpperCase();
    const labelUpper = concepto.label.toUpperCase();
    
    // TRANSPORTE URBANO sí es editable (excepción)
    if (codigoUpper.includes('TRANS_URBANO') ||
        codigoUpper.includes('_TURB') ||
        codigoUpper === 'TURB' ||
        (labelUpper.includes('TRANSPORTE') && labelUpper.includes('URBANO'))) {
      return false; // ES EDITABLE
    }
    
    // TODOS los demás transportes NO son editables
    if (this.esConceptoTransporte(concepto)) {
      return true; // NO ES EDITABLE
    }
    
    // ALIMENTACIÓN no es editable
    if (codigoUpper.includes('ALIMENTACION') || 
        codigoUpper.includes('_ALIM') ||
        codigoUpper.includes('ALIM_') ||
        labelUpper.includes('ALIMENTACIÓN') ||
        labelUpper.includes('ALIMENTACION')) {
      return true;
    }
    
    // HOSPEDAJE no es editable
    if (codigoUpper.includes('HOSPEDAJE') || 
        labelUpper.includes('HOSPEDAJE')) {
      return true;
    }
    
    return false;
  }

  /**
   * ✅ Determina si el VALOR UNITARIO de un concepto NO debe ser editable
   * Los siguientes conceptos tienen valor unitario no editable:
   * - TODOS los transportes (incluido TRANSPORTE URBANO)
   * - Alimentación
   * - Hospedaje
   * @param concepto Concepto de liquidación
   * @returns true si el valor unitario NO debe ser editable
   */
  esValorUnitarioNoEditable(concepto: { codigo: string; label: string }): boolean {
    const codigoUpper = concepto.codigo.toUpperCase();
    const labelUpper = concepto.label.toUpperCase();
    
    // TODOS los transportes tienen valor unitario no editable (incluido urbano)
    if (this.esConceptoTransporte(concepto)) {
      return true;
    }
    
    // ALIMENTACIÓN tiene valor unitario no editable
    if (codigoUpper.includes('ALIMENTACION') || 
        labelUpper.includes('ALIMENTACIÓN') ||
        labelUpper.includes('ALIMENTACION')) {
      return true;
    }
    
    // HOSPEDAJE tiene valor unitario no editable
    if (codigoUpper.includes('HOSPEDAJE') || 
        labelUpper.includes('HOSPEDAJE')) {
      return true;
    }
    
    return false;
  }

  // Calcula liquidación global sumando todos los destinos
  calcularLiquidacionGlobal(): void {
    const conceptosTotales: Record<string, number> = {};

    this.conceptosLiquidacion.forEach(concepto => {
      conceptosTotales[concepto.label] = 0;
    });

    for (let i = 0; i < this.destinosFormArray.length; i++) {
      const destino = this.destinosFormArray.at(i) as FormGroup;
      const liquidacionGroup = destino.get('liquidacion') as FormGroup;

      if (liquidacionGroup) {
        this.conceptosLiquidacion.forEach(concepto => {
          const conceptoGroup = liquidacionGroup.get(concepto.id.toString()) as FormGroup;
          if (conceptoGroup) {
            const marcado = conceptoGroup.get('marcado')?.value;
            const subtotal = Number(conceptoGroup.get('subtotal')?.value) || 0;

            if (marcado && subtotal > 0) {
              conceptosTotales[concepto.label] += subtotal;
            }
          }
        });
      }
    }

    this.liquidacionGlobalCalculada = Object.entries(conceptosTotales)
      .filter(([, total]) => total > 0)
      .map(([concepto, subtotal]) => ({ concepto, subtotal }));
    
    // ✅ CRÍTICO: Actualizar el valor total en el formulario después del cálculo
    this.actualizarValorTotalGlobal();
  }

  // Obtiene valor total global de la liquidación
  getValorTotalGlobal(): number {
    return this.liquidacionGlobalCalculada.reduce((sum, item) => sum + item.subtotal, 0);
  }
}
