import { Component, OnInit, ChangeDetectorRef, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs, 'es');

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { OfertaLaboral, RequisitoOferta } from '../../core/models/oferta-laboral.model';
import { PostulacionDto } from '../../core/models/postulacion.model';

import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { PostulacionService } from '../../core/services/postulacion.service';
import { PersonasService } from '../../core/services/personas.service';
import { AuthService } from '@microfrontends/shared-services';
import { HojaVidaStatusService } from '../../core/services/hoja-vida-status.service';
@Component({
  selector: 'app-postulacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    
    DialogModule,
    ButtonModule,
    CardModule,
    MessageModule,
    CheckboxModule,
    ProgressBarModule,
    ToastModule,
  ],
  providers: [MessageService, { provide: LOCALE_ID, useValue: 'es' }],
  templateUrl: './postulacion.component.html',
  styleUrls: ['./postulacion.component.scss']
})
export class PostulacionComponent implements OnInit {
  
  form!: FormGroup;
  oferta: OfertaLaboral | null = null;
  ofertaId!: string;
  personaId: string | null = null; 
  
  loading: boolean = false;
  yaSePostulo: boolean = false;
  postulacionesActivas: number = 0;
  limiteMaximo: number = 10; 
  limiteAlcanzado: boolean = false;
  showProgressBar: boolean = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ofertaService: OfertaLaboralService,
    private postulacionService: PostulacionService,
    private personasService: PersonasService,
    private authService: AuthService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private hojaVidaStatusService: HojaVidaStatusService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ofertaId = params['ofertaId'];
      this.obtenerPersonaId().then(() => {
        if (this.personaId) {
          this.cargarOferta();
          this.verificarEstadoPostulacion();
        }
      });
    });
  }

  private async obtenerPersonaId(): Promise<void> {
    try {
      const persona = await this.personasService.getPersonaActual().toPromise();
      this.personaId = persona?.id || null;
      
      if (!this.personaId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Información Incompleta',
          detail: 'No se pudo obtener su información de usuario. Por favor, complete su perfil primero.',
          life: 5000
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Autenticación',
        detail: 'No se pudo verificar su identidad. Por favor, inicie sesión nuevamente.',
        life: 5000
      });
    }
  }

  cargarOferta(): void {
    this.loading = true;
    
    this.ofertaService.getById(this.ofertaId).subscribe({
      next: (oferta) => {
        // Verificar si es convocatoria interna y el usuario no es empleado
        const esInterna = oferta.tipoConvocatoria?.toLowerCase().includes('interna');
        if (esInterna) {
          this.personasService.esEmpleadoUniversidad().subscribe({
            next: (result) => {
              if (!result.esEmpleado) {
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Acceso restringido',
                  detail: 'Esta convocatoria es de carácter interno y solo está disponible para empleados de la universidad.',
                  life: 5000
                });
                this.router.navigate(['/app/ofertas-laborales']);
                return;
              }
              this.oferta = oferta;
              this.inicializarFormulario();
              this.loading = false;
            },
            error: () => {
              this.router.navigate(['/app/ofertas-laborales']);
            }
          });
        } else {
          this.oferta = oferta;
          this.inicializarFormulario();
          this.loading = false;
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al Cargar',
          detail: 'No se pudo cargar la información de la oferta laboral.',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  verificarEstadoPostulacion(): void {
    if (!this.personaId) return;
    
    this.postulacionService.verificarPostulacion(this.personaId, this.ofertaId).subscribe({
      next: (response) => {
        this.yaSePostulo = response.yaSePostulo;
      }
    });

    this.postulacionService.contarPostulacionesActivas(this.personaId).subscribe({
      next: (response) => {
        this.postulacionesActivas = response.postulacionesActivas;
        this.limiteMaximo = response.limiteMaximo || 10; // Obtener del backend o usar 10 por defecto
        this.limiteAlcanzado = response.limiteAlcanzado;
      }
    });
  }

  inicializarFormulario(): void {
    if (!this.oferta) return;

    this.form = this.fb.group({
      tituloPostulacion: [`Postulación a ${this.oferta.cargoRequerido}`, Validators.required],
      descripcion: ['Postulación realizada a través del sistema de hojas de vida.', Validators.required],
      aceptacionDeclaracion: [false, Validators.requiredTrue]
    });
  }

  crearRequisitoForm(requisito: RequisitoOferta): FormGroup {
    return this.fb.group({
      idRequisito: [requisito.id, Validators.required],
      puntaje: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      nombreRequisito: [requisito.nombre],
      descripcionRequisito: [requisito.descripcion]
    });
  }

  get requisitosFormArray(): FormArray {
    const control = this.form.get('requisitos');
    return (control && control instanceof FormArray) ? control as FormArray : this.fb.array([]);
  }

  get tieneRequisitos(): boolean {
    return this.requisitosFormArray && this.requisitosFormArray.length > 0;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.personaId) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error de Autenticación', 
        detail: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.',
        life: 5000
      });
      return;
    }

    if (this.yaSePostulo) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Postulación Existente', 
        detail: 'Ya se encuentra postulado a esta convocatoria',
        life: 5000
      });
      return;
    }

    if (this.limiteAlcanzado) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Límite Alcanzado', 
        detail: `Ha alcanzado el límite máximo de ${this.limiteMaximo} postulaciones activas`,
        life: 5000
      });
      return;
    }

    const academicaStatus = this.hojaVidaStatusService.getSectionStatus('informacion-academica');

    if (!academicaStatus || academicaStatus.recordCount === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Información Incompleta', 
        detail: 'Debe registrar al menos una formación académica antes de postularse a una convocatoria. Por favor, complete su hoja de vida.',
        life: 6000
      });
      return;
    }

    const formData = this.form.getRawValue();
    const postulacion: PostulacionDto = {
      tituloPostulacion: formData.tituloPostulacion,
      descripcion: formData.descripcion,
      persona: { id: this.personaId! },
      convocatoria: { id: this.ofertaId },
      aceptacionDeclaracion: formData.aceptacionDeclaracion
    };

    this.loading = true;
    this.postulacionService.crearPostulacion(postulacion).subscribe({
      next: (response) => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Postulación registrada', 
          detail: 'Su postulación fue registrada con éxito',
          life: 3000
        });
        
        setTimeout(() => {
          this.router.navigate(['/app/ofertas-laborales']);
        }, 2000);
      },
      error: (error) => {
        
        
        let mensajeError = 'Error al enviar la postulación.';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            mensajeError = error.error;
          } else if (error.error.message) {
            mensajeError = error.error.message;
          } else if (error.error.error) {
            mensajeError = error.error.error;
          }
        } else if (error.message) {
          mensajeError = error.message;
        }
        
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error al Enviar', 
          detail: mensajeError,
          life: 7000
        });
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.volver();
  }

  volver(): void {
    this.router.navigate(['/app/ofertas-laborales']);
  }

  calcularProgreso(): number {
    if (!this.form) return 0;

    const totalRequisitos = this.requisitosFormArray.length;
    const requisitosCompletos = this.requisitosFormArray.controls.filter(control => 
      control.get('puntaje')?.value !== null && control.get('puntaje')?.value !== undefined && control.get('puntaje')?.value !== 0
    ).length;

    const totalEvaluaciones = totalRequisitos;
    const evaluacionesCompletas = requisitosCompletos;

    return totalEvaluaciones > 0 ? Math.round((evaluacionesCompletas / totalEvaluaciones) * 100) : 100;
  }

  esRequisitoNA(descripcion: string): boolean {
    return !descripcion || descripcion.trim() === '' || descripcion.toUpperCase() === 'N/A' || descripcion.toUpperCase().includes('N/A');
  }

  obtenerDescripcionRequisito(descripcion: string): string {
    if (this.esRequisitoNA(descripcion)) {
      return 'Formación académica y competencias profesionales relacionadas con el cargo';
    }
    return descripcion;
  }

  formatearTipoConvocatoria(tipo: string): string {
    if (!tipo) return '';
    return tipo.toLowerCase() === 'ambas' ? 'Interna/Externa' : tipo;
  }
}