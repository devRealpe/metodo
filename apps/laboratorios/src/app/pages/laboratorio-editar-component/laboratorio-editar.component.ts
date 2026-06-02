import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  InputComponent,
  TextareaComponent,
  SelectComponent
} from '@microfrontends/shared-ui';

type Opt = { label: string; value: string };

@Component({
  selector: 'app-laboratorio-editar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule, 
    InputComponent,
    TextareaComponent,
    SelectComponent
  ],
  providers: [MessageService],
  templateUrl: './laboratorio-editar.component.html'
})
export class LaboratorioEditarComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private svc = inject(LaboratoriosService);
  private toast = inject(MessageService);

  form!: FormGroup;
  saving = false;
  loading = false;
  selectedLab: Laboratorio | null = null;
  nombreLaboratorio: string | null = null;

  estadoOptions: Opt[] = [
    { label: 'Disponible', value: 'Disponible' },
    { label: 'Ocupado', value: 'Ocupado' },
    { label: 'Mantenimiento', value: 'Mantenimiento' }
  ];
  tipoOptions: Opt[] = [
    { label: 'Servicio', value: 'Servicio' },
    { label: 'Clases', value: 'Clases' }
  ];
  sedeOptions: Opt[] = [
    { label: 'Sede Alvernia', value: 'Sede Alvernia' },
    { label: 'Sede Central', value: 'Sede Central' }
  ];
  bloqueOptions: Opt[] = [
    { label: 'Maria Inmaculada', value: 'Maria Inmaculada' },
    { label: 'San José', value: 'San José' },
    { label: 'San Francisco', value: 'San Francisco' },
    { label: 'Alvernia', value: 'Alvernia' },
    { label: 'Jesús De Nazaret', value: 'Jesús De Nazaret' },
    { label: 'San Buenaventura', value: 'San Buenaventura' }
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100),
        this.validarSoloLetrasNumeroEspacios
      ]],
      capacidad: [null, [
        Validators.required, 
        Validators.min(1),
        Validators.max(200),
        this.validarNumeroEntero
      ]],
      estado: ['Disponible', Validators.required],
      tipo: ['Servicio', Validators.required],
      sede: ['Sede Central', Validators.required],
      bloque: ['', [Validators.maxLength(50)]],
      descripcion: ['', [Validators.maxLength(500)]]
    });

    const nombreParametro = this.route.snapshot.paramMap.get('nombre');
    if (nombreParametro) {
      this.nombreLaboratorio = decodeURIComponent(nombreParametro);
      this.cargarLaboratorio();
    } else {
      this.toast.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se especificó el laboratorio a editar' 
      });
      this.volver();
    }
  }

  private cargarLaboratorio(): void {
    if (!this.nombreLaboratorio) return;
    
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (laboratorios) => {
        const lab = laboratorios.find(l => l.nombre === this.nombreLaboratorio);
        if (lab) {
          this.selectedLab = lab;
          this.form.patchValue({
            nombre: lab.nombre,
            capacidad: lab.capacidad,
            estado: lab.estado,
            tipo: lab.tipo,
            sede: lab.ubicacion,
            bloque: lab.bloque || '',
            descripcion: lab.descripcion || ''
          });
        } else {
          this.toast.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se encontró el laboratorio especificado' 
          });
          this.volver();
        }
      },
      error: () => {
        this.toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo cargar el laboratorio' 
        });
        this.volver();
      },
      complete: () => this.loading = false
    });
  }

  guardar() {
    if (!this.selectedLab) return;
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      this.toast.add({ 
        severity: 'warn', 
        summary: 'Formulario inválido', 
        detail: 'Por favor corrija los errores antes de guardar' 
      });
      return;
    }

    const valores = this.form.value;
    const payload = {
      nombre: valores.nombre.trim(),
      capacidad: Number(valores.capacidad),
      estado: valores.estado,
      tipo: valores.tipo,
      ubicacion: valores.sede,
      bloque: valores.bloque?.trim() || '',
      descripcion: valores.descripcion?.trim() || ''
    };

    this.saving = true;
    this.svc.update(this.selectedLab.id, payload).subscribe({
      next: () => {
        this.toast.add({ 
          severity: 'success', 
          summary: 'Guardado', 
          detail: 'Laboratorio actualizado correctamente' 
        });
        this.volver();
      },
      error: () => {
        this.toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo actualizar el laboratorio' 
        });
      },
      complete: () => (this.saving = false)
    });
  }

  volver() {
    this.router.navigate(['/app/listaLaboratorios']);
  }

  cancelar() {
    this.volver();
  }

  private validarSoloLetrasNumeroEspacios(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const valor = control.value.toString().trim();
    const patron = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;
    
    if (!patron.test(valor)) {
      return { formatoInvalido: 'Solo se permiten letras, números, espacios y caracteres básicos' };
    }
    
    return null;
  }

  private validarNumeroEntero(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const valor = Number(control.value);
    if (!Number.isInteger(valor) || valor <= 0) {
      return { numeroInvalido: 'Debe ser un número entero positivo' };
    }
    
    return null;
  }

  campoInvalido(ctrl: string) {
    const control = this.form.get(ctrl);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  obtenerError(ctrl: string) {
    const control = this.form.get(ctrl);
    if (!control || !control.errors) return '';
    
    const errores = control.errors;
    if (errores['required']) return 'Campo requerido';
    if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    if (errores['min']) return `El valor mínimo es ${errores['min'].min}`;
    if (errores['max']) return `El valor máximo es ${errores['max'].max}`;
    if (errores['formatoInvalido']) return errores['formatoInvalido'];
    if (errores['numeroInvalido']) return errores['numeroInvalido'];
    
    return 'Valor inválido';
  }

  get tituloPagina(): string {
    if (this.loading) return 'Cargando...';
    if (this.selectedLab) return `Editando: ${this.selectedLab.nombre}`;
    return 'Editar Laboratorio';
  }
}
