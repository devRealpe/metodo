import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, forkJoin, map } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { RadioButtonModule } from 'primeng/radiobutton';
import { 
  TituloSelectComponent,
  InputComponent,
  SelectComponent,
  DatepickerComponent
} from '@microfrontends/shared-ui';

import { CvViewerComponent } from '../../shared/components/cv-viewer/cv-viewer.component';
import { EnviarCorreoDialogComponent } from '../../shared/components/enviar-correo-dialog/enviar-correo-dialog.component';

import { PersonasService } from '../../core/services/personas.service';
import { InformacionAcademicaService } from '../../core/services/info-academica.service';
import { InfoLaboralService } from '../../core/services/info-laboral.service';
import { DocumentoSoporteService } from '../../core/services/documento-soporte.service';
import { CentrosCostoOracleService } from '../../core/services/centros-costo-oracle.service';
import { AfiliacionesService } from '../../core/services/afiliaciones.service';
import { 
  ListasValoresService, 
  UbicacionesGeograficasService,
  OracleInstitucionesService,
  FileAttachmentService,
  EmailNotificationService,
  NotificationManagementService
} from '@microfrontends/shared-services';
import { Persona } from '../../core/models/persona.model';
import { InformacionAcademica } from '../../core/models/informacion-academica.model';
import { InfoLaboral } from '../../core/models/info-laboral.model';
import { DocumentoSoporte } from '../../core/models/documento-soporte.model';
import { Afiliacion } from '../../core/models/afiliacion.model';
import { PostulacionSeleccionada } from '../../core/models/postulacion-seleccionada.model';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { DropdownItem, ListasValoresDto, UbicacionesGeograficasDto } from '@microfrontends/shared-models';

@Component({
  selector: 'app-visor-hoja-vida',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    ButtonModule,
    CardModule,
    TabsModule,
    ProgressSpinnerModule,
    DialogModule,
    TagModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    CheckboxModule,
    AutoCompleteModule,
    RadioButtonModule,
    TituloSelectComponent,
    InputComponent,
    SelectComponent,
    DatepickerComponent,
    CvViewerComponent,
    EnviarCorreoDialogComponent
  ],
  providers: [MessageService],
  templateUrl: './visor-hoja-vida.component.html',
  styleUrls: ['./visor-hoja-vida.component.scss']
})
export class VisorHojaVidaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  personaId: string = '';
  persona: Persona | null = null;
  informacionAcademica: InformacionAcademica[] = [];
  informacionLaboral: InfoLaboral[] = [];
  documentosSoporte: DocumentoSoporte[] = [];
  afiliaciones: Afiliacion[] = [];
  
  candidato: PostulacionSeleccionada | null = null;
  convocatoria: OfertaLaboral | null = null;
  
  loading = false;
  guardando = false;
  modoEdicion = false;
  mostrarCvViewer = false;
  mostrarDialogoCorreo = false;

  formPersonal!: FormGroup;
  formAcademicaEdit: { [key: string]: FormGroup } = {};
  formLaboralEdit: { [key: string]: FormGroup } = {};
  formAfiliacionesEdit: { [key: string]: FormGroup } = {};

  tiposTitulo: DropdownItem[] = [];
  modalidades: DropdownItem[] = [];
  paises: DropdownItem[] = [];
  departamentos: DropdownItem[] = [];
  ciudades: DropdownItem[] = [];
  instituciones: DropdownItem[] = [];
  institucionesFiltered: DropdownItem[] = [];
  isPrecargandoDatos = false;
  paisColombiaId: string = '';

  tiposDocumento: DropdownItem[] = [];
  generos: DropdownItem[] = [];
  estadosCiviles: DropdownItem[] = [];
  etnias: DropdownItem[] = [];
  nacionalidades: DropdownItem[] = [];
  libretasMilitares: DropdownItem[] = [];
  filiacionPoliticas: DropdownItem[] = [];
  estratos: DropdownItem[] = [];
  areas: DropdownItem[] = [];
  discapacidades: DropdownItem[] = [];
  centrosCosto: any[] = []; 
  paisesExpedicion: DropdownItem[] = [];
  departamentosExpedicion: DropdownItem[] = [];
  ciudadesExpedicion: DropdownItem[] = [];
  paisesNacimiento: DropdownItem[] = [];
  departamentosNacimiento: DropdownItem[] = [];
  ciudadesNacimiento: DropdownItem[] = [];
  paisesResidencia: DropdownItem[] = [];
  departamentosResidencia: DropdownItem[] = [];
  ciudadesResidencia: DropdownItem[] = [];

  tiposExperiencia: DropdownItem[] = [];
  paisesLaboral: DropdownItem[] = [];
  departamentosLaboral: DropdownItem[] = [];
  ciudadesLaboral: DropdownItem[] = [];
  esColombiaLaboral: boolean = false;

  tiposAfiliacion: ListasValoresDto[] = [];
  entidadesAfiliacion: ListasValoresDto[] = [];
  administradorasFiltradas: { [key: string]: ListasValoresDto[] } = {};
  isLoadingAdministradoras: { [key: string]: boolean } = {};
  today = new Date();

  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private personasService: PersonasService,
    private infoAcademicaService: InformacionAcademicaService,
    private infoLaboralService: InfoLaboralService,
    private documentoSoporteService: DocumentoSoporteService,
    private listasValoresService: ListasValoresService,
    private ubicacionesService: UbicacionesGeograficasService,
    private institucionesService: OracleInstitucionesService,
    private centrosCostoService: CentrosCostoOracleService,
    private fileAttachmentService: FileAttachmentService,
    private afiliacionesService: AfiliacionesService,
    private emailService: EmailNotificationService,
    private notificationService: NotificationManagementService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.inicializarFormularios();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.personaId = params['personaId'];
      
      if (!this.personaId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ID de persona no proporcionado',
          life: 3000
        });
        this.volver();
        return;
      }

      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        this.candidato = navigation.extras.state['candidato'];
        this.convocatoria = navigation.extras.state['convocatoria'];
      }

      this.cargarDatosPersona();
    });
  }

  inicializarFormularios(): void {
    this.formPersonal = this.fb.group({
      primerNombre: [''],
      segundoNombre: [''],
      primerApellido: [''],
      segundoApellido: [''],
      tipoDocumento: [''],
      identificacion: [''],
      paisExpedicion: [''],
      departamentoExpedicion: [''],
      ciudadExpedicion: [''],
      fechaExpedicion: [''],
      fechaNacimiento: [''],
      paisNacimiento: [''],
      departamentoNacimiento: [''],
      ciudadNacimiento: [''],
      genero: [''],
      estadoCivil: [''],
      etnia: [''],
      nacionalidad: [''],
      tieneDiscapacidad: [false],
      discapacidad: [''],
      victimaConflicto: [false],
      filiacionPolitica: [''],
      libretaMilitar: [''],
      paisResidencia: [''],
      departamentoResidencia: [''],
      ciudadResidencia: [''],
      barrio: [''],
      direccion: [''],
      sector: [''],
      estrato: [''],
      telefono: [''],
      correo: [''],
      celular1: [''],
      celular2: [''],
      aspiracionSalario: [''],
      area: [''],
      trabajoActual: [false],
      hojaVidaPresentada: [false],
      trabajaUniversidad: [false],
      correoInstitucional: [''],
      cargoUniversidad: [''],
      dependencia: [''],
      egresadoUniversidad: [false]
    });
    
    this.setupFormPersonalSubscriptions();
  }

  private findInDropdown(items: DropdownItem[], nombre: string | null | undefined, dropdownName: string = ''): string {
    if (!nombre || nombre.trim() === '') {
      return '';
    }
    const normalize = (s: string) => s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const target = normalize(nombre);

    let found = items.find(item => normalize(item.nombre) === target);

    if (!found) {
      found = items.find(item => normalize(item.nombre).startsWith(target));
    }

    if (!found) {
      found = items.find(item => normalize(item.nombre).includes(target));
    }

    if (!found) {
      return '';
    }
    return found.id;
  }

  async cargarDatosEnFormulario(): Promise<void> {
    if (!this.persona) return;
    const tipoDocumentoId = this.findInDropdown(this.tiposDocumento, this.persona.tipoDocumento, 'Tipo Documento');
    const generoId = this.findInDropdown(this.generos, this.persona.genero, 'Género');
    const estadoCivilId = this.findInDropdown(this.estadosCiviles, this.persona.estadoCivil, 'Estado Civil');
    const etniaId = this.findInDropdown(this.etnias, this.persona.etnia, 'Etnia');
    const nacionalidadId = this.findInDropdown(this.nacionalidades, this.persona.nacionalidad, 'Nacionalidad');
    const filiacionPoliticaId = this.findInDropdown(this.filiacionPoliticas, this.persona.filiacionPolitica || '', 'Filiación Política');
    const libretaMilitarId = this.findInDropdown(this.libretasMilitares, this.persona.libretaMilitar || '', 'Libreta Militar');
    const estratoId = this.findInDropdown(this.estratos, this.persona.estrato || '', 'Estrato');
    const areaId = this.findInDropdown(this.areas, this.persona.area || '', 'Área');

    this.formPersonal.patchValue({
      primerNombre: this.persona.primerNombre || '',
      segundoNombre: this.persona.segundoNombre || '',
      primerApellido: this.persona.primerApellido || '',
      segundoApellido: this.persona.segundoApellido || '',
      tipoDocumento: tipoDocumentoId,
      identificacion: this.persona.identificacion || '',
      fechaExpedicion: this.persona.fechaExpedicion ? new Date(this.persona.fechaExpedicion) : null,
      fechaNacimiento: this.persona.fechaNacimiento ? new Date(this.persona.fechaNacimiento) : null,
      genero: generoId,
      estadoCivil: estadoCivilId,
      etnia: etniaId,
      nacionalidad: nacionalidadId,
      tieneDiscapacidad: !!this.persona.discapacidad && this.persona.discapacidad !== '',
      discapacidad: this.persona.discapacidad || '',
      victimaConflicto: this.persona.victimaConflicto || false,
      filiacionPolitica: filiacionPoliticaId,
      libretaMilitar: libretaMilitarId,
      barrio: this.persona.barrio || '',
      direccion: this.persona.direccion || '',
      sector: this.persona.sector || '',
      estrato: estratoId,
      telefono: this.persona.telefono || '',
      correo: this.persona.correo || '',
      celular1: this.persona.celular1 || '',
      celular2: this.persona.celular2 || '',
      aspiracionSalario: this.persona.aspiracionSalario || '',
      area: areaId,
      trabajoActual: this.persona.trabajoActual || false,
      hojaVidaPresentada: this.persona.hojaVidaPresentada || false,
      trabajaUniversidad: this.persona.trabajaUniversidad || false,
      correoInstitucional: this.persona.correoInstitucional || '',
      cargoUniversidad: this.persona.cargoUniversidad || '',
      dependencia: this.persona.dependencia || '',
      egresadoUniversidad: this.persona.egresadoUniversidad || false
    });

    await this.cargarUbicacionesPersona();
  }

  cargarDatosPersona(): void {
    this.loading = true;

    forkJoin({
      persona: this.personasService.obtenerPersonaPorId(this.personaId),
      infoAcademica: this.infoAcademicaService.obtenerRegistros(this.personaId),
      infoLaboral: this.infoLaboralService.getAll(this.personaId),
      documentos: this.documentoSoporteService.getByUsuarioId(this.personaId),
      afiliaciones: this.afiliacionesService.getAfiliacionesPersonas(this.personaId),
      tiposAfiliacion: this.listasValoresService.getEntidadesAfiliacion().pipe(
        map((response: ListasValoresDto[]) =>
          response.filter(item => item.nombrePadre === 'Entidades')
        )
      ),
      entidadesAfiliacion: this.listasValoresService.getEntidadesAfiliacion(),
      tiposTitulo: this.listasValoresService.getDropdownByTipo('TTIT').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .filter(item => item.nombre !== 'Tipo de Título')
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      modalidades: this.listasValoresService.getDropdownByTipo('MOD').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      tiposExperiencia: this.listasValoresService.getDropdownByTipo('EXP').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null && item.nombre !== 'Tipo de Experiencia')
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      paises: this.ubicacionesService.getPaises().pipe(
        map((response: UbicacionesGeograficasDto[]) =>
          response.map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      tiposDocumento: this.listasValoresService.getDropdownByTipo('TDOC').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      generos: this.listasValoresService.getDropdownByTipo('GEN').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      estadosCiviles: this.listasValoresService.getDropdownByTipo('ECIV').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      etnias: this.listasValoresService.getDropdownByTipo('ETN').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      nacionalidades: this.listasValoresService.getDropdownByTipo('NAC').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      libretasMilitares: this.listasValoresService.getDropdownByTipo('MIL').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      filiacionPoliticas: this.listasValoresService.getDropdownByTipo('POLI').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      estratos: this.listasValoresService.getDropdownByTipo('EST').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      areas: this.listasValoresService.getDropdownByTipo('AREI').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      discapacidades: this.listasValoresService.getDropdownByTipo('DISC').pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(item => item.idPadre !== null)
            .map(item => ({ id: item.id, nombre: item.nombre }))
        )
      ),
      centrosCosto: this.centrosCostoService.getCentrosCostoActivos().pipe(
        map((response: any) => {
          let centros: any[] = [];
          if (Array.isArray(response)) {
            centros = response;
          } else if (response && typeof response === 'object') {
            centros = response.data || response.items || response.centrosCosto || response.content || [];
          }
          if (!Array.isArray(centros)) {
            return [];
          }
          return centros.sort((a, b) => a.nombreCentroCosto.localeCompare(b.nombreCentroCosto));
        })
      )
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (datos) => {
        this.persona = datos.persona;
        this.informacionAcademica = datos.infoAcademica;
        this.informacionLaboral = datos.infoLaboral;
        this.documentosSoporte = datos.documentos;
        this.afiliaciones = datos.afiliaciones;
        this.tiposAfiliacion = datos.tiposAfiliacion;
        this.entidadesAfiliacion = datos.entidadesAfiliacion;
        this.tiposTitulo = datos.tiposTitulo;
        this.modalidades = datos.modalidades;
        this.tiposExperiencia = datos.tiposExperiencia;
        this.paises = datos.paises;
        this.paisesLaboral = datos.paises;
        this.paisesExpedicion = datos.paises;
        this.paisesNacimiento = datos.paises;
        this.paisesResidencia = datos.paises;
        
        this.tiposDocumento = datos.tiposDocumento;
        this.generos = datos.generos;
        this.estadosCiviles = datos.estadosCiviles;
        this.etnias = datos.etnias;
        this.nacionalidades = datos.nacionalidades;
        this.libretasMilitares = datos.libretasMilitares;
        this.filiacionPoliticas = datos.filiacionPoliticas;
        this.estratos = datos.estratos;
        this.areas = datos.areas;
        this.discapacidades = datos.discapacidades;
        this.centrosCosto = datos.centrosCosto;
        
        const colombia = this.paises.find(p => p.nombre.toLowerCase() === 'colombia');
        if (colombia) {
          this.paisColombiaId = colombia.id;
        }
        
        this.cargarDatosEnFormulario();
        await this.crearFormulariosAcademicos();
        await this.crearFormulariosLaborales();
        await this.crearFormulariosAfiliaciones();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los datos de la persona',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  abrirCvViewer(): void {
    if (!this.persona?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'No se puede visualizar la hoja de vida',
        life: 3000
      });
      return;
    }
    this.mostrarCvViewer = true;
  }

  cerrarCvViewer(): void {
    this.mostrarCvViewer = false;
  }

  descargarArchivoPlano(): void {
    if (!this.persona?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'No se puede descargar el archivo: información de persona no disponible',
        life: 3000
      });
      return;
    }

    this.loading = true;

    this.personasService.descargarCsvPersona(this.persona.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const fecha = new Date().toISOString().split('T')[0];
        const nombrePersona = `${this.persona?.primerNombre}_${this.persona?.primerApellido}`.replace(/\s+/g, '_');
        link.download = `hoja_vida_${nombrePersona}_${fecha}.zip`;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Archivo ZIP con CSVs descargado correctamente',
          life: 3000
        });

        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo descargar el archivo ZIP',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  toggleModoEdicion(): void {
    this.modoEdicion = !this.modoEdicion;
    
    if (this.modoEdicion) {
      this.messageService.add({
        severity: 'info',
        summary: 'Modo Edición Activado',
        detail: 'Puede editar los campos directamente en esta vista',
        life: 3000
      });
    } else {
      this.cargarDatosEnFormulario();
      this.messageService.add({
        severity: 'info',
        summary: 'Modo Edición Desactivado',
        detail: 'Los cambios no guardados se han descartado',
        life: 3000
      });
    }
  }

  guardarInformacionPersonal(): void {
    if (this.formPersonal.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor complete los campos requeridos',
        life: 3000
      });
      return;
    }

    this.guardando = true;
    
    const formValue = this.formPersonal.value;
    
    const tipoDocumentoNombre = this.obtenerNombrePorId(this.tiposDocumento, formValue.tipoDocumento);
    const generoNombre = this.obtenerNombrePorId(this.generos, formValue.genero);
    const estadoCivilNombre = this.obtenerNombrePorId(this.estadosCiviles, formValue.estadoCivil);
    const etniaNombre = this.obtenerNombrePorId(this.etnias, formValue.etnia);
    const nacionalidadNombre = this.obtenerNombrePorId(this.nacionalidades, formValue.nacionalidad);
    const filiacionPoliticaNombre = this.obtenerNombrePorId(this.filiacionPoliticas, formValue.filiacionPolitica);
    const libretaMilitarNombre = this.obtenerNombrePorId(this.libretasMilitares, formValue.libretaMilitar);
    const estratoNombre = this.obtenerNombrePorId(this.estratos, formValue.estrato);
    const areaNombre = this.obtenerNombrePorId(this.areas, formValue.area);
    
    const paisExpedicionNombre = this.obtenerNombrePorId(this.paises, formValue.paisExpedicion) || this.persona?.paisExpedicion || '';
    const departamentoExpedicionNombre = this.obtenerNombrePorId(this.departamentosExpedicion, formValue.departamentoExpedicion) || this.persona?.departamentoExpedicion || '';
    const ciudadExpedicionNombre = this.obtenerNombrePorId(this.ciudadesExpedicion, formValue.ciudadExpedicion) || this.persona?.ciudadExpedicion || '';
    
    const paisNacimientoNombre = this.obtenerNombrePorId(this.paises, formValue.paisNacimiento) || this.persona?.paisNacimiento || '';
    const departamentoNacimientoNombre = this.obtenerNombrePorId(this.departamentosNacimiento, formValue.departamentoNacimiento) || this.persona?.departamentoNacimiento || '';
    const ciudadNacimientoNombre = this.obtenerNombrePorId(this.ciudadesNacimiento, formValue.ciudadNacimiento) || this.persona?.ciudadNacimiento || '';
    
    const paisResidenciaNombre = this.obtenerNombrePorId(this.paises, formValue.paisResidencia) || this.persona?.paisResidencia || '';
    const departamentoResidenciaNombre = this.obtenerNombrePorId(this.departamentosResidencia, formValue.departamentoResidencia) || this.persona?.departamentoResidencia || '';
    const ciudadResidenciaNombre = this.obtenerNombrePorId(this.ciudadesResidencia, formValue.ciudadResidencia) || this.persona?.ciudadResidencia || '';
    
    const personaActualizada: Persona = {
      ...this.persona,
      ...formValue,
      id: this.personaId,
      tipoDocumento: tipoDocumentoNombre,
      genero: generoNombre,
      estadoCivil: estadoCivilNombre,
      etnia: etniaNombre,
      nacionalidad: nacionalidadNombre,
      filiacionPolitica: filiacionPoliticaNombre,
      libretaMilitar: libretaMilitarNombre,
      estrato: estratoNombre,
      area: areaNombre,
      paisExpedicion: paisExpedicionNombre,
      departamentoExpedicion: departamentoExpedicionNombre,
      ciudadExpedicion: ciudadExpedicionNombre,
      paisNacimiento: paisNacimientoNombre,
      departamentoNacimiento: departamentoNacimientoNombre,
      ciudadNacimiento: ciudadNacimientoNombre,
      paisResidencia: paisResidenciaNombre,
      departamentoResidencia: departamentoResidenciaNombre,
      ciudadResidencia: ciudadResidenciaNombre
    };

    this.personasService.actualizarPersona(this.personaId, personaActualizada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.persona = response;
          this.guardando = false;
          this.modoEdicion = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Información personal actualizada correctamente',
            life: 3000
          });
        },
        error: (error) => {
          this.guardando = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la información personal',
            life: 5000
          });
        }
      });
  }

  editarInformacionPersonal(): void {
    this.modoEdicion = true;
  }

  editarInformacionAcademica(): void {
    this.modoEdicion = true;
  }

  async crearFormulariosAcademicos(): Promise<void> {
    this.formAcademicaEdit = {};
    
    for (const registro of this.informacionAcademica) {
      if (registro.id) {
        this.formAcademicaEdit[registro.id] = await this.crearFormularioAcademico(registro);
      }
    }
  }

  async crearFormularioAcademico(registro: InformacionAcademica): Promise<FormGroup> {
    const tipoTituloId = this.obtenerIdPorNombre(this.tiposTitulo, registro.tipoTitulo);
    const modalidadId = this.obtenerIdPorNombre(this.modalidades, registro.modalidad || '');

    let paisId = this.obtenerIdPorNombre(this.paises, registro.pais);
    
    if (this.uuidRegex.test(registro.pais)) {
      paisId = registro.pais;
    }

    let institucionObj: DropdownItem | null = null;
    if (registro.institucion) {
      try {
        let institucionApi;
        if (this.uuidRegex.test(registro.institucion)) {
          institucionApi = await this.institucionesService.getById(registro.institucion).toPromise();
        } else {
          institucionApi = await this.institucionesService.getByNombreExacto(registro.institucion).toPromise();
        }
        if (institucionApi) {
          institucionObj = {
            id: institucionApi.id,
            nombre: institucionApi.nombre,
            abreviatura: institucionApi.nombreTipoInstitucion || ''
          };
        }
      } catch (error) {
      }
    }

    const form = this.fb.group({
      tipoTitulo: [tipoTituloId || ''],
      titulo: [registro.titulo || ''],
      enCurso: [registro.enCurso || false],
      pais: [paisId || ''],
      departamento: [''],
      ciudad: [''],
      fechaInicio: [registro.fechaInicio ? new Date(registro.fechaInicio) : null],
      fechaGrado: [registro.fechaGrado ? new Date(registro.fechaGrado) : null],
      institucion: [institucionObj],
      modalidad: [modalidadId || ''],
      tarjetaProfesional: [registro.tarjetaProfesional || false],
      bachillerato: [registro.bachillerato || false],
      areaEducacion: [registro.areaEducacion || ''],
      numeroActa: [registro.numeroActa || ''],
      horasDuracion: [registro.horasDuracion || null],
      anosCursados: [registro.anosCursados || null],
      distinciones: [registro.distinciones || '']
    });

    form.get('enCurso')?.valueChanges.subscribe(enCurso => {
      const fechaGradoControl = form.get('fechaGrado');
      if (enCurso) {
        fechaGradoControl?.disable();
        fechaGradoControl?.setValue(new Date('9999-12-31'));
      } else {
        fechaGradoControl?.enable();
      }
    });

    form.get('pais')?.valueChanges.subscribe(paisId => {
      if (paisId) {
        this.cargarDepartamentos(paisId);
        form.get('departamento')?.setValue('');
        form.get('ciudad')?.setValue('');
        this.ciudades = [];
      }
    });

    form.get('departamento')?.valueChanges.subscribe(departamentoId => {
      if (departamentoId) {
        this.cargarCiudades(departamentoId);
        form.get('ciudad')?.setValue('');
      }
    });

    if (paisId && registro.ciudad) {
      let ciudadParaBuscar = registro.ciudad;
      if (registro.ciudad.includes(',')) {
        ciudadParaBuscar = registro.ciudad.split(',')[0].trim();
      }
      await this.cargarDepartamentosYCiudad(form, paisId, ciudadParaBuscar);
    }

    return form;
  }

  obtenerIdPorNombre(items: DropdownItem[], nombre: string): string {
    if (!nombre) return '';
    const nombreNormalizado = nombre.trim().toLowerCase();
    const item = items.find(i => i.nombre.trim().toLowerCase() === nombreNormalizado);
    return item?.id || '';
  }

  async cargarDepartamentosYCiudad(form: FormGroup, paisId: string, ciudadValor: string): Promise<void> {
    try {
      
      let ciudadId = '';
      let departamentoId = '';

      const todasUbicaciones = await this.ubicacionesService.getAllForDropdown().toPromise();
      
      const ciudad = todasUbicaciones?.find(u => {
        if (this.uuidRegex.test(ciudadValor)) {
          return u.id === ciudadValor;
        } else {
          return u.nombre?.toLowerCase().trim() === ciudadValor.toLowerCase().trim();
        }
      });
      
      
      if (ciudad && ciudad.idPadre) {
        ciudadId = ciudad.id;
        departamentoId = ciudad.idPadre;
        
        await this.cargarJerarquiaCompleta(paisId, departamentoId, ciudadId);
        
        form.get('departamento')?.setValue(departamentoId, { emitEvent: false });
        
        setTimeout(() => {
          form.patchValue({ ciudad: ciudadId }, { emitEvent: false });
        }, 100);
        
        setTimeout(() => {
          form.get('ciudad')?.setValue(ciudadId);
          this.cdr.detectChanges();
        }, 300);
      } else {
      }
    } catch (error) {
    }
  }

  private async cargarJerarquiaCompleta(paisId: string, departamentoId: string, ciudadId: string): Promise<void> {
    try {
      await new Promise<void>(resolve => {
        this.ubicacionesService.getByPadreForDropdown(paisId)
          .pipe(
            map((response: UbicacionesGeograficasDto[]) =>
              response.map(item => ({ id: item.id, nombre: item.nombre }))
            ),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (deps) => {
              this.departamentos = deps;
              resolve();
            },
            error: () => resolve()
          });
      });

      if (!this.departamentos.some(d => d.id === departamentoId)) {
        const departamento = await this.ubicacionesService.getById(departamentoId).toPromise();
        if (departamento) {
          this.departamentos.push({ id: departamento.id, nombre: departamento.nombre });
        }
      }

      const ciudades = await this.ubicacionesService.getByPadreForDropdown(departamentoId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map(item => ({ id: item.id, nombre: item.nombre }))
          )
        )
        .toPromise();
      
      if (ciudades) {
        this.ciudades = ciudades;
      }

      if (!this.ciudades.some(c => c.id === ciudadId)) {
        const ciudad = await this.ubicacionesService.getById(ciudadId).toPromise();
        if (ciudad) {
          this.ciudades.push({ id: ciudad.id, nombre: ciudad.nombre });
        }
      }
    } catch (error) {
    }
  }

  cargarDepartamentos(paisId: string): void {
    this.ubicacionesService.getByPadreForDropdown(paisId)
      .pipe(
        map((response: UbicacionesGeograficasDto[]) =>
          response.map(item => ({ id: item.id, nombre: item.nombre }))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (departamentos: DropdownItem[]) => {
          this.departamentos = departamentos;
        },
        error: (error) => {
        }
      });
  }

  cargarCiudades(departamentoId: string): void {
    this.ubicacionesService.getByPadreForDropdown(departamentoId)
      .pipe(
        map((response: UbicacionesGeograficasDto[]) =>
          response.map(item => ({ id: item.id, nombre: item.nombre }))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (ciudades: DropdownItem[]) => {
          this.ciudades = ciudades;
        },
        error: (error) => {
        }
      });
  }

  guardarInformacionAcademica(registroId: string): void {
    const form = this.formAcademicaEdit[registroId];
    
    if (!form || form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor complete los campos requeridos',
        life: 3000
      });
      return;
    }

    this.guardando = true;
    
    const formValue = form.value;
    
    const tipoTituloNombre = this.obtenerNombrePorId(this.tiposTitulo, formValue.tipoTitulo);
    const paisNombre = this.obtenerNombrePorId(this.paises, formValue.pais);
    const modalidadNombre = this.obtenerNombrePorId(this.modalidades, formValue.modalidad);
    
    const institucionId = formValue.institucion?.id || formValue.institucion;
    
    const departamentoNombre = this.obtenerNombrePorId(this.departamentos, formValue.departamento);
    const ciudadNombre = this.obtenerNombrePorId(this.ciudades, formValue.ciudad);
    const ciudadCompleta = departamentoNombre ? `${ciudadNombre}, ${departamentoNombre}` : ciudadNombre;
    
    const registroActualizado: InformacionAcademica = {
      ...formValue,
      id: registroId,
      tipoTitulo: tipoTituloNombre,
      pais: paisNombre,
      ciudad: ciudadCompleta,
      institucion: institucionId,
      modalidad: modalidadNombre,
      persona: { id: this.personaId }
    };

    this.infoAcademicaService.actualizarRegistro(registroActualizado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response) => {
          const institucionNombre = formValue.institucion?.nombre || formValue.institucion;
          
          const index = this.informacionAcademica.findIndex(r => r.id === registroId);
          if (index !== -1) {
            this.informacionAcademica[index] = {
              ...response,
              institucion: institucionNombre 
            };
          }
          
          await this.crearFormulariosAcademicos();
          
          this.guardando = false;
          this.modoEdicion = false;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Información académica actualizada correctamente',
            life: 3000
          });
        },
        error: (error) => {
          this.guardando = false;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la información académica',
            life: 5000
          });
        }
      });
  }

  obtenerNombrePorId(items: DropdownItem[], id: string): string {
    if (!id) return '';
    const item = items.find(i => i.id === id);
    return item?.nombre || '';
  }

  buscarInstituciones(query: string): void {
    if (!query || query.trim().length < 3) {
      this.institucionesFiltered = [];
      return;
    }

    this.institucionesService.searchByNombre(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (instituciones: any[]) => {
          this.institucionesFiltered = instituciones.map((inst: any) => ({
            id: inst.id,
            nombre: inst.nombre,
            abreviatura: inst.nombreTipoInstitucion || ''
          }));
        },
        error: (error: any) => {
          this.institucionesFiltered = [];
        }
      });
  }

  onInstitucionSelected(event: any): void {
  }

  onInstitucionCleared(): void {
    this.institucionesFiltered = [];
  }

  obtenerDepartamento(ciudad: string): string {
    if (!ciudad) return '-';
    
    if (ciudad.includes(',')) {
      const partes = ciudad.split(',');
      return partes.length > 1 ? partes[1].trim() : '-';
    }
    
    return '-';
  }

  obtenerCiudad(ciudad: string): string {
    if (!ciudad) return '-';
    
    if (ciudad.includes(',')) {
      const partes = ciudad.split(',');
      return partes[0].trim();
    }
    
    return ciudad;
  }

  async cancelarEdicionAcademica(registroId: string): Promise<void> {
    const registroOriginal = this.informacionAcademica.find(r => r.id === registroId);
    if (registroOriginal) {
      this.formAcademicaEdit[registroId] = await this.crearFormularioAcademico(registroOriginal);
    }
  }

  obtenerNombreTipoTitulo(codigo: string): string {
    const item = this.tiposTitulo.find(t => t.id === codigo);
    return item?.nombre || codigo;
  }

  obtenerNombreModalidad(codigo: string): string {
    const item = this.modalidades.find(m => m.id === codigo);
    return item?.nombre || codigo;
  }

  volver(): void {
    this.router.navigate(['/app/gestion-convocatorias-cerradas']);
  }

  editarInformacionLaboral(): void {
    this.modoEdicion = true;
  }

  async crearFormulariosLaborales(): Promise<void> {
    this.formLaboralEdit = {};
    
    for (const registro of this.informacionLaboral) {
      if (registro.id) {
        this.formLaboralEdit[registro.id] = await this.crearFormularioLaboral(registro);
      }
    }
  }

  async crearFormularioLaboral(registro: InfoLaboral): Promise<FormGroup> {
    let tipoExperienciaId = '';
    if (this.uuidRegex.test(registro.tipo_experiencia)) {
      tipoExperienciaId = registro.tipo_experiencia;
    } else {
      tipoExperienciaId = this.obtenerIdPorNombre(this.tiposExperiencia, registro.tipo_experiencia);
    }
    

    
    let paisId = '';
    
    if (this.uuidRegex.test(registro.pais)) {
      paisId = registro.pais;
    } else {
      paisId = this.obtenerIdPorNombre(this.paisesLaboral, registro.pais);
    }

    const form = this.fb.group({
      tipo_experiencia: [tipoExperienciaId || ''],
      nombreEmpresa: [registro.nombreEmpresa || ''],
      cargoDesempenado: [registro.cargoDesempenado || ''],
      vigente: [registro.vigente || false],
      fechaInicio: [registro.fechaInicio ? new Date(registro.fechaInicio) : null],
      fechaFin: [registro.fechaFin ? new Date(registro.fechaFin) : null],
      jefeInmediato: [registro.jefeInmediato || ''],
      pais: [paisId || ''],
      departamento: [''],
      ciudad: [''],
      direccion: [registro.direccion || ''],
      celular: [registro.celular || ''],
      correo: [registro.correo || ''],
      motivoRetiro: [registro.motivoRetiro || '']
    });

    form.get('vigente')?.valueChanges.subscribe(vigente => {
      const fechaFinControl = form.get('fechaFin');
      if (vigente) {
        fechaFinControl?.disable();
        fechaFinControl?.setValue(null);
      } else {
        fechaFinControl?.enable();
      }
    });

    if (paisId && registro.ciudad) {
      let ciudadParaBuscar = registro.ciudad;
      if (registro.ciudad.includes(',')) {
        ciudadParaBuscar = registro.ciudad.split(',')[0].trim();
      }
      await this.cargarDepartamentosYCiudadLaboral(form, paisId, ciudadParaBuscar);
    }

    return form;
  }

  async cargarDepartamentosYCiudadLaboral(form: FormGroup, paisId: string, ciudadValor: string): Promise<void> {
    try {
      let ciudadId = '';
      let departamentoId = '';

      const todasUbicaciones = await this.ubicacionesService.getAllForDropdown().toPromise();
      const ciudad = todasUbicaciones?.find(u => {
        if (this.uuidRegex.test(ciudadValor)) {
          return u.id === ciudadValor;
        } else {
          return u.nombre?.toLowerCase().trim() === ciudadValor.toLowerCase().trim();
        }
      });
      
      if (ciudad && ciudad.idPadre) {
        ciudadId = ciudad.id;
        departamentoId = ciudad.idPadre;
        
        await this.cargarJerarquiaCompletaLaboral(paisId, departamentoId, ciudadId);
        
        form.get('departamento')?.setValue(departamentoId, { emitEvent: false });
        
        setTimeout(() => {
          form.patchValue({ ciudad: ciudadId }, { emitEvent: false });
        }, 100);
        
        setTimeout(() => {
          form.get('ciudad')?.setValue(ciudadId);
          this.cdr.detectChanges();
        }, 300);
      }
    } catch (error) {
    }
  }

  private async cargarJerarquiaCompletaLaboral(paisId: string, departamentoId: string, ciudadId: string): Promise<void> {
    try {
      await new Promise<void>(resolve => {
        this.ubicacionesService.getByPadreForDropdown(paisId)
          .pipe(
            map((response: UbicacionesGeograficasDto[]) =>
              response.map(item => ({ id: item.id, nombre: item.nombre }))
            ),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (deps) => {
              this.departamentosLaboral = deps;
              resolve();
            },
            error: () => resolve()
          });
      });

      if (!this.departamentosLaboral.some(d => d.id === departamentoId)) {
        const departamento = await this.ubicacionesService.getById(departamentoId).toPromise();
        if (departamento) {
          this.departamentosLaboral.push({ id: departamento.id, nombre: departamento.nombre });
        }
      }

      const ciudades = await this.ubicacionesService.getByPadreForDropdown(departamentoId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map(item => ({ id: item.id, nombre: item.nombre }))
          )
        )
        .toPromise();
      
      if (ciudades) {
        this.ciudadesLaboral = ciudades;
      }

      if (!this.ciudadesLaboral.some(c => c.id === ciudadId)) {
        const ciudad = await this.ubicacionesService.getById(ciudadId).toPromise();
        if (ciudad) {
          this.ciudadesLaboral.push({ id: ciudad.id, nombre: ciudad.nombre });
        }
      }
    } catch (error) {
    }
  }

  guardarInformacionLaboral(registroId: string): void {
    const form = this.formLaboralEdit[registroId];
    
    if (!form || form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor complete los campos requeridos',
        life: 3000
      });
      return;
    }

    this.guardando = true;
    
    const formValue = form.value;
    
    const tipoExperienciaNombre = this.obtenerNombrePorId(this.tiposExperiencia, formValue.tipo_experiencia);
    const paisNombre = this.obtenerNombrePorId(this.paisesLaboral, formValue.pais);
    
    const departamentoNombre = this.obtenerNombrePorId(this.departamentosLaboral, formValue.departamento);
    const ciudadNombre = this.obtenerNombrePorId(this.ciudadesLaboral, formValue.ciudad);
    const ciudadCompleta = departamentoNombre ? `${ciudadNombre}, ${departamentoNombre}` : ciudadNombre;
    
    const registroActualizado: InfoLaboral = {
      ...formValue,
      id: registroId,
      tipo_experiencia: tipoExperienciaNombre,
      pais: paisNombre,
      ciudad: ciudadCompleta,
      persona: { id: this.personaId }
    };

    this.infoLaboralService.update(registroActualizado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response: InfoLaboral) => {
          const index = this.informacionLaboral.findIndex(r => r.id === registroId);
          if (index !== -1) {
            this.informacionLaboral[index] = {
              ...response,
              ciudad: ciudadCompleta, 
              pais: paisNombre 
            };
          }
          
          await this.crearFormulariosLaborales();
          
          this.guardando = false;
          this.modoEdicion = false;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Información laboral actualizada correctamente',
            life: 3000
          });
        },
        error: (error: any) => {
          this.guardando = false;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la información laboral',
            life: 5000
          });
        }
      });
  }

  async cancelarEdicionLaboral(registroId: string): Promise<void> {
    const registroOriginal = this.informacionLaboral.find(r => r.id === registroId);
    if (registroOriginal) {
      this.formLaboralEdit[registroId] = await this.crearFormularioLaboral(registroOriginal);
    }
  }

  private setupFormPersonalSubscriptions(): void {
    this.formPersonal.get('paisExpedicion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async paisId => {
        if (paisId) {
          await this.cargarDepartamentosPorPais(paisId, 'expedicion');
          this.formPersonal.patchValue({
            departamentoExpedicion: '',
            ciudadExpedicion: ''
          }, { emitEvent: false });
          this.ciudadesExpedicion = [];
        } else {
          this.departamentosExpedicion = [];
          this.ciudadesExpedicion = [];
        }
      });

    this.formPersonal.get('departamentoExpedicion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async departamentoId => {
        if (departamentoId) {
          await this.cargarCiudadesPorDepartamento(departamentoId, 'expedicion');
          this.formPersonal.patchValue({ ciudadExpedicion: '' }, { emitEvent: false });
        } else {
          this.ciudadesExpedicion = [];
        }
      });

    this.formPersonal.get('paisNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async paisId => {
        if (paisId) {
          await this.cargarDepartamentosPorPais(paisId, 'nacimiento');
          this.formPersonal.patchValue({
            departamentoNacimiento: '',
            ciudadNacimiento: ''
          }, { emitEvent: false });
          this.ciudadesNacimiento = [];
        } else {
          this.departamentosNacimiento = [];
          this.ciudadesNacimiento = [];
        }
      });

    this.formPersonal.get('departamentoNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async departamentoId => {
        if (departamentoId) {
          await this.cargarCiudadesPorDepartamento(departamentoId, 'nacimiento');
          this.formPersonal.patchValue({ ciudadNacimiento: '' }, { emitEvent: false });
        } else {
          this.ciudadesNacimiento = [];
        }
      });

    this.formPersonal.get('paisResidencia')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async paisId => {
        if (paisId) {
          await this.cargarDepartamentosPorPais(paisId, 'residencia');
          this.formPersonal.patchValue({
            departamentoResidencia: '',
            ciudadResidencia: ''
          }, { emitEvent: false });
          this.ciudadesResidencia = [];
        } else {
          this.departamentosResidencia = [];
          this.ciudadesResidencia = [];
        }
      });

    this.formPersonal.get('departamentoResidencia')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async departamentoId => {
        if (departamentoId) {
          await this.cargarCiudadesPorDepartamento(departamentoId, 'residencia');
          this.formPersonal.patchValue({ ciudadResidencia: '' }, { emitEvent: false });
        } else {
          this.ciudadesResidencia = [];
        }
      });
  }

  private async cargarUbicacionesPersona(): Promise<void> {
    if (!this.persona) return;

    try {
      await Promise.all([
        this.cargarUbicacionExpedicion(),
        this.cargarUbicacionNacimiento(),
        this.cargarUbicacionResidencia()
      ]);
    } catch (error) {
    }
  }

  private async cargarUbicacionExpedicion(): Promise<void> {
    if (!this.persona?.paisExpedicion) return;
    
    const paisId = await this.obtenerPaisIdPorNombre(this.persona.paisExpedicion);
    if (!paisId) return;
    
    this.formPersonal.patchValue({ paisExpedicion: paisId }, { emitEvent: false });
    await this.cargarDepartamentosPorPais(paisId, 'expedicion');
    
    if (!this.persona.departamentoExpedicion) return;
    
    const deptoId = await this.obtenerDepartamentoIdPorNombre(this.persona.departamentoExpedicion, paisId);
    if (!deptoId) return;
    
    this.formPersonal.patchValue({ departamentoExpedicion: deptoId }, { emitEvent: false });
    await this.cargarCiudadesPorDepartamento(deptoId, 'expedicion');
    
    if (!this.persona.ciudadExpedicion) return;
    
    const ciudadId = await this.obtenerCiudadIdPorNombre(this.persona.ciudadExpedicion, deptoId);
    if (ciudadId) {
      this.formPersonal.patchValue({ ciudadExpedicion: ciudadId }, { emitEvent: false });
    }
  }

  private async cargarUbicacionNacimiento(): Promise<void> {
    if (!this.persona?.paisNacimiento) return;
    
    const paisId = await this.obtenerPaisIdPorNombre(this.persona.paisNacimiento);
    if (!paisId) return;
    
    this.formPersonal.patchValue({ paisNacimiento: paisId }, { emitEvent: false });
    await this.cargarDepartamentosPorPais(paisId, 'nacimiento');
    
    if (!this.persona.departamentoNacimiento) return;
    
    const deptoId = await this.obtenerDepartamentoIdPorNombre(this.persona.departamentoNacimiento, paisId);
    if (!deptoId) return;
    
    this.formPersonal.patchValue({ departamentoNacimiento: deptoId }, { emitEvent: false });
    await this.cargarCiudadesPorDepartamento(deptoId, 'nacimiento');
    
    if (!this.persona.ciudadNacimiento) return;
    
    const ciudadId = await this.obtenerCiudadIdPorNombre(this.persona.ciudadNacimiento, deptoId);
    if (ciudadId) {
      this.formPersonal.patchValue({ ciudadNacimiento: ciudadId }, { emitEvent: false });
    }
  }

  private async cargarUbicacionResidencia(): Promise<void> {
    if (!this.persona?.paisResidencia) return;
    
    const paisId = await this.obtenerPaisIdPorNombre(this.persona.paisResidencia);
    if (!paisId) return;
    
    this.formPersonal.patchValue({ paisResidencia: paisId }, { emitEvent: false });
    await this.cargarDepartamentosPorPais(paisId, 'residencia');
    
    if (!this.persona.departamentoResidencia) return;
    
    const deptoId = await this.obtenerDepartamentoIdPorNombre(this.persona.departamentoResidencia, paisId);
    if (!deptoId) return;
    
    this.formPersonal.patchValue({ departamentoResidencia: deptoId }, { emitEvent: false });
    await this.cargarCiudadesPorDepartamento(deptoId, 'residencia');
    
    if (!this.persona.ciudadResidencia) return;
    
    const ciudadId = await this.obtenerCiudadIdPorNombre(this.persona.ciudadResidencia, deptoId);
    if (ciudadId) {
      this.formPersonal.patchValue({ ciudadResidencia: ciudadId }, { emitEvent: false });
    }
  }

  private async obtenerPaisIdPorNombre(nombre: string): Promise<string | null> {
    try {
      const response = await this.ubicacionesService.getPaisIdPorNombre(nombre).toPromise();
      return response?.id || null;
    } catch (error) {
      return null;
    }
  }

  private async obtenerDepartamentoIdPorNombre(nombre: string, paisId: string): Promise<string | null> {
    try {
      const nombreNormalizado = nombre.toLowerCase().trim();
      
      const contextos = ['expedicion', 'nacimiento', 'residencia'];
      
      for (const contexto of contextos) {
        const departamentosArray = contexto === 'expedicion' ? this.departamentosExpedicion :
                                   contexto === 'nacimiento' ? this.departamentosNacimiento :
                                   this.departamentosResidencia;
        
        if (departamentosArray && departamentosArray.length > 0) {
          const departamentoEncontrado = departamentosArray.find(d => 
            d.nombre.toLowerCase().trim() === nombreNormalizado
          );
          
          if (departamentoEncontrado) {
            return departamentoEncontrado.id;
          }
        }
      }
      
      const ubicacion = await this.ubicacionesService.getByNombreExacto(nombre).toPromise();
      if (ubicacion && ubicacion.idPadre === paisId) {
        return ubicacion.id;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async obtenerCiudadIdPorNombre(nombre: string, departamentoId: string): Promise<string | null> {
    try {
      const nombreNormalizado = nombre.toLowerCase().trim();
      
      const contextos = [
        { name: 'expedicion', array: this.ciudadesExpedicion },
        { name: 'nacimiento', array: this.ciudadesNacimiento },
        { name: 'residencia', array: this.ciudadesResidencia }
      ];
      
      for (const contexto of contextos) {
        if (contexto.array && contexto.array.length > 0) {
          const ciudadEncontrada = contexto.array.find(c => 
            c.nombre.toLowerCase().trim() === nombreNormalizado
          );
          
          if (ciudadEncontrada) {
            return ciudadEncontrada.id;
          }
        }
      }
      
      const ciudadesDepartamento = await this.ubicacionesService
        .getMunicipiosPorDepartamento(departamentoId).toPromise();
      
      if (ciudadesDepartamento) {
        const ciudadEncontrada = ciudadesDepartamento.find(c => 
          c.nombre.toLowerCase().trim() === nombreNormalizado
        );
        
        if (ciudadEncontrada) {
          return ciudadEncontrada.id;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async cargarDepartamentosPorPais(paisId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): Promise<void> {
    try {
      const departamentos = await this.ubicacionesService.getDepartamentosPorPais(paisId).toPromise();
      
      if (contexto === 'expedicion') {
        this.departamentosExpedicion = departamentos || [];
      } else if (contexto === 'nacimiento') {
        this.departamentosNacimiento = departamentos || [];
      } else {
        this.departamentosResidencia = departamentos || [];
      }
    } catch (error) {
    }
  }

  private async cargarCiudadesPorDepartamento(departamentoId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): Promise<void> {
    try {
      const ciudades = await this.ubicacionesService.getMunicipiosPorDepartamento(departamentoId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        ).toPromise();
      
      if (contexto === 'expedicion') {
        this.ciudadesExpedicion = ciudades || [];
      } else if (contexto === 'nacimiento') {
        this.ciudadesNacimiento = ciudades || [];
      } else {
        this.ciudadesResidencia = ciudades || [];
      }
    } catch (error) {
    }
  }


  formatFecha(fecha: Date | string | undefined): string {
    if (!fecha) return '-';
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  }

  calcularEdad(fechaNacimiento: Date | string | undefined): number | null {
    if (!fechaNacimiento) return null;
    
    try {
      const fecha = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
      
      if (isNaN(fecha.getTime())) {
        return null;
      }
      
      const hoy = new Date();
      let edad = hoy.getFullYear() - fecha.getFullYear();
      const mes = hoy.getMonth() - fecha.getMonth();
      
      if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
        edad--;
      }
      
      return edad;
    } catch (error) {
      return null;
    }
  }

  descargarArchivo(archivo: any): void {
    if (!archivo || !archivo.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'No se pudo obtener la información del archivo',
        life: 3000
      });
      return;
    }

    const downloadUrl = this.fileAttachmentService.getDownloadUrl(archivo.id);
    
    this.http.get(downloadUrl, { 
      responseType: 'blob'
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const newWindow = window.open(objectUrl, '_blank');
        
        if (newWindow) {
          newWindow.addEventListener('load', () => {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          });
        } else {
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el archivo',
          life: 5000
        });
      }
    });
  }

  editarAfiliaciones(): void {
    this.modoEdicion = true;
  }

  async crearFormulariosAfiliaciones(): Promise<void> {
    for (const afiliacion of this.afiliaciones) {
      if (afiliacion.id) {
        this.formAfiliacionesEdit[afiliacion.id] = this.crearFormularioAfiliacion(afiliacion);
      }
    }
  }

  crearFormularioAfiliacion(afiliacion: Afiliacion): FormGroup {
    const tipoId = this.tiposAfiliacion.find(t => t.nombre === afiliacion.tipo)?.id || afiliacion.tipo;
    
    let administradoraObj = this.entidadesAfiliacion.find(e => 
      e.nombre === afiliacion.administradora || e.id === afiliacion.administradora
    );
    
    if (!administradoraObj) {
      administradoraObj = {
        id: afiliacion.administradora,
        nombre: afiliacion.administradora,
        nombrePadre: '',
        tipo: ''
      };
    }

    const fecha = afiliacion.fechaAfiliacion ? new Date(afiliacion.fechaAfiliacion) : null;

    return this.fb.group({
      tipo: [tipoId],
      administradora: [administradoraObj],
      fechaAfiliacion: [fecha]
    });
  }

  buscarAdministradoras(filtro: string, afiliacionId: string): void {
    if (!filtro || filtro.length < 2) {
      this.administradorasFiltradas[afiliacionId] = [];
      return;
    }

    const form = this.formAfiliacionesEdit[afiliacionId];
    if (!form) return;

    const tipoSeleccionado = form.get('tipo')?.value;
    const tipoSeleccionadoObj = this.tiposAfiliacion.find(t => t.id === tipoSeleccionado);
    const nombrePadreRequerido = tipoSeleccionadoObj?.nombre;

    this.isLoadingAdministradoras[afiliacionId] = true;

    const filtroLower = filtro.toLowerCase().trim();
    this.administradorasFiltradas[afiliacionId] = this.entidadesAfiliacion
      .filter(e => {
        if (nombrePadreRequerido && e.nombrePadre) {
          const nombrePadreLower = e.nombrePadre.toLowerCase();
          const tipoRequeridoLower = nombrePadreRequerido.toLowerCase();
          const cumpleTipo = nombrePadreLower.includes(tipoRequeridoLower) || tipoRequeridoLower.includes(nombrePadreLower);
          if (!cumpleTipo) {
            return false;
          }
        }
        const nombreLower = e.nombre.toLowerCase();
        return nombreLower.includes(filtroLower);
      })
      .sort((a, b) => {
        const aLower = a.nombre.toLowerCase();
        const bLower = b.nombre.toLowerCase();
        const aStartsWith = aLower.startsWith(filtroLower);
        const bStartsWith = bLower.startsWith(filtroLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.nombre.localeCompare(b.nombre);
      })
      .slice(0, 50);

    this.isLoadingAdministradoras[afiliacionId] = false;
  }

  onAdministradoraSelected(event: any, afiliacionId: string): void {
    const form = this.formAfiliacionesEdit[afiliacionId];
    if (form && event.value) {
      form.get('administradora')?.setValue(event.value);
    }
  }

  onAdministradoraCleared(afiliacionId: string): void {
    const form = this.formAfiliacionesEdit[afiliacionId];
    if (form) {
      form.get('administradora')?.setValue(null);
      this.administradorasFiltradas[afiliacionId] = [];
    }
  }

  onTipoAfiliacionChange(afiliacionId: string): void {
    const form = this.formAfiliacionesEdit[afiliacionId];
    if (form) {
      form.get('administradora')?.setValue(null);
      this.administradorasFiltradas[afiliacionId] = [];
    }
  }

  shouldShowAutocomplete(afiliacionId: string): boolean {
    const form = this.formAfiliacionesEdit[afiliacionId];
    return form ? !!form.get('tipo')?.value : false;
  }

  getPlaceholderText(afiliacionId: string): string {
    const form = this.formAfiliacionesEdit[afiliacionId];
    if (!form) return 'Seleccione tipo primero';
    
    const tipo = form.get('tipo')?.value;
    if (!tipo) return 'Seleccione tipo primero';
    
    return 'Buscar administradora...';
  }

  guardarAfiliacion(afiliacionId: string): void {
    const form = this.formAfiliacionesEdit[afiliacionId];
    if (!form || form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Complete todos los campos requeridos',
        life: 3000
      });
      return;
    }

    this.guardando = true;
    const formValue = form.getRawValue();

    const tipoNombre = this.tiposAfiliacion.find(t => t.id === formValue.tipo)?.nombre || formValue.tipo;
    const administradoraNombre = typeof formValue.administradora === 'object'
      ? formValue.administradora.nombre
      : formValue.administradora;

    const afiliacionActualizada: Afiliacion = {
      id: afiliacionId,
      tipo: tipoNombre,
      administradora: administradoraNombre,
      fechaAfiliacion: formValue.fechaAfiliacion ? formValue.fechaAfiliacion.toISOString().split('T')[0] : '',
      persona: this.personaId
    };

    this.afiliacionesService.update(afiliacionActualizada).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const index = this.afiliaciones.findIndex(a => a.id === afiliacionId);
        if (index !== -1) {
          this.afiliaciones[index] = {
            ...this.afiliaciones[index],
            tipo: tipoNombre,
            administradora: administradoraNombre,
            fechaAfiliacion: afiliacionActualizada.fechaAfiliacion
          };
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Afiliación actualizada correctamente',
          life: 3000
        });
        this.guardando = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la afiliación',
          life: 5000
        });
        this.guardando = false;
      }
    });
  }

  cancelarEdicionAfiliacion(afiliacionId: string): void {
    const afiliacionOriginal = this.afiliaciones.find(a => a.id === afiliacionId);
    if (afiliacionOriginal && this.formAfiliacionesEdit[afiliacionId]) {
      this.formAfiliacionesEdit[afiliacionId] = this.crearFormularioAfiliacion(afiliacionOriginal);
    }
  }

  getAdministradoraControl(afiliacionId: string): any {
    return this.formAfiliacionesEdit[afiliacionId]?.get('administradora');
  }

  getNombreTipoAfiliacion(tipoId: string): string {
    const tipo = this.tiposAfiliacion.find(t => t.id === tipoId || t.nombre === tipoId);
    return tipo ? tipo.nombre : tipoId;
  }

  getNombreAdministradora(administradoraId: string): string {
    const entidad = this.entidadesAfiliacion.find(e => 
      e.id === administradoraId || e.nombre === administradoraId
    );
    
    if (entidad) {
      return entidad.nombre;
    }
    
    return administradoraId;
  }

  abrirDialogoEnviarCorreo(): void {
    if (!this.persona) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se encontró información de la persona',
        life: 3000
      });
      return;
    }

    if (!this.persona.correo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'El usuario no tiene un correo electrónico registrado',
        life: 3000
      });
      return;
    }

    this.mostrarDialogoCorreo = true;
  }

  obtenerNombreCompleto(): string {
    if (!this.persona) return '';
    return `${this.persona.primerNombre || ''} ${this.persona.segundoNombre || ''} ${this.persona.primerApellido || ''} ${this.persona.segundoApellido || ''}`.trim();
  }

  onEnvioCorreoExitoso(): void {
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
