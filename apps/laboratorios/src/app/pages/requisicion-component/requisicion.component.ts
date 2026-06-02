import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { distinctUntilChanged } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

import {
  RequisicionSuministro,
  ItemSuministro,
  FormErrors,
} from '../../core/models/requisicion-suministro.models';
import { Suministro } from '../../core/models/suministro.models';
import { RequisicionSuministroService } from '../../core/services/requisicion-suministro.service';
import { SuministroService } from '../../core/services/suministro.service';
import { CodigosSolicitudService, CodigoSolicitud } from '../../core/services/codigos-solicitud.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';

@Component({
  selector: 'app-requisicion.component',
  imports: [CommonModule, ReactiveFormsModule, SelectModule, DatePickerModule],
  templateUrl: './requisicion.component.html',
  styleUrl: './requisicion.component.scss',
})
export class RequisicionComponent implements OnInit, OnDestroy {
  
  private readonly fb = inject(FormBuilder);
  private readonly requisicionService = inject(RequisicionSuministroService);
  private readonly suministroService = inject(SuministroService);
  private readonly codigosSolicitudService = inject(CodigosSolicitudService);
  private readonly listasValoresService = inject(ListasValoresService);

  loading = signal(false);
  errors = signal<FormErrors>({});
  successMessage = signal<string>('');

  codigosPmi = signal<CodigoSolicitud[]>([]);
  codigosBn = signal<CodigoSolicitud[]>([]);
  proyectosEstrategicos = signal<CodigoSolicitud[]>([]);
  centrosCosto = signal<CodigoSolicitud[]>([]);
  cargandoCodigos = signal(false);

  suministrosEncontrados = signal<Suministro[]>([]);
  buscandoSuministros = signal(false);
  private timeoutBusqueda: ReturnType<typeof setTimeout> | null = null;

  requisicionForm!: FormGroup;
  maxDate = new Date();

  get codigoPmiOptions() {
    return this.codigosPmi().map((pmi) => ({
      label: pmi.nombre,
      value: pmi.nombre,
    }));
  }

  get codigoBnOptions() {
    return this.codigosBn().map((bn) => ({
      label: bn.nombre,
      value: bn.nombre,
    }));
  }

  get proyectoOptions() {
    return this.proyectosEstrategicos().map((p) => ({
      label: p.nombre,
      value: p.nombre,
    }));
  }

  get dependenciaOptions() {
    return this.centrosCosto().map((cc) => ({
      label: cc.nombre,
      value: cc.nombre,
    }));
  }

  get centrosCostoOptions() {
    return this.centrosCosto().map((cc) => ({
      label: `${this.centroNumero(cc)} - ${cc.nombre}`,
      value: this.centroNumero(cc),
    }));
  }

  get depToCC(): Map<string, string> {
    return new Map(
      this.centrosCosto().map((cc) => [cc.nombre, this.centroNumero(cc)])
    );
  }

  get ccToDep(): Map<string, string> {
    return new Map(
      this.centrosCosto().map((cc) => [this.centroNumero(cc), cc.nombre])
    );
  }

  private centroNumero(cc: CodigoSolicitud): string {
    if (!cc) return '';
    const abre = cc.abreviatura?.toString()?.trim() ?? '';
    if (/^\d+$/.test(abre)) return abre;
    const found = abre.match(/\d+/);
    if (found) return found[0];
    return cc.id ?? '';
  }
  
  ngOnInit(): void {
    this.initForm();
    this.wireLinkedFields();
    this.setupRelationEnablers();
    this.cargarCodigosSolicitud();
  }

  private cargarCodigosSolicitud(): void {
    this.cargandoCodigos.set(true);
    this.deshabilitarCamposDuranteCarga();

    Promise.allSettled([
      this.cargarCodigoPMI(),
      this.cargarCodigoBN(),
      this.cargarProyectoEstrategico(),
      this.cargarCentrosCosto()
    ])
      .finally(() => {
        this.cargandoCodigos.set(false);
        this.habilitarCamposDespuesCarga();
      });
  }

  private deshabilitarCamposDuranteCarga(): void {
    this.requisicionForm.get('solicitanteCentroCosto')?.disable();
    this.requisicionForm.get('solicitanteDependencia')?.disable();
  }

  private habilitarCamposDespuesCarga(): void {
    this.requisicionForm.get('solicitanteCentroCosto')?.enable();
    this.requisicionForm.get('solicitanteDependencia')?.enable();
  }

  private procesarResultadosCarga(resultados: {
    pmi: CodigoSolicitud[];
    bn: CodigoSolicitud[];
    pdi: CodigoSolicitud[];
    centrosCosto: CodigoSolicitud[];
  }): void {
    this.codigosPmi.set(resultados.pmi.filter((codigo: CodigoSolicitud) => codigo.idPadre));
    this.codigosBn.set(resultados.bn.filter((codigo: CodigoSolicitud) => codigo.idPadre));
    this.proyectosEstrategicos.set(resultados.pdi.filter((codigo: CodigoSolicitud) => codigo.idPadre));
    this.centrosCosto.set(resultados.centrosCosto.filter((codigo: CodigoSolicitud) => codigo.idPadre));
    this.validarSelect('codigoPmi', this.codigoPmiOptions);
    this.validarSelect('codigoBn', this.codigoBnOptions);
    this.validarSelect('proyectoEstrategico', this.proyectoOptions);
    this.validarSelect('solicitanteCentroCosto', this.centrosCostoOptions);
    this.validarSelect('solicitanteDependencia', this.dependenciaOptions);
    this.cargandoCodigos.set(false);
    this.habilitarCamposDespuesCarga();
  }

  private cargarCodigoPMI(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('PMI').subscribe({
        next: (rows: any[]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped: CodigoSolicitud[] = rows.map((r: any) => ({ id: r.id, nombre: r.nombre, abreviatura: r.abreviatura, idPadre: r.idPadre }));
            this.codigosPmi.set(mapped.filter(c => c.idPadre));
            this.validarSelect('codigoPmi', this.codigoPmiOptions);
            resolve();
          } else {
            this.codigosSolicitudService.getByTipo('PMI').subscribe({
              next: (pmi) => { this.codigosPmi.set(pmi.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('codigoPmi', this.codigoPmiOptions); resolve(); },
              error: (err) => { this.codigosPmi.set([]); reject(new Error('No se pudieron cargar codigos PMI')); }
            });
          }
        },
        error: (err) => {
          this.codigosSolicitudService.getByTipo('PMI').subscribe({
            next: (pmi) => { this.codigosPmi.set(pmi.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('codigoPmi', this.codigoPmiOptions); resolve(); },
            error: (err2) => { this.codigosPmi.set([]); reject(new Error('No se pudieron cargar codigos PMI')); }
          });
        }
      });
    });
  }

  private cargarCodigoBN(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('BN').subscribe({
        next: (rows: any[]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped: CodigoSolicitud[] = rows.map((r: any) => ({ id: r.id, nombre: r.nombre, abreviatura: r.abreviatura, idPadre: r.idPadre }));
            this.codigosBn.set(mapped.filter(c => c.idPadre));
            this.validarSelect('codigoBn', this.codigoBnOptions);
            resolve();
          } else {
            this.codigosSolicitudService.getByTipo('BN').subscribe({next: (bn) => { this.codigosBn.set(bn.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('codigoBn', this.codigoBnOptions); resolve(); }, error: (err) => { this.codigosBn.set([]); reject(new Error('No se pudieron cargar codigos BN')); }});
          }
        },
        error: (err) => {
          this.codigosSolicitudService.getByTipo('BN').subscribe({next: (bn) => { this.codigosBn.set(bn.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('codigoBn', this.codigoBnOptions); resolve(); }, error: (err2) => { this.codigosBn.set([]); reject(new Error('No se pudieron cargar codigos BN')); }});
        }
      });
    });
  }

  private cargarProyectoEstrategico(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('PDI').subscribe({
        next: (rows: any[]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped: CodigoSolicitud[] = rows.map((r: any) => ({ id: r.id, nombre: r.nombre, abreviatura: r.abreviatura, idPadre: r.idPadre }));
            this.proyectosEstrategicos.set(mapped.filter(c => c.idPadre));
            this.validarSelect('proyectoEstrategico', this.proyectoOptions);
            resolve();
          } else {
            this.codigosSolicitudService.getByTipo('PDI').subscribe({next: (pdi) => { this.proyectosEstrategicos.set(pdi.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('proyectoEstrategico', this.proyectoOptions); resolve(); }, error: (err) => { this.proyectosEstrategicos.set([]); reject(new Error('No se pudieron cargar proyectos estratégicos')); }});
          }
        },
        error: (err) => {
          this.codigosSolicitudService.getByTipo('PDI').subscribe({next: (pdi) => { this.proyectosEstrategicos.set(pdi.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('proyectoEstrategico', this.proyectoOptions); resolve(); }, error: (err2) => { this.proyectosEstrategicos.set([]); reject(new Error('No se pudieron cargar proyectos estratégicos')); }});
        }
      });
    });
  }
  private cargarCentrosCosto(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.listasValoresService.getDropdownByTipo('CC').subscribe({
        next: (rows: any[]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped: CodigoSolicitud[] = rows.map((r: any) => ({ id: r.id, nombre: r.nombre, abreviatura: r.abreviatura, idPadre: r.idPadre }));
            this.centrosCosto.set(mapped.filter(c => c.idPadre));
            this.validarSelect('solicitanteCentroCosto', this.centrosCostoOptions);
            this.validarSelect('solicitanteDependencia', this.dependenciaOptions);
            resolve();
          } else {
            this.codigosSolicitudService.getCentrosCostos().subscribe({next: (centros) => { this.centrosCosto.set(centros.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('solicitanteCentroCosto', this.centrosCostoOptions); this.validarSelect('solicitanteDependencia', this.dependenciaOptions); resolve(); }, error: (err) => { this.centrosCosto.set([]); reject(new Error('No se pudieron cargar centros de costo')); }});
          }
        },
        error: (err) => {
          this.codigosSolicitudService.getCentrosCostos().subscribe({next: (centros) => { this.centrosCosto.set(centros.filter((codigo: CodigoSolicitud) => codigo.idPadre)); this.validarSelect('solicitanteCentroCosto', this.centrosCostoOptions); this.validarSelect('solicitanteDependencia', this.dependenciaOptions); resolve(); }, error: (err2) => { this.centrosCosto.set([]); reject(new Error('No se pudieron cargar centros de costo')); }});
        }
      });
    });
  }

  private validarSelect(controlName: string, opciones: Array<{ label: string; value: any }>): void {
    const control = this.requisicionForm.get(controlName);
    if (!control) return;
    const current = control.value;
    if (!current) return;
    const exists = opciones.some((o) => o.value === current || o.label === current);
    if (!exists) {
      control.setValue('');
    }
  }

  private manejarErrorCarga(): void {
    this.cargandoCodigos.set(false);
    this.codigosPmi.set([]);
    this.codigosBn.set([]);
    this.proyectosEstrategicos.set([]);
    this.centrosCosto.set([]);
    this.habilitarCamposDespuesCarga();
  }

  private setupRelationEnablers(): void {
    this.configurarEstadoInicialCampos();
    this.configurarObservadorCambios();
  }

  private configurarEstadoInicialCampos(): void {
    const relPmiCtrl = this.requisicionForm.get('relacionPmi');
    const codPmiCtrl = this.requisicionForm.get('codigoPmi');
    const relBnCtrl = this.requisicionForm.get('relacionBn');
    const codBnCtrl = this.requisicionForm.get('codigoBn');
    const relPdiCtrl = this.requisicionForm.get('relacionPdi');
    const codPdiCtrl = this.requisicionForm.get('proyectoEstrategico');

    this.habilitarDeshabilitarCampo(relPmiCtrl, codPmiCtrl);
    this.habilitarDeshabilitarCampo(relBnCtrl, codBnCtrl);
    this.habilitarDeshabilitarCampo(relPdiCtrl, codPdiCtrl);
  }

  private habilitarDeshabilitarCampo(checkboxCtrl: AbstractControl | null, campoCtrl: AbstractControl | null): void {
    if (checkboxCtrl?.value) {
      campoCtrl?.enable({ emitEvent: false });
    } else {
      campoCtrl?.disable({ emitEvent: false });
    }
  }

  private configurarObservadorCambios(): void {
    const relPmiCtrl = this.requisicionForm.get('relacionPmi');
    const codPmiCtrl = this.requisicionForm.get('codigoPmi');
    const relBnCtrl = this.requisicionForm.get('relacionBn');
    const codBnCtrl = this.requisicionForm.get('codigoBn');
    const relPdiCtrl = this.requisicionForm.get('relacionPdi');
    const codPdiCtrl = this.requisicionForm.get('proyectoEstrategico');

    this.configurarObservadorCampo(relPmiCtrl, codPmiCtrl);
    this.configurarObservadorCampo(relBnCtrl, codBnCtrl);
    this.configurarObservadorCampo(relPdiCtrl, codPdiCtrl);
  }

  private configurarObservadorCampo(checkboxCtrl: AbstractControl | null, campoCtrl: AbstractControl | null): void {
    checkboxCtrl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((checked: boolean) => {
        if (checked) {
          campoCtrl?.enable();
        } else {
          campoCtrl?.reset('');
          campoCtrl?.disable();
        }
      });
  }

  private initForm(): void {
    this.requisicionForm = this.fb.group({
      ...this.crearCamposSolicitante(),
      ...this.crearCamposTipos(),
      ...this.crearCamposRelaciones(),
      ...this.crearCamposCodigos(),
      items: this.fb.array([this.createItemFormGroup()]),
    });

    this.requisicionForm.addValidators(this.atLeastOneTipoSelected);
  }

  private crearCamposSolicitante() {
    return {
      solicitanteNombre: ['', [Validators.required, Validators.minLength(3)]],
      solicitanteCedula: ['', [Validators.required, Validators.pattern(/^\d{8,10}$/)]],
      solicitanteCentroCosto: ['', [Validators.required]],
      solicitanteDependencia: ['', [Validators.required]],
      fechaSolicitud: [new Date(), [Validators.required]],
    };
  }

  private crearCamposTipos() {
    return {
      tipoActivoFijo: [false],
      tipoSuministro: [true],
      tipoServicio: [false],
    };
  }

  private crearCamposRelaciones() {
    return {
      relacionPmi: [false],
      relacionBn: [false],
      relacionPdi: [false],
      relacionGasto: [false],
      relacionInversion: [false],
    };
  }

  private crearCamposCodigos() {
    return {
      codigoPmi: [''],
      codigoBn: [''],
      proyectoEstrategico: [''],
    };
  }

  private formatDateYYYYMMDD(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private formatProyectoEstrategico(textoCompleto: string): string {
    let match = textoCompleto.match(/Proyecto estratégico (\d+)\.\s*(.+)/i);
    if (match) {
      const numero = match[1];
      const descripcion = match[2];
      return `PE ${numero} ${descripcion}`;
    }

    match = textoCompleto.match(/Proyecto Estratégico (\d+)\.\s*(.+)/);
    if (match) {
      const numero = match[1];
      const descripcion = match[2];
      return `PE ${numero} ${descripcion}`;
    }
    return textoCompleto;
  }

  private obtenerAbreviaturaPmi(nombreCompleto: string): string {
    const codigo = this.codigosPmi().find(c => c.nombre === nombreCompleto);
    return codigo?.abreviatura || nombreCompleto.slice(0, 7);
  }

  private obtenerAbreviaturaBn(nombreCompleto: string): string {
    const codigo = this.codigosBn().find(c => c.nombre === nombreCompleto);
    return codigo?.abreviatura || nombreCompleto.slice(0, 7);
  }

  recargarCodigos(): void {
    this.cargarCodigosSolicitud();
  }

  get codigosCargados(): boolean {
    return !this.cargandoCodigos() && 
           (this.codigosPmi().length > 0 || 
            this.codigosBn().length > 0 || 
            this.proyectosEstrategicos().length > 0 ||
            this.centrosCosto().length > 0);
  }

  private wireLinkedFields(): void {
    const depCtrl = this.requisicionForm.get('solicitanteDependencia');
    const ccCtrl = this.requisicionForm.get('solicitanteCentroCosto');

    if (!depCtrl || !ccCtrl) return;

    depCtrl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((dep: string) => {
        const cc = this.depToCC.get(dep || '');
        if (cc && ccCtrl.value !== cc) {
          ccCtrl.setValue(cc, { emitEvent: false });
        }
      });

    ccCtrl.valueChanges.pipe(distinctUntilChanged()).subscribe((cc: string) => {
      const dep = this.ccToDep.get((cc || '').trim());
      if (dep && depCtrl.value !== dep) {
        depCtrl.setValue(dep, { emitEvent: false });
      }
    });
  }

  private createItemFormGroup(): FormGroup {
    return this.fb.group({
      buscarSuministro: [''],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      unidad: ['', [Validators.required]],
    });
  }

  private atLeastOneTipoSelected = (control: AbstractControl) => {
    const a = control.get('tipoActivoFijo')?.value;
    const s = control.get('tipoSuministro')?.value;
    const v = control.get('tipoServicio')?.value;
    return !a && !s && !v ? { atLeastOneTipo: true } : null;
  };

  get itemsFormArray(): FormArray {
    return this.requisicionForm.get('items') as FormArray;
  }

  agregarItem(): void {
    if (this.itemsFormArray.length < 31)
      this.itemsFormArray.push(this.createItemFormGroup());
  }
  
  eliminarItem(i: number): void {
    if (this.itemsFormArray.length > 1) this.itemsFormArray.removeAt(i);
  }

  private validateForm(): boolean {
    this.errors.set({});
    if (this.requisicionForm.invalid) {
      const formErrors = this.construirErroresValidacion();
      this.errors.set(formErrors);
      return false;
    }
    return true;
  }

  private construirErroresValidacion(): FormErrors {
    const formErrors: FormErrors = {};
    const c = this.requisicionForm.controls;

    this.validarCamposSolicitante(formErrors, c);
    this.validarTiposSolicitud(formErrors);
    this.validarItems(formErrors);

    return formErrors;
  }

  private validarCamposSolicitante(formErrors: FormErrors, controls: { [key: string]: AbstractControl }): void {
    if (controls['solicitanteNombre'].invalid)
      formErrors.solicitanteNombre = 'El nombre del solicitante es obligatorio (mínimo 3 caracteres)';
    
    if (controls['solicitanteCedula'].invalid)
      formErrors.solicitanteCedula = 'La cédula debe tener entre 8 y 10 dígitos';
    
    if (controls['solicitanteCentroCosto'].invalid)
      formErrors.solicitanteCentroCosto = 'El centro de costo es obligatorio';
    
    if (controls['solicitanteDependencia'].invalid)
      formErrors.solicitanteDependencia = 'La dependencia es obligatoria';
    
    if (controls['fechaSolicitud'].invalid)
      formErrors.fechaSolicitud = 'La fecha de solicitud es obligatoria';
  }

  private validarTiposSolicitud(formErrors: FormErrors): void {
    if (this.requisicionForm.hasError('atLeastOneTipo'))
      formErrors.tipoSolicitud = 'Debe seleccionar al menos un tipo de solicitud';
  }

  private validarItems(formErrors: FormErrors): void {
    if ((this.requisicionForm.get('items') as FormArray).invalid)
      formErrors.items = 'Verifique que todos los items tengan los datos completos';
  }

  private getFormData(): RequisicionSuministro {
    const v = this.requisicionForm.value;
    return {
      ...this.extraerDatosSolicitante(v),
      ...this.extraerTiposRelaciones(v),
      ...this.extraerCodigos(v),
      items: v.items as ItemSuministro[],
    };
  }

  private extraerDatosSolicitante(valores: { [key: string]: unknown }) {
    return {
      solicitanteNombre: valores['solicitanteNombre'] as string,
      solicitanteCedula: valores['solicitanteCedula'] as string,
      solicitanteCentroCosto: valores['solicitanteCentroCosto'] as string,
      solicitanteDependencia: valores['solicitanteDependencia'] as string,
      fechaSolicitud: this.formatDateYYYYMMDD(valores['fechaSolicitud'] as Date),
    };
  }

  private extraerTiposRelaciones(valores: { [key: string]: unknown }) {
    return {
      tipoActivoFijo: valores['tipoActivoFijo'] as boolean,
      tipoSuministro: valores['tipoSuministro'] as boolean,
      tipoServicio: valores['tipoServicio'] as boolean,
      relacionPmi: valores['relacionPmi'] as boolean,
      relacionBn: valores['relacionBn'] as boolean,
      relacionPdi: valores['relacionPdi'] as boolean,
      relacionGasto: valores['relacionGasto'] as boolean,
      relacionInversion: valores['relacionInversion'] as boolean,
    };
  }

  private extraerCodigos(valores: { [key: string]: unknown }) {
    return {
      codigoPmi: valores['codigoPmi'] ? this.obtenerAbreviaturaPmi(valores['codigoPmi'] as string) : undefined,
      codigoBn: valores['codigoBn'] ? this.obtenerAbreviaturaBn(valores['codigoBn'] as string) : undefined,
      proyectoEstrategico: valores['proyectoEstrategico'] 
        ? this.formatProyectoEstrategico(valores['proyectoEstrategico'] as string) 
        : undefined,
    };
  }

  previsualizarPdf(): void {
    if (!this.validateForm()) return;
    
    this.prepararGeneracionPdf();
    const data = this.getFormData();
    
    this.requisicionService.generarPdfPrevia(data).subscribe({
      next: (blob) => this.manejarExitoPrevisualizacion(blob),
      error: () => this.manejarErrorPdf('Error al generar el PDF de previsualización. Intente nuevamente.'),
    });
  }

  imprimirPdf(): void {
    if (!this.validateForm()) return;
    
    this.prepararGeneracionPdf();
    const data = this.getFormData();
    
    this.requisicionService.generarPdfImpresion(data).subscribe({
      next: (blob) => this.manejarExitoImpresion(blob, data),
      error: () => this.manejarErrorPdf('Error al generar el PDF de impresión. Intente nuevamente.'),
    });
  }

  private prepararGeneracionPdf(): void {
    this.loading.set(true);
    this.errors.set({});
    this.successMessage.set('');
  }

  private manejarExitoPrevisualizacion(blob: Blob): void {
    this.requisicionService.abrirPdfEnNuevaPestana(blob);
    this.successMessage.set('PDF generado exitosamente. Se abrió en una nueva pestaña.');
    this.loading.set(false);
  }

  private manejarExitoImpresion(blob: Blob, data: RequisicionSuministro): void {
    const nombre = this.requisicionService.generarNombreArchivo(data);
    this.requisicionService.descargarPdf(blob, nombre);
    this.successMessage.set('PDF generado y descargado exitosamente.');
    this.loading.set(false);
  }

  private manejarErrorPdf(mensaje: string): void {
    this.errors.set({ general: mensaje });
    this.loading.set(false);
  }

  validarDatos(): void {
    if (!this.validateForm()) return;

    this.loading.set(true);
    this.errors.set({});
    this.successMessage.set('');

    const requisicion = this.getFormData();

    this.requisicionService.validarRequisicion(requisicion).subscribe({
      next: (v) => {
        if (v.valida) {
          this.successMessage.set(
            'Todos los datos de la requisición son válidos.'
          );
        } else {
          this.errors.set({ general: ` ${v.mensaje}` });
        }
        this.loading.set(false);
      },
      error: () => {
        this.errors.set({
          general: 'Error al validar los datos. Intente nuevamente.',
        });
        this.loading.set(false);
      },
    });
  }

  limpiarFormulario(): void {
    this.requisicionForm.reset();
    this.initForm();
    this.wireLinkedFields();
    this.errors.set({});
    this.successMessage.set('');
  }

  getFieldError(fieldName: keyof FormErrors): string {
    return this.errors()[fieldName] || '';
  }
  
  hasFieldError(fieldName: keyof FormErrors): boolean {
    return !!this.errors()[fieldName];
  }

  buscarSuministros(termino: string): void {
    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);

    if (!this.esTerminoValidoParaBusqueda(termino)) {
      this.limpiarResultadosBusqueda();
      return;
    }

    this.iniciarBusquedaConDebounce(termino);
  }

  private esTerminoValidoParaBusqueda(termino: string): boolean {
    return !!termino && termino.length >= 2;
  }

  private limpiarResultadosBusqueda(): void {
    this.suministrosEncontrados.set([]);
    this.buscandoSuministros.set(false);
  }

  private iniciarBusquedaConDebounce(termino: string): void {
    this.buscandoSuministros.set(true);
    this.timeoutBusqueda = setTimeout(() => {
      this.ejecutarBusquedaSuministros(termino);
    }, 300);
  }

  private ejecutarBusquedaSuministros(termino: string): void {
    const terminoLowerCase = termino.toLowerCase();
    this.suministroService.searchByNombre(terminoLowerCase).subscribe({
      next: (suministros) => this.procesarResultadosBusqueda(suministros, terminoLowerCase),
      error: () => this.manejarErrorBusqueda(),
    });
  }

  private procesarResultadosBusqueda(suministros: Suministro[], termino: string): void {
    const suministrosFiltrados = suministros.filter((s) =>
      s.nombreProducto.toLowerCase().includes(termino)
    );
    this.suministrosEncontrados.set(suministrosFiltrados);
    this.buscandoSuministros.set(false);
  }

  private manejarErrorBusqueda(): void {
    this.suministrosEncontrados.set([]);
    this.buscandoSuministros.set(false);
  }

  seleccionarSuministro(suministro: Suministro, itemIndex: number): void {
    const itemFormGroup = this.itemsFormArray.at(itemIndex);
    itemFormGroup.patchValue({
      buscarSuministro: suministro.nombreProducto,
      descripcion: suministro.nombreProducto,
      unidad: suministro.unidadMedida || 'unidades',
    });
    this.suministrosEncontrados.set([]);
  }

  limpiarBusquedaSuministro(itemIndex: number): void {
    const itemFormGroup = this.itemsFormArray.at(itemIndex);
    itemFormGroup.patchValue({
      buscarSuministro: '',
      descripcion: '',
      unidad: '',
    });
    this.suministrosEncontrados.set([]);
  }
  
  cerrarResultadosBusqueda(): void {
    setTimeout(() => this.suministrosEncontrados.set([]), 200);
  }

  ngOnDestroy(): void {
    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);
  }
}
