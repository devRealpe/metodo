import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbMarcaService } from '../../core/services/lb-marca.service';
import { LbMarca, LbMarcaPayload } from '../../core/models/lb-marca.model';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-marca',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    ConfirmDialogModule,
    TooltipModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-marca.component.html',
})
export class LbMarcaComponent implements OnInit {

  private formBuilder        = inject(FormBuilder);
  private marcaService       = inject(LbMarcaService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private confirmationService = inject(ConfirmationService);
  private messageService     = inject(MessageService);

  marcas = signal<LbMarca[]>([]);

  cargando        = false;
  cargandoTabla   = false;
  modoEdicion     = false;
  marcaSeleccionada: LbMarca | null = null;

  filtroTexto = signal('');

  estadoOpciones = signal<OpcionSelect[]>([]);

  marcasFiltradas = computed<LbMarca[]>(() => {
    const filtro = this.filtroTexto().toLowerCase().trim();
    if (!filtro) return this.marcas();
    return this.marcas().filter(m =>
      m.nombre.toLowerCase().includes(filtro) ||
      m.estado.toLowerCase().includes(filtro)
    );
  });

  formMarca = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    estado: ['Activa', [Validators.required]],
  });

  ngOnInit(): void {
    this.cargarMarcas();
    this.listaValoresEquipoService.obtenerHijosPorNombrePadre('ESTADO_MARCA').subscribe({
      next: (valores) => {
        this.estadoOpciones.set([
          { label: 'Seleccionar estado...', value: '' },
          ...valores.map(v => ({ label: v.nombre, value: v.nombre })),
        ]);
        if (!this.formMarca.get('estado')?.value) {
          const primero = valores[0]?.nombre ?? 'Activa';
          this.formMarca.patchValue({ estado: primero });
        }
      },
    });
  }

  async cargarMarcas(): Promise<void> {
    this.cargandoTabla = true;
    try {
      const lista = await this.marcaService.getAll().toPromise();
      this.marcas.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las marcas' });
    } finally {
      this.cargandoTabla = false;
    }
  }

  async registrar(): Promise<void> {
    if (this.formMarca.invalid) {
      this.formMarca.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formMarca.value;
      const payload: LbMarcaPayload = {
        nombre: v.nombre || '',
        estado: v.estado || 'Activa',
      };

      if (this.modoEdicion && this.marcaSeleccionada) {
        await this.marcaService.update(this.marcaSeleccionada.id, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `"${payload.nombre}" actualizada correctamente` });
      } else {
        await this.marcaService.create(payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: `"${payload.nombre}" registrada correctamente` });
      }

      this.limpiarFormulario();
      await this.cargarMarcas();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo guardar la marca' });
    } finally {
      this.cargando = false;
    }
  }

  editar(marca: LbMarca): void {
    this.modoEdicion = true;
    this.marcaSeleccionada = marca;
    this.formMarca.patchValue({
      nombre: marca.nombre,
      estado: marca.estado,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmarEliminar(marca: LbMarca): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la marca "${marca.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(marca.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.marcaService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Marca eliminada correctamente' });
      await this.cargarMarcas();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo eliminar la marca' });
    }
  }

  limpiarFormulario(): void {
    this.formMarca.reset({ nombre: '', estado: 'Activa' });
    this.formMarca.markAsUntouched();
    this.modoEdicion = false;
    this.marcaSeleccionada = null;
  }

  esInvalido(campo: string): boolean {
    const control = this.formMarca.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formMarca.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required'])   return 'Este campo es obligatorio';
    if (e['minlength'])  return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength'])  return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  etiquetaEstado(estado: string): string {
    return estado === 'Activa' ? 'Activa' : 'Inactiva';
  }

  severidadEstado(estado: string): string {
    return estado === 'Activa' ? 'text-green-600' : 'text-red-500';
  }
}
