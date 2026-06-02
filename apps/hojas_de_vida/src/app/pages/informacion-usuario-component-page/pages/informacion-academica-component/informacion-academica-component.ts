import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, takeUntil, Subject } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  FormControl,
} from '@angular/forms';
import { ViewChild } from '@angular/core';
import {
  DropdownItem,
  ListasValoresDto,
  UbicacionesGeograficasDto,
} from '@microfrontends/shared-models';
import {
  ListasValoresService,
  UbicacionesGeograficasService,
  OracleInstitucionesService,
  InstitucionesService,
} from '@microfrontends/shared-services';
import { InformacionAcademica } from '../../../../core/models/informacion-academica.model';
import {
  SelectComponent,
  TextareaComponent,
  InputComponent,
  DatepickerComponent,
  FileAttachmentComponent,
  FileInfoS,
  FileAttachmentConfig,
  TituloSelectComponent,
  PdfValidationResult,
  InfoTableComponent,
  TableColumn,
  TableAction
} from '@microfrontends/shared-ui';
import { TituloAcademicoSimple } from '@microfrontends/shared-services';
import { FileAttachmentService } from '@microfrontends/shared-services';
import { InformacionAcademicaService } from '../../../../core/services/info-academica.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';

class CustomValidators {
  static requiredWithTouched(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    const isBoolean = typeof value === 'boolean';
    let isEmpty = false;
    if (isBoolean) {
      isEmpty = value === null || value === undefined;
    } else if (typeof value === 'string') {
      isEmpty = value.trim() === '';
    } else {
      isEmpty = value === null || value === undefined;
    }

    if (isEmpty) {
      return control.touched ? { requiredTouched: true } : { required: true };
    }

    return null;
  }

  static emailOptional(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value.trim() === '') {
      return null; 
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(control.value) ? null : { email: true };
  }

  static namePattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return namePattern.test(control.value) ? null : { nameInvalid: true };
  }

  static tituloValido(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    if (control.errors && control.errors['invalidSelection']) {
      return { tituloInvalido: true };
    }
    
    return null;
  }

  static institucionPattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    let valorAValidar: string;
    if (typeof control.value === 'object' && control.value.nombre) {
      valorAValidar = control.value.nombre;
    } else if (typeof control.value === 'string') {
      valorAValidar = control.value;
    } else {
      return { institucionInvalid: true };
    }
    
    const institucionPattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s0-9.,()&-]+$/;
    return institucionPattern.test(valorAValidar) ? null : { institucionInvalid: true };
  }

  static requiredIfNotEnCurso(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) return null;
    
    const enCursoControl = control.parent.get('enCurso');
    const enCurso = enCursoControl?.value;
    
    if (enCurso === true) {
      return null;
    }
    
    const value = control.value;
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '');
    
    if (isEmpty) {
      return { required: true };
    }
    
    return null;
  }
}

function fechaNoMayorAHoy(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const valor = new Date(control.value);
    valor.setHours(0, 0, 0, 0);
    if (valor > hoy) {
      return { maxHoy: true };
    }
    return null;
  };
}

function fechaGradoNoMenorAInicio(fechaInicioCtrl: () => AbstractControl | null, enCursoCtrl?: () => AbstractControl | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const fechaGrado = control.value;
    const fechaInicio = fechaInicioCtrl()?.value;
    const enCurso = enCursoCtrl ? enCursoCtrl()?.value : false;
    
    if (fechaGrado && !enCurso) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const grado = new Date(fechaGrado);
      grado.setHours(0, 0, 0, 0);
      if (grado > hoy) {
        return { maxHoy: true };
      }
    }
    
    if (fechaGrado && fechaInicio) {
      const inicio = new Date(fechaInicio);
      const grado = new Date(fechaGrado);
      inicio.setHours(0, 0, 0, 0);
      grado.setHours(0, 0, 0, 0);
      if (grado < inicio) {
        return { minInicio: true };
      }
    }
    return null;
  };
}

@Component({
  selector: 'app-informacion-academica',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    CardModule,
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    ToastModule,
    AutoCompleteModule,
    SelectComponent,
    TextareaComponent,
    DialogModule,
    ConfirmDialogModule,
    InputComponent,
    DatepickerComponent,
    FileAttachmentComponent,
    TituloSelectComponent,
    TooltipModule,
    InfoTableComponent,
    MessageModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './informacion-academica-component.html',
  styleUrls: ['./informacion-academica-component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InformacionAcademicaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isPrecargandoDatos: boolean = false;
  private isValidating: boolean = false; 
  private _originalFormValues: any = {}; 
  private _originalFileId: string | null = null; 

  form!: FormGroup;
  registros: Array<
    InformacionAcademica & {
      tipoTitulo: string;
      pais: string;
      departamento?: string;
      ciudad: string;
      ciudadNombre?: string;   
      ciudadCompleta?: string; 
      institucion: string;
      archivoTitulo?: string;
    }
  > = [];
  registrosOriginales: InformacionAcademica[] = [];
  editingId: string | null = null;
  personaId: string | null = null;
  selectedFile: File | null = null;
  fileError: string | null = null;
  uploadedFileId: string | null = null;
  
  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;
  
  private _hadFilesOnOpen: boolean = false;
  
  tableColumns: TableColumn[] = [
    { field: 'tipoTitulo', header: 'Tipo de Título', type: 'text' },
    { field: 'titulo', header: 'Título Específico', type: 'text' },
    { field: 'enCurso', header: 'En Curso', type: 'custom' },
    { field: 'modalidad', header: 'Modalidad', type: 'text' },
    { field: 'institucionNombre', header: 'Institución', type: 'text' },
    { field: 'pais', header: 'País', type: 'text' },
    { field: 'ciudadNombre', header: 'Ciudad', type: 'text' },
    { field: 'fechaInicio', header: 'Fecha Inicio', type: 'date' },
    { field: 'fechaGrado', header: 'Fecha Grado', type: 'date' },
    { field: 'estado', header: 'Estado', type: 'custom' },
    { field: 'tarjetaProfesional', header: 'T. Profesional', type: 'custom' },
    { field: 'archivos', header: 'Archivos', type: 'custom' },
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar registro',
      severity: 'info',
      onClick: (row) => this.editarRegistro(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar registro',
      severity: 'danger',
      onClick: (row) => this.eliminarRegistro(row.id!)
    }
  ];

  get tableData(): any[] {
    return this.registros.map(registro => this.prepareTableRow(registro));
  }

  prepareTableRow(registro: any): any {
    return {
      ...registro,
      institucionNombre: registro.institucion || '-',
      ciudadNombre: registro.ciudadNombre || registro.ciudad || '-',
    };
  }
  
  existingFiles: FileInfoS[] = [];
  fileControl = new FormControl();
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;
  
  @ViewChild('diplomaAttachment') diplomaAttachment!: FileAttachmentComponent;
  @ViewChild('actaAttachment') actaAttachment!: FileAttachmentComponent;
  @ViewChild('apostillaAttachment') apostillaAttachment!: FileAttachmentComponent;
  @ViewChild('tituloAutocomplete') tituloAutocomplete!: TituloSelectComponent;
  
  diplomaConfig: FileAttachmentConfig = {
    moduleType: 'info_academica',
    multiple: false,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
    accept: '.pdf',
    autoUpload: true,
    showPreview: true,
    showDownload: true,
    showDelete: true,
    renameFiles: true,
    pdfValidation: {
      enabled: true,
      moduleType: 'info_academica',
      expectedDocumentType: 'Educational_Certificate',
      autoReject: true,
      showValidationFeedback: true
    }
  };
  
  actaConfig: FileAttachmentConfig = { ...this.diplomaConfig };
  apostillaConfig: FileAttachmentConfig = { ...this.diplomaConfig };
  
  diplomaFileId: string | null = null;
  actaFileId: string | null = null;
  apostillaFileId: string | null = null;
  
  private _originalDiplomaFileId: string | null = null;
  private _originalActaFileId: string | null = null;
  private _originalApostillaFileId: string | null = null;
  
  diplomaExistingFiles: FileInfoS[] = [];
  actaExistingFiles: FileInfoS[] = [];
  apostillaExistingFiles: FileInfoS[] = [];
  
  requiereApostilla = false;

  tiposTitulo: DropdownItem[] = [];
  paises: DropdownItem[] = [];
  departamentos: DropdownItem[] = [];
  ciudades: DropdownItem[] = [];
  instituciones: DropdownItem[] = [];
  modalidades: DropdownItem[] = [];

  ciudadesDuplicadas: Array<{
    id: string, 
    nombre: string, 
    departamento: string, 
    departamentoId: string,
    pais: string
  }> = [];
  mostrarDialogoCiudades = false;

  private _institucionesFiltered: DropdownItem[] = [];
  get institucionesFiltered(): DropdownItem[] {
    return this._institucionesFiltered;
  }
  set institucionesFiltered(value: DropdownItem[]) {
    this._institucionesFiltered = value;
  }

  isLoadingDropdowns = false;
  isLoadingInstituciones = false;
  isLoading = false;
  isLoadingEdit = false;
  isSubmitting = false; 
  private paisColombiaId: string | null = null;
  esColombia = false;
  hasStates = false; // true if country has intermediate subdivisions (estado/departamento)

  mostrarDialogo = false;

  esTipoBasico = false; 

  readonly errorMessages = {
    tipoTitulo: {
      required: 'El tipo de título es obligatorio',
      requiredTouched: 'El tipo de título es obligatorio'
    },
    titulo: {
      required: 'El título es obligatorio',
      requiredTouched: 'El título es obligatorio',
      tituloInvalido: 'El título ingresado no es válido'
    },
    pais: {
      required: 'El país es obligatorio',
      requiredTouched: 'El país es obligatorio'
    },
    departamento: {
      required: 'El departamento es obligatorio',
      requiredTouched: 'El departamento es obligatorio'
    },
    ciudad: {
      required: 'La ciudad es obligatoria',
      requiredTouched: 'La ciudad es obligatoria'
    },
    fechaInicio: {
      required: 'La fecha de inicio es obligatoria',
      requiredTouched: 'La fecha de inicio es obligatoria',
      maxHoy: 'La fecha de inicio no puede ser mayor a hoy'
    },
    fechaGrado: {
      required: 'La fecha de grado es obligatoria',
      requiredTouched: 'La fecha de grado es obligatoria',
      maxHoy: 'La fecha de grado no puede ser una fecha futura',
      minInicio: 'La fecha de grado no puede ser menor a la fecha de inicio'
    },
    institucion: {
      required: 'La institución es obligatoria',
      requiredTouched: 'La institución es obligatoria',
      institucionInvalid: 'La institución contiene caracteres no válidos'
    },
    modalidad: {
      required: 'La modalidad es obligatoria',
      requiredTouched: 'La modalidad es obligatoria'
    },
    numeroActa: {
      required: 'El número de acta es obligatorio cuando no está en curso',
      maxlength: 'Máximo 20 caracteres'
    },
    horasDuracion: {
      required: 'Los semestres de duración son obligatorios',
      requiredTouched: 'Los semestres de duración son obligatorios',
      min: 'Los semestres no pueden ser negativos'
    },
    anosCursados: {
      required: 'Los años cursados son obligatorios cuando no está en curso',
      min: 'Los años cursados no pueden ser negativos'
    },
    distinciones: {
      maxlength: 'Máximo 200 caracteres'
    }
  } as const;

  get isFormValidForSubmit(): boolean {
    const isFormValid = this.form.valid;
    const hasFile = !!this.uploadedFileId; 
    return isFormValid && hasFile;
  }

  isFormInvalidForSubmit(): boolean {
    const requiredFields = [
      'tipoTitulo', 'titulo', 'pais', 'ciudad', 'fechaInicio', 
      'institucion', 'modalidad'
    ];
    
    for (const field of requiredFields) {
      const control = this.form.get(field);
      if (!control || control.invalid) {
        return true;
      }
    }
    
    const enCurso = this.form.get('enCurso')?.value;
    
    if (!enCurso) {
      const fechaGradoControl = this.form.get('fechaGrado');
      const numeroActaControl = this.form.get('numeroActa');
      const anosCursadosControl = this.form.get('anosCursados');
      
      if (!fechaGradoControl?.value || fechaGradoControl.invalid) {
        return true;
      }
      
      if (!numeroActaControl?.value || numeroActaControl.invalid) {
        return true;
      }
      
      if (anosCursadosControl?.invalid) {
        return true;
      }
    }
    
    if (this.hasStates) {
      const departamento = this.form.get('departamento')?.value;
      if (!departamento) {
        return true;
      }
    }
    
    if (this.form.errors) {
      return true;
    }

    if (this.editingId) {
      
      const tieneArchivoOriginal = this.archivoOriginalId !== null || this.existingFiles.length > 0;
      const tieneArchivoNuevo = !!this.uploadedFileId;
      const archivoFueBorrado = this.archivoPendienteEliminacion;
      
      if (!tieneArchivoOriginal && !tieneArchivoNuevo) {
        return true;
      }
      
      if (archivoFueBorrado && !tieneArchivoNuevo) {
        return true;
      }
      
      return false;
    } else {
      if (!this.uploadedFileId) {
        return true;
      }
      
      return false;
    }
  }

  hasFormChanges(): boolean {
    return this._hasFormChangesInternal();
  }

  getSubmitButtonTooltip(): string {
    if (this.isLoading) {
      return '';
    }

    const enCurso = this.form.get('enCurso')?.value;

    if (!this.uploadedFileId && enCurso !== true) {
      return 'Debe cargar un archivo del título para continuar';
    }

    if (this.form.invalid) {
      return 'Complete todos los campos requeridos correctamente';
    }

    if (this.editingId && !this.hasFormChanges()) {
      return 'No hay cambios que guardar';
    }

    return '';
  }


  private normalizarFechaParaComparacion(fecha: any): number | null {
    if (!fecha) return null;
    
    try {
      if (fecha instanceof Date) {
        return fecha.getTime();
      }
      
      if (typeof fecha === 'string') {
        const parsedDate = new Date(fecha);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.getTime();
        }
      }
      
      if (typeof fecha === 'number') {
        return fecha;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private _hasFormChangesInternal(): boolean {
    const currentValues = this.form.getRawValue();

    const fieldsToCompare = [
      'tipoTitulo',
      'titulo',
      'enCurso',
      'pais',
      'departamento',
      'ciudad',
      'fechaInicio',
      'fechaGrado',
      'institucion',
      'modalidad',
      'tarjetaProfesional',
      'numeroActa',
      'horasDuracion',
      'anosCursados',
      'distinciones'
    ];

    for (const field of fieldsToCompare) {
      const originalValue = this._originalFormValues[field];
      const currentValue = currentValues[field];

      if (field === 'fechaInicio' || field === 'fechaGrado') {
        const originalTimestamp = this.normalizarFechaParaComparacion(originalValue);
        const currentTimestamp = this.normalizarFechaParaComparacion(currentValue);
        
        if (originalTimestamp !== currentTimestamp) {
          return true;
        }
      } 
      else if (field === 'institucion') {
        const originalInst = typeof originalValue === 'object' ? originalValue?.id || originalValue?.nombre : originalValue;
        const currentInst = typeof currentValue === 'object' ? currentValue?.id || currentValue?.nombre : currentValue;
        
        if (originalInst !== currentInst) {
          return true;
        }
      }
      else if (field === 'titulo') {
        const originalTit = typeof originalValue === 'object' ? originalValue?.titulo : originalValue;
        const currentTit = typeof currentValue === 'object' ? currentValue?.titulo : currentValue;
        
        if (originalTit !== currentTit) {
          return true;
        }
      }
      else if (originalValue !== currentValue) {
        return true;
      }
    }

    const hasFileChange = this._hasFileChanged();
    
    if (hasFileChange) {
      return true;
    }

    return false;
  }

  private _hasFileChanged(): boolean {
    if (!this.editingId || this._originalFileId === null) {
      return false;
    }

    if (this.archivoPendienteEliminacion) {
      return true;
    }
    const hasChanged = this.uploadedFileId !== this._originalFileId;
    return hasChanged;
  }

  private saveFormSnapshot(): void {
    const currentValues = this.form.getRawValue();
    this._originalFormValues = { ...currentValues };
    this._originalFileId = this.uploadedFileId;
    }

  private fb = inject(FormBuilder);
  private servicio = inject(InformacionAcademicaService);
  private personasService = inject(PersonasService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private listasValoresService = inject(ListasValoresService);
  private ubicacionesGeograficasService = inject(UbicacionesGeograficasService);
  private oracleInstitucionesService = inject(OracleInstitucionesService);
  private generalInstitucionesService = inject(InstitucionesService);
  private fileAttachmentService = inject(FileAttachmentService);
  private cdr = inject(ChangeDetectorRef);
  private hojaVidaStatusService = inject(HojaVidaStatusService);
  private http = inject(HttpClient);

  fileAttachmentConfig: FileAttachmentConfig = {
    moduleType: 'info_academica',
    multiple: false,
    maxFileSize: 10 * 1024 * 1024, 
    accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    autoUpload: true, 
    showPreview: true,
    showDownload: true,
    showDelete: true,
    renameFiles: true,
    pdfValidation: {
      enabled: true,
      moduleType: 'info_academica',
      expectedDocumentType: 'Educational_Certificate',
      autoReject: true,
      showValidationFeedback: true
    }
  };

  private actualizarConfiguracionArchivos(): void {
    this.requiereApostilla = !this.esColombia;
    
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.configurarSuscripciones();
    this.cargarDatos();
    this.obtenerPersonaId().then(() => {
      this.cargarRegistros();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async obtenerPersonaId(): Promise<void> {
    try {
      const persona = await this.personasService
        .getPersonaActual()
        .toPromise();
      this.personaId = persona?.id || null;
      if (!this.personaId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Debe completar su información personal primero',
        });
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario',
      });
    }
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      id: [''],
      tipoTitulo: ['', CustomValidators.requiredWithTouched],
      titulo: ['', [CustomValidators.requiredWithTouched, CustomValidators.tituloValido]],
      enCurso: [false], 
      pais: ['', CustomValidators.requiredWithTouched],
      departamento: [''],
      ciudad: ['', CustomValidators.requiredWithTouched],
      fechaInicio: ['', [CustomValidators.requiredWithTouched, fechaNoMayorAHoy()]],
      fechaGrado: [
        '',
        [CustomValidators.requiredWithTouched, fechaGradoNoMenorAInicio(() => this.form?.get('fechaInicio'), () => this.form?.get('enCurso'))],
      ],
      institucion: ['', [CustomValidators.requiredWithTouched, CustomValidators.institucionPattern]],
      modalidad: ['', CustomValidators.requiredWithTouched],
      tarjetaProfesional: [false],
      bachillerato: [false],
      areaEducacion: [''],
      numeroActa: ['', [Validators.maxLength(20), CustomValidators.requiredIfNotEnCurso]],
      horasDuracion: [0, [Validators.min(0)]], 
      anosCursados: [0, [Validators.min(0), CustomValidators.requiredIfNotEnCurso]], 
      distinciones: ['', Validators.maxLength(200)],
    });
  }

  private configurarSuscripciones(): void {
    this.form
      .get('pais')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((paisId: string) => {
        if (this.isPrecargandoDatos) {
          return;
        }
        if (this.isValidating) {
          return;
        }
        
        this.onPaisChange(paisId);
        this.actualizarConfiguracionArchivos();
      });
    this.form
      .get('departamento')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(async (departamentoId: string) => {
        if (this.isPrecargandoDatos) {
          return;
        }
        if (this.isValidating) {
          return;
        }
        
        await this.onDepartamentoChange(departamentoId, false);
      });
    
    this.form
      .get('enCurso')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((enCurso: boolean) => {
        const fechaGradoControl = this.form.get('fechaGrado');
        const tarjetaProfesionalControl = this.form.get('tarjetaProfesional');
        const numeroActaControl = this.form.get('numeroActa');
        const anosCursadosControl = this.form.get('anosCursados');
        
        if (enCurso) {
          fechaGradoControl?.clearValidators();
          fechaGradoControl?.setValidators([
            CustomValidators.requiredWithTouched,
            fechaGradoNoMenorAInicio(() => this.form?.get('fechaInicio'), () => this.form?.get('enCurso'))
          ]);
          fechaGradoControl?.enable();
          
          tarjetaProfesionalControl?.setValue(false);
          tarjetaProfesionalControl?.disable();
          
          numeroActaControl?.clearValidators();
          numeroActaControl?.updateValueAndValidity();
          
          anosCursadosControl?.clearValidators();
          anosCursadosControl?.setValidators([Validators.min(0)]);
          anosCursadosControl?.updateValueAndValidity();
        } else {
          fechaGradoControl?.enable();
          fechaGradoControl?.setValidators([
            CustomValidators.requiredWithTouched, 
            fechaGradoNoMenorAInicio(() => this.form?.get('fechaInicio'), () => this.form?.get('enCurso'))
          ]);
          
          tarjetaProfesionalControl?.enable();
          
          numeroActaControl?.setValidators([Validators.maxLength(20), CustomValidators.requiredIfNotEnCurso]);
          numeroActaControl?.updateValueAndValidity();
          
          anosCursadosControl?.setValidators([Validators.min(0), CustomValidators.requiredIfNotEnCurso]);
          anosCursadosControl?.updateValueAndValidity();
        }
        
        fechaGradoControl?.updateValueAndValidity();
        tarjetaProfesionalControl?.updateValueAndValidity();
        numeroActaControl?.updateValueAndValidity();
        anosCursadosControl?.updateValueAndValidity();
      });

    this.form
      .get('fechaInicio')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const fechaGradoControl = this.form.get('fechaGrado');
        if (fechaGradoControl && fechaGradoControl.value) {
          fechaGradoControl.updateValueAndValidity({ emitEvent: false });
        }
      });

    this.form
      .get('tipoTitulo')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((tipoTituloId: string) => {
        this.onTipoTituloChange(tipoTituloId);
      });

    this.form
      .get('modalidad')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.actualizarConfiguracionArchivos();
      });
  }

  private cargarDatos(): void {
    this.isLoadingDropdowns = true;
    forkJoin({
      tiposTitulo: this.listasValoresService
        .getDropdownByTipo('TTIT')
        .pipe(
          map((response: ListasValoresDto[]) =>
            response
              .filter(
                (item) =>
                  'idPadre' in item &&
                  (item as { idPadre: string | null }).idPadre !== null
              ) 
              .filter(item => item.nombre !== 'Tipo de Título') 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        ),
      modalidades: this.listasValoresService
        .getDropdownByTipo('MOD')
        .pipe(
          map((response: ListasValoresDto[]) =>
            response
              .filter(
                (item) =>
                  'idPadre' in item &&
                  (item as { idPadre: string | null }).idPadre !== null
              ) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        ),
      paises: this.ubicacionesGeograficasService.getPaises(),
    }).subscribe({
      next: (data) => {
        this.tiposTitulo = data.tiposTitulo;
        this.modalidades = data.modalidades;
        this.paises = data.paises.map((pais) => ({
          id: pais.id,
          nombre: pais.nombre,
          codigoPais: (pais as any).codigoPais || (pais as any).codigo || null,
        }));
        this.identificarColombia();
        this.isLoadingDropdowns = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error cargando datos',
        });
        this.isLoadingDropdowns = false;
      },
    });
  }

  private identificarColombia(): void {
    const colombia = this.paises.find(
      (pais) =>
        pais.nombre.toLowerCase().includes('colombia') ||
        pais.nombre.toLowerCase() === 'colombia'
    );
    if (colombia) {
      this.paisColombiaId = colombia.id;
    }
  }

  private onPaisChange(paisId: string): void {
   
    if (this.isValidating) {
      
      return;
    }
    
    if (!paisId) {
      this.esColombia = false;
      this.departamentos = [];
      this.ciudades = [];
      return;
    }
    this.esColombia = paisId === this.paisColombiaId;

    // Detect whether selected country has intermediate subdivisions (states/departments)
    this.hasStates = false;
    if (!this.isPrecargandoDatos) {
      this.form.patchValue({
        departamento: '',
        ciudad: '',
      });
      this.departamentos = [];
      this.ciudades = [];
    }

    if (paisId) {
      this.determinarEstructuraGeografica(paisId).then((structure) => {
        this.hasStates = structure === 'states';
        const departamentoControl = this.form.get('departamento');
        if (this.hasStates) {
          departamentoControl?.setValidators([CustomValidators.requiredWithTouched]);
          if (!this.isPrecargandoDatos) {
            this.cargarDepartamentosPorPais(paisId);
          }
        } else {
          departamentoControl?.clearValidators();
          if (!this.isPrecargandoDatos) {
            this.cargarCiudadesPorPais(paisId);
          }
        }
        departamentoControl?.updateValueAndValidity();
      });
      return;
    }
  }

  private async onDepartamentoChange(departamentoId: string, mantenerCiudad: boolean = false): Promise<void> {
    
    if (this.isValidating) {
      return;
    }
    
    if (!departamentoId) {
      this.ciudades = [];
      return;
    }
    
    if (this.hasStates && !this.isPrecargandoDatos) {
      await this.cargarCiudadesPorDepartamento(departamentoId);
    }
    
    if (!mantenerCiudad && !this.isPrecargandoDatos) {
      this.form.patchValue({ ciudad: '' });
    } 
  }

  private onTipoTituloChange(tipoTituloId: string): void {
    if (!tipoTituloId) {
      this.esTipoBasico = false;
      return;
    }

    const tipoTituloSeleccionado = this.tiposTitulo.find(t => t.id === tipoTituloId);
    const nombreTipo = tipoTituloSeleccionado?.nombre || '';

    this.esTipoBasico = nombreTipo.toLowerCase().includes('primaria') || nombreTipo.toLowerCase().includes('secundaria');

    const horasDuracionControl = this.form.get('horasDuracion');
    const tarjetaProfesionalControl = this.form.get('tarjetaProfesional');

    if (this.esTipoBasico) {
      horasDuracionControl?.clearValidators();
      horasDuracionControl?.setValue(0);
      tarjetaProfesionalControl?.clearValidators();
      tarjetaProfesionalControl?.setValue(false);
    } else {
      horasDuracionControl?.setValidators([Validators.min(0)]);
      tarjetaProfesionalControl?.setValidators([]);
    }

    horasDuracionControl?.updateValueAndValidity();
    tarjetaProfesionalControl?.updateValueAndValidity();
  }

  private cargarDepartamentosPorPais(paisId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ubicacionesGeograficasService
        .getByPadreForDropdown(paisId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (departamentos: DropdownItem[]) => {
            this.departamentos = departamentos;
            resolve();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error cargando departamentos',
            });
            reject(error);
          },
        });
    });
  }

  private cargarCiudadesPorPais(paisId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ubicacionesGeograficasService
        .getByPadreForDropdown(paisId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (ciudades: DropdownItem[]) => {
            this.ciudades = ciudades;
            resolve();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error cargando ciudades',
            });
            reject(error);
          },
        });
    });
  }

  private cargarCiudadesPorDepartamento(departamentoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ubicacionesGeograficasService
        .getByPadreForDropdown(departamentoId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (ciudades: DropdownItem[]) => {
            this.ciudades = ciudades;
            resolve();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error cargando ciudades',
            });
            reject(error);
          },
        });
    });
  }

  private async determinarEstructuraGeografica(paisId: string): Promise<'states' | 'flat'> {
    try {
      // Primero intentar por idPadre (estructura tradicional)
      let primeros = await this.ubicacionesGeograficasService.getByPadreForDropdown(paisId).toPromise();

      // Si no devuelve hijos, intentar por codigoPais (fallback)
      if ((!primeros || primeros.length === 0) && this.paises && this.paises.length > 0) {
        const paisObj = this.paises.find(p => p.id === paisId);
        const codigoPais = (paisObj as any)?.codigoPais || (paisObj as any)?.codigo || null;
        if (codigoPais) {
          primeros = await this.ubicacionesGeograficasService.getByCodigoPaisForDropdown(codigoPais).toPromise();
        }
      }

      if (!primeros || primeros.length === 0) return 'flat';

      // Primero intentar inferir por el tipo reportado (nombreTipo) si está disponible
      try {
        const tipos = primeros
          .map((p: any) => (p && (p.nombreTipo || p.nombreTipo?.toString()) ? (p.nombreTipo || '').toString().toLowerCase() : ''))
          .filter((t: string) => t && t.length > 0);

        if (tipos.length > 0) {
          const anyDepartamento = tipos.some((t: string) => t.includes('depart') || t.includes('depto') || t.includes('estado') || t.includes('provincia') || t.includes('prov'));
          const anyMunicipio = tipos.some((t: string) => t.includes('municip') || t.includes('ciud') || t.includes('city'));
          if (anyDepartamento && !anyMunicipio) return 'states';
          if (anyMunicipio && !anyDepartamento) return 'flat';
          // si ambos aparecen o ninguno, caerá al chequeo por hijos abajo
        }
      } catch (err) {
        // ignore and fallback to child-check
      }

      const checks = primeros.slice(0, 5).map((item) =>
        this.ubicacionesGeograficasService.getByPadreForDropdown(item.id).toPromise()
          .then((res) => Array.isArray(res) && res.length > 0)
          .catch(() => false)
      );

      const resultados = await Promise.all(checks);
      return resultados.some((r) => r) ? 'states' : 'flat';
    } catch (error) {
      return 'flat';
    }
  }

  cargarRegistros(): void {
    if (!this.personaId) return;
  this.servicio.obtenerRegistros(this.personaId || undefined).subscribe({
      next: async (data: InformacionAcademica[]) => {
        this.registrosOriginales = data.filter((registro) => {
          const personaField = (registro as any).persona ?? (registro as any).personaId ?? (registro as any).persona_id ?? (registro as any).idPersona;

          if (!personaField) {
            return true;
          }
          if (typeof personaField === 'object' && (personaField as any).id) {
            return (personaField as any).id === this.personaId;
          } else if (typeof personaField === 'string') {
            return personaField === this.personaId;
          }
          return false;
        });

        const institucionIds = Array.from(new Set(this.registrosOriginales.map(r => r.institucion)));
        const missingInstitucionIds = institucionIds.filter(id => !this.instituciones.find(i => i.id === id));
        
        const institucionPromesas = missingInstitucionIds.map(valor => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          if (uuidRegex.test(valor)) {
            return this.generalInstitucionesService.getById(valor).toPromise().catch(() => null);
          } else {
            return this.oracleInstitucionesService.getByNombreExacto(valor).toPromise().catch(() => null);
          }
        });
        
        const institucionDtos = (await Promise.all(institucionPromesas)).filter((inst): inst is { id: string, nombre: string, nombreTipoInstitucion?: string } => !!inst);
        if (institucionDtos.length > 0) {
          const nuevos = institucionDtos.map(inst => ({
            id: inst.id,
            nombre: inst.nombre,
            abreviatura: inst.nombreTipoInstitucion || ''
          }));
          this.instituciones = [...this.instituciones, ...nuevos];
        }

        const ciudadIds = Array.from(new Set(this.registrosOriginales.map(r => r.ciudad)));
        const missingCiudadIds = ciudadIds.filter(id => !this.ciudades.find(c => c.id === id));
        if (missingCiudadIds.length > 0) {
          const allMunicipios: DropdownItem[] = (await this.ubicacionesGeograficasService.getAllForDropdown().toPromise()) || [];
          const nuevasCiudades = missingCiudadIds
            .map(id => {
              const found = allMunicipios.find((m) => m.id === id);
              return found ? { id: found.id, nombre: found.nombre } : null;
            })
            .filter((c): c is { id: string, nombre: string } => !!c);
          if (nuevasCiudades.length > 0) {
            this.ciudades = [...this.ciudades, ...nuevasCiudades];
          }
        }

        this.registros = this.registrosOriginales
          .map((registro) => {
            const tipoTituloNombre =
              this.tiposTitulo.find((t) => t.id === registro.tipoTitulo)?.nombre || registro.tipoTitulo;
            const paisNombre =
              this.paises.find((p) => p.id === registro.pais)?.nombre || registro.pais;
            
            const ciudadCompleta = this.ciudades.find((c) => c.id === registro.ciudad)?.nombre || registro.ciudad;
            const ciudadParaMostrar = this.extraerNombreCiudad(ciudadCompleta);
            
            const foundInstitucion = this.instituciones.find((i) => i.id === registro.institucion);
            return {
              ...registro,
              tipoTitulo: tipoTituloNombre,
              pais: paisNombre,
              ciudad: registro.ciudad,              
              ciudadNombre: ciudadParaMostrar,      
              ciudadCompleta: ciudadCompleta,       
              institucionNombre: foundInstitucion?.nombre || registro.institucion,
              archivos: (registro as any).archivos ?? (registro as any).archivosSubidos ?? (registro as any).archivosAdjuntos ?? [],
            };
          });
          this.hojaVidaStatusService.updateSectionByRecordCount(
            'informacion-academica',
            this.registros.length
          );
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error cargando registros',
        });
        this.hojaVidaStatusService.updateSectionByRecordCount('informacion-academica', 0);
      },
    });
  }

  guardar(): void {
    this.isValidating = true;
    
    this.marcarCamposComoTocados();
    this.form.updateValueAndValidity({ emitEvent: false });
    
    this.isValidating = false;
    
    const camposInvalidos: string[] = [];
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        camposInvalidos.push(key);
      }
    });
    
    if (camposInvalidos.length > 0) {
    }
    
    if (!this.form.valid) {
      const primerCampoInvalido = this.encontrarPrimerCampoInvalido();
      if (primerCampoInvalido) {
        this.scrollYEnfocarCampo(primerCampoInvalido);
        this.messageService.add({
          severity: 'warn',
          summary: 'Formulario incompleto',
          detail: `Por favor complete el campo: ${this.obtenerEtiquetaCampo(primerCampoInvalido)}`,
          life: 5000
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Formulario incompleto',
          detail: 'Por favor complete todos los campos requeridos',
        });
      }
      return;
    }

    const enCurso = this.form.get('enCurso')?.value;
    if (enCurso !== true) {
      if (this.editingId) {
        const tieneDiploma = !!this.diplomaFileId || this.diplomaExistingFiles.length > 0;
        const tieneActa = !!this.actaFileId || this.actaExistingFiles.length > 0;
        const tieneApostilla = !!this.apostillaFileId || this.apostillaExistingFiles.length > 0;
        
        if (!tieneDiploma) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe cargar el archivo del diploma',
          });
          return;
        }
        
        if (!tieneActa) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe cargar el archivo del acta de grado',
          });
          return;
        }
        
        if (this.requiereApostilla && !tieneApostilla) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe cargar el archivo de apostilla para títulos internacionales',
          });
          return;
        }
      } else {
        if (!this.diplomaFileId) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe subir el archivo del diploma',
          });
          return;
        }
        
        if (!this.actaFileId) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe subir el archivo del acta de grado',
          });
          return;
        }
        
        if (this.requiereApostilla && !this.apostillaFileId) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo requerido',
            detail: 'Debe subir el archivo de apostilla para títulos internacionales',
          });
          return;
        }
      }
    }

    if (!this.personaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se ha identificado la persona',
      });
      return;
    }

    if (this.isLoading || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.cdr.detectChanges(); 
    
    const institucionValue = this.form.value.institucion;
    const institucionNombre =
      institucionValue && typeof institucionValue === 'object'
        ? institucionValue.nombre
        : institucionValue;
    
    const tipoTituloNombre = this.tiposTitulo.find(t => t.id === this.form.value.tipoTitulo)?.nombre || this.form.value.tipoTitulo;
    const paisNombre = this.paises.find(p => p.id === this.form.value.pais)?.nombre || this.form.value.pais;
    const ciudadNombre = this.ciudades.find(c => c.id === this.form.value.ciudad)?.nombre || this.form.value.ciudad;
    
    let departamentoNombre = null;
    if (this.esColombia && this.form.value.departamento) {
      departamentoNombre = this.departamentos.find(d => d.id === this.form.value.departamento)?.nombre;
    }
    
    let ciudadCompleta = ciudadNombre;
    if (departamentoNombre) {
      ciudadCompleta = `${ciudadNombre}, ${departamentoNombre}`;
    }
    
    
    const tituloValue = this.form.value.titulo;
    const tituloTexto = tituloValue && typeof tituloValue === 'object' 
      ? tituloValue.titulo 
      : tituloValue;

    const archivosIds = {
      diploma: this.diplomaFileId,
      acta: this.actaFileId,
      ...(this.requiereApostilla && { apostilla: this.apostillaFileId })
    };

    const payload = {
      ...this.form.value,
      ...(this.editingId && { id: this.editingId }), 
      persona: this.personaId,
      tipoTitulo: tipoTituloNombre,   
      titulo: tituloTexto,            
      enCurso: this.form.value.enCurso,
      pais: paisNombre,               
      departamento: departamentoNombre, 
      ciudad: ciudadCompleta,         
      institucion: institucionNombre, 
      fechaInicio: this.formatearFecha(this.form.value.fechaInicio),
      fechaGrado: this.formatearFecha(this.form.value.fechaGrado),
      archivosIds: archivosIds,
    };
    
    const operacion = this.editingId
      ? this.servicio.actualizarRegistro(payload)
      : this.servicio.guardarRegistro(payload);

    operacion.subscribe({
      next: async (response) => {
        if (this.editingId) {
          try {
            const confirmaciones = [];
            if (this.diplomaAttachment) {
              confirmaciones.push(
                this.diplomaAttachment.confirmDeferredDeletions()
              );
            }
            
            if (this.actaAttachment) {
              confirmaciones.push(
                this.actaAttachment.confirmDeferredDeletions()
              );
            }
            
            if (this.apostillaAttachment) {
              confirmaciones.push(
                this.apostillaAttachment.confirmDeferredDeletions()
                );
            }
            
            await Promise.allSettled(confirmaciones);
            
          } catch (error) {
          }
        }
        
        if (response.id) {
          try {
            const asociaciones = [];
            
            if (this.diplomaFileId) {
              asociaciones.push(
                this.http.put(
                  `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.diplomaFileId}/info_academica/${response.id}`,
                  { tipoDocumento: 'diploma' }
                ).toPromise()
              );
            }
            
            if (this.actaFileId) {
              asociaciones.push(
                this.http.put(
                  `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.actaFileId}/info_academica/${response.id}`,
                  { tipoDocumento: 'acta' }
                ).toPromise()
              );
            }
            
            if (this.apostillaFileId && this.requiereApostilla) {
              asociaciones.push(
                this.http.put(
                  `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.apostillaFileId}/info_academica/${response.id}`,
                  { tipoDocumento: 'apostilla' }
                ).toPromise()
              );
            }
            
            await Promise.all(asociaciones);
          
            
          } catch (error) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Registro guardado pero hubo un problema asociando los archivos',
            });
          }
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editingId
            ? 'Registro actualizado correctamente'
            : 'Registro guardado correctamente',
        });
        
        this.mostrarDialogo = false;
        this.limpiarFormularioCompleto();
        this.cargarRegistros(); 
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al guardar el registro',
        });
      },
    }).add(() => {
      this.isSubmitting = false;
      this.isLoading = false;
      this.cdr.detectChanges(); 
    });
  }

async editarRegistro(
  registro: InformacionAcademica & { 
    tipoTitulo: string; 
    pais: string; 
    departamento?: string | null; 
    ciudad: string; 
    ciudadNombre?: string | null;
    ciudadCompleta?: string | null; 
    institucion: string;
    modalidad?: string | null;
    archivoTitulo?: string | null;
  }
): Promise<void> {
  this.editingId = registro.id ?? null;

  this.limpiarFormularioCompleto();
  
  this.editingId = registro.id ?? null;

  // Show dialog immediately with loading state
  this.isLoadingEdit = true;
  this.mostrarDialogo = true;
  this.cdr.detectChanges();

  this.fileAttachmentConfig = {
    ...this.fileAttachmentConfig,
    recordId: registro.id || undefined
  };
  this.diplomaConfig = {
    ...this.diplomaConfig,
    recordId: registro.id || undefined
  };
  
  this.actaConfig = {
    ...this.actaConfig,
    recordId: registro.id || undefined
  };
  
  this.apostillaConfig = {
    ...this.apostillaConfig,
    recordId: registro.id || undefined
  };

  this.archivoOriginalId = null;
  this.archivoPendienteEliminacion = false;

  this._hadFilesOnOpen = !!(registro.archivos && registro.archivos.length > 0);

  this._originalDiplomaFileId = null;
  this._originalActaFileId = null;
  this._originalApostillaFileId = null;


  if (registro.archivos && registro.archivos.length > 0) {
    registro.archivos.forEach(archivo => {
      const fileInfo: FileInfoS = {
        id: archivo.id,
        name: archivo.nombre,
        size: 0,
        type: 'application/pdf',
        uploadDate: new Date(),
        url: this.fileAttachmentService.getDownloadUrl(archivo.id)
      };
      
      const nombreLower = archivo.nombre.toLowerCase();
      const tipo = archivo.tipoDocumento; 
      
      if (tipo === 'diploma' || nombreLower.includes('diploma')) {
        this.diplomaFileId = archivo.id;
        this._originalDiplomaFileId = archivo.id;
        this.diplomaExistingFiles = [fileInfo];
      } else if (tipo === 'acta' || nombreLower.includes('acta')) {
        this.actaFileId = archivo.id;
        this._originalActaFileId = archivo.id; 
        this.actaExistingFiles = [fileInfo];
      } else if (tipo === 'apostilla' || nombreLower.includes('apostilla') || nombreLower.includes('convalidacion') || nombreLower.includes('apostille')) {
        this.apostillaFileId = archivo.id;
        this._originalApostillaFileId = archivo.id; 
        this.apostillaExistingFiles = [fileInfo];
      } else {
        if (!this.diplomaFileId) {
          this.diplomaFileId = archivo.id;
          this._originalDiplomaFileId = archivo.id;
          this.diplomaExistingFiles = [fileInfo];
        } else if (!this.actaFileId) {
          this.actaFileId = archivo.id;
          this._originalActaFileId = archivo.id; 
          this.actaExistingFiles = [fileInfo];
        } else if (!this.apostillaFileId) {
          this.apostillaFileId = archivo.id;
          this._originalApostillaFileId = archivo.id; 
          this.apostillaExistingFiles = [fileInfo];
        }
      }
    });
    
    this.uploadedFileId = registro.archivos[0].id;
    this.archivoOriginalId = registro.archivos[0].id;
    this.archivoPendienteEliminacion = false;
    this.existingFiles = registro.archivos.map(archivo => ({
      id: archivo.id,
      name: archivo.nombre,
      size: 0,
      type: 'application/octet-stream',
      uploadDate: new Date(),
      url: this.fileAttachmentService.getDownloadUrl(archivo.id)
    }));
    
  } else {
    this.uploadedFileId = null;
    this.existingFiles = [];
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    
    this.diplomaFileId = null;
    this.actaFileId = null;
    this.apostillaFileId = null;
    this.diplomaExistingFiles = [];
    this.actaExistingFiles = [];
    this.apostillaExistingFiles = [];
  }

  this.fileError = null;
  this.selectedFile = null;

  const registroOriginal = registro;

  
  const paisNombre = registro.pais; 
  const departamentoNombre = registro.departamento; 
  let nombreCiudad = registro.ciudad;
  if (nombreCiudad && nombreCiudad.includes(',')) {
    nombreCiudad = nombreCiudad.split(',')[0].trim();
  }

  this.esColombia = !!(paisNombre && paisNombre.toLowerCase().includes('colombia'));
  
  let paisId: string | null = null;
  let departamentoId: string | null = null;
  let ciudadId: string | null = null;

  try {
    paisId = await this.obtenerPaisIdPorNombre(paisNombre);
    if (paisId) {
      const estructura = await this.determinarEstructuraGeografica(paisId);
      this.hasStates = estructura === 'states';

      if (this.hasStates && departamentoNombre && nombreCiudad) {
        await this.cargarDepartamentosPorPais(paisId);
        const departamentoEncontrado = this.departamentos.find(d => 
          d.nombre.toLowerCase().trim() === departamentoNombre.toLowerCase().trim()
        );
        departamentoId = departamentoEncontrado?.id || null;
        
        if (departamentoId) {
          await this.cargarCiudadesPorDepartamento(departamentoId);
          const ciudadEncontrada = this.ciudades.find(c => 
            c.nombre.toLowerCase().trim() === nombreCiudad.toLowerCase().trim()
          );
          ciudadId = ciudadEncontrada?.id || null;
        }
      } else if (!this.hasStates && nombreCiudad) {
        await this.cargarCiudadesPorPais(paisId);
        const ciudadEncontrada = this.ciudades.find(c => 
          c.nombre.toLowerCase().trim() === nombreCiudad.toLowerCase().trim()
        );
        ciudadId = ciudadEncontrada?.id || null;
      }
    }
  } catch (error) {
  }

 
  let tipoTituloId = registroOriginal.tipoTitulo;
  const institucionId = registroOriginal.institucion;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tipoTituloId)) {
    const tipoTituloIdResuelto = await this.buscarTipoTituloIdPorNombre(tipoTituloId);
    if (tipoTituloIdResuelto) {
      tipoTituloId = tipoTituloIdResuelto;
    }
  }

  let institucionObj: DropdownItem | null = null;
  if (institucionId) {
    institucionObj = this.instituciones.find(i => i.id === institucionId) || null;
    
    if (!institucionObj) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        let institucionApi;
        if (uuidRegex.test(institucionId)) {
          institucionApi = await this.generalInstitucionesService.getById(institucionId).toPromise();
        } else {
          institucionApi = await this.oracleInstitucionesService.getByNombreExacto(institucionId).toPromise();
        }
        
        if (institucionApi) {
          institucionObj = {
            id: institucionApi.id,
            nombre: institucionApi.nombre,
            abreviatura: (institucionApi as any).nombreTipoInstitucion || ''
          };
          this.instituciones = [...this.instituciones, institucionObj];
          this.institucionesFiltered = [...this.institucionesFiltered, institucionObj];
        }
      } catch (error) {
        institucionObj = null;
      }
    }
  }
  
  this.isPrecargandoDatos = true;
  
  try {
    const registroSinConflictos = { ...registroOriginal };
    delete (registroSinConflictos as any).tipoTitulo;
    delete (registroSinConflictos as any).pais;
    delete (registroSinConflictos as any).departamento;
    delete (registroSinConflictos as any).ciudad;
    delete (registroSinConflictos as any).institucion;

    
    this.form.patchValue({
      ...registroSinConflictos,
      tipoTitulo: tipoTituloId,
      institucion: institucionObj,
      pais: paisId || null,
      departamento: (departamentoId && this.esColombia) ? departamentoId : null,
      ciudad: ciudadId || null,
      fechaInicio: registroOriginal.fechaInicio ? new Date(registroOriginal.fechaInicio) : null,
      fechaGrado: registroOriginal.fechaGrado ? new Date(registroOriginal.fechaGrado) : null
    }, { emitEvent: false }); 
    
    const enCursoControl = this.form.get('enCurso');
    if (enCursoControl?.value) {
      const fechaGradoControl = this.form.get('fechaGrado');
      const tarjetaProfesionalControl = this.form.get('tarjetaProfesional');
      const numeroActaControl = this.form.get('numeroActa');
      const anosCursadosControl = this.form.get('anosCursados');
      
      fechaGradoControl?.setValue(new Date('9999-12-31'));
      fechaGradoControl?.clearValidators();
      fechaGradoControl?.disable();
      
      tarjetaProfesionalControl?.setValue(false);
      tarjetaProfesionalControl?.disable();
      
      numeroActaControl?.clearValidators();
      numeroActaControl?.updateValueAndValidity();
      
      anosCursadosControl?.clearValidators();
      anosCursadosControl?.setValidators([Validators.min(0)]);
      anosCursadosControl?.updateValueAndValidity();
      
      fechaGradoControl?.updateValueAndValidity();
      tarjetaProfesionalControl?.updateValueAndValidity();
      numeroActaControl?.updateValueAndValidity();
      anosCursadosControl?.updateValueAndValidity();
    }
    
    this.actualizarConfiguracionArchivos();
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
    
    if (paisId) {
      this.form.get('pais')?.markAsTouched();
    }
    if (departamentoId) {
      this.form.get('departamento')?.markAsTouched();
    }
    if (ciudadId) {
      this.form.get('ciudad')?.markAsTouched();
    }
    
  } catch (error) {
  }

  if (this.hasStates) {
    const departamentoControl = this.form.get('departamento');
    departamentoControl?.setValidators([CustomValidators.requiredWithTouched]);
    departamentoControl?.updateValueAndValidity({ emitEvent: false });
  }

  // Mostrar el formulario: *ngIf="!isLoadingEdit" crea los componentes del form.
  // isPrecargandoDatos se mantiene true para que las suscripciones de valueChanges
  // no disparen onPaisChange/onDepartamentoChange durante la creación inicial.
  this.isLoadingEdit = false;
  this.cdr.detectChanges();

  this.isPrecargandoDatos = false;
  this.saveFormSnapshot();
}

abrirDialogo(): void {
  this.editingId = null;
  this.limpiarFormularioCompleto();
  
  this.fileAttachmentConfig = {
    ...this.fileAttachmentConfig,
    recordId: undefined
  };
  
  this.diplomaConfig = {
    ...this.diplomaConfig,
    recordId: undefined
  };
  
  this.actaConfig = {
    ...this.actaConfig,
    recordId: undefined
  };
  
  this.apostillaConfig = {
    ...this.apostillaConfig,
    recordId: undefined
  };
  
  this._hadFilesOnOpen = false;
  
  this.actualizarConfiguracionArchivos();
  
  this.mostrarDialogo = true;
}

async cancelarEdicion() {
    const puedeSerrarSinArchivos = !this._hadFilesOnOpen;
    const tieneArchivos = this.hasFileAttached();
    
    if (this.editingId && !tieneArchivos && !puedeSerrarSinArchivos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cancelar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro no puede quedar sin soporte.'
      });
      return;
    }
    
    if (this.editingId && this.archivoPendienteEliminacion && this.fileAttachment) {
      try {
        await this.fileAttachment.cancelMarkedDeletions();
        } catch (error) {
      }
    }
    
    this.editingId = null;
    this.mostrarDialogo = false;
    this.resetFormulario();
    this.limpiarFormularioCompleto();
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.diplomaConfig = {
      ...this.diplomaConfig,
      recordId: undefined
    };
    
    this.actaConfig = {
      ...this.actaConfig,
      recordId: undefined
    };
    
    this.apostillaConfig = {
      ...this.apostillaConfig,
      recordId: undefined
    };
    
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    this._hadFilesOnOpen = false;
  }

  cerrarDialogo(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const puedeSerrarSinArchivos = !this._hadFilesOnOpen;
    const tieneArchivos = this.hasFileAttached();

    if (this.editingId && !tieneArchivos && !puedeSerrarSinArchivos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cerrar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro requiere al menos un archivo de soporte.'
      });
      return; 
    }

    this.mostrarDialogo = false;
    this.onDialogHide();
  }

  async onDialogHide() {
    
    if (this.tituloAutocomplete) {
      this.tituloAutocomplete.closePanel();
    }
    
    const puedeSerrarSinArchivos = !this._hadFilesOnOpen;
    const tieneArchivos = this.hasFileAttached();
    
    if (this.editingId && !tieneArchivos && !puedeSerrarSinArchivos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cerrar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro requiere al menos un archivo de soporte.'
      });
      setTimeout(() => {
        this.mostrarDialogo = true;
        this.cdr.markForCheck();
      }, 100);
      return; 
    }
    
    if (this.editingId) {
      try {
        if (this.diplomaAttachment) {
          this.diplomaAttachment.cancelDeferredDeletions();
        }
        
        if (this.actaAttachment) {
          this.actaAttachment.cancelDeferredDeletions();
        }
        
        if (this.apostillaAttachment) {
          this.apostillaAttachment.cancelDeferredDeletions();
        }
      } catch (error) {
      }
    }

    this.editingId = null;
    this.isLoadingEdit = false;

    if (!this.isLoading) {
      this.resetFormulario();
      this.limpiarFormularioCompleto();
      
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
      this._hadFilesOnOpen = false;
    }
  }

  hasFileAttached(): boolean {
    return this.validarArchivosRequeridos();
  }

  isEditingWithoutFile(): boolean {
    return !!this.editingId && !this.hasFileAttached();
  }

  private limpiarFormularioCompleto(): void {
    this.form.reset();
    
    this.isLoading = false;
    this.isSubmitting = false;
    
    this._originalFormValues = {};
    this._originalFileId = null;
    
    this._hadFilesOnOpen = false;
    
    this._originalDiplomaFileId = null;
    this._originalActaFileId = null;
    this._originalApostillaFileId = null;
    
    if (!this.editingId) {
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
    }
    
    if (!this.editingId) {
      this.selectedFile = null;
      this.uploadedFileId = null;
      this.fileError = null;
      this.existingFiles = [];
      this.diplomaFileId = null;
      this.actaFileId = null;
      this.apostillaFileId = null;
      this.diplomaExistingFiles = [];
      this.actaExistingFiles = [];
      this.apostillaExistingFiles = [];
      this.requiereApostilla = false;
    }
    
    this.form.patchValue({
      modalidad: { value: null, disabled: true },
      tarjetaProfesional: false,
      bachillerato: false,
      horasDuracion: 0,
      anosCursados: 0,
    });
    
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.setErrors(null);
    });
    
    if (!this.editingId) {
      this.departamentos = [];
      this.ciudades = [];
      this.institucionesFiltered = [];
    }
    
    }

  eliminarRegistro(id: string): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este registro de información académica?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.fileAttachmentService.deleteFileAssociationsByRecord(id, 'info_academica').subscribe({
          next: (deletedFileIds) => {
            this.eliminarRegistroFinal(id);
          },
          error: (error: any) => {
            this.eliminarRegistroFinal(id);
          }
        });
      }
    });
  }

  private eliminarRegistroFinal(id: string): void {
    this.servicio.eliminarRegistro(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Registro eliminado correctamente',
        });
        this.cargarRegistros(); 
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al eliminar el registro',
        });
      },
    });
  }

  private markAllAsTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.markAsTouched();
    });
  }

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  public getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control?.errors || !(control.touched || control.dirty)) return '';

    const errors = control.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];
      
      if ((errorKey === 'maxlength' || errorKey === 'minlength') && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages[errorKey];
        return msg || `${errorKey === 'maxlength' ? 'Máximo' : 'Mínimo'} ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (errorKey === 'min' && errorValue && 'min' in errorValue) {
        const msg = fieldMessages[errorKey];
        return msg || `El valor mínimo es ${(errorValue as any).min}`;
      }
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['requiredTouched']) return 'Este campo es obligatorio';
    if (errors['nameInvalid']) return 'Solo se permiten letras y espacios';
    if (errors['email']) return 'Correo electrónico inválido';
    if (errors['minlength']) return `Mínimo ${(errors['minlength'] as any).requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${(errors['maxlength'] as any).requiredLength} caracteres`;
    if (errors['min']) return `El valor mínimo es ${(errors['min'] as any).min}`;

    return 'Campo inválido';
  }

  private resetFormulario(): void {
    this.form.reset();
    
    if (!this.editingId) {
      this.selectedFile = null;
      this.uploadedFileId = null;
      this.fileError = null;
      this.existingFiles = [];
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
    }
    
    this.form.patchValue({
      modalidad: { value: null },
      tarjetaProfesional: false,
      bachillerato: false,
      horasDuracion: 0,
      anosCursados: 0,
    });
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.markAsPristine();
      this.form.get(key)?.markAsUntouched();
    });
  }

  private formatearFecha(fecha: Date | null | undefined): string | null {
    if (!fecha) return null;

    if (fecha.getFullYear() === 9999 && fecha.getMonth() === 11 && fecha.getDate() === 31 && this.form.value.enCurso) {
      return null;
    }

    return fecha.toISOString();
  }

  permitirSoloLetrasNumeros(event: KeyboardEvent): void {
    const regex = /^[a-zA-Z0-9 ]$/;
    if (!regex.test(event.key)) {
      event.preventDefault();
    }
  }

  validarTipoTitulo(): void {
    this.form.get('tipoTitulo')?.valueChanges.subscribe((valor) => {
      const modalidadControl = this.form.get('modalidad');
      const bachilleratoControl = this.form.get('bachillerato');
      if (valor === 'Secundaria') {
        modalidadControl?.enable();
        bachilleratoControl?.setValue(true);
        bachilleratoControl?.disable();
      } else {
        modalidadControl?.reset();
        modalidadControl?.disable();
        bachilleratoControl?.setValue(false);
        bachilleratoControl?.enable();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ];
      if (!validTypes.includes(this.selectedFile.type)) {
        this.fileError = 'Solo se permiten archivos PDF, DOC, DOCX, JPG o PNG.';
        this.selectedFile = null;
      } else if (this.selectedFile.size > 20 * 1024 * 1024) {
        this.fileError = 'El archivo no puede exceder los 20MB.';
        this.selectedFile = null;
      } else {
        this.fileError = null;
      }
    }
  }

  buscarInstituciones(filtro: string): void {
    if (!filtro || filtro.length < 3) {
      this.institucionesFiltered = [];
      return;
    }

    this.isLoadingInstituciones = true;

    this.generalInstitucionesService
      .searchAsDropdownItems(filtro)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (instituciones: DropdownItem[]) => {
          this.institucionesFiltered = instituciones;
          this.isLoadingInstituciones = false;
        },
        error: (_error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error buscando instituciones',
          });
          this.isLoadingInstituciones = false;
          this.institucionesFiltered = [];
        },
      });
  }

  onInstitucionSelected(event: { value: DropdownItem }): void {
    if (event.value && event.value.id) {
      this.form.patchValue({
        institucion: event.value,
      });
    }
  }

  onInstitucionCleared(): void {
    this.form.patchValue({
      institucion: null,
    });
  }

  onTituloEspecificoSeleccionado(titulo: TituloAcademicoSimple | null): void {
    if (titulo) {
      }
  }

  onDepartamentoSeleccionado(departamentoId: string): void {
    if (this.isPrecargandoDatos) {
      return;
    }
    
    if (departamentoId) {
      const mantenerCiudad = !!this.editingId;
      this.onDepartamentoChange(departamentoId, mantenerCiudad);
    }
  }

  onPaisSeleccionado(paisId: string): void {
    if (this.isPrecargandoDatos) {
      return;
    }
    
    if (paisId) {
      this.onPaisChange(paisId);
    }
  }

  previewArchivo(id: string): void {
    const downloadUrl = this.fileAttachmentService.getDownloadUrl(id);
    
    this.http.get(downloadUrl, { 
      responseType: 'blob'
    }).subscribe({
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
          detail: 'No se pudo abrir el archivo para vista previa'
        });
      }
    });
  }

  onArchivoTituloUploaded(id: string) {
    this.uploadedFileId = id;
    this.fileError = null;
  }

  onArchivoTituloUploadedObj(file: { id: string }) {
    this.uploadedFileId = file.id;
    this.fileError = null;
  }

  onArchivoTituloError(msg: string) {
    this.fileError = msg;
    this.uploadedFileId = null;
  }

  onFilesSelected(files: File[]): void {
  }

  onFilesUploaded(files: FileInfoS[]): void {
    if (files && files.length > 0) {
      this.uploadedFileId = files[0].id;
      this.existingFiles = files;
      this.fileError = null;
      
      if (this.editingId) {
        this.cdr.detectChanges();
      }
    }
  }
  
  onDiplomaUploaded(files: FileInfoS[]): void {
    if (files && files.length > 0) {
      this.diplomaFileId = files[0].id;
      this.diplomaExistingFiles = files;
      
      if (this.editingId) {
        this.cdr.detectChanges();
      }
    }
  }
  
  onActaUploaded(files: FileInfoS[]): void {
    if (files && files.length > 0) {
      this.actaFileId = files[0].id;
      this.actaExistingFiles = files;
      
      if (this.editingId) {
        this.cdr.detectChanges();
      }
    }
  }
  
  onApostillaUploaded(files: FileInfoS[]): void {
    if (files && files.length > 0) {
      this.apostillaFileId = files[0].id;
      this.apostillaExistingFiles = files;
      
      if (this.editingId) {
        this.cdr.detectChanges();
      }
    }
  }
  
  validarArchivosRequeridos(): boolean {
    const enCurso = this.form.get('enCurso')?.value;
    if (enCurso === true) {
      return true;
    }
    
    const tieneDiploma = !!this.diplomaFileId;
    const tieneActa = !!this.actaFileId;
    const tieneApostilla = !!this.apostillaFileId;
    
    if (this.requiereApostilla) {
      return tieneDiploma && tieneActa && tieneApostilla;
    } else {
      return tieneDiploma && tieneActa;
    }
  }
  
  onDiplomaDeleted(fileId: string): void {
    this.diplomaFileId = null;
    this.diplomaExistingFiles = [];
    this.cdr.detectChanges();
  }
  
  onDiplomaMarkedForDeletion(fileId: string): void {
    if (!this._originalDiplomaFileId) {
      this._originalDiplomaFileId = fileId;
    }
    
    this.diplomaFileId = null;
    this.diplomaExistingFiles = this.diplomaExistingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo de diploma se eliminará al guardar con un archivo de reemplazo'
    });
    
    this.cdr.detectChanges();
  }
  
  onActaDeleted(fileId: string): void {
    this.actaFileId = null;
    this.actaExistingFiles = [];
    this.cdr.detectChanges();
  }
  onActaMarkedForDeletion(fileId: string): void {
    if (!this._originalActaFileId) {
      this._originalActaFileId = fileId;
    }
    
    this.actaFileId = null;
    this.actaExistingFiles = this.actaExistingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo de acta se eliminará al guardar con un archivo de reemplazo'
    });
    
    this.cdr.detectChanges();
  }
  
  onApostillaDeleted(fileId: string): void {
    this.apostillaFileId = null;
    this.apostillaExistingFiles = [];
    this.cdr.detectChanges();
  }
  
  onApostillaMarkedForDeletion(fileId: string): void {
    if (!this._originalApostillaFileId) {
      this._originalApostillaFileId = fileId;
    }
    
    this.apostillaFileId = null;
    this.apostillaExistingFiles = this.apostillaExistingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo de apostilla se eliminará al guardar con un archivo de reemplazo'
    });
    
    this.cdr.detectChanges();
  }

  onValidationComplete(result: PdfValidationResult): void {

    if (result.isValid) {
      this.messageService.add({
        severity: 'success',
        summary: 'Documento Válido',
        detail: `Certificado educativo validado y subido correctamente (${Math.round(result.confidence * 100)}% confianza).`
      });
      } else {
      const errorDetail = result.message || 'El documento no cumple con los criterios de validación para certificados educativos.';
      this.fileError = errorDetail;
      
      this.messageService.add({
        severity: 'error',
        summary: 'Documento No Válido',
        detail: errorDetail + ' Por favor, suba un certificado educativo válido.'
      });
    }
  }

  onFileDeleted(fileId: string): void {
    if (!fileId) {
      return;
    }

    this.fileAttachmentService.deleteUploadedFile(fileId).subscribe({
      next: () => {
        this.uploadedFileId = null;
        this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Archivo eliminado correctamente'
        });
      },
      error: (delErr: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el archivo'
        });
      }
    });
  }

  onFileMarkedForDeletion(fileId: string): void {
    
    if (!this.archivoOriginalId) {
      this.archivoOriginalId = fileId;
    }
    
    this.archivoPendienteEliminacion = true;
    
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
      this.selectedFile = null;
    }
    
    this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo se eliminará al guardar el registro con un archivo de reemplazo'
    });
    
    if (this.editingId) {
      this.cdr.detectChanges();
    }
  }

  onFileAttachmentUploadError(error: string): void {
    this.fileError = error;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: error });
  }

  onFilePreview(file: FileInfoS): void {
    if (!file.id && !file.url) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede previsualizar el archivo' 
      });
      return;
    }

    if (file.id) {
      this.previewArchivo(file.id);
    } else if (file.url) {
      this.http.get(file.url, { responseType: 'blob' })
        .subscribe({
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
              detail: 'No se pudo abrir el archivo para vista previa'
            });
          }
        });
    }
  }

  onRealUploadNeeded(files: File[]): void {
    if (!files || files.length === 0) {
      return;
    }

    if (!this.personaId) {
      const errorMsg = 'ID de persona no disponible. No se puede subir el archivo.';

      this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
      return;
    }

    const uploadObservables = files.map(file => 
      this.fileAttachmentService.uploadFile(file, this.fileAttachmentConfig, this.personaId!)
    );

    forkJoin(uploadObservables).pipe(takeUntil(this.destroy$)).subscribe({
      next: (responses: any[]) => {
        const uploadedFiles: FileInfoS[] = responses.map((r, idx) => ({
          id: r.id,
          name: r.nombre || files[idx]?.name || 'archivo',
          size: r.tamano || files[idx]?.size || 0,
          type: r.tipoContenido || files[idx]?.type || 'application/octet-stream',
          uploadDate: new Date(r.fechaSubida || Date.now()),
          url: this.fileAttachmentService.getDownloadUrl(r.id)
        }));

        this.existingFiles = uploadedFiles;
        this.uploadedFileId = uploadedFiles[0]?.id || null;
        if (uploadedFiles.length > 0) this.uploadedFileId = uploadedFiles[0].id;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivo(s) subido(s) correctamente' });
      },
      error: (err) => {
        const msg = err?.message || 'Error subiendo archivos';
        this.fileError = msg;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      }
    });
  }

  abrirDialogoCiudades(): void {
    this.mostrarDialogoCiudades = true;
  }

  cerrarDialogoCiudades(): void {
    this.mostrarDialogoCiudades = false;
  }

  async seleccionarCiudad(ciudadSeleccionada: {
    id: string, 
    nombre: string, 
    departamento: string, 
    departamentoId: string,
    pais: string
  }): Promise<void> {
    try {
      const paisId = await this.obtenerPaisIdPorNombre(ciudadSeleccionada.pais);
      
      if (ciudadSeleccionada.pais.toLowerCase().includes('colombia')) {
        this.esColombia = true;
        
        if (paisId) {
          await new Promise<void>(resolve => {
            this.cargarDepartamentosPorPais(paisId);
            setTimeout(resolve, 200);
          });
        }
        
        if (!this.departamentos.some(d => d.id === ciudadSeleccionada.departamentoId)) {
          this.departamentos.push({
            id: ciudadSeleccionada.departamentoId,
            nombre: ciudadSeleccionada.departamento
          });
        }
        
        await this.cargarCiudadesPorDepartamento(ciudadSeleccionada.departamentoId);
        
        const departamentoControl = this.form.get('departamento');
        departamentoControl?.setValidators([CustomValidators.requiredWithTouched]);
        departamentoControl?.updateValueAndValidity();
      }
      
      if (!this.ciudades.some(c => c.id === ciudadSeleccionada.id)) {
        this.ciudades.push({
          id: ciudadSeleccionada.id,
          nombre: ciudadSeleccionada.nombre
        });
      }
      
      this.form.patchValue({
        pais: paisId,
        departamento: this.esColombia ? ciudadSeleccionada.departamentoId : '',
        ciudad: ciudadSeleccionada.id
      });
      
      this.cerrarDialogoCiudades();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Ciudad actualizada',
        detail: `Se seleccionó ${ciudadSeleccionada.nombre}, ${ciudadSeleccionada.departamento}`
      });
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la ciudad seleccionada'
      });
    }
  }

  
  private async obtenerPaisIdPorNombre(nombrePais: string): Promise<string | null> {
    const paisEncontrado = this.paises.find(p => 
      p.nombre.toLowerCase().includes(nombrePais.toLowerCase())
    );
    
    if (paisEncontrado) {
      return paisEncontrado.id;
    }
    
    try {
      const ubicacion = await this.ubicacionesGeograficasService
        .getByNombreExacto(nombrePais).toPromise();
      
      if (ubicacion) {
        this.paises.push({ id: ubicacion.id, nombre: ubicacion.nombre });
        return ubicacion.id;
      }
    } catch (error) {
    }
    
    return null;
  }

  private extraerNombreCiudad(ciudadCompleta: string): string {
    if (!ciudadCompleta) return '';
    
    const partes = ciudadCompleta.split(',');
    return partes[0].trim();
  }

  private async buscarTipoTituloIdPorNombre(nombreTipo: string): Promise<string | null> {
    try {
      const tipoLocal = this.tiposTitulo.find(t => 
        t.nombre.toLowerCase().trim() === nombreTipo.toLowerCase().trim()
      );
      
      if (tipoLocal) {
        return tipoLocal.id;
      }

      const tipoDto = await this.listasValoresService
        .getByNombreExacto(nombreTipo).toPromise();
      
      if (tipoDto && tipoDto.nombre !== 'Tipo de Título') {
        this.tiposTitulo.push({ id: tipoDto.id, nombre: tipoDto.nombre });
        return tipoDto.id;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  private marcarCamposComoTocados(): void {
    this.isValidating = true;
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched({ onlySelf: true });
      control?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
    
    this.isValidating = false;
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const controls = this.form.controls;
    for (const name in controls) {
      if (controls[name].invalid && controls[name].touched) {
        return name;
      }
    }
    return null;
  }

  private scrollYEnfocarCampo(nombreCampo: string): void {
    setTimeout(() => {
      const selectores = [
        `[formControlName="${nombreCampo}"]`,
        `#${nombreCampo}`,
        `[name="${nombreCampo}"]`,
        `input[formControlName="${nombreCampo}"]`,
        `select[formControlName="${nombreCampo}"]`,
        `.p-select[formControlName="${nombreCampo}"]`
      ];

      let elemento: HTMLElement | null = null;
      
      for (const selector of selectores) {
        elemento = document.querySelector(selector) as HTMLElement;
        if (elemento) break;
      }

      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          if (elemento) {
            const input = elemento.querySelector('input, select, textarea') as HTMLElement;
            if (input) {
              input.focus();
            } else {
              elemento.focus();
            }
          }
        }, 500);
      }
    }, 100);
  }

  private obtenerEtiquetaCampo(nombreCampo: string): string {
    const etiquetas: { [key: string]: string } = {
      tipoTitulo: 'Tipo de Título',
      titulo: 'Título Obtenido',
      modalidad: 'Modalidad',
      pais: 'País',
      departamento: 'Departamento',
      ciudad: 'Ciudad',
      fechaInicio: 'Fecha de Inicio',
      fechaGrado: 'Fecha de Grado',
      institucion: 'Institución',
      numeroActa: 'Número de Acta',
      horasDuracion: 'Horas de Duración',
      anosCursados: 'Años Cursados',
      distinciones: 'Distinciones'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }
}
