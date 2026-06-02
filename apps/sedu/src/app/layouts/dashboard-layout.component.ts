import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { DrawerComponent, DrawerSection, DrawerMenuItem, DrawerUser } from '@microfrontends/shared-ui';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterModule, DrawerComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  logoTitle = 'SEDU';
  drawerVisible = false;
  private destroy$ = new Subject<void>();

  user: DrawerUser = {
    name: 'Usuario',
    avatar: undefined,
    email: '',
  };

  sections: DrawerSection[] = [
    {
      id: 'admin',
      title: 'Administración GTH',
      expanded: true,
      items: [
        {
          id: 'dashboard-admin',
          label: 'Dashboard',
          icon: 'pi pi-chart-bar',
          route: '/app/admin/dashboard',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'ADMIN_GTH'],
        },
        {
          id: 'gestion-periodos',
          label: 'Gestión de Periodos',
          icon: 'pi pi-calendar',
          route: '/app/admin/periodos',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'ADMIN_GTH'],
        },
        {
          id: 'gestion-catalogos',
          label: 'Gestión de Catálogos',
          icon: 'pi pi-list',
          route: '/app/admin/catalogos',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'ADMIN_GTH'],
        },
        {
          id: 'gestion-asignaciones',
          label: 'Gestión de Asignaciones',
          icon: 'pi pi-users',
          route: '/app/admin/asignaciones',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'ADMIN_GTH'],
        },
        {
          id: 'seguimiento-global',
          label: 'Seguimiento Global',
          icon: 'pi pi-eye',
          route: '/app/admin/seguimiento',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'ADMIN_GTH'],
        },
      ],
    },
    {
      id: 'superadmin',
      title: 'Super Administración',
      expanded: true,
      items: [
        {
          id: 'auditoria',
          label: 'Auditoría',
          icon: 'pi pi-history',
          route: '/app/superadmin/auditoria',
          // @ts-ignore
          requiredRoles: ['ADMIN'],
        },
        {
          id: 'super-admin-gestion',
          label: 'Gestión Avanzada',
          icon: 'pi pi-shield',
          route: '/app/superadmin/gestion',
          // @ts-ignore
          requiredRoles: ['ADMIN'],
        },
      ],
    },
    {
      id: 'evaluador',
      title: 'Evaluador',
      expanded: true,
      items: [
        {
          id: 'dashboard-evaluador',
          label: 'Mis Evaluaciones',
          icon: 'pi pi-pencil',
          route: '/app/evaluador/dashboard',
          // @ts-ignore
          requiredRoles: ['EVALUADOR'],
        },
      ],
    },
    {
      id: 'evaluado',
      title: 'Evaluado',
      expanded: true,
      items: [
        {
          id: 'dashboard-evaluado',
          label: 'Mis Evaluaciones',
          icon: 'pi pi-file',
          route: '/app/evaluado/dashboard',
          // @ts-ignore
          requiredRoles: ['EVALUADO'],
        },
      ],
    },
    {
      id: 'config',
      title: 'Configuración',
      expanded: false,
      items: [
        {
          id: 'perfil',
          label: 'Mi Perfil',
          icon: 'pi pi-user',
          route: '/app/perfil',
        },
        {
          id: 'notificaciones',
          label: 'Notificaciones',
          icon: 'pi pi-bell',
          route: '/app/notificaciones',
        },
      ],
    },
  ];

  visibleSections: DrawerSection[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeTheme();

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.user = {
          name: user.id || user.email || 'Usuario',
          email: user.email || '',
          avatar: undefined,
        };
      }
    });

    this.applyFilters();
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  private applyFilters(): void {
    const clientRoles = this.authService.getUserRoles() || [];

    this.visibleSections = this.sections
      .map((section) => {
        const items = (section.items || []).filter((item) => {
          const requiredRoles: string[] | undefined = (item as any).requiredRoles;
          if (requiredRoles && requiredRoles.length > 0) {
            return requiredRoles.some((r) => clientRoles.includes(r));
          }
          return true;
        });
        return { ...section, items } as DrawerSection;
      })
      .filter((s) => (s.items || []).length > 0);
  }

  ngOnDestroy(): void {
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

  onUserProfileClick(): void {
    this.router.navigate(['/app/perfil']);
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

  onLogout(): void {
    this.drawerVisible = false;
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/sedu/';
      },
      error: () => {
        window.location.href = window.location.origin + '/sedu/';
      },
    });
  }
}
