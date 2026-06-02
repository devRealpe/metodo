import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import {
  DrawerComponent,
  DrawerSection,
  DrawerMenuItem,
  DrawerUser,
} from '@microfrontends/shared-ui';
import {
  AuthService,
  NotificationManagementService,
} from '@microfrontends/shared-services';
import {
  UserResolverService,
  ResolvedUser,
} from '../core/services/user-resolver.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterModule, DrawerComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent implements OnInit {
  logoTitle = 'Planes de trabajo';
  drawerVisible = false;

  user: DrawerUser = {
    name: 'Usuario Demo',
    avatar: 'https://i.pravatar.cc/100',
    email: 'usuario@example.com',
  };

  sections: DrawerSection[] = [];
  resolvedRoles: string[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private userResolverService: UserResolverService,
    private notificationService: NotificationManagementService
  ) {}

  async ngOnInit(): Promise<void> {
    const resolved = await this.loadCurrentUser();
    this.resolvedRoles = resolved.roles;
    this.sections = this.buildMenuByRoles(this.resolvedRoles);
    this.authService.debugToken();

    // Configurar email del usuario para notificaciones
    if (resolved.email) {
      localStorage.setItem('email', resolved.email);
      this.notificationService.setCurrentUserEmail(resolved.email);
      this.notificationService.setProjectContext('planes_de_trabajo');
    }
  }

  private async loadCurrentUser(): Promise<ResolvedUser> {
    const authUser = this.authService.getCurrentUser();
    const keycloakRoles = this.authService.getUserRoles();
    const identificacion = authUser?.username || null;
    const email = authUser?.email || '';

    if (!identificacion) {
      const fallback: ResolvedUser = {
        identificacion: '',
        name: 'Usuario no autenticado',
        email: '',
        avatar: 'https://i.pravatar.cc/100?img=generic',
        roles: [],
      };
      this.user = fallback;
      return fallback;
    }

    const resolved = await this.userResolverService.resolve(
      identificacion,
      email,
      keycloakRoles
    );

    this.user = {
      name: resolved.name,
      email: resolved.email,
      avatar: resolved.avatar,
    };

    return resolved;
  }

  private buildMenuByRoles(roles: string[]): DrawerSection[] {
    const items: DrawerMenuItem[] = [];

    if (roles.includes('ADMIN')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio Sistemas',
        icon: 'pi pi-home',
        route: 'app/home-sistemas',
      });
      items.push(
        {
          id: 'inicio-admin',
          label: 'Inicio Admin',
          icon: 'pi pi-user',
          route: 'app/admin',
        },
        {
          id: 'inicio-gestion-humana',
          label: 'Gestión Humana',
          icon: 'pi pi-briefcase',
          route: 'app/home-gestion-humana',
        },
        {
          id: 'inicio-planeacion',
          label: 'Inicio Planeación',
          icon: 'pi pi-building-columns',
          route: 'app/home-planeacion',
        },
                {
          id: 'gestion-planes',
          label: 'Gestión de Planes',
          icon: 'pi pi-list-check',
          route: 'app/gestion-planes',
        },
        {
          id: 'inicio-vicerrectoria',
          label: 'Inicio Vicerrectoria',
          icon: 'pi pi-sitemap',
          route: 'app/home-vicerrectoria',
        },
        {
          id: 'reportes',
          label: 'Reportes',
          icon: 'pi pi-clipboard',
          route: 'app/reportes',
        },
        {
          id: 'novedades-director',
          label: 'Novedades Director',
          icon: 'pi pi-exclamation-circle',
          route: 'app/novedades-director',
        },
      );
    } else if (roles.includes('PLANES_SISTEMAS')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    } else if (roles.includes('PLANES_DIRECTOR')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
      items.push(
        {
          id: 'reportes',
          label: 'Reportes',
          icon: 'pi pi-clipboard',
          route: 'app/reportes',
        },
        {
          id: 'novedades-director',
          label: 'Novedades',
          icon: 'pi pi-exclamation-circle',
          route: 'app/novedades-director',
        }
      );
    } else if (roles.includes('PLANES_DECANO')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    } else if (roles.includes('PLANES_GESTION')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    } else if (roles.includes('PLANES_PLANEACION')) {
      items.unshift({
        id: 'inicio-planeacion',
        label: 'Inicio Planeación',
        icon: 'pi pi-building-columns',
        route: 'app/inicio',
      });

      items.push({
        id: 'gestion-planes',
        label: 'Gestión de Planes',
        icon: 'pi pi-list-check',
        route: 'app/gestion-planes',
      });

    } else if (roles.includes('PLANES_VICERRECTORIA')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    } else if (roles.includes('USUARIO')) {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    } else {
      items.unshift({
        id: 'inicio',
        label: 'Inicio',
        icon: 'pi pi-home',
        route: 'app/inicio',
      });
    }

    return [
      {
        id: 'main',
        title: 'MENÚ PRINCIPAL',
        expanded: true,
        items,
      },
    ];
  }


  onMenuItemClick(item: DrawerMenuItem): void {
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  onUserProfileClick(user: DrawerUser): void {
    this.router.navigate(['/perfil']);
  }

  onDrawerVisibilityChange(visible: boolean): void {
    this.drawerVisible = visible;
  }

  onThemeToggle(isDarkMode: boolean): void {
    document.documentElement.classList.toggle('my-app-dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  toggleDarkMode(): void {
    const isDarkMode = document.documentElement.classList.toggle('my-app-dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  onLogout(): void {
    this.drawerVisible = false;

    // Limpiar notificaciones antes de logout
    this.notificationService.clearUserNotifications();

    // Llamar al servicio de logout para invalidar sesión en Keycloak
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/planes_de_trabajo/';
      },
      error: () => {
        window.location.href = window.location.origin + '/planes_de_trabajo/';
      }
    });
  }
}
