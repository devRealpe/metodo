import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { PersonasService } from '../../core/services/personas.service';
import { PanelModule } from 'primeng/panel';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { HojaVidaStatusService } from '../../core/services/hoja-vida-status.service';
import { ImageViewerComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';

interface Section {
  title: string;
  completed: boolean;
  route: string;
  piIcon: string;
  allowedWithoutData: boolean;
}

@Component({
  selector: 'app-informacion-usuario-component-page',
  standalone: true,
  imports: [CommonModule, MenubarModule, RouterModule, CardModule, ButtonModule, AvatarModule, BadgeModule, ToastModule, PanelModule, FileUploadModule,
    DialogModule, ConfirmDialogModule, ImageViewerComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './informacion-usuario-component-page.html',
  styleUrls: ['./informacion-usuario-component-page.scss']
})
export class InformacionUsuarioComponentPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  items: MenuItem[] = [];
  tieneDatosGuardados: boolean = false;
  isLoadingInitial: boolean = true;
  private destroy$ = new Subject<void>();
  
  private isAdminOrGestionHumana: boolean = false;

  fotoPerfilUrl: string | null = null;
  mostrarDialogoFoto = false;
  subiendoFoto = false;
  personaId: string | null = null;

  usuarioInfo = {
    nombre: 'Usuario',
    identificacion: '',
    celular: '',
    correoPersonal: '',
    correoInstitucional: ''
  };

  sections: Section[] = [
    { title: 'Datos\nPersonales', completed: true, route: 'informacion-personal', piIcon: 'pi-user', allowedWithoutData: true },
    { title: 'Formación\nAcadémica', completed: true, route: 'informacion-academica', piIcon: 'pi-graduation-cap', allowedWithoutData: false },
    { title: 'Información\nLaboral',  completed: false, route: 'informacion-laboral', piIcon: 'pi-briefcase', allowedWithoutData: false },
    { title: 'Información\nFamiliar', completed: false, route: 'informacion-familiar', piIcon: 'pi-users', allowedWithoutData: false },
    { title: 'Referencias\nPersonales', completed: false, route: 'referencias-personales', piIcon: 'pi-id-card', allowedWithoutData: false },
    { title: 'Competencias', completed: false, route: 'competencias', piIcon: 'pi-star', allowedWithoutData: false },
    { title: 'Afiliaciones', completed: false, route: 'afiliaciones', piIcon: 'pi-id-card', allowedWithoutData: false },
    { title: 'Documentos\nde Soporte', completed: false, route: 'documentos-soporte', piIcon: 'pi-file', allowedWithoutData: false }
  ];

  get isDataPersonalCompleted(): boolean {
    return this.hojaVidaStatusService.isDatosPersonalesCompleted();
  }

  constructor(
    private personasService: PersonasService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private http: HttpClient,
    private fotoPerfilService: FotoPerfilService,
    public hojaVidaStatusService: HojaVidaStatusService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdminOrGestionHumana = this.authService.hasRole('ADMIN') || this.authService.hasRole('GESTION_HUMANA');
    
    this.subscribeToFotoChanges();
    this.subscribeToUserProfile();
    this.subscribeToSectionStatuses();
    this.cargarDatosUsuarioAutenticado();
    this.subscribeToRouteChanges();
    
    this.recargarEstadosDesdeBackend();
  }

  private subscribeToRouteChanges() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
    
      const currentUrl = event.urlAfterRedirects || event.url;
          if (currentUrl.endsWith('/informacion-usuario') || 
          currentUrl.endsWith('/informacion-usuario/')) {
        this.recargarEstadosDesdeBackend();
      }
    });
  }

  onChildRouteDeactivate() {
    this.recargarEstadosDesdeBackend();
  }

  private subscribeToFotoChanges() {
    this.fotoPerfilService.fotoUrl$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(url => {
      this.fotoPerfilUrl = url;
      this.cdr.markForCheck();
    });
  }

  private subscribeToUserProfile() {
    this.fotoPerfilService.userProfile$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(profile => {
      if (profile) {
        this.usuarioInfo.nombre = profile.nombre;
        this.usuarioInfo.correoPersonal = profile.email || '';
        this.cdr.markForCheck();
      }
    });
  }

  private subscribeToSectionStatuses() {
    this.hojaVidaStatusService.sectionsStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(statuses => {
      this.sections.forEach(section => {
        const status = statuses.get(section.route);
        if (status) {
          section.completed = status.completed;
        }
      });
      this.cdr.markForCheck();
    });
  }

  private reloadInProgress = false;

  private recargarEstadosDesdeBackend() {
    if (this.reloadInProgress) {
      return;
    }

    this.reloadInProgress = true;
    
    setTimeout(() => {
      this.hojaVidaStatusService.reloadFromBackend(true).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (statuses) => {
          this.reloadInProgress = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.reloadInProgress = false;
        }
      });
    }, 300); 
  }

  private cargarDatosUsuarioAutenticado() {
    this.personasService.getPersonaActual().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (persona) => {
        if (persona) {

          this.tieneDatosGuardados = true;
          localStorage.setItem('tieneDatosGuardados', 'true');
          this.personaId = persona.id ?? null;
          
          this.usuarioInfo = {
            nombre: `${persona.primerNombre || ''} ${persona.segundoNombre || ''} ${persona.primerApellido || ''} ${persona.segundoApellido || ''}`.trim(),
            identificacion: persona.identificacion || '',
            celular: persona.celular1 || '',
            correoPersonal: persona.correo || '',
            correoInstitucional: ''
          };

          this.fotoPerfilService.updateUserProfile({
            nombre: this.usuarioInfo.nombre,
            email: this.usuarioInfo.correoPersonal || this.usuarioInfo.correoInstitucional
          });

          if (this.personaId) {
            this.cargarFotoPerfil(this.personaId);
          }
        } else {

          this.tieneDatosGuardados = false;
          localStorage.setItem('tieneDatosGuardados', 'false');
          
          const identificacion = localStorage.getItem('identificacion');
          if (identificacion) {
            this.usuarioInfo.identificacion = identificacion;
          }
        }

        this.configurarMenu(this.tieneDatosGuardados);
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoadingInitial = false;
        this.tieneDatosGuardados = false;
        this.configurarMenu(false);

        localStorage.setItem('tieneDatosGuardados', 'false');
        const identificacion = localStorage.getItem('identificacion');
        if (identificacion) {
          this.usuarioInfo.identificacion = identificacion;
        }
        this.cdr.markForCheck();

        if (!error.message.includes('no encontrado')) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos del usuario'
          });
        }
        this.cdr.markForCheck();
      }
    });
  }

  private cargarFotoPerfil(personaId: string) {
    const fotoUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas/${personaId}/foto`;

    this.http.get(fotoUrl, { 
      responseType: 'blob', 
      observe: 'response',
      withCredentials: false 
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.status !== 204 && response.body && response.body.size > 0) {
          this.blobToBase64(response.body).then(base64 => {
            const nuevaUrl = base64 as string;
            this.fotoPerfilService.updateFotoUrl(nuevaUrl);
            this.cdr.detectChanges(); 
          }).catch(error => {
            this.fotoPerfilService.updateFotoUrl(null);
            this.cdr.detectChanges();
          });
        } else {
          this.fotoPerfilService.updateFotoUrl(null);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        if (error.status === 404) {
          } else {
        }
        this.fotoPerfilService.updateFotoUrl(null);
        this.cdr.detectChanges();
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  abrirDialogoFoto() {
    if (!this.personaId) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Advertencia', 
        detail: 'Primero debe completar la información personal' 
      });
      return;
    }
    this.mostrarDialogoFoto = true;
  }

  abrirSelectorArchivo() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.personaId) {
      this.subirFoto(file);
    }
  }

  subirFoto(file: File) {
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'El archivo debe ser una imagen' 
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'La imagen no puede superar los 5MB' 
      });
      return;
    }
    
    this.subiendoFoto = true;
    this.personasService.subirFoto(this.personaId!, file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'Foto actualizada' 
        });
        
        this.cargarFotoPerfil(this.personaId!);
        
        this.mostrarDialogoFoto = false;
        this.subiendoFoto = false;
        this.fileInput.nativeElement.value = '';
      },
      error: (e) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo subir la foto' 
        });
        this.subiendoFoto = false;
      }
    });
  }

  eliminarFoto() {
    if (!this.personaId) return;
    
    this.confirmationService.confirm({
      message: '¿Está seguro que desea eliminar la foto?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.personasService.eliminarFoto(this.personaId!).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.fotoPerfilService.updateFotoUrl(null);
            
            this.mostrarDialogoFoto = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Foto eliminada' 
            });
          },
          error: (e) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo eliminar la foto' 
            });
          }
        });
      }
    });
  }

  private configurarMenu(conDatos: boolean) {
    const permiteNavegacion = this.isAdminOrGestionHumana || conDatos;
    
    this.items = this.sections.map(section => ({
      label: section.title.replace('\n', ' '), 
      icon: section.piIcon,
      routerLink: (permiteNavegacion || section.allowedWithoutData) ? [section.route] : undefined,
      command: () => {
        if (!permiteNavegacion && !section.allowedWithoutData) {
          this.mostrarAviso();
        }
      }
    }));
  }

  private mostrarAviso() {
    this.messageService.add({
      severity: 'warn',
      summary: 'Acción no permitida',
      detail: 'Primero debe completar la Información Personal.'
    });
  }

  navigateToSection(route: string) {
    const section = this.sections.find(s => s.route === route);
    
    if (this.isAdminOrGestionHumana) {
      this.router.navigate([route], { relativeTo: this.router.routerState.root.firstChild });
      return;
    }
    
    if (route === 'informacion-personal') {
      this.router.navigate([route], { relativeTo: this.router.routerState.root.firstChild });
      return;
    }
    
    const isDatosPersonalesCompleted = this.hojaVidaStatusService.isDatosPersonalesCompleted();
    
    if (!isDatosPersonalesCompleted) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail: 'Primero debe completar la Información Personal (Datos Personales).'
      });
      return;
    }
    
    if (section) {
      this.router.navigate([route], { relativeTo: this.router.routerState.root.firstChild });
    }
  }

  revisarHojaDeVida(): void {
    if (this.isAdminOrGestionHumana || this.tieneDatosGuardados) {
      this.router.navigate(['/app/hoja-de-vida']);
    } else {
      this.mostrarAviso();
    }
  }

  irAConvocatorias(): void {
    if (this.isAdminOrGestionHumana || this.tieneDatosGuardados) {
      const isAdmin = this.authService.hasRole('ADMIN');
      
      if (isAdmin) {
        this.router.navigate(['/app/ofertas-laborales']);
      } else {
        this.router.navigate(['/app/ofertas-laborales']);
      }
    } else {
      this.mostrarAviso();
    }
  }

  irAMisPostulaciones(): void {
    if (this.isAdminOrGestionHumana || this.tieneDatosGuardados) {
      this.router.navigate(['/app/mis-postulaciones']);
    } else {
      this.mostrarAviso();
    }
  }
  
  getInitials(): string {
    if (!this.usuarioInfo.nombre) return '';
    
    const partes = this.usuarioInfo.nombre.trim().split(' ');
    if (partes.length === 0) return '';
    
    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }
    
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
