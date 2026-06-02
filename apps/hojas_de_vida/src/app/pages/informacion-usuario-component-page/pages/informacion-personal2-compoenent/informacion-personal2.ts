import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectComponent, InputComponent, DatepickerComponent, MultiselectComponent, InputNumberComponent } from '@microfrontends/shared-ui';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { DropdownItem, UbicacionesGeograficasDto } from '@microfrontends/shared-models';
import { ListasValoresService } from '../../../../core/services/listas-valores.service';
import { ListaValor } from '../../../../core/models/lista-valor.model';
import { PersonasService } from '../../../../core/services/personas.service';
import { Persona } from '../../../../core/models/persona.model';
import { UbicacionesGeograficasService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-informacion-personal2',
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    SelectComponent, 
    InputComponent, 
    DatepickerComponent,
    MultiselectComponent,
    InputNumberComponent,
    CheckboxModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './informacion-personal2.html',
  styleUrl: './informacion-personal2.scss',
})
export class InformacionPersonal2 implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private listasValoresService = inject(ListasValoresService);
  private personasService = inject(PersonasService);
  private ubicacionesGeograficasService = inject(UbicacionesGeograficasService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private destroy$ = new Subject<void>();

  informacionForm!: FormGroup;

  tiposDocumento: DropdownItem[] = [];
  generos: DropdownItem[] = [];
  estadosCiviles: DropdownItem[] = [];
  paises: DropdownItem[] = [];
  departamentosExpedicion: DropdownItem[] = [];
  departamentosNacimiento: DropdownItem[] = [];
  departamentosResidencia: DropdownItem[] = [];
  ciudadesExpedicion: DropdownItem[] = [];
  ciudadesNacimiento: DropdownItem[] = [];
  ciudadesResidencia: DropdownItem[] = [];
  etnias: DropdownItem[] = [];
  nacionalidades: DropdownItem[] = [];
  discapacidades: DropdownItem[] = [];
  sectores: DropdownItem[] = [
    { nombre: 'Urbano', id: 'urbano' },
    { nombre: 'Rural', id: 'rural' }
  ];
  estratos: DropdownItem[] = [];
  areas: DropdownItem[] = [];
  filiacionPoliticas: DropdownItem[] = [];
  libretasMilitares: DropdownItem[] = [];
  dependencias: DropdownItem[] = [];

  isLoadingData = false;
  isSubmitting = false;
  tieneDatosGuardados = false;
  personaId: string | null = null;
  errorMessage: string | null = null;
  paisColombiaId: string | null = null;

  mostrarDepartamentoExpedicion = false;
  mostrarDepartamentoNacimiento = false;
  mostrarDepartamentoResidencia = false;

  errorMessages: { [key: string]: { [key: string]: string } } = {
    primerNombre: {
      required: 'El primer nombre es obligatorio',
      minlength: 'El primer nombre debe tener al menos 2 caracteres',
      maxlength: 'El primer nombre no puede exceder 65 caracteres',
      pattern: 'El primer nombre solo puede contener letras y espacios'
    },
    segundoNombre: {
      maxlength: 'El segundo nombre no puede exceder 65 caracteres',
      pattern: 'El segundo nombre solo puede contener letras y espacios'
    },
    primerApellido: {
      required: 'El primer apellido es obligatorio',
      minlength: 'El primer apellido debe tener al menos 2 caracteres',
      maxlength: 'El primer apellido no puede exceder 65 caracteres',
      pattern: 'El primer apellido solo puede contener letras y espacios'
    },
    segundoApellido: {
      maxlength: 'El segundo apellido no puede exceder 65 caracteres',
      pattern: 'El segundo apellido solo puede contener letras y espacios'
    },
    tipoDocumento: {
      required: 'El tipo de documento es obligatorio'
    },
    identificacion: {
      required: 'El número de documento es obligatorio',
      maxlength: 'El número de documento no puede exceder 12 caracteres',
      pattern: 'El número de documento solo puede contener números'
    },
    paisExpedicion: {
      required: 'El país de expedición es obligatorio'
    },
    ciudadExpedicion: {
      required: 'La ciudad de expedición es obligatoria'
    },
    fechaExpedicion: {
      required: 'La fecha de expedición es obligatoria'
    },
    fechaNacimiento: {
      required: 'La fecha de nacimiento es obligatoria'
    },
    paisNacimiento: {
      required: 'El país de nacimiento es obligatorio'
    },
    ciudadNacimiento: {
      required: 'La ciudad de nacimiento es obligatoria'
    },
    genero: {
      required: 'El género es obligatorio'
    },
    estadoCivil: {
      required: 'El estado civil es obligatorio'
    },
    nacionalidad: {
      required: 'La nacionalidad es obligatoria'
    },
    etnia: {
      required: 'La etnia es obligatoria'
    },
    discapacidad: {
      required: 'Debe especificar el tipo de discapacidad'
    },
    paisResidencia: {
      required: 'El país de residencia es obligatorio'
    },
    ciudadResidencia: {
      required: 'La ciudad de residencia es obligatoria'
    },
    barrio: {
      required: 'El barrio es obligatorio',
      maxlength: 'El barrio no puede exceder 100 caracteres'
    },
    direccion: {
      required: 'La dirección es obligatoria',
      maxlength: 'La dirección no puede exceder 100 caracteres'
    },
    sector: {
      required: 'El sector es obligatorio'
    },
    estrato: {
      required: 'El estrato es obligatorio'
    },
    telefono: {
      maxlength: 'El teléfono no puede exceder 13 caracteres',
      pattern: 'El teléfono solo puede contener números'
    },
    celular1: {
      required: 'El celular principal es obligatorio',
      maxlength: 'El celular no puede exceder 13 caracteres',
      pattern: 'El celular solo puede contener números'
    },
    celular2: {
      maxlength: 'El celular no puede exceder 13 caracteres',
      pattern: 'El celular solo puede contener números'
    },
    correo: {
      required: 'El correo electrónico es obligatorio',
      email: 'El correo electrónico no tiene un formato válido',
      maxlength: 'El correo no puede exceder 50 caracteres'
    },
    aspiracionSalario: {
      required: 'La aspiración salarial es obligatoria',
      min: 'La aspiración salarial debe ser mayor a 0'
    },
    area: {
      required: 'El área de interés es obligatoria'
    },
    cargoUniversidad: {
      required: 'El cargo en la universidad es obligatorio cuando trabaja en ella'
    },
    dependencia: {
      required: 'La dependencia es obligatoria cuando trabaja en la universidad'
    },
    filiacionPolitica: {
      required: 'La filiación política es obligatoria'
    },
    libretaMilitar: {
      required: 'El estado de libreta militar es obligatorio'
    },
    politica_datos: {
      required: 'Debe aceptar la política de tratamiento de datos'
    }
  };

  ngOnInit(): void {
    this.initForm();
    this.cargarDropdowns();
    this.setupFormListeners();
    
    setTimeout(() => this.cargarDatosUsuario(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.informacionForm = this.fb.group({
      primerNombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(65)]],
      segundoNombre: ['', [Validators.maxLength(65)]],
      primerApellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(65)]],
      segundoApellido: ['', [Validators.maxLength(65)]],
      
      tipoDocumento: ['', Validators.required],
      identificacion: ['', [Validators.required, Validators.maxLength(12)]],
      paisExpedicion: ['', Validators.required],
      departamentoExpedicion: [''],
      ciudadExpedicion: ['', Validators.required],
      fechaExpedicion: ['', Validators.required],
      
      fechaNacimiento: ['', Validators.required],
      paisNacimiento: ['', Validators.required],
      departamentoNacimiento: [''],
      ciudadNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      estadoCivil: ['', Validators.required],
      nacionalidad: ['', Validators.required],
      etnia: ['', Validators.required],
      tieneDiscapacidad: [false],
      discapacidad: [''],
      victimaConflicto: [false],
      
      paisResidencia: ['', Validators.required],
      departamentoResidencia: [''],
      ciudadResidencia: ['', Validators.required],
      barrio: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(100)]],
      sector: ['', Validators.required],
      estrato: ['', Validators.required],
      
      telefono: ['', [Validators.maxLength(13)]],
      celular1: ['', [Validators.required, Validators.maxLength(13)]],
      celular2: ['', [Validators.maxLength(13)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      
      aspiracionSalario: ['', Validators.required],
      trabajoActual: [false],
      area: ['', Validators.required],
      
      hojaVidaPresentada: [false],
      trabajaUniversidad: [false],
      cargoUniversidad: [''],
      dependencia: [''],
      egresadoUniversidad: [false],
      filiacionPolitica: ['', Validators.required],
      libretaMilitar: ['', Validators.required],
      politica_datos: [false, Validators.requiredTrue]
    });
  }

  private setupFormListeners(): void {
    this.informacionForm.get('paisExpedicion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(paisId => {
        this.handlePaisChange(paisId, 'expedicion');
      });

    this.informacionForm.get('departamentoExpedicion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(departamentoId => {
        if (departamentoId) {
          this.cargarCiudadesPorDepartamento(departamentoId, 'expedicion');
          this.informacionForm.patchValue({
            ciudadExpedicion: ''
          }, { emitEvent: false });
        }
      });

    this.informacionForm.get('paisNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(paisId => {
        this.handlePaisChange(paisId, 'nacimiento');
      });

    this.informacionForm.get('departamentoNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(departamentoId => {
        if (departamentoId) {
          this.cargarCiudadesPorDepartamento(departamentoId, 'nacimiento');
          this.informacionForm.patchValue({
            ciudadNacimiento: ''
          }, { emitEvent: false });
        }
      });

    this.informacionForm.get('paisResidencia')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(paisId => {
        this.handlePaisChange(paisId, 'residencia');
      });

    this.informacionForm.get('departamentoResidencia')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(departamentoId => {
        if (departamentoId) {
          this.cargarCiudadesPorDepartamento(departamentoId, 'residencia');
          this.informacionForm.patchValue({
            ciudadResidencia: ''
          }, { emitEvent: false });
        }
      });
  }

  private handlePaisChange(paisId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!paisId) {
      this.ocultarDepartamento(contexto);
      return;
    }

    const esColombia = paisId === this.paisColombiaId;

    if (esColombia) {
      this.mostrarDepartamento(contexto);
      this.cargarDepartamentosPorPais(paisId, contexto);
    } else {
      this.ocultarDepartamento(contexto);
      this.cargarCiudadesPorPais(paisId, contexto);
    }

    const deptoField = `departamento${this.capitalize(contexto)}`;
    const ciudadField = `ciudad${this.capitalize(contexto)}`;
    this.informacionForm.patchValue({
      [deptoField]: '',
      [ciudadField]: ''
    }, { emitEvent: false });
  }

  private mostrarDepartamento(contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (contexto === 'expedicion') {
      this.mostrarDepartamentoExpedicion = true;
    } else if (contexto === 'nacimiento') {
      this.mostrarDepartamentoNacimiento = true;
    } else {
      this.mostrarDepartamentoResidencia = true;
    }
  }

  private ocultarDepartamento(contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (contexto === 'expedicion') {
      this.mostrarDepartamentoExpedicion = false;
      this.departamentosExpedicion = [];
    } else if (contexto === 'nacimiento') {
      this.mostrarDepartamentoNacimiento = false;
      this.departamentosNacimiento = [];
    } else {
      this.mostrarDepartamentoResidencia = false;
      this.departamentosResidencia = [];
    }
  }

  private cargarDepartamentosPorPais(paisId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!paisId) return;

    this.ubicacionesGeograficasService.getDepartamentosPorPais(paisId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departamentos: UbicacionesGeograficasDto[]) => {
          const dropdownItems = departamentos.map(d => ({
            id: d.id,
            nombre: d.nombre
          }));

          if (contexto === 'expedicion') {
            this.departamentosExpedicion = dropdownItems;
          } else if (contexto === 'nacimiento') {
            this.departamentosNacimiento = dropdownItems;
          } else {
            this.departamentosResidencia = dropdownItems;
          }

        },
      });
  }

  private cargarCiudadesPorPais(paisId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!paisId) return;

    this.ubicacionesGeograficasService.getByPadreForDropdown(paisId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ciudades: UbicacionesGeograficasDto[]) => {
          const dropdownItems = ciudades.map(c => ({
            id: c.id,
            nombre: c.nombre
          }));

          if (contexto === 'expedicion') {
            this.ciudadesExpedicion = dropdownItems;
          } else if (contexto === 'nacimiento') {
            this.ciudadesNacimiento = dropdownItems;
          } else {
            this.ciudadesResidencia = dropdownItems;
          }

        },
      });
  }

  private cargarCiudadesPorDepartamento(departamentoId: string, contexto: 'expedicion' | 'nacimiento' | 'residencia'): void {
    if (!departamentoId) return;

    this.ubicacionesGeograficasService.getMunicipiosPorDepartamento(departamentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ciudades: UbicacionesGeograficasDto[]) => {
          const dropdownItems = ciudades.map(c => ({
            id: c.id,
            nombre: c.nombre
          }));

          if (contexto === 'expedicion') {
            this.ciudadesExpedicion = dropdownItems;
          } else if (contexto === 'nacimiento') {
            this.ciudadesNacimiento = dropdownItems;
          } else {
            this.ciudadesResidencia = dropdownItems;
          }

        },
      });
  }

  private cargarDropdowns(): void {
    this.cargarCamposCriticos();
    
    this.cargarPaises();
    
    setTimeout(() => this.cargarCamposSecundarios(), 200);
  }

  private cargarPaises(): void {
    this.ubicacionesGeograficasService.getPaises()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paises: UbicacionesGeograficasDto[]) => {
          this.paises = paises.map(p => ({
            id: p.id,
            nombre: p.nombre
          }));

          const colombia = this.paises.find(p => p.nombre.toLowerCase().includes('colombia'));
          this.paisColombiaId = colombia?.id || null;

        },
      });
  }

  private cargarCamposCriticos(): void {
    
    this.listasValoresService.obtenerPorTipo('TDOC')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tiposDocumento = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('GEN')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.generos = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('ECIV')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.estadosCiviles = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('AREI')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.areas = this.mapToDropdown(data);
        },
      });
  }

  private cargarCamposSecundarios(): void {

    this.listasValoresService.obtenerPorTipo('ETN')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.etnias = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('NAC')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.nacionalidades = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('DISC')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.discapacidades = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('POLI')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.filiacionPoliticas = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('EST')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.estratos = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('MIL')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.libretasMilitares = this.mapToDropdown(data);
        },
      });

    this.listasValoresService.obtenerPorTipo('DPE')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dependencias = this.mapToDropdown(data);
        },
      });
  }

  private mapToDropdown(items: ListaValor[]): DropdownItem[] {
    if (!Array.isArray(items)) return [];
    return items
      .filter(item => item.idPadre !== null) 
      .map(item => ({ 
        id: item.id, 
        nombre: item.nombre 
      }));
  }

  private cargarDatosUsuario(): void {
    this.isLoadingData = true;
    
    this.personasService.getPersonaActual()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (persona) => {
          if (persona) {
            this.personaId = persona.id || null;
            this.tieneDatosGuardados = !!persona.id;
            await this.llenarFormulario(persona);
          } else {
            this.tieneDatosGuardados = false;
            this.personaId = null;
          }
          this.isLoadingData = false;
        },
        error: (error) => {
          this.isLoadingData = false;
          this.tieneDatosGuardados = false;
        }
      });
  }

  private async llenarFormulario(persona: Persona): Promise<void> {

    this.informacionForm.patchValue({
      primerNombre: persona.primerNombre || '',
      segundoNombre: persona.segundoNombre || '',
      primerApellido: persona.primerApellido || '',
      segundoApellido: persona.segundoApellido || '',
    }, { emitEvent: false });

    this.informacionForm.patchValue({
      tipoDocumento: this.buscarIdEnLista(this.tiposDocumento, persona.tipoDocumento),
      identificacion: persona.identificacion || '',
      fechaExpedicion: persona.fechaExpedicion ? new Date(persona.fechaExpedicion) : null,
    }, { emitEvent: false });

    if (persona.paisExpedicion) {
      await this.cargarUbicacionesParaContexto('expedicion', persona.paisExpedicion, persona.departamentoExpedicion, persona.ciudadExpedicion);
    }

    this.informacionForm.patchValue({
      fechaNacimiento: persona.fechaNacimiento ? new Date(persona.fechaNacimiento) : null,
      genero: this.buscarIdEnLista(this.generos, persona.genero),
      estadoCivil: this.buscarIdEnLista(this.estadosCiviles, persona.estadoCivil),
      nacionalidad: this.buscarIdEnLista(this.nacionalidades, persona.nacionalidad),
      etnia: this.buscarIdEnLista(this.etnias, persona.etnia),
      tieneDiscapacidad: persona.discapacidad ? true : false,
      discapacidad: persona.discapacidad ? persona.discapacidad.split(',').map(d => d.trim()) : [],
      victimaConflicto: persona.victimaConflicto || false,
    }, { emitEvent: false });

    if (persona.paisNacimiento) {
      await this.cargarUbicacionesParaContexto('nacimiento', persona.paisNacimiento, persona.departamentoNacimiento, persona.ciudadNacimiento);
    }

    this.informacionForm.patchValue({
      barrio: persona.barrio || '',
      direccion: persona.direccion || '',
      sector: persona.sector || '',
      estrato: this.buscarIdEnLista(this.estratos, persona.estrato),
    }, { emitEvent: false });

    if (persona.paisResidencia) {
      await this.cargarUbicacionesParaContexto('residencia', persona.paisResidencia, persona.departamentoResidencia, persona.ciudadResidencia);
    }

    this.informacionForm.patchValue({
      telefono: persona.telefono || '',
      celular1: persona.celular1 || '',
      celular2: persona.celular2 || '',
      correo: persona.correo || '',
    }, { emitEvent: false });

    this.informacionForm.patchValue({
      aspiracionSalario: persona.aspiracionSalario || '',
      trabajoActual: persona.trabajoActual || false,
      area: this.buscarIdEnLista(this.areas, persona.area),
    }, { emitEvent: false });

    this.informacionForm.patchValue({
      hojaVidaPresentada: persona.hojaVidaPresentada || false,
      trabajaUniversidad: persona.trabajaUniversidad || false,
      cargoUniversidad: persona.cargoUniversidad || '',
      dependencia: this.buscarIdEnLista(this.dependencias, persona.dependencia),
      egresadoUniversidad: persona.egresadoUniversidad || false,
      filiacionPolitica: this.buscarIdEnLista(this.filiacionPoliticas, persona.filiacionPolitica),
      libretaMilitar: this.buscarIdEnLista(this.libretasMilitares, persona.libretaMilitar),
      politica_datos: persona.politica_datos || false
    }, { emitEvent: false });
  }

  private async cargarUbicacionesParaContexto(
    contexto: 'expedicion' | 'nacimiento' | 'residencia',
    paisId: string,
    departamentoId?: string,
    ciudadId?: string
  ): Promise<void> {
    try {
      
      let paisUuid = paisId;
      if (!this.esUUID(paisId)) {
        paisUuid = this.buscarIdEnLista(this.paises, paisId);
        if (paisUuid) {
        } else {
          return;
        }
      }
      
      const paisField = `pais${this.capitalize(contexto)}`;
      this.informacionForm.patchValue({ [paisField]: paisUuid }, { emitEvent: false });

      const esColombia = paisUuid === this.paisColombiaId;
      
      if (esColombia) {
        this.mostrarDepartamento(contexto);
        
        const departamentos = await this.ubicacionesGeograficasService
          .getDepartamentosPorPais(paisUuid)
          .toPromise();

        if (departamentos) {
          const dropdownItems = departamentos.map(d => ({
            id: d.id,
            nombre: d.nombre
          }));

          if (contexto === 'expedicion') {
            this.departamentosExpedicion = dropdownItems;
          } else if (contexto === 'nacimiento') {
            this.departamentosNacimiento = dropdownItems;
          } else {
            this.departamentosResidencia = dropdownItems;
          }

          if (departamentoId) {
            let departamentoUuid = departamentoId;
            if (!this.esUUID(departamentoId)) {
              departamentoUuid = this.buscarIdEnLista(dropdownItems, departamentoId);
              if (departamentoUuid) {
              
              } else {
                return;
              }
            }
            
            const deptoField = `departamento${this.capitalize(contexto)}`;
            this.informacionForm.patchValue({ [deptoField]: departamentoUuid }, { emitEvent: false });

            const ciudades = await this.ubicacionesGeograficasService
              .getMunicipiosPorDepartamento(departamentoUuid)
              .toPromise();

            if (ciudades) {
              const ciudadesDropdown = ciudades.map(c => ({
                id: c.id,
                nombre: c.nombre
              }));

              if (contexto === 'expedicion') {
                this.ciudadesExpedicion = ciudadesDropdown;
              } else if (contexto === 'nacimiento') {
                this.ciudadesNacimiento = ciudadesDropdown;
              } else {
                this.ciudadesResidencia = ciudadesDropdown;
              }

              if (ciudadId) {
                let ciudadUuid = ciudadId;
                if (!this.esUUID(ciudadId)) {
                  ciudadUuid = this.buscarIdEnLista(ciudadesDropdown, ciudadId);
                  if (ciudadUuid) {
                  } else {
                  }
                }
                
                if (ciudadUuid) {
                  const ciudadField = `ciudad${this.capitalize(contexto)}`;
                  this.informacionForm.patchValue({ [ciudadField]: ciudadUuid }, { emitEvent: false });
                }
              }
            }
          }
        }
      } else {
        this.ocultarDepartamento(contexto);

        const ciudades = await this.ubicacionesGeograficasService
          .getByPadreForDropdown(paisUuid)
          .toPromise();

        if (ciudades) {
          const ciudadesDropdown = ciudades.map(c => ({
            id: c.id,
            nombre: c.nombre
          }));

          if (contexto === 'expedicion') {
            this.ciudadesExpedicion = ciudadesDropdown;
          } else if (contexto === 'nacimiento') {
            this.ciudadesNacimiento = ciudadesDropdown;
          } else {
            this.ciudadesResidencia = ciudadesDropdown;
          }

          if (ciudadId) {
            let ciudadUuid = ciudadId;
            if (!this.esUUID(ciudadId)) {
              ciudadUuid = this.buscarIdEnLista(ciudadesDropdown, ciudadId);
              if (ciudadUuid) {
              } else {
              }
            }
            
            if (ciudadUuid) {
              const ciudadField = `ciudad${this.capitalize(contexto)}`;
              this.informacionForm.patchValue({ [ciudadField]: ciudadUuid }, { emitEvent: false });
            }
          }
        }
      }
      
    } catch (error) {
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private esUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
  
  private buscarIdEnLista(lista: DropdownItem[], nombre: string | undefined): string {
    if (!nombre) return '';
    
    const item = lista.find(i => 
      i.nombre?.toLowerCase() === nombre.toLowerCase()
    );
    
    return item?.id || '';
  }

  getCustomErrorMessages(fieldName: string): { [key: string]: string } {
    return this.errorMessages[fieldName] || {};
  }

  onSubmit(): void {
    Object.keys(this.informacionForm.controls).forEach(key => {
      this.informacionForm.get(key)?.markAsTouched();
    });

    if (this.informacionForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos obligatorios correctamente'
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const personaData: Persona = {
      ...this.informacionForm.value,
      id: this.personaId 
    };

    const operacion$ = this.tieneDatosGuardados && this.personaId
      ? this.personasService.actualizarPersonaActual(personaData)
      : this.personasService.crearPersonaActual(personaData);

    operacion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (persona) => {
        this.isSubmitting = false;
        this.tieneDatosGuardados = true;
        this.personaId = persona.id || null;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.tieneDatosGuardados 
            ? 'Información actualizada correctamente' 
            : 'Información guardada correctamente'
        });

        this.informacionForm.markAsPristine();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message || 'Error al guardar la información';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.errorMessage || 'Error al guardar'
        });
      }
    });
  }
}
