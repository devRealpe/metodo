import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbMarcaService } from '../../core/services/lb-marca.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';

@Component({
  selector: 'app-lb-equipo-almacen.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-equipo-almacen.component.html',
})
export class LbEquipoAlmacenComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private equipoAlmacenService = inject(LbEquipoAlmacenService);
  private marcaService = inject(LbMarcaService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private messageService = inject(MessageService);

  cargando = false;

  marcaOpciones = signal<{ label: string; value: string }[]>([
    { label: 'Seleccionar marca...', value: '' },
  ]);

  tipoOpciones = signal<{ label: string; value: string }[]>([
    { label: 'Seleccionar tipo...', value: '' },
  ]);

  ngOnInit(): void {
    this.marcaService.getAll().subscribe({
      next: (marcas) => {
        const activas = marcas
          .filter(m => m.estado === 'Activa')
          .map(m => ({ label: m.nombre, value: m.nombre }));
        this.marcaOpciones.set([{ label: 'Seleccionar marca...', value: '' }, ...activas]);
      },
    });
    this.listaValoresEquipoService.obtenerHijosPorNombrePadre('TIPO_EQUIPO').subscribe({
      next: (valores) => {
        this.tipoOpciones.set([
          { label: 'Seleccionar tipo...', value: '' },
          ...valores.map(v => ({ label: v.nombre, value: v.nombre })),
        ]);
      },
    });
  }

  formEquipo = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    tipo: ['', [Validators.required, Validators.maxLength(80)]],
    marca: ['', []],
    modelo: ['', [Validators.maxLength(120)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  async registrar(): Promise<void> {
    if (this.formEquipo.invalid) {
      this.formEquipo.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formEquipo.value;
      const payload: Omit<LbEquipoAlmacen, 'id'> = {
        nombre: v.nombre || '',
        tipo: v.tipo || '',
        marca: v.marca || undefined,
        modelo: v.modelo || undefined,
        stock: v.stock ?? 0,
      };

      await this.equipoAlmacenService.create(payload).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Registrado', detail: `"${payload.nombre}" registrado correctamente` });

      this.limpiarFormulario();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el equipo' });
    } finally {
      this.cargando = false;
    }
  }

  limpiarFormulario(): void {
    this.formEquipo.reset({ nombre: '', tipo: '', marca: '', modelo: '', stock: 0 });
    this.formEquipo.markAsUntouched();
  }

  esInvalido(campo: string): boolean {
    const control = this.formEquipo.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formEquipo.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    return 'Campo inválido';
  }
}
