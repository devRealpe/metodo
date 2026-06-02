import { Component, ViewChild, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, of, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { FilterMatchMode } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';

import { EstudiantesOracleService } from '../../core/services/estudiantes-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { EstudiantesOracle } from '../../core/models/estudiantes-oracle.model';

type CampoTexto = 'idEstudiante' | 'nombre' | 'codAsignatura' | 'nomAsignatura' | 'codAula' | 'nomAula' | 'numIdProfesor';
type CampoExacto = 'grupo' | 'semestre' | 'periodo';

interface EstudianteConHorario extends EstudiantesOracle {
  diasClase?: string[];
  horaInicio?: string;
  horaFin?: string;
}

@Component({
  selector: 'app-estudiantes-oracle-consulta',
  standalone: true,
  imports: [
    CommonModule, PanelModule, ButtonModule, TableModule, FormsModule,
    InputTextModule, SelectModule, InputComponent, SelectComponent
  ],
  templateUrl: './estudiantes-oracle-consulta.component.html',
})
export class EstudiantesOracleConsultaComponent implements OnInit {
  private api = inject(EstudiantesOracleService);
  private horariosApi = inject(HorariosOracleService);

  @ViewChild('dt') dt?: Table;

  cargando = signal(false);
  data = signal<EstudianteConHorario[]>([]);
  dataFiltrada = signal<EstudianteConHorario[]>([]);

  busquedaRapida = signal<string>('');
  diaSeleccionado = signal<string>('');

  diaLabel = computed(() => {
    const opt = this.opcionesDias.find(o => o.value === this.diaSeleccionado());
    return opt ? opt.label : this.diaSeleccionado();
  });

  opcionesDias = [
    { label: 'Todos los días', value: '' },
    { label: 'Lunes',    value: 'LUNES' },
    { label: 'Martes',   value: 'MARTES' },
    { label: 'Miércoles', value: 'MIERCOLES' },
    { label: 'Jueves',   value: 'JUEVES' },
    { label: 'Viernes',  value: 'VIERNES' },
    { label: 'Sábado',   value: 'SABADO' },
    { label: 'Domingo',  value: 'DOMINGO' },
    { label: 'Hoy',      value: 'HOY' }
  ];

  filtros = signal<Partial<Record<CampoTexto | CampoExacto, any>>>({
    idEstudiante: '',
    nombre: '',
    codAsignatura: '',
    nomAsignatura: '',
    codAula: '',
    nomAula: '',
    numIdProfesor: '',
    grupo: '',
    semestre: '',
    periodo: ''
  });

  opciones = {
    asignaturas: computed(() => this.buildOpts(this.dataFiltrada(), 'nomAsignatura')),
    aulas: computed(() => this.buildOpts(this.dataFiltrada(), 'nomAula')),
    semestres: computed(() => this.buildOpts(this.dataFiltrada(), 'semestre')),
    periodos: computed(() => this.buildOpts(this.dataFiltrada(), 'periodo')),
  };

  private horariosCache = new Map<string, HorarioItem[]>();

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.getAll()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: res => {
          const estudiantes = Array.isArray(res) ? res : (res ? [res] : []);

          const porClave = new Map<string, EstudianteConHorario>();
          for (const est of estudiantes) {
            const id = (est?.idEstudiante || '').toString().trim();
            if (!id) continue;
            const clave = [
              (est.periodo ?? ''),
              id,
              (est.codAsignatura ?? ''),
              (est.grupo ?? ''),
              (est.codAula ?? '')
            ].join('|');
            if (!porClave.has(clave)) {
              porClave.set(clave, est as EstudianteConHorario);
            }
          }

          const deduplicados = Array.from(porClave.values());
          this.data.set(deduplicados);
          this.dataFiltrada.set(deduplicados);
        },
        error: () => {
          this.data.set([]);
          this.dataFiltrada.set([]);
        },
      });
  }

  async filtrarPorDia(dia: string) {
    this.diaSeleccionado.set(dia);

    if (!dia) {
      this.dataFiltrada.set(this.data());
      return;
    }

    const diaReal = dia === 'HOY' ? this.getDiaHoy() : dia;

    this.cargando.set(true);

    try {
      let horariosDia = this.horariosCache.get(diaReal);

      if (!horariosDia) {
        horariosDia = await firstValueFrom(
          this.horariosApi.getHoras(diaReal).pipe(catchError(() => of([])))
        ) ?? [];
        this.horariosCache.set(diaReal, horariosDia);
      }

      const coincide = (h: HorarioItem, est: EstudianteConHorario): boolean => {
        const aulaOk = !!est.nomAula &&
          this.normalizar(h.nomAula || '') === this.normalizar(est.nomAula);

        if (!aulaOk) return false;

        if (h.materia && est.nomAsignatura) {
          return this.normalizar(h.materia) === this.normalizar(est.nomAsignatura);
        }

        return true;
      };

      const estudiantesFiltrados = this.data()
        .filter(est => horariosDia!.some(h => coincide(h, est)))
        .map(est => {
          const horario = horariosDia!.find(h => coincide(h, est));
          return {
            ...est,
            diasClase: [diaReal],
            horaInicio: horario?.horaInicio || '',
            horaFin: horario?.horaFin || ''
          } as EstudianteConHorario;
        });

      this.dataFiltrada.set(estudiantesFiltrados);
    } catch {
      this.dataFiltrada.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  private getDiaHoy(): string {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return dias[new Date().getDay()];
  }

  private normalizar(str: string): string {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizarCodigo(str: string): string {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_\s]+/g, '')
      .trim();
  }

  recargar() {
    this.dt?.clear();
    this.busquedaRapida.set('');
    this.diaSeleccionado.set('');
    this.horariosCache.clear();
    this.resetFiltros();
    this.cargar();
  }

  trackById = (_: number, e: EstudianteConHorario) =>
    `${e.periodo}-${e.idEstudiante}-${e.codAsignatura}-${e.codAula}`;

  aplicarBusquedaRapida(valor: string) {
    this.busquedaRapida.set(valor);
    this.dt?.filterGlobal(valor, 'contains');
  }

  aplicarFiltroTexto(campo: CampoTexto, valor: string | null | undefined) {
    const v = valor ?? '';
    this.filtros.update(f => ({ ...f, [campo]: v }));
    this.dt?.filter(v, campo, FilterMatchMode.CONTAINS);
  }

  aplicarFiltroExacto(campo: CampoExacto, valor: any) {
    const v = valor ?? '';
    this.filtros.update(f => ({ ...f, [campo]: v }));
    this.dt?.filter(v, campo, FilterMatchMode.EQUALS);
  }

  limpiarFiltros() {
    this.dt?.clear();
    this.busquedaRapida.set('');
    this.diaSeleccionado.set('');
    this.dataFiltrada.set(this.data());
    this.resetFiltros();
  }

  private resetFiltros() {
    this.filtros.set({
      idEstudiante: '',
      nombre: '',
      codAsignatura: '',
      nomAsignatura: '',
      codAula: '',
      nomAula: '',
      numIdProfesor: '',
      grupo: '',
      semestre: '',
      periodo: ''
    });
  }

  private buildOpts<T extends Record<string, any>>(arr: T[], field: string) {
    const set = new Set<string>();
    for (const item of arr) {
      const v = `${item?.[field] ?? ''}`.trim();
      if (v) set.add(v);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ label: v, value: v }));
  }
}
