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
  logoTitle = 'PAZ Y SALVOS';
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
    //{
    //  id: 'main',
    //  title: 'MENÚ PRINCIPAL',
    //  expanded: true,
    //  items: [
    //    {
    //      id: 'inicio',
    //      label: 'Inicio',
    //      icon: 'pi pi-home',
    //      route: '/app/inicio',
    //    },
    //  ],
    //},
    {
      id: 'paz-salvos',
      title: 'PAZ Y SALVOS',
      expanded: true,
      items: [
        {
          id: 'registro',
          label: 'Registro de Solicitudes',
          icon: 'pi pi-file-plus',
          route: '/app/registro',
          // @ts-ignore
          requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'],
        },
        {
          id: 'misSolicitudes',
          label: 'Mis Solicitudes',
          icon: 'pi pi-file',
          route: '/app/mis-solicitudes',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'PLANES_DIRECTOR'],
        },
        {
          id: 'revision',
          label: 'Aprobación de Paz y Salvos',
          icon: 'pi pi-check-circle',
          route: '/app/revision-solicitud',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'PLANES_DIRECTOR', 'USUARIO'],
        },
      ],
    },
    {
      id: 'dependencias',
      title: 'DEPENDENCIAS',
      expanded: true,
      items: [
        {
          id: 'gestionDependencias',
          label: 'Gestión de Dependencias',
          icon: 'pi pi-building',
          route: '/app/dependencias',
          // @ts-ignore
          requiredRoles: ['ADMIN'],
        },
        {
          id: 'gestionTipos',
          label: 'Tipos de Paz y Salvo',
          icon: 'pi pi-tags',
          route: '/app/tipos-solicitud',
          // @ts-ignore
          requiredRoles: ['ADMIN',],
        },
      ],
    },
  ];

  visibleSections: DrawerSection[] = [];

  ngOnInit(): void {
    this.initializeTheme();
    this.loadUserInfo();
    this.applyFilters();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.loadUserInfo();
        }
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserInfo(): void {
    try {
      const userInfo = this.authService.getUserInfo();
      if (userInfo) {
        this.user = {
          name: userInfo.name || userInfo.preferred_username || 'Usuario',
          email: userInfo.email || 'usuario@umariana.edu.co',
          avatar: userInfo.avatar || undefined,
        };

        if (userInfo.email) {
          this.notificationManagementService.reinitializeForNewUser(userInfo.email, 'paz-salvos');
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar información del usuario:', error);
    }
  }

  private applyFilters(): void {
    const clientRoles = this.authService.getUserRoles() || [];

    const filtered: DrawerSection[] = this.sections
      .map((section) => {
        const items = (section.items || []).filter((item) => {
          const requiredRoles: string[] | undefined = (item as any).requiredRoles;

          if (!requiredRoles || requiredRoles.length === 0) {
            return true;
          }

          return requiredRoles.some((role) => clientRoles.includes(role));
        });

        return { ...section, items } as DrawerSection;
      })
      .filter((section) => (section.items || []).length > 0);

    this.visibleSections = filtered;
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
      this.drawerVisible = false;
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

  onLogout(): void {
    this.drawerVisible = false;
    this.notificationManagementService.clearUserNotifications();
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/paz-salvos/';
      },
      error: () => {
        window.location.href = window.location.origin + '/paz-salvos/';
      },
    });
  }
}
