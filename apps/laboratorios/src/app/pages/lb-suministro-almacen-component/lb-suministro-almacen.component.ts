import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbSuministroAlmacenService } from '../../core/services/lb-suministro-almacen.service';
import { LbSuministroAlmacen } from '../../core/models/lb-suministro-almacen.model';
import { LbListaValoresSuministroService } from '../../core/services/lb-lista-valores-suministro.service';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-suministro-almacen',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-suministro-almacen.component.html',
})
export class LbSuministroAlmacenComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private suministroAlmacenService = inject(LbSuministroAlmacenService);
  private listaValoresSuministroService = inject(LbListaValoresSuministroService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  categoriasRaw = signal<string[]>([]);
  undMedidasRaw = signal<string[]>([]);

  cargando = false;
  modoEdicion = false;
  suministroSeleccionado: LbSuministroAlmacen | null = null;

  categoriasOpciones = computed<OpcionSelect[]>(() => [
    { label: 'Seleccionar categoría...', value: '' },
    ...this.categoriasRaw().map(c => ({ label: c, value: c }))
  ]);

  undMedidasOpciones = computed<OpcionSelect[]>(() => [
    { label: 'Seleccionar unidad de medida...', value: '' },
    ...this.undMedidasRaw().map(u => ({ label: u, value: u }))
  ]);

  formSuministro = this.formBuilder.group({
    codigo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    categoria: ['', [Validators.required, Validators.maxLength(80)]],
    undMedida: ['', [Validators.required, Validators.maxLength(30)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    Promise.allSettled([
      this.cargarCategorias(),
      this.cargarUndMedidas(),
    ]);
  }

  private async cargarCategorias(): Promise<void> {
    try {
      const categorias = await this.listaValoresSuministroService.obtenerHijosPorNombrePadre('TIPO_SUMINISTRO').toPromise();
      this.categoriasRaw.set(Array.isArray(categorias) ? categorias.map(c => c.nombre) : []);
    } catch {
      // silencioso
    }
  }

  private async cargarUndMedidas(): Promise<void> {
    try {
      const undMedidas = await this.listaValoresSuministroService.obtenerHijosPorNombrePadre('UND_MEDIDA_SUMINISTRO').toPromise();
      this.undMedidasRaw.set(Array.isArray(undMedidas) ? undMedidas.map(u => u.nombre) : []);
    } catch {
      // silencioso
    }
  }

  async registrar(): Promise<void> {
    if (this.formSuministro.invalid) {
      this.formSuministro.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formSuministro.value;
      const payload: Omit<LbSuministroAlmacen, 'id'> = {
        codigo: v.codigo || '',
        nombre: v.nombre || '',
        categoria: v.categoria || '',
        undMedida: v.undMedida || '',
        stock: v.stock ?? 0,
      };

      if (this.modoEdicion && this.suministroSeleccionado) {
        await this.suministroAlmacenService.update(this.suministroSeleccionado.id, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `"${payload.nombre}" actualizado correctamente` });
      } else {
        await this.suministroAlmacenService.create(payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: `"${payload.nombre}" registrado correctamente` });
      }

      this.limpiarFormulario();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el suministro' });
    } finally {
      this.cargando = false;
    }
  }

  confirmarEliminar(suministro: LbSuministroAlmacen): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el suministro "${suministro.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(suministro.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.suministroAlmacenService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Suministro eliminado correctamente' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el suministro' });
    }
  }

  limpiarFormulario(): void {
    this.formSuministro.reset({ codigo: '', nombre: '', categoria: '', undMedida: '', stock: 0 });
    this.formSuministro.markAsUntouched();
    this.modoEdicion = false;
    this.suministroSeleccionado = null;
  }

  esInvalido(campo: string): boolean {
    const control = this.formSuministro.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formSuministro.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    return 'Campo inválido';
  }
}
