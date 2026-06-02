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
import { LbEquipoAccesorioService } from '../../core/services/lb-equipo-accesorio.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';
import { LbEquipoAccesorio, LbEquipoAccesorioPayload } from '../../core/models/lb-equipo-accesorio.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-equipo-accesorio',
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
  templateUrl: './lb-equipo-accesorio.component.html',
})
export class LbEquipoAccesorioComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private accesorioService = inject(LbEquipoAccesorioService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  accesorios = signal<LbEquipoAccesorio[]>([]);

  cargando = false;
  cargandoTabla = false;
  modoEdicion = false;
  accesorioSeleccionado: LbEquipoAccesorio | null = null;

  filtroTexto = signal('');

  estadoOpciones = signal<OpcionSelect[]>([
    { label: 'Seleccionar estado...', value: '' },
    { label: 'Funcional',    value: 'funcional' },
    { label: 'Dañado',       value: 'dañado' },
    { label: 'Extraviado',   value: 'extraviado' },
    { label: 'Dado de baja', value: 'dado_de_baja' },
  ]);

  accesoriosFiltrados = computed<LbEquipoAccesorio[]>(() => {
    const filtro = this.filtroTexto().toLowerCase().trim();
    if (!filtro) return this.accesorios();
    return this.accesorios().filter(a =>
      a.nombre.toLowerCase().includes(filtro) ||
      a.estado.toLowerCase().includes(filtro)
    );
  });

  formAccesorio = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    estado: ['funcional', [Validators.required]],
  });

  ngOnInit(): void {
    Promise.allSettled([
      this.cargarAccesorios(),
      this.cargarEstadosAccesorio(),
    ]);
  }

  private cargarEstadosAccesorio(): Promise<void> {
    return new Promise((resolve) => {
      this.listaValoresEquipoService.obtenerHijosPorNombrePadre('ESTADOS_ACCESORIO').subscribe({
        next: (lista) => {
          this.estadoOpciones.set([
            { label: 'Seleccionar estado...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre.toLowerCase() })),
          ]);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  async cargarAccesorios(): Promise<void> {
    this.cargandoTabla = true;
    try {
      const lista = await this.accesorioService.getAll().toPromise();
      this.accesorios.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los accesorios' });
    } finally {
      this.cargandoTabla = false;
    }
  }

  async registrar(): Promise<void> {
    if (this.formAccesorio.invalid) {
      this.formAccesorio.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formAccesorio.value;
      const payload: LbEquipoAccesorioPayload = {
        nombre: v.nombre || '',
        estado: v.estado || 'funcional',
      };

      if (this.modoEdicion && this.accesorioSeleccionado) {
        await this.accesorioService.update(this.accesorioSeleccionado.id, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `"${payload.nombre}" actualizado correctamente` });
      } else {
        await this.accesorioService.create(payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: `"${payload.nombre}" registrado correctamente` });
      }

      this.limpiarFormulario();
      await this.cargarAccesorios();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo guardar el accesorio' });
    } finally {
      this.cargando = false;
    }
  }

  editar(accesorio: LbEquipoAccesorio): void {
    this.modoEdicion = true;
    this.accesorioSeleccionado = accesorio;
    this.formAccesorio.patchValue({
      nombre: accesorio.nombre,
      estado: accesorio.estado,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmarEliminar(accesorio: LbEquipoAccesorio): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el accesorio "${accesorio.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(accesorio.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.accesorioService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Accesorio eliminado correctamente' });
      await this.cargarAccesorios();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo eliminar el accesorio' });
    }
  }

  limpiarFormulario(): void {
    this.formAccesorio.reset({ nombre: '', estado: 'funcional' });
    this.formAccesorio.markAsUntouched();
    this.modoEdicion = false;
    this.accesorioSeleccionado = null;
  }

  esInvalido(campo: string): boolean {
    const control = this.formAccesorio.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formAccesorio.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      funcional: 'Funcional',
      dañado: 'Dañado',
      extraviado: 'Extraviado',
      dado_de_baja: 'Dado de baja',
    };
    return map[estado] ?? estado;
  }

  severidadEstado(estado: string): string {
    const map: Record<string, string> = {
      funcional: 'text-green-600',
      dañado: 'text-orange-500',
      extraviado: 'text-red-500',
      dado_de_baja: 'text-gray-400',
    };
    return map[estado] ?? '';
  }
}
