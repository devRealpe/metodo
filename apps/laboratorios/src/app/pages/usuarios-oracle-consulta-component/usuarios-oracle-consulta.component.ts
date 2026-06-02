import { Component, ViewChild, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { FilterMatchMode } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { ProgramaService } from '../../core/services/programas.service';
import { Card } from "primeng/card";


type CampoTexto = 'identificacion' | 'nombre' | 'facultad' | 'programa' | 'rol' | 'cargo';
type CampoExacto = 'genero' | 'semestre';

@Component({
  selector: 'app-usuarios-oracle-consulta',
  standalone: true,
  imports: [CommonModule, PanelModule, ButtonModule, TableModule, FormsModule, InputTextModule, SelectModule, InputComponent, SelectComponent, Card],
  templateUrl: './usuarios-oracle-consulta.component.html',
})
export class UsuariosOracleConsultaComponent implements OnInit {
  private api = inject(UsuariosOracleService);
  private programaService = inject(ProgramaService);

  @ViewChild('dt') dt?: Table;

  cargando = signal(false);
  data = signal<UsuarioOracle[]>([]); 

  busquedaRapida = signal<string>('');

  filtros = signal<Partial<Record<CampoTexto | CampoExacto, any>>>({
    identificacion: '',
    nombre: '',
    facultad: '',
    programa: '',
    rol: '',
    cargo: '',
    genero: '',
    semestre: '',
  });

  opcionesFacultades = signal<{ label: string; value: string }[]>([]);
  opcionesProgramas = signal<{ label: string; value: string }[]>([]);
  opcionesRoles = signal<{ label: string; value: string }[]>([]);
  opcionesGeneros = signal<{ label: string; value: string }[]>([]);
  opcionesSemestres = signal<{ label: string; value: string }[]>([]);

  opciones = {
    facultades: () => this.opcionesFacultades(),
    programas: () => this.opcionesProgramas(),
    roles: () => this.opcionesRoles(),
    generos: () => this.opcionesGeneros(),
    semestres: () => this.opcionesSemestres(),
  };

  filter: boolean = true;

  ngOnInit() {
    this.cargar();
    this.cargarOpciones();
  }

  cargar() {
    this.cargando.set(true);
    this.api.getAll()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => this.data.set(Array.isArray(res) ? res : (res ? [res] : [])),
        error: () => this.data.set([]),
      });
  }

  private cargarOpciones() {
    this.programaService.getAllFacultades().subscribe({
      next: (facultades: {id: string, nombre: string}[]) => {
        this.opcionesFacultades.set(facultades.map(f => ({ label: f.nombre, value: f.nombre })));
      },
      error: (err: unknown) => {
        console.error('Error cargando facultades:', err);
        this.opcionesFacultades.set(this.buildOpts(this.data(), 'facultad'));
      }
    });

    this.programaService.getAllProgramas().subscribe({
      next: (programas: {id: string, nombre: string}[]) => {
        this.opcionesProgramas.set(programas.map(p => ({ label: p.nombre, value: p.nombre })));
      },
      error: (err: unknown) => {
        console.error('Error cargando programas:', err);
        this.opcionesProgramas.set(this.buildOpts(this.data(), 'programa'));
      }
    });

    this.opcionesRoles.set(this.buildOpts(this.data(), 'cargo'));
    this.opcionesGeneros.set(this.buildOpts(this.data(), 'genero'));
    this.opcionesSemestres.set(this.buildOptsSemestres(this.data()));
  }

  recargar() {
    this.dt?.clear();
    this.busquedaRapida.set('');
    this.resetFiltros();
    this.cargar();
  }


  trackById = (_: number, u: UsuarioOracle) => u.identificacion ?? `${u.nombre}-${u.programa}`;

  aplicarBusquedaRapida(valor: string) {
    this.busquedaRapida.set(valor);
    this.dt?.filterGlobal(valor, 'contains');
  }

  aplicarFiltroTexto(campo: CampoTexto, valor: string | null | undefined) {
    const v = valor ?? '';
    this.filtros.update(f => ({ ...f, [campo]: v }));
    
    if (campo === 'rol' || campo === 'cargo') {
      this.dt?.filter(v, 'cargo', FilterMatchMode.CONTAINS);
      return;
    }
    
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
    this.resetFiltros();
  }

  private resetFiltros() {
    this.filtros.set({
      identificacion: '',
      nombre: '',
      facultad: '',
      programa: '',
      rol: '',
      cargo: '',
      genero: '',
      semestre: '',
    });
  }

  fmtGenero(g: string | null | undefined): string {
    const s = (g ?? '').toString().trim();
    if (!s) return '—';
    const up = s.toUpperCase();

    if (up === 'M' || up === 'MASCULINO') return 'Masculino';
    if (up === 'F' || up === 'FEMENINO')  return 'Femenino';
    if (up === 'O' || up === 'OTRO')      return 'Otro';

    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  onFilterSelect(event: { filter: string }, campo: CampoTexto) {
    this.aplicarFiltroTexto(campo, event.filter);
  }

  private buildOpts(arr: UsuarioOracle[], field: keyof UsuarioOracle) {
    const set = new Set<string>();
    for (const item of arr) {
      const v = `${item?.[field] ?? ''}`.trim();
      if (v) set.add(v);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ label: v, value: v }));
  }

  private buildOptsSemestres(arr: UsuarioOracle[]) {
    const valores = Array.from(new Set(arr
      .map(u => u.semestre)
      .filter(v => v !== undefined && v !== null && `${v}`.trim() !== '')
      .map(v => `${v}`.trim())
    ));
    const nums = valores.every(v => /^\d+$/.test(v));
    if (nums) valores.sort((a, b) => Number(a) - Number(b));
    else valores.sort((a, b) => a.localeCompare(b));
    return valores.map(v => ({ label: v, value: v }));
  }
}
