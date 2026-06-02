import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { DrawerComponent, DrawerSection, DrawerMenuItem, DrawerUser } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService } from '../core/services/usuarios-oracle.service';
import { Subject, takeUntil } from 'rxjs';
import { NotificationsPanelComponent } from '../shared/components/notifications-panel/notifications-panel.component';
import { NotificationsService } from '@domain/auth';


@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterModule, DrawerComponent, NotificationsPanelComponent],
  standalone: true,
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  @ViewChild(NotificationsPanelComponent) notificationsPanel!: NotificationsPanelComponent;

  logoTitle = 'INTERNACIONALIZACIÓN';
  drawerVisible = false;
  notificationCount = 0;
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private notificationsService = inject(NotificationsService);

  user: DrawerUser = {
    name: '',
    avatar: '',
    email: ''
  };

  sections: DrawerSection[] = [
    {
      id: 'main',
      title: 'MENÚ PRINCIPAL',
      expanded: true,
      items: [
        {
          id: 'inicio',
          label: 'Inicio',
          icon: 'pi pi-home',
          route: '/app/inicio',
        },
      ],
    },
    {
      id: 'convenios',
      title: 'CONVENIOS',
      expanded: true,
      items: [
        {
          id: 'convenios-formularios',
          label: 'Formularios',
          icon: 'pi pi-folder',
          children: [
            {
              id: 'convenio',
              label: 'Formulario de Convenio',
              icon: 'pi pi-file-edit',
              route: '/app/convenio',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: ['ADMIN', 'ORI'],
            },
          ],
        },
        {
          id: 'convenios-listas',
          label: 'Listas',
          icon: 'pi pi-folder',
          children: [
            {
              id: 'convenios-list',
              label: 'Lista de Convenios',
              icon: 'pi pi-list',
              route: '/app/convenios-list',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: [
                'ADMIN',
                'DIRECTOR_PROGRAMA',
                'DECANO',
                'VICERRECTORIA_ACADEMICA',
                'VICERECTORIA_FINANCIERA',
                'ORI',
                'USUARIO',
                'RECTORA',
                'SECRETARIA_GENERAL',
                'DIRECCION_INVESTIGACION'
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'movilidades',
      title: 'MOVILIDADES',
      expanded: true,
      items: [
        {
          id: 'movilidades-formularios',
          label: 'Formularios',
          icon: 'pi pi-folder',
          children: [
            {
              id: 'movilidad',
              label: 'Formulario de Movilidad',
              icon: 'pi pi-file-edit',
              route: '/app/movilidad',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: ['ADMIN', 'ORI', 'USUARIO', 'DIRECTOR_PROGRAMA'],
            },
          ],
        },
        {
      
          id: 'movilidades-listas',
          label: 'Listas',
          icon: 'pi pi-folder',
          children: [
            {
              id: 'movilidad-list',
              label: 'Lista de Movilidades',
              icon: 'pi pi-list',
              route: '/app/movilidad-list',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: ['ADMIN', 'DIRECTOR_PROGRAMA'],
            },
            {
              id: 'movilidad-saliente-list',
              label: 'Lista de Movilidades Postulantes',
              icon: 'pi pi-sign-out',
              route: '/app/movilidad-saliente-list',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: [
                'ADMIN',
                'DECANO',
                'VICERRECTORIA_ACADEMICA',
                'VICERECTORIA_FINANCIERA',
                'ORI',
                'DIRECTOR_PROGRAMA'
              ],
            },
            {
              id: 'movilidad-estudiantes-list',
              label: 'Lista de Movilidades  Estudiantes',
              icon: 'pi pi-graduation-cap',
              route: '/app/movilidad-estudiantes-list',
              // @ts-ignore - propiedad dinámica usada para control de visibilidad
              requiredRoles: [
                'ADMIN',
                'DIRECTOR_PROGRAMA',
                'DECANO',
                'DIRECCION_INVESTIGACION',
                'VICERRECTORIA_ACADEMICA',
                'VICERECTORIA_FINANCIERA',
                'ORI'
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'autorizaciones',
      title: 'AUTORIZACIONES',
      expanded: true,
      items: [
        {
          id: 'lista-autorizaciones',
          label: 'Autorizaciones  Movilidades',
          icon: 'pi pi-check-circle',
          route: '/app/autorizacion',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: [
            'ADMIN',
            'DIRECTOR_PROGRAMA',
            'DECANO',
            'ORI',
            'VICERRECTORIA_ACADEMICA',
            'RECTORA',
            'SECRETARIA_GENERAL',
            'VICERECTORIA_FINANCIERA',
          ],
        },
        {
          id: 'movilidades-proceso',
          label: 'Seguimiento de Movilidades',
          icon: 'pi pi-clock',
          route: '/app/movilidades-proceso',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: [
            'ADMIN',
            'ORI',
            'VICERRECTORIA_ACADEMICA',
            'DECANO',
            'DIRECTOR_PROGRAMA'
          ],
        },
      ],
    },
    {
      id: 'reportes',
      title: 'REPORTES',
      expanded: true,
      items: [
        {
          id: 'reportes-movilidades',
          label: 'Reportes de Movilidades',
          icon: 'pi pi-chart-bar',
          route: '/app/reporte-movilidades',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: [
            'ADMIN',
            'ORI',
            'VICERRECTORIA_ACADEMICA',
            'DECANO',
            'DIRECTOR_PROGRAMA',
            'USUARIO',
            'RECTORA',
            'VICERECTORIA_FINANCIERA',
            'DIRECCION_INVESTIGACION'
          ],
        },
      ],
    },
    {
      id: 'administracion',
      title: 'ADMINISTRACIÓN',
      expanded: false,
      items: [
        {
          id: 'user-role-management',
          label: 'Gestión de Roles',
          icon: 'pi pi-users',
          route: '/app/admin/user-role-management',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN'],
        },
      ],
    },
  ];

  // Secciones visibles calculadas según roles
  visibleSections: DrawerSection[] = [];

  private router = inject(Router);

  constructor() {
    this.initializeTheme();
  }

  ngOnInit(): void {
    // Obtener información del usuario desde el token
    const userInfo = this.authService.getUserInfo();
    if (userInfo) {
      const identificacion = userInfo.identificacion || userInfo.preferred_username || '';

      // Información inicial del token
      this.user = {
        name: userInfo.preferred_username || userInfo.email || 'Usuario',
        email: userInfo.email || '',
        avatar: '',
      };

      // Consultar nombre completo de Oracle
      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle) {
              const nombreCompleto = [usuarioOracle.nombres, usuarioOracle.apellidos]
                .filter(Boolean)
                .join(' ')
                .trim();

              if (nombreCompleto) {
                this.user = {
                  ...this.user,
                  name: nombreCompleto,
                };
              }
            }
          },
          error: (error) => {
            console.warn('Error al consultar usuario de Oracle:', error);
          },
        });
      }
    }

    // Calcular secciones visibles según los roles del usuario
    this.applyFilters();

    // escuchar notificaciones no leídas para actualizar badge
    this.notificationsService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => this.notificationCount = count);

    // Reaplicar filtros si los roles cambian en tiempo real
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private applyFilters(): void {
    const clientRoles = this.authService.getUserRoles() || [];

    const filterItems = (items: DrawerMenuItem[]): DrawerMenuItem[] => {
      return items
        .map((item) => {
          const requiredRoles: string[] | undefined = (item as any).requiredRoles;
          const isVisible = !requiredRoles || requiredRoles.length === 0 ||
            requiredRoles.some((role) => clientRoles.includes(role));

          if (!isVisible) return null;

          if (item.children && item.children.length > 0) {
            const filteredChildren = filterItems(item.children);
            if (filteredChildren.length === 0) return null;
            return { ...item, children: filteredChildren };
          }

          return item;
        })
        .filter((item): item is DrawerMenuItem => item !== null);
    };

    this.visibleSections = this.sections
      .map((section) => {
        const filteredItems = filterItems(section.items || []);
        return { ...section, items: filteredItems };
      })
      .filter((section) => section.items.length > 0);
  }
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDarkMode) {
      document.documentElement.classList.add('my-app-dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
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
  }

  onNotificationClick(event: Event): void {
    this.notificationsPanel.toggle(event);
  }

  toggleDarkMode(): void {
    document.documentElement.classList.toggle('my-app-dark');
  }

  onLogout(): void {
    this.drawerVisible = false;

    // Llamar al servicio de logout para invalidar sesión en Keycloak
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/internacionalizacion/';
      },
      error: () => {
        window.location.href = window.location.origin + '/internacionalizacion/';
      }
    });
  }

}
