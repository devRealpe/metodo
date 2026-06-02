import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  InputComponent,
  TextareaComponent,
  SelectComponent
} from '@microfrontends/shared-ui';

type Opcion = { label: string; value: string };
type ClaveFormulario =
  | 'nombre_laboratorio'
  | 'capacidad'
  | 'estado'
  | 'tipo'
  | 'sede'
  | 'bloque'
  | 'descripcion';

const PATRON_NOMBRE = /^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ.\-#()/]+$/;

const OPCIONES_ESTADO: Opcion[] = [
  { label: 'Disponible', value: 'Disponible' },
  { label: 'Ocupado', value: 'Ocupado' },
  { label: 'Mantenimiento', value: 'Mantenimiento' }
];

const OPCIONES_TIPO: Opcion[] = [
  { label: 'Servicio', value: 'Servicio' },
  { label: 'Clases', value: 'Clases' }
];

const OPCIONES_SEDE: Opcion[] = [
  { label: 'Sede Alvernia', value: 'Sede Alvernia' },
  { label: 'Sede Central', value: 'Sede Central' }
];

const OPCIONES_BLOQUE: Opcion[] = [
  { label: 'Maria Inmaculada', value: 'Maria Inmaculada' },
  { label: 'San José', value: 'San José' },
  { label: 'San Francisco', value: 'San Francisco' },
  { label: 'Alvernia', value: 'Alvernia' },
  { label: 'Jesús De Nazaret', value: 'Jesús De Nazaret' },
  { label: 'San Buenaventura', value: 'San Buenaventura' }
  
];

@Component({
  selector: 'app-laboratorio',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    MessageModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    InputComponent,
    TextareaComponent,
    SelectComponent
  ],
  templateUrl: './laboratorio.component.html',
  styleUrls: ['./laboratorio.component.scss']
})
export class LaboratorioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private rutaActiva = inject(ActivatedRoute);
  private labsSrv = inject(LaboratoriosService);
  private router = inject(Router);

  modoEdicion = false;
  cargando = false;
  mostrarMensajeExito = false;
  private idLaboratorio: string | null = null;

  opcionesEstado = OPCIONES_ESTADO;
  opcionesTipo = OPCIONES_TIPO;
  opcionesSede = OPCIONES_SEDE;
  opcionesBloque = OPCIONES_BLOQUE;

  formularioLaboratorio!: FormGroup;

  private destruir$ = new Subject<void>();

  ngOnInit(): void {
    this.inicializarFormulario();
    this.configurarSuscripciones();

    const id = this.rutaActiva.snapshot.paramMap.get('id');
    if (!id) return;

    this.modoEdicion = true;
    this.idLaboratorio = id;
    this.cargando = true;

    this.labsSrv
      .getById(id)
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: (lab) => {
          this.formularioLaboratorio.patchValue({
            nombre_laboratorio: lab?.nombre ?? '',
            capacidad: lab?.capacidad ?? null,
            estado: this.capitalizar(lab?.estado ?? 'Disponible'),
            tipo: this.capitalizar(lab?.tipo ?? 'Servicio'),
            sede: lab?.ubicacion ?? 'Sede Central',
            bloque: lab?.bloque ?? '',
            descripcion: lab?.descripcion ?? ''
          });
        },
        complete: () => (this.cargando = false)
      });
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  private inicializarFormulario(): void {
    this.formularioLaboratorio = this.fb.group({
      nombre_laboratorio: [
        '',
        [Validators.required, Validators.maxLength(100), Validators.pattern(PATRON_NOMBRE)]
      ],
      capacidad: [null, [Validators.required, Validators.min(1)]],
      estado: ['Disponible', Validators.required],
      tipo: ['Servicio', Validators.required],
      sede: ['Sede Central', Validators.required],
      bloque: ['', Validators.maxLength(50)],
      descripcion: ['', [Validators.maxLength(255)]]
    });
  }

  private configurarSuscripciones(): void {
    this.formularioLaboratorio
      .get('estado')
      ?.valueChanges.pipe(takeUntil(this.destruir$))
      .subscribe((v) => {
        const ctrl = this.formularioLaboratorio.get('estado');
        if (ctrl) {
          ctrl.setValue(this.capitalizar(v ?? ''), { emitEvent: false });
        }
      });

    this.formularioLaboratorio
      .get('tipo')
      ?.valueChanges.pipe(takeUntil(this.destruir$))
      .subscribe((v) => {
        const ctrl = this.formularioLaboratorio.get('tipo');
        if (ctrl) {
          ctrl.setValue(this.capitalizar(v ?? ''), { emitEvent: false });
        }
      });

    this.formularioLaboratorio
      .get('estado')
      ?.valueChanges.pipe(takeUntil(this.destruir$))
      .subscribe((estado) => {
        const ctrlCap = this.formularioLaboratorio.get('capacidad');
        if (!ctrlCap) return;
        
        if ((estado ?? '').toString().toLowerCase() === 'mantenimiento') {
          ctrlCap.disable({ emitEvent: false });
        } else {
          ctrlCap.enable({ emitEvent: false });
        }
      });
  }

  private obtenerControl(nombre: ClaveFormulario): AbstractControl | null {
    return this.formularioLaboratorio.get(nombre);
  }

  esInvalido(nombre: ClaveFormulario): boolean {
    const c = this.obtenerControl(nombre);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  obtenerMensajeError(nombre: ClaveFormulario): string {
    const c = this.obtenerControl(nombre);
    if (!c || !c.errors) return '';

    switch (nombre) {
      case 'nombre_laboratorio':
        if (c.errors['required']) return 'El nombre del laboratorio es obligatorio.';
        if (c.errors['maxlength']) return 'Máximo 100 caracteres para el nombre.';
        if (c.errors['pattern']) return 'Solo letras, números, espacios y . - # ( ) /';
        return 'Revisa el nombre del laboratorio.';
      case 'capacidad':
        if (c.errors['required']) return 'La capacidad es obligatoria.';
        if (c.errors['min']) {
          const min = c.errors['min']?.min ?? 1;
          return `La capacidad debe ser un número mayor o igual a ${min}.`;
        }
        return 'Revisa la capacidad (número entero).';
      case 'estado':
        if (c.errors['required']) return 'Selecciona el estado del laboratorio.';
        return 'Estado inválido.';
      case 'tipo':
        if (c.errors['required']) return 'Selecciona el tipo (Servicio o Clases).';
        return 'Tipo inválido.';
      case 'sede':
        if (c.errors['required']) return 'Selecciona la sede (Alvernia o Central).';
        return 'Sede inválida.';
      case 'bloque':
        if (c.errors['maxlength']) return 'El bloque no puede exceder los 50 caracteres.';
        return 'Bloque inválido.';
      case 'descripcion':
        if (c.errors['maxlength']) return 'La descripción admite máximo 255 caracteres.';
        return 'Descripción inválida.';
      default:
        return 'Campo inválido.';
    }
  }

  permitirCaracteresNombre(ev: KeyboardEvent) {
    const tecla = ev.key;
    const ctrl = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
    if (ctrl.includes(tecla)) return;
    if (!/^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ.\-#()/]$/.test(tecla)) ev.preventDefault();
  }

  capitalizarNombre(ev: FocusEvent) {
    const input = ev.target as HTMLInputElement;
    const valor = (input?.value ?? '').trim().toLowerCase();
    const capitalizado = valor
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
    this.obtenerControl('nombre_laboratorio')?.setValue(capitalizado);
  }

  private capitalizar(valor: string): string {
    if (!valor) return valor;
    const v = `${valor}`.trim();
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  enviarFormulario() {
    if (this.formularioLaboratorio.invalid || this.cargando) {
      this.formularioLaboratorio.markAllAsTouched();
      return;
    }

    const v = this.formularioLaboratorio.getRawValue();

    const datos: Omit<Laboratorio, 'id'> = {
      nombre: (v.nombre_laboratorio ?? '').trim(),
      capacidad: Number(v.capacidad),
      estado: this.capitalizar(v.estado),
      tipo: this.capitalizar(v.tipo),
      ubicacion: v.sede,
      bloque: (v.bloque ?? '').trim(),
      descripcion: (v.descripcion ?? '').trim()
    };

    this.cargando = true;

    const req$ =
      this.modoEdicion && this.idLaboratorio
        ? this.labsSrv.update(this.idLaboratorio, datos)
        : this.labsSrv.create(datos);

    req$.pipe(takeUntil(this.destruir$)).subscribe({
      next: () => {
        this.mostrarMensajeExito = true;

        setTimeout(() => {
          this.mostrarMensajeExito = false;
          this.router.navigate(['/app/listaLaboratorios']);
        }, 1500);
      },
      complete: () => (this.cargando = false)
    });
  }
}
