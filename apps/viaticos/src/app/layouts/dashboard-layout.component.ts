import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService, NotificationManagementService } from '@microfrontends/shared-services';
import {
  DrawerComponent,
  DrawerSection,
  DrawerMenuItem,
  DrawerUser,
} from '@microfrontends/shared-ui';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterModule, DrawerComponent],
  standalone: true,
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  logoTitle = 'VIÁTICOS';
  drawerVisible = false;
  private destroy$ = new Subject<void>();
  
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationManagementService = inject(NotificationManagementService);

  user: DrawerUser = {
    name: 'Usuario',
    avatar: undefined,
    email: 'usuario@umariana.edu.co',
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
      id: 'viaticos',
      title: 'VIÁTICOS',
      expanded: true,
      items: [
        {
          id: 'solicitudViaticos',
          label: 'Solicitud de Viáticos',
          icon: 'pi pi-briefcase',
          route: '/app/solicitudViaticos',

          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO','ADMIN', 'VIATICOS_ADMINISTRATIVOS','VIATICOS_DECANO_DIRECTOR','VIATICOS_DIRECTOR','VIATICOS_TALENTO_HUMANO','VIATICOS_VICE_ADMINISTRATIVO'],
        },
        {
          id: 'misViaticos',
          label: 'Mis Viáticos',
          icon: 'pi pi-wallet',
          route: '/app/misViaticos',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['USUARIO','VIATICOS_VICE_ADMINISTRATIVO','ADMIN','VIATICOS_ADMINISTRATIVOS','VIATICOS_DIRECTOR','VIATICOS_DECANO_DIRECTOR','VIATICOS_TALENTO_HUMANO'],
        },
        {
          id: 'listaViaticos',
          label: 'Aprobación de Viáticos',
          icon: 'pi pi-list',
          route: '/app/listaViaticos',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: [ 'VIATICOS_VICE_ADMINISTRATIVO', 'ADMIN','VIATICOS_DECANO_DIRECTOR','VIATICOS_RECTORIA','VIATICOS_DIRECTOR_TALENTO','VIATICOS_DIRECTOR'],
        },
      ],
    },
    {
      id: 'tarifas',
      title: 'TARIFAS',
      expanded: true,
      items: [
        {
          id: 'registroTarifas',
          label: 'Registro de Tarifas',
          icon: 'pi pi-tag',
          route: '/app/registroTarifas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['VIATICOS_ADMINISTRATIVOS','ADMIN','VIATICOS_TALENTO_HUMANO'],
        },
        {
          id: 'tarifasRegistradas',
          label: 'Tarifas Registradas',
          icon: 'pi pi-tags',
          route: '/app/tarifasRegistradas',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['VIATICOS_ADMINISTRATIVOS','ADMIN','VIATICOS_TALENTO_HUMANO'],
        },
      ],
    },
    {
      id: 'aprobaciones',
      title: 'APROBACIONES',
      expanded: true,
      items: [
        {
          id: 'listaAprobaciones',
          label: 'Gestión y Pago de Viáticos',
          icon: 'pi pi-check-circle',
          route: '/app/listaAprobaciones',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'VIATICOS_TALENTO_HUMANO'],
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

  ngOnInit(): void {
    // Inicializar tema desde localStorage
    this.initializeTheme();

    // Cargar información del usuario desde AuthService
    this.loadUserInfo();

    // Calcular secciones visibles según los roles del usuario
    this.applyFilters();

    // Reaplicar filtros si los roles cambian en tiempo real
    // También reinicializar notificaciones si el usuario cambia (login/logout)
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          // Usuario autenticado - reinicializar notificaciones
          this.loadUserInfo();
        }
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la información del usuario desde el token
   */
  private loadUserInfo(): void {
    try {
      const userInfo = this.authService.getUserInfo();
      if (userInfo) {
        this.user = {
          name: userInfo.name || userInfo.preferred_username || 'Usuario',
          email: userInfo.email || 'usuario@umariana.edu.co',
          avatar: userInfo.avatar || undefined,
        };
        
        // 🔄 Reinicializar notificaciones para el usuario actual
        if (userInfo.email) {
          this.notificationManagementService.reinitializeForNewUser(userInfo.email, 'viaticos');
        } 
      } 
    } catch (error) {
      console.error('❌ Error al cargar información del usuario:', error);
    }
  }

  
  private applyFilters(): void {
    // Usar SOLO client roles para autorización de UI
    const clientRoles = this.authService.getUserRoles() || [];

    const filtered: DrawerSection[] = this.sections
      .map((section) => {
        const items = (section.items || []).filter((item) => {
          const requiredRoles: string[] | undefined = (item as any)
            .requiredRoles;

          // Si no requiere roles, es visible para todos
          if (!requiredRoles || requiredRoles.length === 0) {
            return true;
          }

          // Verificar si el usuario tiene al menos uno de los roles requeridos
          const hasRole = requiredRoles.some((role) =>
            clientRoles.includes(role)
          );

          return hasRole;
        });

        return {
          ...section,
          items,
        } as DrawerSection;
      })
      .filter((section) => (section.items || []).length > 0);

    this.visibleSections = filtered;
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
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

  onUserProfileClick(): void {
    this.router.navigate(['/app/perfil']);
  }

  onDrawerVisibilityChange(visible: boolean): void {
    this.drawerVisible = visible;
  }

  onThemeToggle(isDarkMode: boolean): void {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  toggleDarkMode(): void {
    document.documentElement.classList.toggle('my-app-dark');
  }

  onLogout(): void {
    this.drawerVisible = false;

    // Limpiar notificaciones antes de logout
    this.notificationManagementService.clearUserNotifications();

    // Llamar al servicio de logout para invalidar sesión en Keycloak
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/viaticos/';
      },
      error: () => {
        window.location.href = window.location.origin + '/viaticos/';
      }
    });
  }
}
