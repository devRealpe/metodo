import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@microfrontends/shared-services';
import { firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ProfesorService } from '../../core/services/profesor.service';
import { PlanDeTrabajoService } from '../../core/services/planDeTrabajo.service';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { Profesor } from '../../core/models/profesor.model';
import { PlanDeTrabajoModel } from '../../core/models/planDeTrabajo.model';
import { Auditoria } from '../../core/models/auditoria.model';

interface AuditoriaExtendida extends Auditoria {
  severity?: 'success' | 'info' | 'danger';
}

interface ProfesorConPlan extends Profesor {
  planDeTrabajo: PlanDeTrabajoModel | null;
  estado: string;
  severityEstado?: 'success' | 'info' | 'danger';
}

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    SelectModule,
    TableModule,
    ToastModule,
    TagModule
  ],
  providers: [MessageService]
})
export class Reportes implements OnInit {

  periodosAcademicos: PeriodoAcademico[] = [];
  periodoSeleccionado = signal<PeriodoAcademico | null>(null);

  profesoresConPlan = signal<ProfesorConPlan[]>([]);
  profesorSeleccionado = signal<ProfesorConPlan | null>(null);

  auditorias = signal<AuditoriaExtendida[]>([]);

  cargandoProfesores = signal<boolean>(false);
  cargandoAuditorias = signal<boolean>(false);

  profesorDirector = signal<Profesor | null>(null);

  constructor(
    private profesorService: ProfesorService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private auditoriaService: AuditoriaService,
    private messageService: MessageService,
    private authService : AuthService
  ) { }

  private getDirectorId(): string | null {
    const authUser = this.authService.getCurrentUser();
    return authUser?.username || null;
  }
  
  ngOnInit(): void {
    const directorId = this.getDirectorId();
    if (!directorId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al director.'
      });
      return;
    }

    this.generarPeriodosAcademicos();
    this.cargarDatosIniciales(directorId);
  }

  private async cargarDatosIniciales(directorId: string): Promise<void> {
    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      if (director) {
        this.profesorDirector.set(director);
        this.cargarProfesoresPrograma(director.programa);
      } else {
        this.showError('No se encontró información del director');
      }
    } catch (error) {
      this.showError('Error al cargar datos iniciales');
    }
  }

  generarPeriodosAcademicos(): void {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const ANIO_MINIMO = 2026;

    let anioDefecto = anioActual;
    let periodoDefecto: 1 | 2 = mes <= 6 ? 1 : 2;

    if (mes >= 5 && mes <= 6) {
      periodoDefecto = 2;
    } else if (mes >= 11) {
      periodoDefecto = 1;
      anioDefecto = anioActual + 1;
    }
    const periodos: { label: string; anio: number; periodo: number }[] = [];

    for (let anio = anioDefecto; anio >= ANIO_MINIMO; anio--) {
      if (anio === anioDefecto) {
        if (periodoDefecto === 2) {
          periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        }
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      } else {
        periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      }
    }

    const periodoDefault = periodos.find(p => p.anio === anioDefecto && p.periodo === periodoDefecto)
      || periodos[0];

    this.periodosAcademicos = periodos;
    this.periodoSeleccionado.set(periodoDefault);
  }

  cargarProfesoresPrograma(programa: string): void {
    this.cargandoProfesores.set(true);
    this.profesorService.getByPrograma(programa).subscribe({
      next: async (profesores) => {
        const profesoresProgram = this.profesorService.filterByCargo(profesores);
        const directorId = this.getDirectorId();
        const profesoresOrdenados = profesoresProgram.sort((a, b) => {
          if (a.numIdentificacion === directorId) return -1;
          if (b.numIdentificacion === directorId) return 1;
          return 0;
        });

        const profesoresConPlan = await this.cargarPlanesDeTrabajoParaProfesores(profesoresOrdenados);
        this.profesoresConPlan.set(profesoresConPlan);
        this.cargandoProfesores.set(false);
      },
      error: (error) => {
        this.showError('Error al cargar profesores del programa');
        this.cargandoProfesores.set(false);
      }
    });
  }

  async cargarPlanesDeTrabajoParaProfesores(profesores: Profesor[]): Promise<ProfesorConPlan[]> {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      return profesores.map(profesor => ({
        ...profesor,
        planDeTrabajo: null,
        estado: 'Sin periodo seleccionado',
        severityEstado: 'danger'
      }));
    }

    const profesoresConPlan: ProfesorConPlan[] = [];

    for (const profesor of profesores) {
      try {
        const plan = await this.planDeTrabajoService
          .getByProfesorPeriodo(profesor.numIdentificacion, periodo.anio, periodo.periodo)
          .toPromise();

        if (plan) {
          profesoresConPlan.push({
            ...profesor,
            planDeTrabajo: plan,
            estado: 'Con plan',
            severityEstado: 'success'
          });
        } else {
          profesoresConPlan.push({
            ...profesor,
            planDeTrabajo: null,
            estado: 'Sin plan',
            severityEstado: 'danger'
          });
        }
      } catch (error) {
        profesoresConPlan.push({
          ...profesor,
          planDeTrabajo: null,
          estado: 'Sin plan',
          severityEstado: 'danger'
        });
      }
    }

    return profesoresConPlan;
  }

  onCambioPeriodo(periodo: PeriodoAcademico): void {
    this.periodoSeleccionado.set(periodo);
    this.profesorSeleccionado.set(null);
    this.auditorias.set([]);

    const director = this.profesorDirector();
    if (director?.programa) {
      this.cargarProfesoresPrograma(director.programa);
    }
  }

  onCambioProfesor(profesor: ProfesorConPlan): void {
    this.profesorSeleccionado.set(profesor);

    if (profesor?.planDeTrabajo?.id) {
      this.cargarAuditorias(profesor.planDeTrabajo.id);
    } else {
      this.auditorias.set([]);
      const periodo = this.periodoSeleccionado();
      this.showWarn(`El profesor seleccionado no tiene un plan de trabajo en el año ${periodo?.label}`);
    }
  }

  cargarAuditorias(idPlanTrabajo: string): void {
    this.cargandoAuditorias.set(true);

    this.auditoriaService.getAuditoriaByPt(idPlanTrabajo).subscribe({
      next: (auditorias) => {
        const auditoriasConSeverity = auditorias.map(auditoria => ({
          ...auditoria,
          severity: this.getSeverityFromTipoCambio(auditoria.tipoCambio)
        }));
        this.auditorias.set(auditoriasConSeverity);
        this.cargandoAuditorias.set(false);

        if (auditorias.length === 0) {
          this.showInfo('No se encontraron auditorías para este plan de trabajo');
        }
      },
      error: (error) => {
        this.showError('Error al cargar auditorías');
        this.auditorias.set([]);
        this.cargandoAuditorias.set(false);
      }
    });
  }

  getSeverityFromTipoCambio(tipoCambio: string): 'success' | 'info' | 'danger' {
    const tipoCambioLower = tipoCambio.toLowerCase();

    // Success: Asignaciones y creaciones
    if (tipoCambioLower.includes('asignada') ||
      tipoCambioLower.includes('crear') ||
      tipoCambioLower.includes('agregar') ||
      tipoCambioLower.includes('aproba')) {
      return 'success';
    }

    // Danger: Todas las eliminaciones
    if (tipoCambioLower.includes('elimina') || tipoCambioLower.includes('rechaza')) {
      return 'danger';
    }

    // Info: Actualizaciones y cualquier otra acción
    return 'info';
  }

  get nombreProfesorCompleto(): string {
    const profesor = this.profesorSeleccionado();
    if (!profesor) return '';
    return `${profesor.nombres} ${profesor.apellidos}`;
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
      life: 3000
    });
  }

  private showInfo(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: message,
      life: 3000
    });
  }

  private showWarn(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: message,
      life: 3000
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 3000
    });
  }
}