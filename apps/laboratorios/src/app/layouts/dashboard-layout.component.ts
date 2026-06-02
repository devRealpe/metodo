import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { DrawerComponent, DrawerSection, DrawerMenuItem, DrawerUser } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { Subject, takeUntil } from 'rxjs';
import { UsuariosOracleService } from '../core/services/usuarios-oracle.service';


@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterModule, DrawerComponent],
  standalone: true,
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  logoTitle = 'Laboratorios'
  drawerVisible = false;
  private authService = inject(AuthService);
  private usuariosOracleService = inject(UsuariosOracleService);

  user: DrawerUser = {
    name: '',
    avatar: '',
    email: ''
  }

  tieneDatosGuardados = false;

  visibleSections: DrawerSection[] = [];
  private destroy$ = new Subject<void>();

  sections: DrawerSection[] = [
    {
      id: 'main',
      title: 'Menú principal',
      expanded: true,
      items: [
        {
          id: 'inicio',
          label: 'Inicio',
          icon: 'pi pi-home',
          route: '/app/inicio',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'USUARIO', 'LAB_PLANEACION', 'LAB_PROFESOR', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'pi pi-home',
          route: '/app/dashboard',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },

        {
          id: 'dashboardUsabilidad',
          label: 'Dashboard Usabilidad',
          icon: 'pi pi-home',
          route: '/app/dashboardUsabilidad',
          // @ts-ignore - propiedad dinámica usada para control de visibilidad
          requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },

      ]


    },
    {
      id: 'laboratorios',
      title: 'Laboratorios',
      expanded: true,
      items: [
        {
          id: 'horario',
          label: 'Horario',
          icon: 'pi pi-calendar',
          route: '/app/calendarioLaboratorios',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'LAB_PROFESOR', 'LAB_LABORATORISTA', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'horarioDocente',
          label: 'Horario del docente',
          icon: 'pi pi-calendar',
          route: '/app/docente-labs',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'listaLaboratorios',
          label: 'Lista de laboratorios',
          icon: 'pi pi-list',
          route: '/app/listaLaboratorios',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'aulasLaboratorios',
          label: 'Gestión de Aulas',
          icon: 'pi pi-building',
          route: '/app/aulas-laboratorios',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'asignacionCoordinadores',
          label: 'Asignación de Coordinadores',
          icon: 'pi pi-user-edit',
          route: '/app/asignacion-coordinadores',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        }
      ]
    },
    {
      id: 'registros',
      title: 'Registros',
      expanded: true,
      items: [
        {
          id: 'registroClases',
          label: 'Registro de clases',
          icon: 'pi pi-book',
          route: '/app/solicitudLaboratorio',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'monitorAsistencia',
          label: 'Monitor de asistencia',
          icon: 'pi pi-eye',
          route: '/app/monitorAsistencia',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'AsistenciaLaboratorio',
          label: 'Asistencia laboratorio',
          icon: 'pi pi-book',
          route: '/app/asistenciaLaboratorios',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'LAB_LABORATORISTA', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'AsistenciaLaboratorio',
          label: 'Registro de estudiantes',
          icon: 'pi pi-book',
          route: '/app/registroEstudiantes',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PROFESOR', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'reservaLaboratorio',
          label: 'Reserva de laboratorio',
          icon: 'pi pi-calendar-plus',
          route: '/app/reservaLaboratorio',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PROFESOR', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'listaReservas',
          label: 'Lista de reservas',
          icon: 'pi pi-list',
          route: '/app/lista-reservas',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'monitoreoReservas',
          label: 'Monitoreo de asistencia',
          icon: 'pi pi-chart-line',
          route: '/app/monitoreo-reservas',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'monitoreoAsistencia',
          label: 'Cache horario semanal',
          icon: 'pi pi-calendar-clock',
          route: '/app/monitoreo-asistencia',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PLANEACION']
        },
        {
          id: 'asistenciaReserva',
          label: 'Asistencia a reserva',
          icon: 'pi pi-check-square',
          route: '/app/asistencia-reserva',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PROFESOR', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },

        {
          id: 'registroExternos',
          label: 'Registro de externos',
          icon: 'pi pi-users',
          route: '/app/registroExternos',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'LAB_LABORATORISTA', 'USUARIO', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'forzarSalida',
          label: 'Forzar salida de laboratorio',
          icon: 'pi pi-sign-out',
          route: '/app/forzar-salida',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
        }
      ]
    },
    {
      id: 'reportes',
      title: 'Reportes',
      expanded: true,
      items: [
        {
          id: 'reportesUso',
          label: 'Reporte de Uso',
          icon: 'pi pi-chart-bar',
          route: '/app/informeLaboratorios',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'listaUsuarios',
          label: 'Lista de usuarios',
          icon: 'pi pi-users',
          route: '/app/consultaUsuariosOracle',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'listaUsuariosExternos',
          label: 'Lista de usuarios externos',
          icon: 'pi pi-users',
          route: '/app/consultaUsuariosExternos',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        },
        {
          id: 'listaEstudiantes',
          label: 'Lista de estudiantes',
          icon: 'pi pi-users',
          route: '/app/consultaEstudiantesOracle',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        }

      ]
    },
    {
      id: 'inventario',
      title: 'Inventario',
      expanded: true,
      // @ts-ignore
      requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'],
      items: [
        {
          id: 'registro-submenu',
          label: 'Registro',
          icon: 'pi pi-plus-circle',
          expanded: false,
          children: [
            {
              id: 'registrarMarca',
              label: 'Registrar marca',
              icon: 'pi pi-box',
              route: '/app/marcas',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbRegistrarEquipoAlmacen',
              label: 'Registrar equipo en almacén',
              icon: 'pi pi-list',
              route: '/app/equipos-almacen',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbEquipoAula',
              label: 'Registrar equipos en aula',
              icon: 'pi pi-list',
              route: '/app/equipos-aula',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'registrarSuministro',
              label: 'Registrar suministro',
              icon: 'pi pi-box',
              route: '/app/suministro-almacen',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'registrarReservaEquipo',
              label: 'Registrar reserva de equipo',
              icon: 'pi pi-desktop',
              route: '/app/reservas-equipo',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'registrarDevolucionEquipo',
              label: 'Registrar devolución de equipo',
              icon: 'pi pi-replay',
              route: '/app/devolucion-equipo',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA']
            },
            {
              id: 'registrarEquipoComputo',
              label: 'Registrar equipos de cómputo',
              icon: 'pi pi-desktop',
              route: '/app/equiposComputo',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
          ]
        },
        {
          id: 'listas-submenu',
          label: 'Listas',
          icon: 'pi pi-list',
          expanded: false,
          children: [
            {
              id: 'lbEquipoAccesorio',
              label: 'Lista de accesorios',
              icon: 'pi pi-list',
              route: '/app/equipos-accesorios',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
             {
              id: 'lbEquipoUnidad',
              label: 'Lista de hojas de vida equipos',
              icon: 'pi pi-list',
              route: '/app/lista-equipos-unidad',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbEquipoAlmacen',
              label: 'Lista de equipos en almacén',
              icon: 'pi pi-list',
              route: '/app/lista-equipos-almacen',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbListaEquiposAsignados',
              label: 'Lista de equipos asignados',
              icon: 'pi pi-list',
              route: '/app/lista-equipos-asignados',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbMantenimientoEquipo',
              label: 'Lista de mantenimientos de equipos',
              icon: 'pi pi-list',
              route: '/app/mantenimiento-equipo',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbSuministrosAlmacen',
              label: 'Lista de suministros en almacén',
              icon: 'pi pi-list',
              route: '/app/lista-suministros-almacen',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbSuministrosAula',
              label: 'Lista de suministros en aula',
              icon: 'pi pi-list',
              route: '/app/suministro-aula',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'lbListaSuministrosAsignados',
              label: 'Lista de suministros asignados',
              icon: 'pi pi-list',
              route: '/app/lista-suministros-asignados',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA']
            }, 
            {
              id: 'lbListareservasEquipo',
              label: 'Lista de reservas de equipo',
              icon: 'pi pi-list',
              route: '/app/lista-reservas-equipo',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA']
            },
            {
              id: 'lbListaDevolucionesEquipo',
              label: 'Lista de devoluciones de equipo',
              icon: 'pi pi-list',
              route: '/app/lista-devoluciones',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA','COR_LAB_ING', 'COR_LAB_SALUD']
            },
          ]
        },
        {
          id: 'hojas-vida-submenu',
          label: 'Hojas de Vida',
          icon: 'pi pi-file',
          expanded: false,
          children: [
            {
              id: 'lbEquipoUnidad',
              label: 'Registro de hoja de vida de equipo',
              icon: 'pi pi-list',
              route: '/app/hojas-de-vida-equipos',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            },
            {
              id: 'listahojasdevidaequipos',
              label: 'Descargar hoja de vida de equipos',
              icon: 'pi pi-file',
              route: '/app/historial-equipo'
            },
            {
              id: 'hojaVidaProducto',
              label: 'Hoja de vida del producto',
              icon: 'pi pi-cog',
              route: '/app/hoja-vida-producto'
            },
          ]
        },
        {
          id: 'reportes-submenu',
          label: 'Reportes y Gestión',
          icon: 'pi pi-chart-bar',
          expanded: false,
          children: [
            {
              id: 'requisicionProducto',
              label: 'Requisición de productos',
              icon: 'pi pi-receipt',
              route: '/app/requisicionProducto',
              // @ts-ignore
              requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD']
            }
          ]
        }
      ]
    }
    ,
    {
      id: 'settings-admin',
      title: 'Configuración Avanzada',
      expanded: false,
      items: [
        // {
        //   id: 'user-role-management',
        //   label: 'Gestión de Roles de Usuario',
        //   icon: 'pi pi-shield',
        //   route: '/app/admin/user-role-management',
        //   // @ts-ignore
        //   requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        // },
        {
          id: 'admin-listas-valores',
          label: 'Admin Listas de Valores',
          icon: 'pi pi-list',
          route: '/app/admin/listas-valores',
          // @ts-ignore
          requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD']
        }
      ]
    }
  ];

  private router = inject(Router);

  constructor() {
    // Inicializar tema desde localStorage
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
        avatar: ''
      };

      // Consultar nombre completo de Oracle
      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle && usuarioOracle.nombre) {
              this.user = {
                ...this.user,
                name: usuarioOracle.nombre
              };
              // Si existe un registro, marcaremos que existen datos guardados
              this.tieneDatosGuardados = true;
              this.applyFilters();
            }
          },
          error: () => {
          }
        });
      }
    }

    // Reaplicar filtros si el estado de autenticación cambia
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.applyFilters();
    });

    // Inicializar filtros inmediatamente (por si no hay cambios posteriores), incluso si no hay userInfo
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyFilters(): void {
    // Obtener roles del cliente del auth service
    const clientRoles = this.authService.getUserRoles() || [];

    const filtered: DrawerSection[] = this.sections.map(section => {
      // Reglas para controlar la visibilidad del SECTION (cabecera/agrupación)
      const sectionRequiredRoles: string[] | undefined = (section as any).requiredRoles;
      const sectionRequiresData: boolean | undefined = (section as any).requiresData;
      // Determinamos si el usuario tiene acceso al SECTION en base a sus roles y la existencia de datos
      let sectionRoleAllowed = true;
      if (sectionRequiredRoles && sectionRequiredRoles.length > 0) {
        sectionRoleAllowed = sectionRequiredRoles.some(r => clientRoles.includes(r));
      }
      let sectionDataAllowed = true;
      if (sectionRequiresData) {
        sectionDataAllowed = this.tieneDatosGuardados;
      }
      // Si el usuario no tiene permitido ver esta sección, devolvemos una sección sin items
      if (!sectionRoleAllowed || !sectionDataAllowed) {
        return {
          ...section,
          items: []
        } as DrawerSection;
      }
      const items = (section.items || []).map(item => {
        const requiredRoles: string[] | undefined = (item as any).requiredRoles;
        const requiresData: boolean | undefined = (item as any).requiresData;

        // Validación de roles
        let roleAllowed = true;
        if (requiredRoles && requiredRoles.length > 0) {
          roleAllowed = requiredRoles.some(r => clientRoles.includes(r));
        }

        // Validación de datos guardados
        let dataAllowed = true;
        if (requiresData) {
          dataAllowed = this.tieneDatosGuardados;
        }

        // Validar children si existen
        let children = (item as any).children;
        if (Array.isArray(children)) {
          children = children.filter((child: any) => {
            const childRequiredRoles: string[] | undefined = (child as any).requiredRoles;
            const childRequiresData: boolean | undefined = (child as any).requiresData;
            let childRoleAllowed = true;
            if (childRequiredRoles && childRequiredRoles.length > 0) {
              childRoleAllowed = childRequiredRoles.some(r => clientRoles.includes(r));
            }
            let childDataAllowed = true;
            if (childRequiresData) {
              childDataAllowed = this.tieneDatosGuardados;
            }
            return childRoleAllowed && childDataAllowed;
          });
        }

        return {
          ...item,
          children
        } as DrawerMenuItem;
      }).filter(item => {
        const requiredRoles: string[] | undefined = (item as any).requiredRoles;
        const requiresData: boolean | undefined = (item as any).requiresData;

        // Validación de roles (otra vez para el filtrado de items)
        let roleAllowed = true;
        if (requiredRoles && requiredRoles.length > 0) {
          roleAllowed = requiredRoles.some(r => clientRoles.includes(r));
        }
        let dataAllowed = true;
        if (requiresData) {
          dataAllowed = this.tieneDatosGuardados;
        }
        return roleAllowed && dataAllowed;
      });

      return {
        ...section,
        items
      } as DrawerSection;
    }).filter(s => (s.items || []).length > 0);

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
    }
  }

  onUserProfileClick(): void {
    this.router.navigate(['/app/edit-profile']);
  }

  onDrawerVisibilityChange(visible: boolean): void {
    this.drawerVisible = visible;
  }

  onThemeToggle(isDarkMode: boolean): void {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  // Método simplificado para alternar tema
  toggleDarkMode(): void {
    document.documentElement.classList.toggle('my-app-dark');
  }

  onLogout(): void {
    this.drawerVisible = false;

    // Llamar al servicio de logout para invalidar sesión en Keycloak
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = window.location.origin + '/laboratorios/';
      },
      error: () => {
        window.location.href = window.location.origin + '/laboratorios/';
      }
    });
  }

}
