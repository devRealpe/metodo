import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { ChangeDetectorRef } from '@angular/core';
import { EntrevistaDto } from '@shared/shared-models';
import { EntrevistasService, AuthService } from '@microfrontends/shared-services';
import { PostulacionService } from '../../core/services/postulacion.service';
import { PostulacionSeleccionada } from '@shared/shared-models';
import { EntrevistaFormComponent } from '@microfrontends/shared-ui';
import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';

@Component({
  selector: 'app-entrevistas-form',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    DividerModule,
    EntrevistaFormComponent
  ],
  providers: [MessageService],
  templateUrl: './entrevistas-form.component.html',
  styleUrls: ['./entrevistas-form.component.scss']
})
export class EntrevistasFormComponent implements OnInit {
  
  @ViewChild(EntrevistaFormComponent) entrevistaFormComponent!: EntrevistaFormComponent;
  
  entrevistaId: string | null = null;
  postulacionData: PostulacionSeleccionada | null = null;
  entrevistaActual: EntrevistaDto | undefined = undefined;
  
  private ofertaId: string | null = null;
  private desdeFase2 = false;
  
  loading = false;
  saving = false;
  modoEdicion = false;
  formValido = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entrevistasService: EntrevistasService,
    private postulacionService: PostulacionService,
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.ofertaId = params['ofertaId'] || null;
      this.desdeFase2 = params['desde'] === 'fase2';
      
      if (params['idPostulacion']) {
        this.verificarEntrevistaExistente(params['idPostulacion']);
      } else {
        this.loading = false;
      }
    });
    
    this.route.params.subscribe(params => {
      this.entrevistaId = params['id'];
      if (this.entrevistaId) {
        this.modoEdicion = true;
        this.cargarEntrevista();
      }
    });
  }

  verificarEntrevistaExistente(idPostulacion: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(idPostulacion)) {
      this.modoEdicion = false;
      this.entrevistaActual = undefined;
      this.loading = false;
      return;
    }
    
    this.loading = true;
    
    this.entrevistasService.obtenerEntrevistaPorPostulacion(idPostulacion).subscribe({
      next: (entrevista: EntrevistaDto | null) => {
        if (entrevista?.id) {
          this.entrevistaId = entrevista.id;
          this.modoEdicion = true;
          this.entrevistaActual = entrevista;
          
          this.cargarDatosPostulacionConCallback(idPostulacion, () => {
            this.messageService.add({
              severity: 'info',
              summary: 'Entrevista existente',
              detail: 'Se cargó la entrevista existente para esta postulación'
            });
          });
        } else {
          this.modoEdicion = false;
          this.entrevistaActual = undefined;
          this.cargarDatosPostulacionConCallback(idPostulacion);
        }
      },
      error: (err) => {
        this.modoEdicion = false;
        this.entrevistaActual = undefined;
        this.cargarDatosPostulacionConCallback(idPostulacion);
      }
    });
  }

  cargarDatosPostulacionConCallback(idPostulacion: string, onComplete?: () => void): void {
    this.postulacionesSeleccionadasService.verificarSeleccion(idPostulacion).subscribe({
      next: (verificacion: any) => {
        
        if (verificacion.postulacion) {
          const postulacion = verificacion.postulacion;
          
          if (verificacion.oferta && !postulacion.ofertaLaboral) {
            postulacion.ofertaLaboral = verificacion.oferta;
          }
          
          this.postulacionData = {
            id: idPostulacion,
            postulacion: postulacion
          };
          
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se encontraron datos completos de la postulación'
          });
        }
        
        this.loading = false;
        this.cdr.detectChanges();
        onComplete?.();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar los datos de la postulación'
        });
        onComplete?.();
      }
    });
  }

  cargarEntrevista(): void {
    if (!this.entrevistaId) return;
    
    this.loading = true;
    
    this.entrevistasService.obtenerEntrevistaPorId(this.entrevistaId).subscribe({
      next: (entrevista: EntrevistaDto) => {
        this.entrevistaActual = entrevista;
        this.modoEdicion = true;
        
        if (entrevista.postulacion?.id) {
          this.cargarDatosPostulacionConCallback(entrevista.postulacion.id);
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la entrevista'
        });
      }
    });
  }

  onFormStatusChange(status: { valid: boolean; dirty: boolean }): void {
    this.formValido = status.valid;
  }

  guardar(): void {
    if (!this.entrevistaFormComponent) {
      return;
    }

    if (!this.entrevistaFormComponent.validarFormulario()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos obligatorios'
      });
      return;
    }

    this.saving = true;
    const entrevistaData = this.entrevistaFormComponent.obtenerDatosEntrevista();
  
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.email) {
      if (!this.entrevistaId) {
        entrevistaData.creadoPor = currentUser.email;
      } else {
        entrevistaData.modificadoPor = currentUser.email;
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario actual. Por favor, inicie sesión nuevamente.'
      });
      this.saving = false;
      return;
    }
    

    if (this.entrevistaId) {
      entrevistaData.id = this.entrevistaId;
      if (this.entrevistaActual?.creadoPor) {
        entrevistaData.creadoPor = this.entrevistaActual.creadoPor;
      }
      if (this.entrevistaActual?.estado) {
        entrevistaData.estado = this.entrevistaActual.estado;
      }
      this.entrevistasService.actualizarEntrevista(this.entrevistaId, entrevistaData).subscribe({
        next: () => {
          this.saving = false;
          this.modoEdicion = true;
          this.entrevistaFormComponent.limpiarBorradorLocal();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Entrevista actualizada correctamente'
          });
          
          let ofertaId = this.ofertaId;
          if (!ofertaId && this.postulacionData?.postulacion?.ofertaLaboral?.id) {
            ofertaId = this.postulacionData.postulacion.ofertaLaboral.id;
          }
          
          if (ofertaId) {
            this.router.navigate(['/app/seleccionados-fase2', ofertaId]);
          } else {
            this.router.navigate(['/app/seleccionados-fase2-general']);
          }
        },
        error: (err) => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error al actualizar',
            detail: err.error?.message || 'No se pudo actualizar la entrevista'
          });
        }
      });
    } else {
      this.entrevistasService.crearEntrevista(entrevistaData).subscribe({
        next: (response) => {
          this.saving = false;
          this.entrevistaId = response.id!;
          this.modoEdicion = true;
          this.entrevistaActual = response;
          this.entrevistaFormComponent.limpiarBorradorLocal();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Entrevista guardada correctamente'
          });
          
          let ofertaId = this.ofertaId;
          if (!ofertaId && this.postulacionData?.postulacion?.ofertaLaboral?.id) {
            ofertaId = this.postulacionData.postulacion.ofertaLaboral.id;
          }
          
          if (ofertaId) {
            this.router.navigate(['/app/seleccionados-fase2', ofertaId]);
          } else {
            this.router.navigate(['/app/seleccionados-fase2-general']);
          }
        },
        error: (err) => {
          this.saving = false;
      
          if (err.error?.validationErrors) {
            const errores = Object.entries(err.error.validationErrors)
              .map(([campo, mensaje]) => `${campo}: ${mensaje}`)
              .join('\n');
            
            const erroresHTML = Object.entries(err.error.validationErrors)
              .map(([campo, mensaje]) => `<li><strong>${campo}:</strong> ${mensaje}</li>`)
              .join('');
            
            this.messageService.add({
              severity: 'error',
              summary: 'Errores de validación',
              detail: `<ul style="list-style-type: disc; padding-left: 20px;">${erroresHTML}</ul>`,
              sticky: true,
              life: 10000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error al guardar',
              detail: err.error?.message || err.error?.error || err.message || 'No se pudo guardar la entrevista'
            });
          }
        }
      });
    }
  }

  cancelar(): void {
    let ofertaId = this.ofertaId;
    
    if (!ofertaId && this.postulacionData?.postulacion?.ofertaLaboral?.id) {
      ofertaId = this.postulacionData.postulacion.ofertaLaboral.id;
    }
    
    if (ofertaId) {
      this.router.navigate(['/app/seleccionados-fase2', ofertaId]);
    } else {
      this.router.navigate(['/app/seleccionados-fase2-general']);
    }
  }

  getCompletitud(): number {
    if (this.entrevistaActual?.completitud !== undefined) {
      return this.entrevistaActual.completitud;
    }
    
    if (this.entrevistaFormComponent && this.postulacionData) {
      const entrevistaData = this.entrevistaFormComponent.obtenerDatosEntrevista();
      return this.entrevistasService.calcularCompletitud(entrevistaData);
    }
    
    return 0;
  }

  getCompletitudColor(): string {
    const completitud = this.getCompletitud();
    if (completitud >= 80) return '#10b981';
    if (completitud >= 50) return '#f59e0b';
    return '#ef4444';
  }
}
