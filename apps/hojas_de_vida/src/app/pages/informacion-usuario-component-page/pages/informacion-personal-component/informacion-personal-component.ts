import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiselectComponent } from '@microfrontends/shared-ui';
import { ConfirmationService, MessageService } from 'primeng/api';
import { forkJoin, map, takeUntil, Subject, debounceTime, of, catchError, Observable } from 'rxjs';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import {
  UbicacionesGeograficasService,
  AuthService,
  KeycloakClientConfigService,
} from '@microfrontends/shared-services';
import { environment } from '@shared/shared-environments';
import {
  DropdownItem,
  UbicacionesGeograficasDto,
} from '@microfrontends/shared-models';
import { PersonasService } from 'apps/hojas_de_vida/src/app/core/services/personas.service';
import { Persona } from 'apps/hojas_de_vida/src/app/core/models/persona.model';
import { ListasValoresService } from '../../../../core/services/listas-valores.service';
import { ListaValor } from '../../../../core/models/lista-valor.model';
import { CentrosCostoOracleService, CentroCostoOracle } from '../../../../core/services/centros-costo-oracle.service';
import { PreferenciasNotificacionesDialogComponent } from '../../../../shared/components/preferencias-notificaciones-dialog/preferencias-notificaciones-dialog.component';

import { 
  InputComponent, 
  SelectComponent, 
  DatepickerComponent
} from '@microfrontends/shared-ui';
import { CustomErrorMessages } from '@microfrontends/shared-models';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import { FotoPerfilService } from '../../../../core/services/foto-perfil.service';


@Component({
  selector: 'app-informacion-personal-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    CheckboxModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    CardModule,
    DatePickerModule,
    InputNumberModule,
    InputComponent,
    SelectComponent,
    MultiselectComponent,
    DatepickerComponent,
  ],
  providers: [ConfirmationService, MessageService, DialogService],
  templateUrl: './informacion-personal-component.html',
  styleUrls: ['./informacion-personal-component.scss'],
})
export class InformacionPersonalComponent implements OnInit, OnDestroy, AfterViewInit {

  private fb = inject(FormBuilder);
  private listasValoresService = inject(ListasValoresService);
  private centrosCostoService = inject(CentrosCostoOracleService);
  private ubicacionesGeograficasService = inject(UbicacionesGeograficasService);
  private personasService = inject(PersonasService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private hojaVidaStatusService = inject(HojaVidaStatusService);
  private fotoPerfilService = inject(FotoPerfilService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialogService = inject(DialogService);
  private httpClient = inject(HttpClient);
  private authService = inject(AuthService);
  private keycloakClientConfig = inject(KeycloakClientConfigService);
  private dialogRef: DynamicDialogRef | null = null;

  private personaIdExterno: string | null = null;
  private modoEdicionTerceros = false;

  form!: FormGroup;

  tiposDocumento: DropdownItem[] = [];
  generos: DropdownItem[] = [];
  estadosCiviles: DropdownItem[] = [];
  sectores: DropdownItem[] = [];
  ciudades: DropdownItem[] = [];
  paises: UbicacionesGeograficasDto[] = [];
  areas: DropdownItem[] = [];  
  etnias: DropdownItem[] = [];
  nacionalidades: DropdownItem[] = [];
  discapacidades: DropdownItem[] = [];

  filiacionPoliticas: DropdownItem[] = [];
  estratos: DropdownItem[] = [];
  libretasMilitares: DropdownItem[] = [];
  dependencias: DropdownItem[] = [];
  centrosCosto: CentroCostoOracle[] = []; 
  
  departamentos: Map<string, UbicacionesGeograficasDto[]> = new Map();
  ciudadesMap: Map<string, DropdownItem[]> = new Map();

  isLoadingDropdowns = false;
  isLoadingUbicaciones: Map<string, boolean> = new Map();
  isLoading = false;
  isSubmitting = false;

  tieneDatosGuardados = false;
  formHasChanges = false; 
  private initialFormValue: any = null;
  private correoOriginal = ''; 

  errorMessage: string | null = null;
  showErrorDetails = false;

  paisContextos: Map<string, { esColombia: boolean; paisId: string }> = new Map();
  
  private paisColombiaId: string | null = null;

  private destroy$ = new Subject<void>();
  
  isLoadingInitial = false;
  identificacionOriginal: string | null = null;
  
  readonly errorMessages = {
    primerNombre: {
      required: 'Por favor, ingrese su primer nombre',
      minlength: 'El primer nombre debe tener al menos 2 caracteres',
      invalidName: 'El primer nombre solo puede contener letras y espacios, no se permiten números ni símbolos'
    } as CustomErrorMessages,
    
    segundoNombre: {
      minlength: 'El segundo nombre debe tener al menos 2 caracteres',
      invalidName: 'El segundo nombre solo puede contener letras y espacios, no se permiten números ni símbolos'
    } as CustomErrorMessages,
    
    primerApellido: {
      required: 'El primer apellido es obligatorio',
      minlength: 'El primer apellido debe tener al menos 2 caracteres',
      invalidName: 'El primer apellido solo puede contener letras y espacios'
    } as CustomErrorMessages,
    
    segundoApellido: {
      minlength: 'El segundo apellido debe tener al menos 2 caracteres',
      invalidName: 'El segundo apellido solo puede contener letras y espacios'
    } as CustomErrorMessages,
    etnia: {
      required: 'La etnia es obligatoria'
    } as CustomErrorMessages,
    
    tipoDocumento: {
      required: 'Debe seleccionar un tipo de documento'
    } as CustomErrorMessages,
    
    identificacion: {
      required: 'El número de identificación es obligatorio',
      invalidDocument: 'El formato del documento no es válido. Verifique que corresponda al tipo seleccionado'
    } as CustomErrorMessages,
    
    fechaNacimiento: {
      required: 'La fecha de nacimiento es obligatoria',
      minimumAge: 'Debe ser mayor de 14 años para completar este formulario',
      maximumAge: 'La edad no puede superar los 100 años',
      futureDate: 'La fecha de nacimiento no puede ser futura'
    } as CustomErrorMessages,
    
    fechaExpedicion: {
      required: 'La fecha de expedición del documento es obligatoria',
      futureDate: 'La fecha de expedición no puede ser futura',
      minimumDocumentAge: 'La fecha de expedición debe ser al menos 16 años después del nacimiento'
    } as CustomErrorMessages,
    
    correo: {
      required: 'El correo electrónico es obligatorio',
      email: 'Por favor, ingrese un correo electrónico válido (ejemplo: usuario@dominio.com)'
    } as CustomErrorMessages,
    
    telefono: {
      invalidPhone: 'El teléfono debe tener entre 7 y 13 dígitos. Solo se permiten números',
      min: 'El teléfono no puede ser un número negativo'
    } as CustomErrorMessages,
    
    celular1: {
      required: 'El número de celular principal es obligatorio',
      invalidCellPhone: 'El celular debe tener entre 10 y 13 dígitos. No incluya espacios ni guiones',
      min: 'El celular no puede ser un número negativo'
    } as CustomErrorMessages,
    celular2: {
      invalidCellPhone: 'El celular secundario debe tener entre 10 y 13 dígitos. No incluya espacios ni guiones',
      min: 'El celular no puede ser un número negativo'
    } as CustomErrorMessages,
    cargoUniversidad: {
      required: 'El cargo en la universidad es obligatorio',
      minlength: 'El cargo debe tener al menos 2 caracteres',
      whitespaceOnly: 'El cargo no puede contener solo espacios en blanco'
    } as CustomErrorMessages,
    dependencia: {
      required: 'La dependencia es obligatoria',
      minlength: 'La dependencia debe tener al menos 2 caracteres',
      whitespaceOnly: 'La dependencia no puede contener solo espacios en blanco'
    } as CustomErrorMessages,
    
    aspiracionSalario: {
      required: 'La aspiración salarial es obligatoria',
      min: 'La aspiración salarial debe ser mayor a $0'
    } as CustomErrorMessages,
    
    filiacionPolitica: {
      required: 'La filiación política es obligatoria'
    } as CustomErrorMessages,
    
    estrato: {
      required: 'El estrato socioeconómico es obligatorio'
    } as CustomErrorMessages,
    
    libretaMilitar: {
      required: 'El número de libreta militar es obligatorio si tiene libreta',
      minlength: 'La libreta militar debe tener al menos 3 caracteres',
      maxlength: 'La libreta militar no puede exceder 15 caracteres'
    } as CustomErrorMessages,
    
    clase: {
      required: 'La clase es obligatoria si tiene libreta',
      min: 'La clase debe ser un número positivo',
      max: 'La clase debe ser un número entre 0 y 9'
    } as CustomErrorMessages,
    
    distrito: {
      required: 'El distrito es obligatorio si tiene libreta',
      minlength: 'El distrito debe tener al menos 2 caracteres',
      maxlength: 'El distrito no puede exceder 5 caracteres'
    } as CustomErrorMessages,

    barrio: {
      required: 'El barrio es requerido',
      minlength: 'El barrio debe tener al menos 2 caracteres',
      invalidBarrio: 'El barrio contiene caracteres inválidos',
      whitespaceOnly: 'El barrio no puede contener solo espacios en blanco'
    } as CustomErrorMessages,

    direccion: {
      required: 'La dirección es requerida',
      minlength: 'La dirección debe tener al menos 3 caracteres',
      invalidAddress: 'La dirección contiene caracteres inválidos',
      whitespaceOnly: 'La dirección no puede contener solo espacios en blanco'
    } as CustomErrorMessages,
    
    correoInstitucional: {
      required: 'El correo institucional es obligatorio cuando trabaja en la universidad',
      email: 'Por favor, ingrese un correo institucional válido (ejemplo: nombre@umariana.edu.co)'
    } as CustomErrorMessages,
    
    politica_datos: {
      required: 'Debe aceptar los términos y condiciones de la política de datos personales'
    } as CustomErrorMessages
  };

  formatCurrency(value: number | string): string {
    if (!value && value !== 0) return '';
    
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) : value;
    if (isNaN(numericValue) || numericValue <= 0) return '';
    
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numericValue);
    } catch (error) {
      return `$ ${numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
  }

  parseCurrencyToNumber(value: string): number {
    if (!value || value.trim() === '') return 0;
    
    const numericString = value.replace(/[^\d]/g, '');
    const numericValue = numericString ? parseInt(numericString, 10) : 0;
    
    return numericValue > 0 && numericValue <= 999999999 ? numericValue : 0;
  }

  onAspiracionSalarialChange(event: any): void {
    const inputValue = event.target.value;
    const numericValue = this.parseCurrencyToNumber(inputValue);
    
    this.form.patchValue({ aspiracionSalario: numericValue }, { emitEvent: false });
    
    setTimeout(() => {
      const formattedValue = this.formatCurrency(numericValue);
      if (event.target.value !== formattedValue) {
        event.target.value = formattedValue;
      }
    }, 0);
  }

  onAspiracionSalarialBlur(event: any): void {
    const inputValue = event.target.value;
    const numericValue = this.parseCurrencyToNumber(inputValue);
    
    if (numericValue > 0) {
      const formattedValue = this.formatCurrency(numericValue);
      event.target.value = formattedValue;
      this.form.patchValue({ aspiracionSalario: numericValue }, { emitEvent: false });
    }
  }

  onAspiracionSalarialFocus(event: any): void {
    const currentValue = this.form.get('aspiracionSalario')?.value;
    if (currentValue && currentValue > 0) {
      event.target.value = currentValue.toString();
    }
  }

  get aspiracionSalarialFormatted(): string {
    const value = this.form.get('aspiracionSalario')?.value;
    return this.formatCurrency(value);
  }

  updateAspiracionSalarialDisplay(): void {
    const value = this.form.get('aspiracionSalario')?.value;
    if (!value || value <= 0) return;

    const findAndFormatInput = (attempt: number = 1): void => {
      let aspiracionSalarialInput: HTMLInputElement | null = null;
      
      const selectors = [
        'input[formcontrolname="aspiracionSalario"]',
        'app-input-component[id="aspiracionSalario"] input',
        '#aspiracionSalario input',
        'input[id*="aspiracionSalario"]',
        '.p-inputtext[formcontrolname="aspiracionSalario"]'
      ];

      for (const selector of selectors) {
        aspiracionSalarialInput = document.querySelector(selector) as HTMLInputElement;
        if (aspiracionSalarialInput) break;
      }

      if (aspiracionSalarialInput && aspiracionSalarialInput.value !== undefined) {
        const formattedValue = this.formatCurrency(value);
        aspiracionSalarialInput.value = formattedValue;
      } else if (attempt < 5) {
        const delay = attempt * 200;
        setTimeout(() => findAndFormatInput(attempt + 1), delay);
      } else {
      }
    };

    findAndFormatInput();
  }

  setupAspiracionSalarialFormatting(): void {
    const value = this.form.get('aspiracionSalario')?.value;
    if (value && value > 0) {
      this.updateAspiracionSalarialDisplay();
    }

    this.form.get('aspiracionSalario')?.valueChanges.subscribe((newValue) => {
      if (newValue && newValue > 0) {
        setTimeout(() => {
          this.updateAspiracionSalarialDisplay();
        }, 50);
      }
    });
  }

  forceAspiracionSalarialFormat(): void {
    const value = this.form.get('aspiracionSalario')?.value;
    if (!value || value <= 0) return;

    setTimeout(() => {
      const inputs = [
        document.querySelector('input[formcontrolname="aspiracionSalario"]'),
        document.querySelector('app-input-component[id="aspiracionSalario"] input'),
        document.querySelector('#aspiracionSalario input')
      ];

      for (const input of inputs) {
        if (input) {
          const htmlInput = input as HTMLInputElement;
          const formattedValue = this.formatCurrency(value);
          
          htmlInput.value = formattedValue;
          htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
          htmlInput.dispatchEvent(new Event('change', { bubbles: true }));
          htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
          
          break;
        }
      }
    }, 100);
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['personaId']) {
        this.personaIdExterno = params['personaId'];
        this.modoEdicionTerceros = true;
        }
    });

    this.initForm();
    this.initializePaisContextos();
    this.setupFormSubscriptions();
    this.cargarDatos();
    
    if (!this.modoEdicionTerceros) {
      const identificacionSesion = localStorage.getItem('identificacion');
      if (identificacionSesion) {
        this.form.patchValue({ identificacion: identificacionSesion });
      }
      
      this.fotoPerfilService.userProfile$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(profile => {
        if (profile && profile.email) {
          const correoActual = this.form.get('correo')?.value;
          if (!correoActual || correoActual.trim() === '') {
            this.form.patchValue({ correo: profile.email }, { emitEvent: false });
          }
        }
      });
    }
    
    if (this.paisColombiaId) {
      this.cargarUbicacionesPorPais(this.paisColombiaId, 'expedicion', 'departamentos');
    }

    this.updateFieldStates();

    const rawInit = this.form.getRawValue();
    this.initialFormValue = JSON.parse(JSON.stringify(this.normalizeFormValue(rawInit)));
    this.formHasChanges = false;
  }

  private initializePaisContextos(): void {
    this.paisContextos.set('expedicion', { esColombia: false, paisId: '' });
    this.paisContextos.set('nacimiento', { esColombia: false, paisId: '' });
    this.paisContextos.set('residencia', { esColombia: false, paisId: '' });
    
    this.isLoadingUbicaciones.set('expedicion', false);
    this.isLoadingUbicaciones.set('nacimiento', false);
    this.isLoadingUbicaciones.set('residencia', false);
  }

  private initForm(): void {
    this.form = this.fb.group({
      primerNombre: ['', [Validators.required, Validators.minLength(2), CustomValidators.nameValidator()]],
      segundoNombre: ['', [Validators.minLength(2), CustomValidators.nameValidator()]],
      primerApellido: ['', [Validators.required, Validators.minLength(2), CustomValidators.nameValidator()]],
      segundoApellido: ['', [Validators.minLength(2), CustomValidators.nameValidator()]],
      tipoDocumento: ['', Validators.required],
      identificacion: ['', [Validators.required, CustomValidators.documentNumber()]],
      paisExpedicion: ['', Validators.required],
      departamentoExpedicion: [''], 
      ciudadExpedicion: ['', Validators.required],
      fechaExpedicion: ['', [Validators.required, CustomValidators.futureDate(), CustomValidators.minimumDocumentAge(16)]],
      fechaNacimiento: ['', [Validators.required, CustomValidators.minimumAge(14), CustomValidators.maximumAge(100), CustomValidators.futureDate()]],
      paisNacimiento: ['', Validators.required],
      departamentoNacimiento: [''], 
      ciudadNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      estadoCivil: ['', Validators.required],
      nacionalidad: ['', Validators.required],
      etnia: ['', Validators.required], 
      tieneDiscapacidad: [false], 
      discapacidad: [[], CustomValidators.requiredIfTieneDiscapacidad()], 
      victimaConflicto: [false],
      paisResidencia: ['', Validators.required],
      departamentoResidencia: [''], 
      ciudadResidencia: ['', Validators.required],
      barrio: ['', [Validators.required, Validators.minLength(2), CustomValidators.barrioValidator(), CustomValidators.notOnlyWhitespace()]],
      direccion: ['', [Validators.required, Validators.minLength(3), CustomValidators.addressValidator(), CustomValidators.notOnlyWhitespace()]],
      sector: ['', Validators.required],
  telefono: ['', [CustomValidators.phoneNumber(13), Validators.min(0)]],
      celular1: ['', [Validators.required, CustomValidators.cellPhoneNumberFlexible(13), Validators.min(0)]],
      celular2: ['', [CustomValidators.cellPhoneNumberFlexible(13), Validators.min(0)]],
      correo: ['', [Validators.required, CustomValidators.email()]],
      aspiracionSalario: ['', [Validators.required, Validators.min(0), CustomValidators.salaryRange(0, 999999999)]],
      area: [''],

      trabajoActual: [false],
      hojaVidaPresentada: [false],
      trabajaUniversidad: [false],
      correoInstitucional: [''],
      cargoUniversidad: [''],
      dependencia: [''],
      egresadoUniversidad: [false],
      filiacionPolitica: ['', Validators.required], 
      estrato: ['', Validators.required], 
      tieneLibretaMilitar: [false], 
      libretaMilitar: [''], 
      clase: [null], 
      distrito: [''], 
      politica_datos: [false, Validators.requiredTrue] 
    });
    this.setupDocumentValidation();
  }

  ngAfterViewInit(): void {
    const correoInstitucionalControl = this.form.get('correoInstitucional');
    const cargoControl = this.form.get('cargoUniversidad');
    const depControl = this.form.get('dependencia');
    const discapacidadControl = this.form.get('discapacidad');
    
    if (correoInstitucionalControl && cargoControl && depControl) {
      correoInstitucionalControl.setValidators([
        CustomValidators.requiredIfTrabajaUniversidad(),
        CustomValidators.email()
      ]);
      cargoControl.setValidators([
        CustomValidators.requiredIfTrabajaUniversidad(),
        Validators.minLength(2),
        CustomValidators.notOnlyWhitespace()
      ]);
      depControl.setValidators([
        CustomValidators.requiredIfTrabajaUniversidad(),
        Validators.minLength(2),
        CustomValidators.notOnlyWhitespace()
      ]);
      correoInstitucionalControl.updateValueAndValidity();
      cargoControl.updateValueAndValidity();
      depControl.updateValueAndValidity();
    }

    if (discapacidadControl) {
      discapacidadControl.setValidators([
        CustomValidators.requiredIfTieneDiscapacidad()
      ]);
      discapacidadControl.updateValueAndValidity();
    }

    const libretaMilitarControl = this.form.get('libretaMilitar');
    const claseControl = this.form.get('clase');
    const distritoControl = this.form.get('distrito');
    
    if (libretaMilitarControl && claseControl && distritoControl) {
      libretaMilitarControl.setValidators([
        CustomValidators.requiredIfTieneLibretaMilitar(),
        Validators.minLength(3),
        Validators.maxLength(15)
      ]);
      claseControl.setValidators([
        CustomValidators.requiredIfTieneLibretaMilitar(),
        Validators.min(0),
        Validators.max(9)
      ]);
      distritoControl.setValidators([
        CustomValidators.requiredIfTieneLibretaMilitar(),
        Validators.minLength(2),
        Validators.maxLength(5)
      ]);
      libretaMilitarControl.updateValueAndValidity();
      claseControl.updateValueAndValidity();
      distritoControl.updateValueAndValidity();
    }

    this.form.get('tieneLibretaMilitar')?.valueChanges.subscribe((tieneLibreta) => {
      if (!tieneLibreta) {
        this.form.patchValue({ 
          libretaMilitar: '',
          clase: null,
          distrito: ''
        }, { emitEvent: false });
      }
      
      setTimeout(() => {
        libretaMilitarControl?.updateValueAndValidity();
        claseControl?.updateValueAndValidity();
        distritoControl?.updateValueAndValidity();
        this.cdr.detectChanges();
      }, 0);
    });

    this.form.get('trabajaUniversidad')?.valueChanges.subscribe((trabajaUniversidad) => {
      if (!trabajaUniversidad) {
        this.form.patchValue({ 
          correoInstitucional: '',
          cargoUniversidad: '',
          dependencia: ''
        }, { emitEvent: false });
      }
      
      setTimeout(() => {
        correoInstitucionalControl?.updateValueAndValidity();
        cargoControl?.updateValueAndValidity();
        depControl?.updateValueAndValidity();
        this.cdr.detectChanges();
      }, 0);
    });

    this.form.get('tieneDiscapacidad')?.valueChanges.subscribe((tieneDiscapacidad) => {
      if (!tieneDiscapacidad) {
        this.form.patchValue({ discapacidad: [] }, { emitEvent: false });
      }
      
      setTimeout(() => {
        discapacidadControl?.updateValueAndValidity();
        this.cdr.detectChanges();
      }, 0);
    });

    setTimeout(() => {
      this.setupAspiracionSalarialFormatting();
    }, 500);
  }

  private setupDocumentValidation(): void {
    this.form.get('tipoDocumento')?.valueChanges.subscribe(tipoDocumento => {
      const identificacionControl = this.form.get('identificacion');
      
      if (identificacionControl && tipoDocumento) {
        identificacionControl.clearValidators();
        
        identificacionControl.setValidators([
          Validators.required,
          CustomValidators.documentWithType(tipoDocumento)
        ]);
        
        identificacionControl.updateValueAndValidity();
      }
    });
  }

  private setupFormSubscriptions(): void {
    this.form.get('paisExpedicion')?.valueChanges.subscribe(paisId => {
      this.onPaisChange(paisId, 'expedicion');
      this.updateFieldStates();
    });

    this.form.get('paisNacimiento')?.valueChanges.subscribe(paisId => {
      this.onPaisChange(paisId, 'nacimiento');
      this.updateFieldStates();
    });

    this.form.get('paisResidencia')?.valueChanges.subscribe(paisId => {
      this.onPaisChange(paisId, 'residencia');
      this.updateFieldStates();
    });

    this.form.get('departamentoExpedicion')?.valueChanges.subscribe(departamentoId => {
      this.onDepartamentoChange(departamentoId, 'expedicion');
      this.updateFieldStates();
    });

    this.form.get('departamentoNacimiento')?.valueChanges.subscribe(departamentoId => {
      this.onDepartamentoChange(departamentoId, 'nacimiento');
      this.updateFieldStates();
    });

    this.form.get('departamentoResidencia')?.valueChanges.subscribe(departamentoId => {
      this.onDepartamentoChange(departamentoId, 'residencia');
      this.updateFieldStates();
    });

    this.form.get('fechaNacimiento')?.valueChanges.subscribe(fechaNacimiento => {
      this.cdr.markForCheck();
    });

    this.form.statusChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300) 
    ).subscribe(() => {
      this.checkAndUpdateStatus();
    });

    this.form.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => {
      this.detectFormChanges();
    });
  }

  private checkAndUpdateStatus(): void {
    const isComplete = this.isFormComplete();
    this.hojaVidaStatusService.updateInformacionPersonalStatus(isComplete);
  }

  private detectFormChanges(): void {
    if (!this.initialFormValue) {
      this.formHasChanges = false;
      return;
    }

    const currentValue = this.form.getRawValue();
    
    const normalizedInitial = this.normalizeFormValue(this.initialFormValue);
    const normalizedCurrent = this.normalizeFormValue(currentValue);
    
    this.formHasChanges = JSON.stringify(normalizedInitial) !== JSON.stringify(normalizedCurrent);
  }

  private normalizeFormValue(value: any): any {
    if (!value) return value;
    
    const normalized: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        const fieldValue = value[key];
        
        if (fieldValue instanceof Date) {
          normalized[key] = fieldValue.toISOString();
        }
        else if (Array.isArray(fieldValue)) {
          normalized[key] = [...fieldValue];
        }
        else if (fieldValue === null || fieldValue === undefined) {
          normalized[key] = '';
        }
        else if (typeof fieldValue === 'boolean') {
          normalized[key] = fieldValue;
        }
        else {
          normalized[key] = fieldValue;
        }
      }
    }
    return normalized;
  }

  private findDifferences(obj1: any, obj2: any): string[] {
    const differences: string[] = [];
    
    for (const key in obj1) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        differences.push(`${key}: ${JSON.stringify(obj1[key])} → ${JSON.stringify(obj2[key])}`);
      }
    }
    
    return differences;
  }

  private isFormComplete(): boolean {
    if (!this.form.valid) {
      return false;
    }

    const requiredFields = [
      'primerNombre', 'primerApellido', 'tipoDocumento', 'identificacion',
      'paisExpedicion', 'ciudadExpedicion', 'fechaExpedicion',
      'fechaNacimiento', 'paisNacimiento', 'ciudadNacimiento',
      'genero', 'estadoCivil', 'nacionalidad', 'etnia',
      'paisResidencia', 'ciudadResidencia', 'barrio', 'direccion', 'sector',
      'celular1', 'correo', 'aspiracionSalario',
      'filiacionPolitica', 'estrato'
    ];

    for (const field of requiredFields) {
      const value = this.form.get(field)?.value;
      if (value === null || value === undefined || value === '') {
        return false;
      }
    }

    const tieneLibretaMilitar = this.form.get('tieneLibretaMilitar')?.value;
    if (tieneLibretaMilitar) {
      const libretaMilitar = this.form.get('libretaMilitar')?.value;
      const clase = this.form.get('clase')?.value;
      const distrito = this.form.get('distrito')?.value;
      
      if (!libretaMilitar || !clase || !distrito) {
        return false;
      }
    }

    if (this.paisContextos.get('expedicion')?.esColombia) {
      const dpto = this.form.get('departamentoExpedicion')?.value;
      if (!dpto) return false;
    }

    if (this.paisContextos.get('nacimiento')?.esColombia) {
      const dpto = this.form.get('departamentoNacimiento')?.value;
      if (!dpto) return false;
    }

    if (this.paisContextos.get('residencia')?.esColombia) {
      const dpto = this.form.get('departamentoResidencia')?.value;
      if (!dpto) return false;
    }

    return true;
  }

  private onPaisChange(paisId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!paisId) {
      this.limpiarContextoPais(contexto);
      return;
    }

    const esColombia = paisId === this.paisColombiaId;
    this.paisContextos.set(contexto, { esColombia, paisId });
    
    this.limpiarCamposDependientes(contexto);
    
    this.actualizarValidacionesDepartamento(contexto, esColombia);
    
    if (esColombia) {
      this.cargarUbicacionesPorPais(paisId, contexto, 'departamentos');
    } else {
      this.cargarUbicacionesPorPais(paisId, contexto, 'ciudades');
    }
    
  }

  private onDepartamentoChange(departamentoId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!departamentoId) {
      this.limpiarCiudades(contexto);
      return;
    }

    const contextoData = this.paisContextos.get(contexto);
    if (contextoData?.esColombia) {
      this.cargarUbicacionesPorPadre(departamentoId, contexto, 'ciudades');
    }

    this.limpiarCamposCiudad(contexto);
  }

  get edad(): number | null {
    const fechaNacimiento = this.form.get('fechaNacimiento')?.value;
    if (!fechaNacimiento) {
      return null;
    }

    try {
      const fechaNac = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
      
      if (isNaN(fechaNac.getTime())) {
        return null;
      }

      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mesActual = hoy.getMonth();
      const mesNacimiento = fechaNac.getMonth();
      
      if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fechaNac.getDate())) {
        edad--;
      }

      return (edad >= 0 && edad <= 150) ? edad : null;
    } catch (error) {
      return null;
    }
  }

  private cargarUbicacionesPorPais(
    paisId: string, 
    contexto: string, 
    tipo: 'departamentos' | 'ciudades'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!paisId) {
        resolve();
        return;
      }

      this.isLoadingUbicaciones.set(contexto, true);
      
      const observable = tipo === 'departamentos' 
        ? this.ubicacionesGeograficasService.getDepartamentosPorPais(paisId)
        : this.ubicacionesGeograficasService.getByPadreForDropdown(paisId).pipe(
            map((response: UbicacionesGeograficasDto[]) =>
              response.map((item) => ({ id: item.id, nombre: item.nombre }))
            )
          );

      observable.subscribe({
        next: (data: any[]) => {
          const key = `${contexto}_${paisId}`;
          
          if (tipo === 'departamentos') {
            this.departamentos.set(key, data);
          } else {
            this.ciudadesMap.set(key, data);
          }
          
          this.isLoadingUbicaciones.set(contexto, false);
          resolve();
        },
        error: (error: any) => {
          this.isLoadingUbicaciones.set(contexto, false);
          
          this.showUserErrorMessage(`Error al cargar ${tipo}`, error);
          
          if (tipo === 'ciudades') {
            this.cargarCiudadesFallback(contexto).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        },
      });
    });
  }

  private cargarUbicacionesPorPadre(
    padreId: string, 
    contexto: string, 
    tipo: 'ciudades'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isLoadingUbicaciones.set(contexto, true);
      
      this.ubicacionesGeograficasService.getMunicipiosPorDepartamento(padreId)
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        )
        .subscribe({
          next: (ciudades: DropdownItem[]) => {
            const key = `${contexto}_${padreId}`;
            this.ciudadesMap.set(key, ciudades);
            this.isLoadingUbicaciones.set(contexto, false);
            resolve();
          },
          error: (error: any) => {
            this.isLoadingUbicaciones.set(contexto, false);
            reject(error);
          },
        });
    });
  }

  private limpiarContextoPais(contexto: string): void {
    this.paisContextos.set(contexto, { esColombia: false, paisId: '' });
    this.limpiarCamposDependientes(contexto);
  }

  private limpiarCamposDependientes(contexto: string): void {
    const departamentoField = `departamento${contexto.charAt(0).toUpperCase() + contexto.slice(1)}`;
    const ciudadField = `ciudad${contexto.charAt(0).toUpperCase() + contexto.slice(1)}`;
    
    this.form.patchValue({
      [departamentoField]: '',
      [ciudadField]: ''
    });
    
    this.limpiarCiudades(contexto);
  }

  private limpiarCamposCiudad(contexto: string): void {
    const ciudadField = `ciudad${contexto.charAt(0).toUpperCase() + contexto.slice(1)}`;
    this.form.patchValue({ [ciudadField]: '' });
  }

  private limpiarCiudades(contexto: string): void {
    const keysToDelete: string[] = [];
    this.ciudadesMap.forEach((value, key) => {
      if (key.startsWith(`${contexto}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.ciudadesMap.delete(key));
  }

  private actualizarValidacionesDepartamento(contexto: string, esColombia: boolean): void {
    const departamentoField = `departamento${contexto.charAt(0).toUpperCase() + contexto.slice(1)}`;
    const departamentoControl = this.form.get(departamentoField);
    
    if (esColombia) {
      departamentoControl?.setValidators([Validators.required]);
    } else {
      departamentoControl?.clearValidators();
    }
    departamentoControl?.updateValueAndValidity();
  }

  private obtenerNombrePais(paisId: string): string {
    if (!paisId) return '';
    
    const paisPorId = this.paises.find(p => p.id === paisId);
    if (paisPorId) {
      return paisPorId.nombre;
    }
    
    const paisPorNombre = this.paises.find(p => p.nombre === paisId);
    if (paisPorNombre) {
      return paisId; 
    }
    
    return paisId;
  }

  private obtenerNombreDropdown(dropdownItems: DropdownItem[], id: string | null | undefined, nombreCampo: string = ''): string {
    if (id && typeof id === 'object') {
      const maybeId = (id as any).id ?? (id as any).value ?? null;
      const maybeNombre = (id as any).nombre ?? null;
      if (maybeId) {
        id = String(maybeId);
      } else if (maybeNombre) {
        return String(maybeNombre);
      }
    }

    if (!id || (typeof id === 'string' && id.trim() === '')) {
      return '';
    }

    const idTrimmed = String(id).trim();

    const itemPorId = dropdownItems.find(item => item.id === idTrimmed);
    if (itemPorId) {
      return itemPorId.nombre;
    }

    const itemPorNombre = dropdownItems.find(item => item.nombre.trim().toLowerCase() === idTrimmed.toLowerCase());
    if (itemPorNombre) {
      return itemPorNombre.nombre; 
    }

    return '';
  }


  private cargarCiudadesFallback(contexto: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isLoadingUbicaciones.set(contexto, true);
      
      this.ubicacionesGeograficasService.getCiudadesPrincipales()
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response.map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        )
        .subscribe({
          next: (ciudades: DropdownItem[]) => {
            const key = `${contexto}_fallback`;
            this.ciudadesMap.set(key, ciudades);
            this.isLoadingUbicaciones.set(contexto, false);
            resolve();
          },
          error: (error: any) => {
            this.isLoadingUbicaciones.set(contexto, false);
            reject(error);
          },
        });
    });
  }

  private cargarDatos(): void {
    this.isLoadingDropdowns = true;

    forkJoin({
      tiposDocumento: this.listasValoresService
        .obtenerPorTipo('TDOC')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      generos: this.listasValoresService
        .obtenerPorTipo('GEN')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      estadosCiviles: this.listasValoresService
        .obtenerPorTipo('ECIV')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      sectores: this.listasValoresService
        .obtenerPorTipo('SECT')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      etnias: this.listasValoresService
      .obtenerPorTipo('ETN')
      .pipe(
        map((response: ListaValor[]) =>
          response
            .filter((item) => item.idPadre !== null) 
            .map((item) => ({ id: item.id, nombre: item.nombre }))
        ),
        catchError(err => {
          return of([]);
        })
      ),
      nacionalidades: this.listasValoresService
        .obtenerPorTipo('NAC')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      discapacidades: this.listasValoresService
        .obtenerPorTipo('DISC')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      areas: this.listasValoresService
        .obtenerPorTipo('AREI')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
        filiacionPoliticas: this.listasValoresService
        .obtenerPorTipo('POLI')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
        estratos: this.listasValoresService
        .obtenerPorTipo('EST')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
        libretasMilitares: this.listasValoresService
        .obtenerPorTipo('MIL')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      dependencias: this.listasValoresService
        .obtenerPorTipo('DPE')
        .pipe(
          map((response: ListaValor[]) =>
            response
              .filter((item) => item.idPadre !== null) 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
      centrosCosto: this.centrosCostoService.getCentrosCostoActivos()
        .pipe(
          map((response: any) => {
            let centros: CentroCostoOracle[] = [];
            
            if (Array.isArray(response)) {
              centros = response;
            } else if (response && typeof response === 'object') {
              centros = response.data || response.items || response.centrosCosto || response.content || [];
            }
            
            if (!Array.isArray(centros)) {
              return [];
            }
            
            return centros.sort((a, b) => a.nombreCentroCosto.localeCompare(b.nombreCentroCosto));
          }),
          catchError(err => {
            return of([]);
          })
        ),
      paises: this.ubicacionesGeograficasService.getPaises()
        .pipe(
          catchError(err => {
            return of([]);
          })
        ),
      todasLasCiudades: this.ubicacionesGeograficasService.getAllForDropdown()
        .pipe(
          map((response: UbicacionesGeograficasDto[]) =>
            response
              .filter(ubicacion => ubicacion.nombreTipo?.toLowerCase().includes('ciudad') || 
                                  ubicacion.nombreTipo?.toLowerCase().includes('municipio'))
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          ),
          catchError(err => {
            return of([]);
          })
        ),
    }).subscribe({
      next: (data) => {
        
        this.tiposDocumento = data.tiposDocumento;
        this.generos = data.generos;
        this.estadosCiviles = data.estadosCiviles;
        this.sectores = data.sectores;
        this.areas = data.areas;
        this.paises = data.paises;
        this.ciudades = data.todasLasCiudades;
        this.etnias = data.etnias;
        this.nacionalidades = data.nacionalidades;
        this.discapacidades = data.discapacidades;
        this.filiacionPoliticas = data.filiacionPoliticas;
        this.estratos = data.estratos;
        this.libretasMilitares = data.libretasMilitares;
        this.dependencias = data.dependencias;
        this.centrosCosto = data.centrosCosto;
        
        this.identificarColombia();
        
        this.isLoadingDropdowns = false;
        
        this.cdr.detectChanges();
        
        this.cargarDatosUsuarioAutenticado();
      },
      error: (error: any) => {
        this.isLoadingDropdowns = false;
        this.errorMessage = 'Error al cargar los datos iniciales. Por favor, recargue la página.';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error de Carga',
          detail: 'No se pudieron cargar los catálogos. Intente recargar la página.',
          life: 5000
        });
        
        this.cdr.detectChanges();
      },
    });
  }

  private identificarColombia(): void {
    const colombia = this.paises.find(pais => 
      pais.nombre.toLowerCase().includes('colombia')
    );
    this.paisColombiaId = colombia?.id || null;
  }

  get departamentosExpedicion(): UbicacionesGeograficasDto[] {
    const contexto = this.paisContextos.get('expedicion');
    if (!contexto?.paisId) return [];
    return this.departamentos.get(`expedicion_${contexto.paisId}`) || [];
  }

  get departamentosNacimiento(): UbicacionesGeograficasDto[] {
    const contexto = this.paisContextos.get('nacimiento');
    if (!contexto?.paisId) return [];
    return this.departamentos.get(`nacimiento_${contexto.paisId}`) || [];
  }

  get departamentosResidencia(): UbicacionesGeograficasDto[] {
    const contexto = this.paisContextos.get('residencia');
    if (!contexto?.paisId) return [];
    return this.departamentos.get(`residencia_${contexto.paisId}`) || [];
  }

  get ciudadesExpedicion(): DropdownItem[] {
    const contexto = this.paisContextos.get('expedicion');
    if (!contexto?.paisId) return [];
    
    const departamentoId = this.form.get('departamentoExpedicion')?.value;
    if (departamentoId && contexto.esColombia) {
      return this.ciudadesMap.get(`expedicion_${departamentoId}`) || [];
    }
    return this.ciudadesMap.get(`expedicion_${contexto.paisId}`) || [];
  }

  get ciudadesNacimiento(): DropdownItem[] {
    const contexto = this.paisContextos.get('nacimiento');
    if (!contexto?.paisId) return [];
    
    const departamentoId = this.form.get('departamentoNacimiento')?.value;
    if (departamentoId && contexto.esColombia) {
      return this.ciudadesMap.get(`nacimiento_${departamentoId}`) || [];
    }
    return this.ciudadesMap.get(`nacimiento_${contexto.paisId}`) || [];
  }

  get ciudadesResidencia(): DropdownItem[] {
    const contexto = this.paisContextos.get('residencia');
    if (!contexto?.paisId) return this.ciudades; 
    
    const departamentoId = this.form.get('departamentoResidencia')?.value;
    if (departamentoId && contexto.esColombia) {
      return this.ciudadesMap.get(`residencia_${departamentoId}`) || [];
    }
    return this.ciudadesMap.get(`residencia_${contexto.paisId}`) || this.ciudades;
  }

  get esColombia(): boolean {
    return this.paisContextos.get('expedicion')?.esColombia || false;
  }

  get esColombiaNacimiento(): boolean {
    return this.paisContextos.get('nacimiento')?.esColombia || false;
  }

  get esColombiaResidencia(): boolean {
    return this.paisContextos.get('residencia')?.esColombia || false;
  }

  get isLoadingExpedicion(): boolean {
    return this.isLoadingUbicaciones.get('expedicion') || false;
  }

  get isLoadingNacimiento(): boolean {
    return this.isLoadingUbicaciones.get('nacimiento') || false;
  }

  get isLoadingResidencia(): boolean {
    return this.isLoadingUbicaciones.get('residencia') || false;
  }

  onExpedicionClick(): void {
    const contexto = this.paisContextos.get('expedicion');
    if (!contexto?.paisId) {
      return;
    }

    if (contexto.esColombia) {
      const departamentoId = this.form.get('departamentoExpedicion')?.value;
      if (!departamentoId) {
        return;
      }
      
      const key = `expedicion_${departamentoId}`;
      if (!this.ciudadesMap.has(key)) {
        this.cargarUbicacionesPorPadre(departamentoId, 'expedicion', 'ciudades');
      }
    } else {
      const key = `expedicion_${contexto.paisId}`;
      if (!this.ciudadesMap.has(key)) {
        this.cargarUbicacionesPorPais(contexto.paisId, 'expedicion', 'ciudades');
      }
    }
  }

  onNacimientoClick(): void {
    const contexto = this.paisContextos.get('nacimiento');
    if (!contexto?.paisId) {
      return;
    }

    if (!contexto.esColombia) {
      const key = `nacimiento_${contexto.paisId}`;
      if (!this.ciudadesMap.has(key)) {
        this.cargarUbicacionesPorPais(contexto.paisId, 'nacimiento', 'ciudades');
      }
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !(field.dirty || field.touched)) {
      return '';
    }

    const errors = field.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];
      
      if (errorKey === 'minlength' && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages['minlength'];
        return msg || `Mínimo ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (errorKey === 'min' && errorValue && 'min' in errorValue) {
        const msg = fieldMessages['min'];
        return msg || `El valor debe ser mayor a ${(errorValue as any).min}`;
      }
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es requerido';
    if (errors['email']) return 'Ingrese un email válido';
    if (errors['pattern']) return 'Formato inválido';
    if (errors['minlength']) return `Mínimo ${(errors['minlength'] as any).requiredLength} caracteres`;
    if (errors['min']) return `El valor debe ser mayor a ${(errors['min'] as any).min}`;
    if (errors['invalidName']) return 'Solo se permiten letras y espacios';
    if (errors['invalidBarrio']) return 'El barrio contiene caracteres inválidos';
    if (errors['invalidAddress']) return 'La dirección contiene caracteres inválidos';
    if (errors['invalidDocument']) return 'Formato de documento no válido';
    if (errors['invalidPhone']) return 'Formato de teléfono no válido';
    if (errors['invalidCellPhone']) return 'Formato de celular no válido';
    if (errors['minimumAge']) return 'Debe ser mayor de 14 años';
    if (errors['maximumAge']) return 'La edad no puede superar los 100 años';
    if (errors['futureDate']) return 'La fecha no puede ser futura';
    if (errors['minimumDocumentAge']) return 'La fecha de expedición debe ser al menos 16 años después del nacimiento';
    if (errors['whitespaceOnly']) return 'Este campo no puede contener solo espacios en blanco';
    if (errors['expeditionBeforeBirth']) return 'La fecha de expedición no puede ser anterior a la de nacimiento';

    return 'Este campo tiene un error';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  debugFormErrors(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        } else if (control) {
      }
    });
  }

  guardarRegistro(): void {
    if (this.form.valid) {
      if (this.isLoading || this.isSubmitting) {
        return;
      }
      this.confirmarGuardar();
    } else {
      this.form.markAllAsTouched();
      
      const politicaDatosControl = this.form.get('politica_datos');
      if (politicaDatosControl && politicaDatosControl.invalid) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Términos y Condiciones',
          detail: 'Debe aceptar los términos y condiciones de la política de datos personales para continuar.'
        });
        return;
      }
      
      this.debugFormErrors();
    }
  }

  confirmarGuardar(event?: Event): void {
    if (this.form.invalid) {
      this.marcarCamposComoTocados();
      
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
          severity: 'error',
          summary: 'Formulario inválido',
          detail: 'Por favor complete todos los campos requeridos'
        });
      }
      return;
    }

    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: '¿Está seguro de guardar la información personal?',
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.guardarDatos();
      },
    });
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched({ onlySelf: true });
    });
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
      tipoDocumento: 'Tipo de Documento',
      numeroDocumento: 'Número de Documento',
      primerNombre: 'Primer Nombre',
      segundoNombre: 'Segundo Nombre',
      primerApellido: 'Primer Apellido',
      segundoApellido: 'Segundo Apellido',
      fechaNacimiento: 'Fecha de Nacimiento',
      genero: 'Género',
      estadoCivil: 'Estado Civil',
      nacionalidad: 'Nacionalidad',
      etnia: 'Etnia',
      paisExpedicion: 'País de Expedición',
      departamentoExpedicion: 'Departamento de Expedición',
      ciudadExpedicion: 'Ciudad de Expedición',
      fechaExpedicion: 'Fecha de Expedición',
      paisNacimiento: 'País de Nacimiento',
      departamentoNacimiento: 'Departamento de Nacimiento',
      ciudadNacimiento: 'Ciudad de Nacimiento',
      paisResidencia: 'País de Residencia',
      departamentoResidencia: 'Departamento de Residencia',
      ciudadResidencia: 'Ciudad de Residencia',
      direccion: 'Dirección',
      barrio: 'Barrio',
      estrato: 'Estrato',
      telefonoFijo: 'Teléfono Fijo',
      telefonoCelular: 'Teléfono Celular',
      correoPersonal: 'Correo Personal',
      correoInstitucional: 'Correo Institucional',
      sector: 'Sector',
      dependencia: 'Dependencia',
      area: 'Área',
      cargo: 'Cargo',
      filiacionPolitica: 'Filiación Política',
      libretaMilitar: 'Libreta Militar',
      numeroLibreta: 'Número de Libreta',
      distritoMilitar: 'Distrito Militar'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }

  private obtenerNombreDepartamento(departamentoId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): string {
    if (!departamentoId) return '';
    
    let departamentos: UbicacionesGeograficasDto[] = [];
    switch (contexto) {
      case 'expedicion':
        departamentos = this.departamentosExpedicion;
        break;
      case 'nacimiento':
        departamentos = this.departamentosNacimiento;
        break;
      case 'residencia':
        departamentos = this.departamentosResidencia;
        break;
    }
    
    const departamentoPorId = departamentos.find(d => d.id === departamentoId);
    if (departamentoPorId) {
      return departamentoPorId.nombre;
    }
    
    const departamentoPorNombre = departamentos.find(d => d.nombre === departamentoId);
    if (departamentoPorNombre) {
      return departamentoId; 
    }
    return departamentoId;
  }

  private obtenerNombreCiudad(ciudadId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): string {
    if (!ciudadId) return '';
    
    let ciudades: DropdownItem[] = [];
    switch (contexto) {
      case 'expedicion':
        ciudades = this.ciudadesExpedicion;
        break;
      case 'nacimiento':
        ciudades = this.ciudadesNacimiento;
        break;
      case 'residencia':
        ciudades = this.ciudadesResidencia;
        break;
    }
    
    const ciudadPorId = ciudades.find(c => c.id === ciudadId);
    if (ciudadPorId) {
      return ciudadPorId.nombre;
    }
    
    const ciudadPorNombre = ciudades.find(c => c.nombre === ciudadId);
    if (ciudadPorNombre) {
      return ciudadId; 
    }
    
    return ciudadId;
  }

  private guardarDatos(): void {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario inválido',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

  this.isLoading = true;
  this.isSubmitting = true;

  const formData = this.form.getRawValue();
    
    const paisExpedicionNombre = this.obtenerNombrePais(formData.paisExpedicion);
    const departamentoExpedicionNombre = this.obtenerNombreDepartamento(formData.departamentoExpedicion, 'expedicion');
    const ciudadExpedicionNombre = this.obtenerNombreCiudad(formData.ciudadExpedicion, 'expedicion');
    
    const paisNacimientoNombre = this.obtenerNombrePais(formData.paisNacimiento);
    const departamentoNacimientoNombre = this.obtenerNombreDepartamento(formData.departamentoNacimiento, 'nacimiento');
    const ciudadNacimientoNombre = this.obtenerNombreCiudad(formData.ciudadNacimiento, 'nacimiento');
    
    const paisResidenciaNombre = this.obtenerNombrePais(formData.paisResidencia);
    const departamentoResidenciaNombre = this.obtenerNombreDepartamento(formData.departamentoResidencia, 'residencia');
    const ciudadResidenciaNombre = this.obtenerNombreCiudad(formData.ciudadResidencia, 'residencia');
    
    const tipoDocumentoNombre = this.obtenerNombreDropdown(this.tiposDocumento, formData.tipoDocumento, 'Tipo Documento');
    const generoNombre = this.obtenerNombreDropdown(this.generos, formData.genero, 'Género');
    const estadoCivilNombre = this.obtenerNombreDropdown(this.estadosCiviles, formData.estadoCivil, 'Estado Civil');
    const nacionalidadNombre = this.obtenerNombreDropdown(this.nacionalidades, formData.nacionalidad, 'Nacionalidad');
    const etniaNombre = this.obtenerNombreDropdown(this.etnias, formData.etnia, 'Etnia');
    const sectorNombre = formData.sector || '';
    const areaNombre = this.obtenerNombreDropdown(this.areas, formData.area, 'Área');
    let filiacionPoliticaNombre = this.obtenerNombreDropdown(this.filiacionPoliticas, formData.filiacionPolitica, 'Filiación Política');
    let estratoNombre = this.obtenerNombreDropdown(this.estratos, formData.estrato, 'Estrato');

    if ((!filiacionPoliticaNombre || filiacionPoliticaNombre.trim() === '') && formData.filiacionPolitica) {
      const opt = this.filiacionPoliticas.find(o => o.id === formData.filiacionPolitica || (o as any).value === formData.filiacionPolitica);
      if (opt) {
        filiacionPoliticaNombre = opt.nombre;
      }
    }

    if ((!estratoNombre || estratoNombre.trim() === '') && formData.estrato) {
      const opt = this.estratos.find(o => o.id === formData.estrato || (o as any).value === formData.estrato);
      if (opt) {
        estratoNombre = opt.nombre;
      }
    }
    
    const dependenciaNombre = formData.dependencia || '';
    
    const persona: Persona = {
      primerNombre: formData.primerNombre,
      segundoNombre: formData.segundoNombre,
      primerApellido: formData.primerApellido,
      segundoApellido: formData.segundoApellido,
      tipoDocumento: tipoDocumentoNombre,
      identificacion: formData.identificacion,
      paisExpedicion: paisExpedicionNombre,
      departamentoExpedicion: departamentoExpedicionNombre,
      ciudadExpedicion: ciudadExpedicionNombre,
      fechaExpedicion: formData.fechaExpedicion,
      fechaNacimiento: formData.fechaNacimiento,
      paisNacimiento: paisNacimientoNombre,
      departamentoNacimiento: departamentoNacimientoNombre,
      ciudadNacimiento: ciudadNacimientoNombre,
      genero: generoNombre,
      estadoCivil: estadoCivilNombre,
      nacionalidad: nacionalidadNombre,
      etnia: etniaNombre,
      discapacidad: formData.tieneDiscapacidad && formData.discapacidad?.length > 0 
        ? formData.discapacidad.join(', ') 
        : '',
      victimaConflicto: formData.victimaConflicto,
      paisResidencia: paisResidenciaNombre,
      departamentoResidencia: departamentoResidenciaNombre,
      ciudadResidencia: ciudadResidenciaNombre,
      barrio: formData.barrio,
      direccion: formData.direccion,
      sector: sectorNombre,
      telefono: formData.telefono,
      celular1: formData.celular1,
      celular2: formData.celular2,
      correo: formData.correo,
      aspiracionSalario: formData.aspiracionSalario,
      trabajoActual: formData.trabajoActual,
      area: areaNombre,
      hojaVidaPresentada: formData.hojaVidaPresentada,
      trabajaUniversidad: formData.trabajaUniversidad,
      correoInstitucional: formData.correoInstitucional,
      cargoUniversidad: formData.cargoUniversidad,
      dependencia: dependenciaNombre,
      egresadoUniversidad: formData.egresadoUniversidad,
      filiacionPolitica: filiacionPoliticaNombre,
      estrato: estratoNombre,
      tieneLibretaMilitar: formData.tieneLibretaMilitar,
      libretaMilitar: formData.tieneLibretaMilitar ? formData.libretaMilitar : 'No aplica',
      clase: formData.tieneLibretaMilitar ? formData.clase : null,
      distrito: formData.tieneLibretaMilitar ? formData.distrito : 'No aplica',
      politica_datos: formData.politica_datos
    };

    let request$: Observable<Persona>;
    
    if (this.modoEdicionTerceros && this.personaIdExterno) {
      request$ = this.personasService.actualizarPersona(this.personaIdExterno, persona);
    } else {
      request$ = this.tieneDatosGuardados 
        ? this.personasService.actualizarPersonaActual(persona)
        : this.personasService.crearPersonaActual(persona);
    }

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (personaGuardada: Persona) => {
          this.isLoading = false;
          this.isSubmitting = false;
          
          const esPrimeraVez = !this.tieneDatosGuardados;
          const noTienePreferenciaGuardada = !personaGuardada.fechaPreferenciaNotificaciones;
          
          this.tieneDatosGuardados = true;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: esPrimeraVez ? 'Información guardada correctamente' : 'Información actualizada correctamente'
          });

          // Sincronizar correo con Keycloak si cambió (solo para el propio usuario)
          if (!this.modoEdicionTerceros) {
            const nuevoCorreo = personaGuardada.correo || '';
            if (nuevoCorreo && nuevoCorreo.trim().toLowerCase() !== this.correoOriginal.trim().toLowerCase()) {
              this.sincronizarCorreoKeycloak(nuevoCorreo.trim().toLowerCase());
              this.correoOriginal = nuevoCorreo;
            }
          }
          
          const rawValue = this.form.getRawValue();
          this.initialFormValue = JSON.parse(JSON.stringify(this.normalizeFormValue(rawValue)));
          this.formHasChanges = false;
          
          setTimeout(() => {
            this.checkAndUpdateStatus();
          }, 300);
          
          if (noTienePreferenciaGuardada && personaGuardada.identificacion) {
            this.mostrarDialogoPreferencias(personaGuardada.identificacion);
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.isSubmitting = false;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la información. Verifique los datos e intente nuevamente'
          });
        }
      });
  }

  private sincronizarCorreoKeycloak(nuevoCorreo: string): void {
    const userInfo = this.authService.getUserInfo();
    const keycloakUserId = userInfo?.sub;
    if (!keycloakUserId) return;

    const token = this.authService.getAccessToken();
    const clientConfig = this.keycloakClientConfig.getCurrentClientConfig();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const payload = {
      email: nuevoCorreo,
      programa: clientConfig.appName
    };

    const authApi = environment.authApi;
    this.httpClient.put(`${authApi}/auth/users/${keycloakUserId}`, payload, { headers }).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  private mostrarDialogoPreferencias(personaId: string): void {
    this.dialogRef = this.dialogService.open(PreferenciasNotificacionesDialogComponent, {
      header: 'Configuración de notificaciones',
      width: '600px',
      modal: true,
      closable: false,
      dismissableMask: false,
      styleClass: 'preferencias-notificaciones-modal'
    });

    this.dialogRef?.onClose
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: { aceptado: boolean; recibirNotificaciones: boolean } | undefined) => {
        if (result && result.aceptado) {
          this.personasService.actualizarPreferenciasNotificaciones(
            personaId, 
            result.recibirNotificaciones
          ).pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              const mensaje = result.recibirNotificaciones 
                ? 'Recibirás notificaciones sobre nuevas convocatorias laborales' 
                : 'No recibirás notificaciones por correo. Puedes cambiar esta preferencia más tarde';
              
              this.messageService.add({
                severity: 'info',
                summary: 'Preferencias guardadas',
                detail: mensaje,
                life: 5000
              });
            },
          });
        }
      });
  }

  resetearFormulario(): void {
    this.isLoading = false;
    this.isSubmitting = false;
    this.form.reset();
    
    this.form.patchValue({
      tieneDiscapacidad: false,
      discapacidad: [],
      tieneLibretaMilitar: false,
      libretaMilitar: '',
      clase: null,
      distrito: '',
      politica_datos: false
    });
    
    this.tieneDatosGuardados = false;
    
    this.paisContextos.clear();
    this.initializePaisContextos();
    
    this.departamentos.clear();
    this.ciudadesMap.clear();
    
    const departamentoExpedicionControl = this.form.get('departamentoExpedicion');
    departamentoExpedicionControl?.clearValidators();
    departamentoExpedicionControl?.updateValueAndValidity();

    const departamentoNacimientoControl = this.form.get('departamentoNacimiento');
    departamentoNacimientoControl?.clearValidators();
    departamentoNacimientoControl?.updateValueAndValidity();

    const departamentoResidenciaControl = this.form.get('departamentoResidencia');
    departamentoResidenciaControl?.clearValidators();
    departamentoResidenciaControl?.updateValueAndValidity();
  }

  get isColombiaSelected(): boolean {
    return this.esColombia;
  }

  get isColombiaNacimientoSelected(): boolean {
    return this.esColombiaNacimiento;
  }

  get isColombiaResidenciaSelected(): boolean {
    return this.esColombiaResidencia;
  }

  get paisTieneEstructuraJerarquica(): boolean {
    return this.esColombia;
  }

  ngOnDestroy(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    
    this.destroy$.next();
    this.destroy$.complete();
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

  private cargarDatosUsuarioAutenticado(retry = 0): void {
    this.isLoadingInitial = true;
    
    const observable$ = this.modoEdicionTerceros && this.personaIdExterno
      ? this.personasService.obtenerPersonaPorId(this.personaIdExterno)
      : this.personasService.getPersonaActual();
    
    observable$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (persona) => {
        if (persona) {
          await this.patchFormWithPersonaData(persona);
          this.tieneDatosGuardados = true;
          
          this.checkAndUpdateStatus();
        } else {
          this.tieneDatosGuardados = false;
          this.checkAndUpdateStatus();
        }
        this.isLoadingInitial = false;
      },
      error: (error) => {
        this.isLoadingInitial = false;
        this.tieneDatosGuardados = false;
        this.checkAndUpdateStatus();
        if (!error.message?.includes('no encontrado')) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos del usuario'
          });
        }
      }
    });
  }

  private async patchFormWithPersonaData(persona: Persona): Promise<void> {
    try {
      const tipoDocumentoId = this.findInDropdown(this.tiposDocumento, persona.tipoDocumento, 'Tipo Documento');
      const generoId = this.findInDropdown(this.generos, persona.genero, 'Género');
      const estadoCivilId = this.findInDropdown(this.estadosCiviles, persona.estadoCivil, 'Estado Civil');
      const nacionalidadId = this.findInDropdown(this.nacionalidades, persona.nacionalidad, 'Nacionalidad');
      const etniaId = this.findInDropdown(this.etnias, persona.etnia, 'Etnia');
      const areaId = this.findInDropdown(this.areas, persona.area, 'Área');
      const filiacionPoliticaId = this.findInDropdown(this.filiacionPoliticas, persona.filiacionPolitica || '', 'Filiación Política');
      const estratoId = this.findInDropdown(this.estratos, persona.estrato || '', 'Estrato');
      
      const tieneLibretaMilitar = persona.tieneLibretaMilitar || false;
      
      const libretaMilitar = (persona.libretaMilitar && persona.libretaMilitar.toLowerCase().trim() !== 'no aplica') 
        ? persona.libretaMilitar : '';
      const clase = persona.clase || null;
      const distrito = (persona.distrito && persona.distrito.toLowerCase().trim() !== 'no aplica') 
        ? persona.distrito : '';
      
      let discapacidadIds: string[] = [];
      if (persona.discapacidad && persona.discapacidad.trim() !== '') {
        const nombresDiscapacidad = persona.discapacidad.split(',').map(d => d.trim()).filter(d => d !== '');
        discapacidadIds = nombresDiscapacidad
          .map(nombre => this.findInDropdown(this.discapacidades, nombre, 'Discapacidad'))
          .filter(id => id !== ''); 
      }
      
      const dependenciaNombre = persona.dependencia || '';
      let sectorId = this.findInDropdown(this.sectores, persona.sector, 'Sector');
      let sectorControlValue = '';
      const rawSector = persona.sector ? String(persona.sector).trim() : '';
      if (rawSector) {
        const lower = rawSector.toLowerCase();
        if (lower === 'urbano' || lower === 'rural') {
          sectorControlValue = lower;
        } else if (sectorId) {
          const opt = this.sectores.find(s => s.id === sectorId);
          if (opt && opt.nombre) sectorControlValue = String(opt.nombre).trim().toLowerCase();
        } else {
          const optByName = this.sectores.find(s => s.nombre?.trim().toLowerCase() === rawSector.toLowerCase());
          if (optByName && optByName.nombre) sectorControlValue = String(optByName.nombre).trim().toLowerCase();
        }
      }

      // Guardar correo original para detectar cambios y sincronizar con Keycloak
      this.correoOriginal = persona.correo || '';

      this.form.patchValue({
        identificacion: persona.identificacion,
        tipoDocumento: tipoDocumentoId,
        primerNombre: persona.primerNombre,
        segundoNombre: persona.segundoNombre,
        primerApellido: persona.primerApellido,
        segundoApellido: persona.segundoApellido,
        telefono: persona.telefono,
        celular1: persona.celular1,
        celular2: persona.celular2,
        correo: persona.correo,
        fechaNacimiento: persona.fechaNacimiento ? new Date(persona.fechaNacimiento) : null,
        genero: generoId,
        estadoCivil: estadoCivilId,
        nacionalidad: nacionalidadId,
        etnia: etniaId,
        tieneDiscapacidad: persona.discapacidad && persona.discapacidad.trim() !== '' ? true : false,
        discapacidad: discapacidadIds,
        victimaConflicto: persona.victimaConflicto,
        barrio: persona.barrio,
        direccion: persona.direccion,
  sector: sectorControlValue || sectorId,
        fechaExpedicion: persona.fechaExpedicion ? new Date(persona.fechaExpedicion) : null,
        aspiracionSalario: persona.aspiracionSalario,
        trabajoActual: persona.trabajoActual,
        area: areaId,
        hojaVidaPresentada: persona.hojaVidaPresentada,
        trabajaUniversidad: persona.trabajaUniversidad,
        correoInstitucional: persona.correoInstitucional,
        cargoUniversidad: persona.cargoUniversidad,
        dependencia: dependenciaNombre,
        egresadoUniversidad: persona.egresadoUniversidad,
        filiacionPolitica: filiacionPoliticaId,
        estrato: estratoId,
        tieneLibretaMilitar: tieneLibretaMilitar,
        libretaMilitar: libretaMilitar,
        clase: clase,
        distrito: distrito,
        politica_datos: persona.politica_datos || false
      });


      if (persona.fechaNacimiento) {
        this.cdr.markForCheck();
      }

      this.updateAspiracionSalarialDisplay();

      await this.cargarUbicacionesDesdeDatos(persona);

      this.updateFieldStates();
      
      this.updateAspiracionSalarialDisplay();
      this.forceAspiracionSalarialFormat();
      
      const rawValue = this.form.getRawValue();
      this.initialFormValue = JSON.parse(JSON.stringify(this.normalizeFormValue(rawValue)));
      this.formHasChanges = false;
      
      this.cdr.detectChanges();
    } catch (error) {
    }
  }

  private async cargarUbicacionesDesdeDatos(persona: Persona): Promise<void> {
    try {
      await Promise.all([
        this.cargarUbicacionExpedicion(persona),
        this.cargarUbicacionNacimiento(persona),
        this.cargarUbicacionResidencia(persona)
      ]);
    } catch (error) {
    }
  }

  private async cargarUbicacionExpedicion(persona: Persona): Promise<void> {
    if (!persona.paisExpedicion) return;
    
    const paisExpedicionId = await this.obtenerPaisIdPorNombre(persona.paisExpedicion);
    if (!paisExpedicionId) return;
    
    this.form.patchValue({ paisExpedicion: paisExpedicionId });
    await this.cargarUbicacionesPorPais(paisExpedicionId, 'expedicion', 'departamentos');
    
    if (!persona.departamentoExpedicion) return;
    
    const deptoExpedicionId = await this.obtenerDepartamentoIdPorNombre(persona.departamentoExpedicion, paisExpedicionId);
    if (!deptoExpedicionId) return;
    
    this.form.patchValue({ departamentoExpedicion: deptoExpedicionId });
    await this.cargarUbicacionesPorPadre(deptoExpedicionId, 'expedicion', 'ciudades');
    
    if (!persona.ciudadExpedicion) return;
    
    const ciudadExpedicionId = await this.obtenerCiudadIdPorNombre(persona.ciudadExpedicion, deptoExpedicionId);
    if (ciudadExpedicionId) {
      this.form.patchValue({ ciudadExpedicion: ciudadExpedicionId });
    }
  }

  private async cargarUbicacionNacimiento(persona: Persona): Promise<void> {
    if (!persona.paisNacimiento) return;
    
    const paisNacimientoId = await this.obtenerPaisIdPorNombre(persona.paisNacimiento);
    if (!paisNacimientoId) return;
    
    this.form.patchValue({ paisNacimiento: paisNacimientoId });
    await this.cargarUbicacionesPorPais(paisNacimientoId, 'nacimiento', 'departamentos');
    
    if (!persona.departamentoNacimiento) return;
    
    const deptoNacimientoId = await this.obtenerDepartamentoIdPorNombre(persona.departamentoNacimiento, paisNacimientoId);
    if (!deptoNacimientoId) return;
    
    this.form.patchValue({ departamentoNacimiento: deptoNacimientoId });
    await this.cargarUbicacionesPorPadre(deptoNacimientoId, 'nacimiento', 'ciudades');
    
    if (!persona.ciudadNacimiento) return;
    
    const ciudadNacimientoId = await this.obtenerCiudadIdPorNombre(persona.ciudadNacimiento, deptoNacimientoId);
    if (ciudadNacimientoId) {
      this.form.patchValue({ ciudadNacimiento: ciudadNacimientoId });
    }
  }

  private async cargarUbicacionResidencia(persona: Persona): Promise<void> {
    if (!persona.paisResidencia) return;
    
    const paisResidenciaId = await this.obtenerPaisIdPorNombre(persona.paisResidencia);
    if (!paisResidenciaId) return;
    
    this.form.patchValue({ paisResidencia: paisResidenciaId });
    await this.cargarUbicacionesPorPais(paisResidenciaId, 'residencia', 'departamentos');
    
    if (!persona.departamentoResidencia) return;
    
    const deptoResidenciaId = await this.obtenerDepartamentoIdPorNombre(persona.departamentoResidencia, paisResidenciaId);
    if (!deptoResidenciaId) return;
    
    this.form.patchValue({ departamentoResidencia: deptoResidenciaId });
    await this.cargarUbicacionesPorPadre(deptoResidenciaId, 'residencia', 'ciudades');
    
    if (!persona.ciudadResidencia) return;
    
    const ciudadResidenciaId = await this.obtenerCiudadIdPorNombre(persona.ciudadResidencia, deptoResidenciaId);
    if (ciudadResidenciaId) {
      this.form.patchValue({ ciudadResidencia: ciudadResidenciaId });
    }
  }

  private async obtenerPaisIdPorNombre(nombre: string): Promise<string | null> {
    try {
      const response = await this.ubicacionesGeograficasService.getPaisIdPorNombre(nombre).toPromise();
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
        const key = `${contexto}_${paisId}`;
        const departamentosContexto = this.departamentos.get(key);
        
        if (departamentosContexto && departamentosContexto.length > 0) {
          const departamentoEncontrado = departamentosContexto.find(d => 
            d.nombre.toLowerCase().trim() === nombreNormalizado
          );
          
          if (departamentoEncontrado) {
            return departamentoEncontrado.id;
          }
        }
      }
      
      const ubicacion = await this.ubicacionesGeograficasService.getByNombreExacto(nombre).toPromise();
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
      const contextos = ['expedicion', 'nacimiento', 'residencia'];
      
      for (const contexto of contextos) {
        const key = `${contexto}_${departamentoId}`;
        const ciudadesContexto = this.ciudadesMap.get(key);
        
        if (ciudadesContexto && ciudadesContexto.length > 0) {
          const ciudadEncontrada = ciudadesContexto.find(c => 
            c.nombre.toLowerCase().trim() === nombreNormalizado
          );
          
          if (ciudadEncontrada) {
            return ciudadEncontrada.id;
          }
        }
      }
      const ciudadesDepartamento = await this.ubicacionesGeograficasService
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

  private updateFieldStates(): void {
    const paisExpedicion = this.form.get('paisExpedicion')?.value;
    const departamentoExpedicion = this.form.get('departamentoExpedicion')?.value;
    const paisNacimiento = this.form.get('paisNacimiento')?.value;
    const departamentoNacimiento = this.form.get('departamentoNacimiento')?.value;
    const paisResidencia = this.form.get('paisResidencia')?.value;
    const departamentoResidencia = this.form.get('departamentoResidencia')?.value;

    const departamentoExpedicionControl = this.form.get('departamentoExpedicion');
    if (!paisExpedicion) {
      departamentoExpedicionControl?.disable({ emitEvent: false });
    } else {
      departamentoExpedicionControl?.enable({ emitEvent: false });
    }

    const ciudadExpedicionControl = this.form.get('ciudadExpedicion');
    const esColombiaExpedicion = paisExpedicion === this.paisColombiaId;
    if (!paisExpedicion || (esColombiaExpedicion && !departamentoExpedicion)) {
      ciudadExpedicionControl?.disable({ emitEvent: false });
    } else {
      ciudadExpedicionControl?.enable({ emitEvent: false });
    }

    const ciudadNacimientoControl = this.form.get('ciudadNacimiento');
    const esColumbiaNacimiento = paisNacimiento === this.paisColombiaId;
    if (esColumbiaNacimiento && !departamentoNacimiento) {
      ciudadNacimientoControl?.disable({ emitEvent: false });
    } else {
      ciudadNacimientoControl?.enable({ emitEvent: false });
    }

    const ciudadResidenciaControl = this.form.get('ciudadResidencia');
    const esColombiaResidencia = paisResidencia === this.paisColombiaId;
    if (esColombiaResidencia && !departamentoResidencia) {
      ciudadResidenciaControl?.disable({ emitEvent: false });
    } else {
      ciudadResidenciaControl?.enable({ emitEvent: false });
    }
  }

  private showUserErrorMessage(message: string, error: any): void {
    this.errorMessage = message;
    
    setTimeout(() => {
      this.errorMessage = null;
      this.showErrorDetails = false;
    }, 5000);
    
    if (error?.status === 500) {
      this.errorMessage = `${message}. El servidor está experimentando problemas temporales. Por favor, intenta más tarde.`;
    } else if (error?.status === 404) {
      this.errorMessage = `${message}. Los datos solicitados no fueron encontrados.`;
    } else if (error?.status === 0) {
      this.errorMessage = `${message}. Problema de conexión con el servidor.`;
    }
  }

  toggleErrorDetails(): void {
    this.showErrorDetails = !this.showErrorDetails;
  }

  closeErrorMessage(): void {
    this.errorMessage = null;
    this.showErrorDetails = false;
  }
}

export class CustomValidators {

  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString().trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      return isValid ? null : { invalidEmail: { value: control.value } };
    };
  }

  static documentNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const isValid = /^\d+$/.test(value);
      
      return isValid ? null : { invalidDocument: { value: control.value } };
    };
  }
  
  static phoneNumber(maxLength: number = 13): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim().replace(/[\s\-()]/g, '');
      const isValid = new RegExp(`^\\d{7,${maxLength}}$`).test(value);
      return isValid ? null : { invalidPhone: { value: control.value } };
    };
  }
  
  static cellPhoneNumberFlexible(maxLength: number = 13): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const value = control.value.toString().trim().replace(/[\s\-()]/g, '');
      const isValid = new RegExp(`^\\d{10,${maxLength}}$`).test(value);
      return isValid ? null : { invalidCellPhone: { value: control.value } };
    };
  }

  static requiredIfTrabajaUniversidad(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control.parent;
      if (!form) return null;
      
      const trabaja = form.get('trabajaUniversidad')?.value;
      if (trabaja && (!control.value || control.value.toString().trim() === '')) {
        return { required: true };
      }
      return null;
    };
  }

  static requiredIfTieneDiscapacidad(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control.parent;
      if (!form) return null;
      
      const tieneDiscapacidad = form.get('tieneDiscapacidad')?.value;
      if (tieneDiscapacidad && (!control.value || control.value.length === 0)) {
        return { required: true };
      }
      return null;
    };
  }

  static requiredIfTieneLibretaMilitar(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control.parent;
      if (!form) return null;
      
      const tieneLibreta = form.get('tieneLibretaMilitar')?.value;
      if (tieneLibreta && (!control.value || control.value.toString().trim() === '')) {
        return { required: true };
      }
      return null;
    };
  }
  
  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const isValid = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-']+$/.test(value);
      
      return isValid ? null : { invalidName: { value: control.value } };
    };
  }

  static barrioValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const isValid = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s][a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s\-'\/\.,]+$/.test(value);
      
      return isValid ? null : { invalidBarrio: { value: control.value } };
    };
  }

  static addressValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString().trim();
      const isValid = /^[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s\-#\/\.,']+$/.test(value);

      return isValid ? null : { invalidAddress: { value: control.value } };
    };
  }

  static notOnlyWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString();
      if (value.trim() === '') {
        return { whitespaceOnly: { value: control.value } };
      }
      
      return null;
    };
  }

  static salaryRange(min: number = 0, max: number = 999999999): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) return null;
      
      const value = Number(control.value);
      
      if (isNaN(value)) {
        return { invalidSalary: { value: control.value } };
      }
      
      if (value < min || value > max) {
        return { salaryOutOfRange: { min, max, value } };
      }
      
      return null;
    };
  }
  
  static documentWithType(tipoDocumento: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      
      switch (tipoDocumento?.trim()) {
        case 'Cédula de Ciudadanía':
          if (!/^\d{6,10}$/.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'La cédula debe tener entre 6 y 10 dígitos' 
            }};
          }
          break;
          
        case 'Tarjeta de Identidad':
          if (!/^\d{10,11}$/.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'La tarjeta de identidad debe tener entre 10 y 11 dígitos' 
            }};
          }
          break;
          
        case 'Pasaporte':
          if (!/^[A-Z0-9]{6,12}$/.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos' 
            }};
          }
          break;
          
        case 'Cédula de Extranjería':
          if (!/^\d{6,12}$/.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'La cédula de extranjería debe tener entre 6 y 12 dígitos' 
            }};
          }
          break;

        case 'Permiso Especial de Permanencia':
          if (!/^[A-Z0-9]{8,12}$/.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'El PEP debe tener entre 8 y 12 caracteres' 
            }};
          }
          break;
          
        default:
          if (!/^[A-Z0-9]{6,12}$/i.test(value)) {
            return { invalidDocument: { 
              value: control.value, 
              message: 'El documento debe tener entre 6 y 12 caracteres' 
            }};
          }
      }
      
      return null;
    };
  }
  
  static minimumAge(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      try {
        const birthDate = new Date(control.value);
        
        if (isNaN(birthDate.getTime())) {
          return { invalidDate: { value: control.value } };
        }
        
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        
        if (actualAge < minAge) {
          return { minimumAge: { 
            requiredAge: minAge, 
            currentAge: actualAge,
            message: `Debe ser mayor de ${minAge} años`
          }};
        }
      } catch (error) {
        return { invalidDate: { value: control.value } };
      }
      
      return null;
    };
  }

  static maximumAge(maxAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      try {
        const birthDate = new Date(control.value);
        
        if (isNaN(birthDate.getTime())) {
          return { invalidDate: { value: control.value } };
        }
        
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        
        if (actualAge > maxAge) {
          return { maximumAge: { 
            maxAge: maxAge, 
            currentAge: actualAge,
            message: `La edad no puede superar los ${maxAge} años`
          }};
        }
      } catch (error) {
        return { invalidDate: { value: control.value } };
      }
      
      return null;
    };
  }
  static minimumDocumentAge(minYears: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      try {
        const parent = control.parent;
        if (!parent) return null;
        
        const birthDateControl = parent.get('fechaNacimiento');
        if (!birthDateControl?.value) return null;
        
        const birthDate = new Date(birthDateControl.value);
        const expeditionDate = new Date(control.value);
        
        if (isNaN(birthDate.getTime()) || isNaN(expeditionDate.getTime())) {
          return { invalidDate: { value: control.value } };
        }
        
        const yearsDiff = expeditionDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = expeditionDate.getMonth() - birthDate.getMonth();
        const dayDiff = expeditionDate.getDate() - birthDate.getDate();
        
        const actualYearsDiff = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) 
          ? yearsDiff - 1 
          : yearsDiff;
        
        if (actualYearsDiff < minYears) {
          return { minimumDocumentAge: { 
            requiredYears: minYears, 
            actualYears: actualYearsDiff,
            message: `La fecha de expedición debe ser al menos ${minYears} años después del nacimiento`
          }};
        }
      } catch (error) {
        return { invalidDate: { value: control.value } };
      }
      
      return null;
    };
  }

  static futureDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      try {
        const selectedDate = new Date(control.value);
        const today = new Date();
        
        if (isNaN(selectedDate.getTime())) {
          return { invalidDate: { value: control.value } };
        }
        
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          return { futureDate: { 
            value: control.value, 
            message: 'La fecha no puede ser mayor a la actual' 
          }};
        }
      } catch (error) {
        return { invalidDate: { value: control.value } };
      }

      return null;
    };
  }

  static expeditionAfterBirth(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      try {
        const parent = control.parent;
        if (!parent) return null;

        const birthDateControl = parent.get('fechaNacimiento');
        if (!birthDateControl?.value) return null;

        const expeditionDate = new Date(control.value);
        const birthDate = new Date(birthDateControl.value);

        if (isNaN(expeditionDate.getTime()) || isNaN(birthDate.getTime())) {
          return { invalidDate: { value: control.value } };
        }

        expeditionDate.setHours(0, 0, 0, 0);
        birthDate.setHours(0, 0, 0, 0);

        if (expeditionDate < birthDate) {
          return { expeditionBeforeBirth: { 
            value: control.value, 
            message: 'La fecha de expedición no puede ser anterior a la de nacimiento' 
          }};
        }
      } catch (error) {
        return { invalidDate: { value: control.value } };
      }

      return null;
    };
  }

  static notEqual(fieldNameToCompare: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const parent = control.parent;
      if (!parent) return null;

      const compareControl = parent.get(fieldNameToCompare);
      if (!compareControl?.value) return null;

      const isSame = control.value.toString().trim().toLowerCase() === 
                    compareControl.value.toString().trim().toLowerCase();

      return isSame ? { notEqual: { value: control.value } } : null;
    };
  }
}