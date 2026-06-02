import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';
import { EntrevistasService } from '@microfrontends/shared-services';
import { PostulacionSeleccionada, EntrevistaDto } from '@shared/shared-models';
import { environment } from '@shared/shared-environments';
import { ImageViewerComponent, EntrevistaFormComponent } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-entrevistas-masivas',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TabsModule,
    BadgeModule,
    ProgressSpinnerModule,
    ImageViewerComponent,
    EntrevistaFormComponent
  ],
  providers: [MessageService],
  templateUrl: './entrevistas-masivas.component.html',
  styleUrls: ['./entrevistas-masivas.component.scss']
})
export class EntrevistasMasivasComponent implements OnInit, OnDestroy {
  
  postulacionesSeleccionadas: PostulacionSeleccionada[] = [];
  entrevistas: Map<string, EntrevistaDto> = new Map(); 
  postulacionesConEntrevistas: Array<{ postulacion: PostulacionSeleccionada, entrevista?: EntrevistaDto }> = []; 
  activeTabIndex = 0;
  estadosFormularios = new Map<string, { valid: boolean, dirty: boolean }>();
  @ViewChildren(EntrevistaFormComponent) formularios!: QueryList<EntrevistaFormComponent>;
  guardandoEntrevistas = false;
  loading = true;
  showFooter = false;
  
  private fotosCache = new Map<string, string>();
  private blobUrls: string[] = [];
  private scrollPositions = new Map<number, number>();
  private currentScrollContainer: HTMLElement | null = null;
  
  constructor(
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private entrevistasService: EntrevistasService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private messageService: MessageService,
    private http: HttpClient
  ) {}
  
  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    let state = navigation?.extras?.state as any;
    
    // Si no viene en navigation, intentar desde history
    if (!state) {
      state = history.state;
    }
    
    console.log('EntrevistasMasivas ngOnInit - Router State:', state);
    
    if (state?.['postulaciones'] && Array.isArray(state['postulaciones']) && state['postulaciones'].length > 0) {
      this.postulacionesSeleccionadas = state['postulaciones'];
      console.log('Postulaciones recibidas:', this.postulacionesSeleccionadas.length);
      
      this.cargarOCrearEntrevistas();
      
      this.postulacionesSeleccionadas.forEach(postulacion => {
        const personaId = postulacion.postulacion?.persona?.id;
        if (personaId && !this.fotosCache.has(personaId)) {
          this.cargarFotoPerfil(personaId);
        }
      });
      
      setTimeout(() => {
        this.setupScrollListener();
      }, 500);
    } else {
      console.error('No se recibieron postulaciones. State:', state);
      console.error('Postulaciones value:', state?.['postulaciones']);
      
      this.loading = false;
      this.postulacionesSeleccionadas = [];
      
      // No mostrar toast si el usuario regresa inmediatamente
      setTimeout(() => {
        if (this.postulacionesSeleccionadas.length === 0 && this.loading === false) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No hay datos',
            detail: 'Para aplicar entrevistas masivas, primero seleccione aspirantes desde la lista de fase 2',
            life: 5000
          });
        }
      }, 1000);
    }
  }
  
  private cargarOCrearEntrevistas(): void {
    const payloads: Partial<EntrevistaDto>[] = this.postulacionesSeleccionadas.map(postulacion => ({
      postulacion: { id: postulacion.postulacion?.id } as any,
      fechaEntrevista: new Date().toISOString().split('T')[0],
      estado: 'borrador' as const,
      requiereAssessment: false,  // Por defecto no requiere assessment en borradores
      competenciasCardinales: []  // Inicializar vacío, se cargarán las maestras en el frontend
    }));
    
    console.log('Enviando payloads para crear/recuperar entrevistas:', payloads);
    
    this.entrevistasService.crearORecuperarEntrevistasMasivas(payloads).subscribe({
      next: (response) => {
        console.log('Respuesta de entrevistas recibida:', response);
       
        response.entrevistas.forEach(entrevista => {
          const postulacionId = entrevista.postulacion?.id || (entrevista as any).idPostulacion || (entrevista as any).id_postulacion;
          
          if (postulacionId) {
            this.entrevistas.set(postulacionId, entrevista);
          } else {
            console.warn('No se pudo obtener ID de postulación para entrevista:', entrevista);
          }
        });
        
        console.log('Entrevistas mapeadas:', this.entrevistas.size);
       
        this.postulacionesConEntrevistas = this.postulacionesSeleccionadas.map(postulacion => ({
          postulacion,
          entrevista: this.entrevistas.get(postulacion.postulacion?.id!)
        }));
        
        console.log('PostulacionesConEntrevistas creado:', this.postulacionesConEntrevistas.length);
        
        this.loading = false;
        this.showFooter = true; 
        if (response.nuevasCreadas > 0 || response.existentesActualizadas > 0) {
          const detalles: string[] = [];
          if (response.nuevasCreadas > 0) {
            detalles.push(`${response.nuevasCreadas} creada(s)`);
          }
          if (response.existentesActualizadas > 0) {
            detalles.push(`${response.existentesActualizadas} actualizada(s)`);
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Entrevistas Procesadas',
            detail: detalles.join(', '),
            life: 5000
          });
        }
        
        if (response.errores && response.errores.length > 0) {
          response.errores.forEach(error => {
            console.warn('Error procesando entrevista:', error);
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: error,
              life: 5000
            });
          });
        }
      },
      error: (err) => {
        console.error('Error en cargarOCrearEntrevistas:', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudieron cargar las entrevistas. Intente nuevamente.',
          life: 5000
        });
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.currentScrollContainer) {
      this.currentScrollContainer.removeEventListener('scroll', () => this.onScroll());
    }
    
    this.blobUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.blobUrls = [];
    this.fotosCache.clear();
    this.scrollPositions.clear();
  }
  
  onTabChange(event: any): void {
    // Guardar la entrevista del tab actual antes de cambiar
    if (this.activeTabIndex !== event.index) {
      const formularioActual = this.formularios?.toArray()[this.activeTabIndex];
      if (formularioActual) {
        this.guardarEntrevistaCambioDeTabs(formularioActual, this.activeTabIndex);
      }
    }
    
    if (this.currentScrollContainer) {
      this.scrollPositions.set(this.activeTabIndex, this.currentScrollContainer.scrollTop);
    }
    
    this.activeTabIndex = event.index;
    
    setTimeout(() => {
      this.restoreScrollPosition();
      this.checkFooterVisibility();
    }, 100);
  }

  private guardarEntrevistaCambioDeTabs(formulario: EntrevistaFormComponent, index: number): void {
    // Verificar si el formulario tiene cambios sin guardar
    const estado = this.estadosFormularios.get(this.postulacionesConEntrevistas[index]?.postulacion.id!);
    
    if (!estado?.dirty) {
      return; // No hay cambios, no hacer nada
    }

    // Validar que el formulario sea válido antes de guardar
    if (!formulario.validarFormulario()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Complete todos los campos de este formulario antes de continuar',
        life: 3000
      });
      return;
    }

    const entrevista = formulario.obtenerDatosEntrevista();
    const tieneEntrevistaExistente = formulario.entrevistaActual?.id;

    if (tieneEntrevistaExistente) {
      // Actualizar entrevista existente
      this.entrevistasService.actualizarEntrevista(tieneEntrevistaExistente, entrevista).subscribe({
        next: (entrevistaActualizada) => {
          const postulacionId = (entrevistaActualizada as any).postulacion?.id || (entrevistaActualizada as any).idPostulacion;
          if (postulacionId) {
            this.entrevistas.set(postulacionId, entrevistaActualizada);
          }
          formulario.limpiarBorradorLocal();
          formulario.marcarComoLimpio();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Entrevista guardada automáticamente',
            life: 2000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al Guardar',
            detail: `No se guardó la entrevista: ${err.error?.message || 'Error desconocido'}`,
            life: 3000
          });
        }
      });
    } else {
      // Crear nueva entrevista
      this.entrevistasService.crearEntrevista(entrevista).subscribe({
        next: (entrevistaCreada) => {
          const postulacionId = (entrevistaCreada as any).postulacion?.id || (entrevistaCreada as any).idPostulacion;
          if (postulacionId) {
            this.entrevistas.set(postulacionId, entrevistaCreada);
          }
          formulario.limpiarBorradorLocal();
          formulario.marcarComoLimpio();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Entrevista guardada automáticamente',
            life: 2000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al Guardar',
            detail: `No se guardó la entrevista: ${err.error?.message || 'Error desconocido'}`,
            life: 3000
          });
        }
      });
    }
  }
  
  private setupScrollListener(): void {
    const container = document.querySelector('.content-wrapper');
    if (container) {
      this.currentScrollContainer = container as HTMLElement;
      container.addEventListener('scroll', () => this.onScroll());
      this.checkFooterVisibility();
    }
  }
  
  private onScroll(): void {
    this.checkFooterVisibility();
  }
  
  private checkFooterVisibility(): void {
    if (!this.currentScrollContainer) return;
    
    const scrollTop = this.currentScrollContainer.scrollTop;
    const scrollHeight = this.currentScrollContainer.scrollHeight;
    const clientHeight = this.currentScrollContainer.clientHeight;
    
    const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 100;
    this.showFooter = isNearBottom;
  }
  
  private restoreScrollPosition(): void {
    if (!this.currentScrollContainer) {
      const container = document.querySelector('.content-wrapper');
      if (container) {
        this.currentScrollContainer = container as HTMLElement;
      }
    }
    
    if (this.currentScrollContainer) {
      const savedPosition = this.scrollPositions.get(this.activeTabIndex) || 0;
      this.currentScrollContainer.scrollTop = savedPosition;
    }
  }
  
  onFormStatusChange(postulacionId: string, status: { valid: boolean, dirty: boolean }): void {
    this.estadosFormularios.set(postulacionId, status);
  }

  getConteoFormulariosCompletados(): number {
    let contador = 0;
    this.postulacionesConEntrevistas.forEach(item => {
      const estado = this.estadosFormularios.get(item.postulacion.id!);
      if (estado?.valid) {
        contador++;
      }
    });
    return contador;
  }
  
  volver(): void {
    this.location.back();
  }
  
  guardarTodasLasEntrevistas(): void {
    const formulariosList = this.formularios.toArray();
    
    const validaciones = formulariosList.map(form => form.validarFormulario());
    const todosValidos = validaciones.every(v => v);
    
    if (!todosValidos) {
      const nombresIncompletos = formulariosList
        .filter((form, index) => !validaciones[index])
        .map(form => {
          const persona = form.postulacion.postulacion?.persona;
          return `${persona?.primerNombre} ${persona?.primerApellido}`;
        });
      
      this.messageService.add({
        severity: 'error',
        summary: 'Formularios Incompletos',
        detail: `Los siguientes formularios están incompletos: ${nombresIncompletos.join(', ')}`,
        life: 5000
      });
      return;
    }
    
    this.guardandoEntrevistas = true;
    
    const payloads: Partial<EntrevistaDto>[] = [];
    const entrevistasParaActualizar: { id: string, dto: Partial<EntrevistaDto>, index: number }[] = [];
    
    formulariosList.forEach((formulario, index) => {
      const entrevista = formulario.obtenerDatosEntrevista();
      const tieneEntrevistaExistente = formulario.entrevistaActual?.id;
      
      if (tieneEntrevistaExistente) {
        entrevistasParaActualizar.push({
          id: tieneEntrevistaExistente,
          dto: entrevista,
          index
        });
      } else {
        payloads.push(entrevista);
      }
    });
    
    let entrevistasGuardadas = 0;
    let errores = 0;
    
    const totalOperaciones = payloads.length + entrevistasParaActualizar.length;
    
    if (payloads.length > 0) {
      payloads.forEach((payload, payloadIndex) => {
        this.entrevistasService.crearEntrevista(payload).subscribe({
          next: (entrevistaCreada) => {
            entrevistasGuardadas++;
            
            const postulacionId = (entrevistaCreada as any).postulacion?.id || (entrevistaCreada as any).idPostulacion;
            if (postulacionId) {
              this.entrevistas.set(postulacionId, entrevistaCreada);
            }
            
            const formularioFound = formulariosList.find(f => 
              !f.entrevistaActual?.id && f.postulacion.postulacion?.id === postulacionId
            );
            if (formularioFound) {
              formularioFound.limpiarBorradorLocal();
              formularioFound.marcarComoLimpio();
            }
            
            if (entrevistasGuardadas + errores === totalOperaciones) {
              this.finalizarGuardadoEntrevistas(entrevistasGuardadas, errores);
            }
          },
          error: (err: any) => {
            
            errores++;
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error al Crear',
              detail: `Error al crear entrevista: ${err.error?.message || err.message}`,
              life: 5000
            });
            
            if (entrevistasGuardadas + errores === totalOperaciones) {
              this.finalizarGuardadoEntrevistas(entrevistasGuardadas, errores);
            }
          }
        });
      });
    }
    
    if (entrevistasParaActualizar.length > 0) {
      entrevistasParaActualizar.forEach(({ id, dto, index }) => {
        this.entrevistasService.actualizarEntrevista(id, dto).subscribe({
          next: (entrevistaActualizada) => {
            entrevistasGuardadas++;
            
            const postulacionId = (entrevistaActualizada as any).postulacion?.id || (entrevistaActualizada as any).idPostulacion;
            if (postulacionId) {
              this.entrevistas.set(postulacionId, entrevistaActualizada);
            }
            
            const formulario = formulariosList[index];
            if (formulario) {
              formulario.limpiarBorradorLocal();
              formulario.marcarComoLimpio();
            }
            
            if (entrevistasGuardadas + errores === totalOperaciones) {
              this.finalizarGuardadoEntrevistas(entrevistasGuardadas, errores);
            }
          },
          error: (err: any) => {
            errores++;
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error al Actualizar',
              detail: `Error al actualizar entrevista: ${err.error?.message || err.message}`,
              life: 5000
            });
            
            if (entrevistasGuardadas + errores === totalOperaciones) {
              this.finalizarGuardadoEntrevistas(entrevistasGuardadas, errores);
            }
          }
        });
      });
    }
    
    if (totalOperaciones === 0) {
      this.finalizarGuardadoEntrevistas(0, 0);
    }
  }
  
  private finalizarGuardadoEntrevistas(exitosas: number, errores: number): void {
    this.guardandoEntrevistas = false;
    
    this.postulacionesConEntrevistas = this.postulacionesSeleccionadas.map(postulacion => ({
      postulacion,
      entrevista: this.entrevistas.get(postulacion.postulacion?.id!)
    }));
    
    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Se guardaron ${exitosas} entrevistas correctamente`,
        life: 5000
      });
      
      setTimeout(() => {
        this.volver();
      }, 2000);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Guardado Parcial',
        detail: `Se guardaron ${exitosas} entrevistas. ${errores} fallaron.`,
        life: 5000
      });
    }
  }
  
  getFotoUrl(postulacion: PostulacionSeleccionada): string | null {
    const personaId = postulacion.postulacion?.persona?.id;
    if (!personaId) {
      return null;
    }
    if (this.fotosCache.has(personaId)) {
      return this.fotosCache.get(personaId)!;
    }
    return null;
  }
  
  private cargarFotoPerfil(personaId: string): void {
    const fotoUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas/${personaId}/foto`;

    this.http.get(fotoUrl, { 
      responseType: 'blob', 
      observe: 'response',
      withCredentials: true 
    }).subscribe({
      next: (response) => {
        let nuevaUrl: string | null = null;
        
        if (response.status !== 204 && response.body && response.body.size > 0) {
          nuevaUrl = URL.createObjectURL(response.body);
          this.blobUrls.push(nuevaUrl);
        }
        
        if (nuevaUrl) {
          this.fotosCache.set(personaId, nuevaUrl);
        }
      },
    });
  }
  
  getInitials(fullName: string): string {
    if (!fullName) return '?';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
  
 
  getEntrevistaParaPostulacion(postulacion: PostulacionSeleccionada): EntrevistaDto | undefined {
    const idPostulacion = postulacion.postulacion?.id;
    
    if (!idPostulacion) {
      return undefined;
    }
    
    return this.entrevistas.get(idPostulacion);
  }
}
