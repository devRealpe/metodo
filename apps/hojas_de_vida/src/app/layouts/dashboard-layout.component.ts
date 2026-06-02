import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { DrawerComponent, DrawerSection, DrawerMenuItem, DrawerUser } from '@microfrontends/shared-ui';
import { FotoPerfilService } from '../core/services/foto-perfil.service';
import { PersonasService } from '../core/services/personas.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, NotificationManagementService } from '@microfrontends/shared-services';
import { NotificationsPanelComponent } from '../shared/components/notifications-panel/notifications-panel.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterModule, DrawerComponent, NotificationsPanelComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  @ViewChild(NotificationsPanelComponent) notificationsPanel!: NotificationsPanelComponent;

  logoTitle = 'Hojas de Vida';
  drawerVisible = false;
  notificationCount = 0;
  private destroy$ = new Subject<void>();
  tieneDatosGuardados: boolean = false;

  user: DrawerUser = {
    name: 'Usuario Demo',
    avatar: undefined, 
    email: 'usuario@example.com'
  };

  sections: DrawerSection[] = [
    {
      id: 'main',
      title: 'Inicio',
      expanded: true,
      items: [
        {
          id: 'dashboard',
          label: 'Inicio',
          icon: 'pi pi-home',
          route: '/app/inicio',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'personal-info',
          label: 'Información Personal',
          icon: 'pi pi-user',
          route: '/app/informacion-personal',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'academic-info',
          label: 'Información Académica',
          icon: 'pi pi-graduation-cap',
          route: '/app/informacion-academica',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'work-info',
          label: 'Información Laboral',
          icon: 'pi pi-briefcase',
          route: '/app/informacion-laboral',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'family-info',
          label: 'Información Familiar',
          icon: 'pi pi-users',
          route: '/app/informacion-familiar',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'references',
          label: 'Referencias Personales',
          icon: 'pi pi-id-card',
          route: '/app/referencias-personales',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'skills',
          label: 'Competencias',
          icon: 'pi pi-star',
          route: '/app/competencias',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'affiliations',
          label: 'Afiliaciones',
          icon: 'pi pi-id-card',
          route: '/app/afiliaciones',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
        {
          id: 'supporting-documents',
          label: 'Documentos de Soporte Adicionales',
          icon: 'pi pi-file',
          route: '/app/documentos-soporte',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        },
      ]
    },
    {
      id: 'curriculum', title: 'Banco Hojas de Vida', expanded: false, items: [
        {
          id: 'curriculum-details',
          label: 'Detalles de la Hoja de Vida',
          icon: 'pi pi-file',
          route: '/app/banco-hojas-de-vida',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      ]
    },
    {
      id: 'hv',
      title: 'Hoja de Vida',
      expanded: false,
      items: [
        {
          id: 'generate-cv',
          label: 'Generar Hoja de Vida',
          icon: 'pi pi-file-pdf',
          route: '/app/hoja-de-vida',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiresData: true
        },

      ]
    },
    {
      id: 'convocatorias',
      title: 'Convocatorias',
      expanded: false,
      items: [
        {
          id: 'crear-convocatoria',
          label: 'Crear Convocatoria',
          icon: 'pi pi-plus-circle',
          route: '/app/administrador-convocatorias',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiresData: true,
          requiredRoles: ['ADMIN']
        },
        {
          id: 'job-offers',
          label: 'Ofertas Laborales',
          icon: 'pi pi-briefcase',
          route: '/app/ofertas-trabajo',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiresData: true,
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        }
      ]
    },
    {
      id: 'settings',
      title: 'Configuración',
      expanded: false,
      items: [
        {
          id: 'profile-settings',
          label: 'Configuración de Perfil',
          icon: 'pi pi-cog',
          route: '/app/edit-profile'
        },
      ]
    },
    {
      id: 'settings-admin',
      title: 'Configuracion Avanzada',
      expanded: false,
      items: [
        {
          id: 'admin-lists',
          label: 'Admin Listas de Valores',
          icon: 'pi pi-list',
          route: '/app/admin/listas-valores',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN']
        },
        {
          id: 'admin-locations',
          label: 'Admin Ubicaciones',
          icon: 'pi pi-globe',
          route: '/app/admin/ubicaciones',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN']
        },
        {
          id: 'admin-closed-convocatorias',
          label: 'Convocatorias Cerradas',
          icon: 'pi pi-folder-open',
          route: '/app/gestion-convocatorias-cerradas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'GESTION_HUMANA']
        },
        {
          id: 'admin-deleted-offers',
          label: 'Convocatorias Eliminadas',
          icon: 'pi pi-trash',
          route: '/app/admin/convocatorias-eliminadas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN']
        },
        {
          id: 'user-role-management',
          label: 'Gestión de Roles de Usuario',
          icon: 'pi pi-shield',
          route: '/app/admin/user-role-management',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN']
        }
      ]
    },
    {
      id: 'gestion-procesos',
      title: 'Gestión de Procesos',
      expanded: false,
      items: [
        {
          id: 'ranking-ofertas',
          label: 'Ranking de Ofertas',
          icon: 'pi pi-chart-bar',
          route: '/app/ranking-ofertas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        },
        {
          id: 'ofertas-finalizadas',
          label: 'Ofertas Finalizadas',
          icon: 'pi pi-check-circle',
          route: '/app/ofertas-finalizadas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        },
        {
          id: 'lista-entrevistas',
          label: 'Lista de Entrevistas',
          icon: 'pi pi-calendar',
          route: '/app/lista-entrevistas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        },
        {
          id: 'seleccionados-fase2-menu',
          label: 'Seleccionados Fase 2',
          icon: 'pi pi-users',
          route: '/app/seleccionados-fase2-general',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        },
        {
          id: 'seleccionados-fase3-menu',
          label: 'Seleccionados Fase 3',
          icon: 'pi pi-star',
          route: '/app/seleccionados-fase3',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        },
        {
          id: 'entrevistas-masivas',
          label: 'Entrevistas Masivas',
          icon: 'pi pi-sitemap',
          route: '/app/entrevistas-masivas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      ]
    },
  ];

  visibleSections: DrawerSection[] = [];

  constructor(
    private router: Router,
    private fotoPerfilService: FotoPerfilService,
    private authService: AuthService,
    private personasService: PersonasService,
    private notificationService: NotificationManagementService
  ) { }

  ngOnInit(): void {
    this.initializeTheme();

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user?.email) {
        localStorage.setItem('email', user.email);
        this.notificationService.setCurrentUserEmail(user.email);
        this.notificationService.setProjectContext('hojas_de_vida');
        this.notificationService.refreshNotifications();
      }
    });

    this.fotoPerfilService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.user = {
          name: profile.nombre || 'Usuario',
          email: profile.email || this.user.email,
          avatar: profile.fotoUrl || undefined
        };
      });

    this.applyFilters();
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.applyFilters();
    });

    this.personasService.getPersonaActual().pipe(takeUntil(this.destroy$)).subscribe({
      next: (persona) => {
        this.tieneDatosGuardados = !!persona;
        this.applyFilters();
      },
      error: () => {
        this.tieneDatosGuardados = false;
        this.applyFilters();
      }
    });
  }

  private applyFilters(): void {
    // Usar SOLO client roles para autorización de UI (no realm roles)
    const clientRoles = this.authService.getUserRoles() || [];

    // Verificar si el usuario tiene el rol GESTION_HUMANA (excluido de validación de datos)
    const esGestionHumana = clientRoles.includes('GESTION_HUMANA');

    const filtered: DrawerSection[] = this.sections.map(section => {
      const items = (section.items || []).filter(item => {
        const requiredRoles: string[] | undefined = (item as any).requiredRoles;
        const requiresData: boolean | undefined = (item as any).requiresData;

        // Validación de roles
        let roleAllowed = true;
        if (requiredRoles && requiredRoles.length > 0) {
          roleAllowed = requiredRoles.some(r => clientRoles.includes(r));
        }

        // Validación de datos guardados (excluir GESTION_HUMANA)
        let dataAllowed = true;
        if (requiresData && !esGestionHumana) {
          dataAllowed = this.tieneDatosGuardados;
        }

        return roleAllowed && dataAllowed;
      });

      return {
        ...section,
        items
      } as DrawerSection;
    }).filter(s => (s.items || []).length > 0); // Filtrar secciones vacías



    this.visibleSections = filtered;
  } ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDarkMode) {
      document.documentElement.classList.add('my-app-dark');
      document.body.classList.add('my-app-dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
      document.body.classList.remove('my-app-dark');
    }
  }

  onMenuItemClick(item: DrawerMenuItem): void {
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  onUserProfileClick(user: DrawerUser): void {
    this.router.navigate(['/app/edit-profile']);
  }

  onDrawerVisibilityChange(visible: boolean): void {
    this.drawerVisible = visible;
  }

  onThemeToggle(isDarkMode: boolean): void {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    if (isDarkMode) {
      document.documentElement.classList.add('my-app-dark');
      document.body.classList.add('my-app-dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
      document.body.classList.remove('my-app-dark');
    }
  }

  toggleDarkMode(): void {
    document.documentElement.classList.toggle('my-app-dark');
    document.body.classList.toggle('my-app-dark');
  }

  onNotificationClick(event: Event): void {
  }

  onLogout(): void {

    this.drawerVisible = false;

    // Limpiar notificaciones antes de logout
    this.notificationService.clearUserNotifications();

    // Llamar al servicio de logout para invalidar sesión en Keycloak
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/hojas_de_vida/';
      },
      error: () => {
        window.location.href = window.location.origin + '/hojas_de_vida/';
      }
    });
  }
}
