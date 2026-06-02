import { Route } from '@angular/router';
import { LaboratorioComponent } from '../pages/laboratorio-component/laboratorio.component';
import { ListaLaboratorioComponent } from '../pages/lista-laboratorio-component/lista-laboratorio.component';
import { LaboratoriosDashboardComponent } from '../pages/laboratorio-dashboard-component/laboratorio-dashboard.component';
import { UsuariosOracleConsultaComponent } from '../pages/usuarios-oracle-consulta-component/usuarios-oracle-consulta.component';
import { RegistroEstudiantesComponent } from '../pages/registro-estudiantes-component/registro-estudiantes.component';
import { ReservaLaboratorioComponent } from '../pages/reserva-laboratorio-component/reserva-laboratorio.component';
import { DashboardUsabilidad } from '../pages/dashboard-usabilidad-component/dashboard-usabilidad.component';
import { LaboratorioEditarComponent } from '../pages/laboratorio-editar-component/laboratorio-editar.component';
import { CalendarioLaboratorioComponent } from '../pages/calendario-laboratorio-component/calendario-laboratorio.component';
import { RegistroExternosComponent } from '../pages/registro-externos_component/registro-externos.component';
import { AsistenciaLaboratoriosComponent } from '../pages/asistencia-laboratorios-component/asistencia-laboratorios.component';
import { SolicitudLaboratorioComponent } from '../pages/solicitud-laboratorio-component/solicitud-laboratorio.component';
import { InformeLaboratoriosComponent } from '../pages/informe-laboratorios-component/informe-laboratorios.component';
import { ConsultaUsuariosExternosComponent } from '../pages/consulta-usuarios-externos-component/consulta-usuarios-externos.component';
import { InicioComponent } from '../pages/inicio-component/inicio.component';
import { EstudiantesOracleConsultaComponent } from '../pages/estudiantes-oracle-consulta-component/estudiantes-oracle-consulta.component';

import { EquiposComputoComponent } from '../pages/equipos-computo-component/equipos-computo.component';
import { ListaEquiposComputoComponent } from '../pages/lista-equipos-computo-component/lista-equipos-computo.component';
import { ListaMaquinariaLaboratoriosComponent } from '../pages/lista-maquinaria-laboratorios-component/lista-maquinaria-laboratorios.component';
import { RequisicionComponent } from '../pages/requisicion-component/requisicion.component';
import { RemoteEntry } from './entry';

import { HojaDeVidaProductoComponent } from '../pages/hoja-de-vida-producto-component/hoja-de-vida-producto.component';
import { MonitorAsistenciaComponent } from '../pages/monitor-asistencia-component/monitor-asistencia.component';
import { DocenteLabsComponent } from '../pages/docente-labs/docente-labs.component';
import { MonitorReservasExternosComponent } from '../pages/monitor-reservas-externos-component/monitor-reservas-externos.component';
import { AuthGuard } from '@microfrontends/shared-services';
import { EditProfileComponent } from '@microfrontends/shared-ui';
import { AdminListasValoresComponent } from '../pages/admin-listas-valores/admin-listas-valores.component';
import { AulasLaboratoriosComponent } from '../pages/aulas-laboratorios/aulas-laboratorios.component';
import { LbEquipoAlmacenComponent } from '../pages/lb-equipo-almacen-component/lb-equipo-almacen.component';
import { LbListaEquiposAlmacenComponent } from '../pages/lb-lista-equipos-almacen-component/lb-lista-equipos-almacen.component';
import { LbEquipoAulaComponent } from '../pages/lb-equipo-aula-component/lb-equipo-aula.component';
import { LbSuministroAlmacenComponent } from '../pages/lb-suministro-almacen-component/lb-suministro-almacen.component';
import { LbListaSuministrosAlmacenComponent } from '../pages/lb-lista-suministros-almacen-component/lb-lista-suministros-almacen.component';
import { LbSuministroAulaComponent } from '../pages/lb-suministro-aula-component/lb-suministro-aula.component';
import { LbListaSuministrosAsignadosComponent } from '../pages/lb-lista-suministros-asignados-component/lb-lista-suministros-asignados.component';
import { LbMantenimientoEquipoComponent } from '../pages/lb-mantenimiento-equipo-component/lb-mantenimiento-equipo.component';
import { LbEquipoAccesorioComponent } from '../pages/lb-equipo-accesorio-component/lb-equipo-accesorio.component';
import { LbEquipoUnidadComponent } from '../pages/lb-equipo-unidad-component/lb-equipo-unidad.component';
import { AsignacionCoordinadoresComponent } from '../pages/asignacion-coordinadores-component/asignacion-coordinadores.component';
import { AprobarReservasComponent } from '../pages/aprobar-reservas-component/aprobar-reservas.component';
import { ListaReservasComponent } from '../pages/lista-reservas-component/lista-reservas.component';
import { LbListaEquiposAsignadosComponent } from '../pages/lb-lista-equipos-asignados-component/lb-lista-equipos-asignados.component';
import { LbMarcaComponent } from '../pages/lb-marca-component/lb-marca.component';
import { LbListaEquiposUnidadComponent } from '../pages/lb-lista-equipos-unidad-component/lb-lista-equipos-unidad.component';
import { LbReservaEquipoComponent } from '../pages/lb-reserva-equipo-component/lb-reserva-equipo.component';
import { LbListaReservasComponent } from '../pages/lb-lista-reservas-component/lb-lista-reservas.component';
import { LbDevolucionEquipoComponent } from '../pages/lb-devolucion-equipo-component/lb-devolucion-equipo.component';
import { LbListaDevolucionesComponent } from '../pages/lb-lista-devoluciones-component/lb-lista-devoluciones.component';
import { LbHistorialEquipoComponent } from '../pages/lb-historial-equipo-component/lb-historial-equipo.component';
import { MonitoreoReservasComponent } from '../pages/monitoreo-reservas-component/monitoreo-reservas.component';
import { AsistenciaReservaComponent } from '../pages/asistencia-reserva-component/asistencia-reserva.component';
import { LbForzarSalidaComponent } from '../pages/lb-forzar-salida-component/lb-forzar-salida.component';
import { MonitoreoAsistenciaComponent } from '../pages/monitoreo-asistencia-component/monitoreo-asistencia.component';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        component: InicioComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PLANEACION',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      // { path: 'inicio', component: InicioComponent },
      {
        path: 'registroLaboratorio',
        component: LaboratorioComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'listaLaboratorios',
        component: ListaLaboratorioComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'dashboard',
        component: LaboratoriosDashboardComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'consultaUsuariosOracle',
        component: UsuariosOracleConsultaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'registroEstudiantes',
        component: RegistroEstudiantesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'reservaLaboratorio',
        component: ReservaLaboratorioComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'dashboardUsabilidad',
        component: DashboardUsabilidad,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'editarLaboratorio/:nombre',
        component: LaboratorioEditarComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'calendarioLaboratorios',
        component: CalendarioLaboratorioComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PLANEACION',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'registroExternos',
        component: RegistroExternosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'asistenciaLaboratorios',
        component: AsistenciaLaboratoriosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_PROFESOR',
            'LAB_LABORATORISTA',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'solicitudLaboratorio',
        component: SolicitudLaboratorioComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'informeLaboratorios',
        component: InformeLaboratoriosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'consultaUsuariosExternos',
        component: ConsultaUsuariosExternosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'consultaEstudiantesOracle',
        component: EstudiantesOracleConsultaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PLANEACION', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },

      {
        path: 'listaEquiposComputo',
        component: ListaEquiposComputoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'equiposComputo',
        component: EquiposComputoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'listaMaquinaria',
        component: ListaMaquinariaLaboratoriosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },

      {
        path: 'requisicionProducto',
        component: RequisicionComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },

      {
        path: 'hoja-vida-producto',
        component: HojaDeVidaProductoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },

      {
        path: 'monitorAsistencia',
        component: MonitorAsistenciaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'monitorReservasExternos',
        component: MonitorReservasExternosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'docente-labs',
        component: DocenteLabsComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_PROFESOR', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'admin/listas-valores',
        component: AdminListasValoresComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'aulas-laboratorios',
        component: AulasLaboratoriosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'asignacion-coordinadores',
        component: AsignacionCoordinadoresComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'equipos-almacen',
        component: LbEquipoAlmacenComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-equipos-almacen',
        component: LbListaEquiposAlmacenComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'equipos-aula',
        component: LbEquipoAulaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-equipos-asignados',
        component: LbListaEquiposAsignadosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'suministro-almacen',
        component: LbSuministroAlmacenComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-suministros-almacen',
        component: LbListaSuministrosAlmacenComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'suministro-aula',
        component: LbSuministroAulaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-suministros-asignados',
        component: LbListaSuministrosAsignadosComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'mantenimiento-equipo',
        component: LbMantenimientoEquipoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'equipos-accesorios',
        component: LbEquipoAccesorioComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'marcas',
        component: LbMarcaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'hojas-de-vida-equipos',
        component: LbEquipoUnidadComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-equipos-unidad',
        component: LbListaEquiposUnidadComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'asignacion-coordinadores',
        component: AsignacionCoordinadoresComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      // { path: 'admin/user-role-management', component: UserRoleManagementComponent, canActivate: [AuthGuard], data: { requiredRoles: ['ADMIN', 'COR_LAB_ING', 'COR_LAB_SALUD'], roleConfig: { clientId: 'clients-service', adminRole: 'ADMIN', availableRoles: ['ADMIN', 'LAB_PLANEACION', 'LAB_LABORATORISTA', 'LAB_PROFESOR', 'LAB_SUPERVISOR', 'LAB_USER', 'USUARIO'], apiHojasDeVida: environment.authApi } } },
      {
        path: 'edit-profile',
        component: EditProfileComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_LABORATORISTA',
            'LAB_PLANEACION',
            'LAB_PROFESOR',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'aprobar-reservas',
        component: AprobarReservasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'reservas-equipo',
        component: LbReservaEquipoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-reservas',
        component: ListaReservasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PROFESOR', 'USUARIO', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-reservas-equipo',
        component: LbListaReservasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA'] },
      },
      {
        path: 'devolucion-equipo',
        component: LbDevolucionEquipoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-devoluciones',
        component: LbListaDevolucionesComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'lista-reservas',
        component: ListaReservasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA'] },
      },
      {
        path: 'historial-equipo',
        component: LbHistorialEquipoComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA'] },
      },
      {
        path: 'monitoreo-reservas',
        component: MonitoreoReservasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PLANEACION', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
      {
        path: 'monitoreo-asistencia',
        component: MonitoreoAsistenciaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PLANEACION'] },
      },
      {
        path: 'asistencia-reserva',
        component: AsistenciaReservaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'ADMIN',
            'LAB_LABORATORISTA',
            'LAB_PROFESOR',
            'USUARIO',
            'COR_LAB_ING',
            'COR_LAB_SALUD',
          ],
        },
      },
      {
        path: 'forzar-salida',
        component: LbForzarSalidaComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'COR_LAB_ING', 'COR_LAB_SALUD'] },
      },
    ],
  },
];
