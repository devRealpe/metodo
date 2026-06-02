import { Component, OnInit, inject, HostListener, ElementRef, ViewChild, effect, untracked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConvenioService } from '../../../core/services/convenio.service';
import { Convenio } from '../../../core/models/convenio.model';
import { CoberturaService } from '../../../core/services/cobertura.service';
import { ProgramaService } from '../../../core/services/programas.service';
import { TipoConvenioIntercambioService } from '../../../core/services/tipo-convenio-intercambio.service';
import { Opcion } from '../../../core/models/opcion.model';
import { UbicacionGeografica } from '../../../core/models/ubicacion-geografica.model';
import { UbicacionesGeograficasService } from '../../../core/services/ubicaciones-geograficas.service';
import { DropdownItem } from '@microfrontends/shared-models';
import { DatepickerComponent } from '@microfrontends/shared-ui';
import { InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { firstValueFrom, catchError, of } from 'rxjs';
import { InternacionalizacionRealtimeService } from '../../../core/services/internacionalizacion-realtime.service';

@Component({
  selector: 'app-convenios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, BadgeModule, DialogModule, ConfirmDialogModule, ToastModule, DatepickerComponent, InfoTableComponent, InputComponent, SelectComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './convenios-list.component.html',
  styles: [`
    .rotate-180 {
      transform: rotate(180deg);
    }

    .dashboard-card {
      transition: all 0.3s ease;
    }

    .dashboard-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
  `]
})
export class ConveniosListComponent implements OnInit {
  private readonly convenioService = inject(ConvenioService);
  private readonly coberturaService = inject(CoberturaService);
  private readonly programaService = inject(ProgramaService);
  private readonly tipoConvenioIntercambioService = inject(TipoConvenioIntercambioService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly ubicacionesService = inject(UbicacionesGeograficasService);
  private readonly realtimeService = inject(InternacionalizacionRealtimeService);

  constructor() {
    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const convenio = this.realtimeService.convenioActualizado();
          if (convenio) {
            this.messageService.add({
              severity: 'info',
              summary: 'Convenio actualizado',
              detail: convenio.message || 'Se ha detectado un cambio en convenios',
              life: 4000
            });
            this.realtimeService.resetSignal('convenio');
          }
          this.cargarConvenios();
        });
      }
    });
  }

  // @ViewChild('filtrosContainer', { static: false }) filtrosContainer!: ElementRef;

  convenios: Convenio[] = [];
  // Vista enriquecida para la tabla con campos derivados
  conveniosFiltrados: (Convenio & { paisNombre?: string; tipoConvenioNombre?: string; convenioOpcionNombre?: string; estado?: string })[] = [];
  loading = false;
  loadingRenovacion = false;
  filtroCodigo = '';
  filtroCobertura = '';
  filtroFechaDesde: Date | null = null;
  filtroFechaHasta: Date | null = null;
  filtroEstado: string = ''; // Nuevo filtro para las tarjetas
  opcionesCobertura: any[] = []; // cargadas desde el servicio (cada elemento tiene label,value,codigo)
  // Normalizamos países como `DropdownItem` { id, nombre }
  paises: DropdownItem[] = [];
  // caché de nombres de programas
  programasMap: Record<string,string> = {}; // id -> nombre

  // Estadísticas
  estadisticas = {
    total: 0,
    vigentes: 0,
    porVencer: 0,
    vencidos: 0
  };

  visible = false;
  selectedConvenio: Convenio | null = null;
  readonly = false;
  mostrarFiltros = false;


  columns: TableColumn[] = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'tipoConvenioNombre', header: 'Tipo', sortable: true },
    { field: 'convenioOpcionNombre', header: 'Cobertura', sortable: true },
    { field: 'institucionDestino', header: 'Institución', sortable: true },
    { field: 'paisNombre', header: 'País', sortable: true },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true, type: 'custom' },
    { field: 'estadoDisplay', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
      getSeverity: (value: any) => value === 'VIGENTE' ? 'success' : value === 'POR VENCER' ? 'warn' : 'danger',
      getLabel: (value: any) => value
    }}
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-pencil', label: '', tooltip: 'Editar convenio', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.editarConvenio(row) },
    { icon: 'pi pi-eye', label: '', tooltip: 'Ver detalles', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.verDetalle(row) },
    { icon: 'pi pi-trash', label: '', tooltip: 'Eliminar convenio', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminar(row) }
  ];

  ngOnInit(): void {
    this.cargarConvenios();
    this.cargarPaises();
    this.cargarCoberturas();
    this.cargarProgramas();
  }

  cargarConvenios(): void {
    this.loading = true;
    this.convenioService.getAll().subscribe({
      next: (data) => {
        this.convenios = data;
        this.calcularEstadisticas();
        this.aplicarFiltros();
        
        
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }

  cargarPaises(): void {
    this.ubicacionesService.obtenerPaises().subscribe({
      next: (data: UbicacionGeografica[]) => {
        // Normalizar a DropdownItem {id,nombre}
        this.paises = data.map((p: UbicacionGeografica) => ({ id: p.id, nombre: p.nombre } as DropdownItem));
        // Aplicar filtros nuevamente ahora que los países están cargados
        this.aplicarFiltros();
      },
      error: (err: any) => {
      }
    });
  }

  cargarCoberturas(): void {
    this.coberturaService.getAll().subscribe({
      next: (data) => {
        this.opcionesCobertura = data.map(c => ({
          label: c.nombre,
          value: c.id,
          codigo: c.codigo
        }));
        this.aplicarFiltros();
      },
      error: () => {}
    });
  }

  private cargarProgramas(): void {
    this.programaService.getAll().subscribe({
      next: (data) => {
        data.forEach(p => { if (p.id) this.programasMap[p.id] = p.nombre; });
      },
      error: () => {
        // no crítico
      }
    });
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.convenios.length;
    this.estadisticas = this.convenios.reduce(
      (acc, convenio) => {
        const estado = convenio.estadoDisplay;
        if (estado === 'VIGENTE') acc.vigentes++;
        else if (estado === 'POR VENCER') acc.porVencer++;
        else if (estado === 'VENCIDO') acc.vencidos++;
        return acc;
      },
      { total: this.estadisticas.total, vigentes: 0, porVencer: 0, vencidos: 0 }
    );
  }

  async exportExcel(): Promise<void> {
    // asegura que los filtros más recientes (incluyendo el elegido por cards) se hayan aplicado
    this.aplicarFiltros();

    // cargar mapas auxiliares si aún no se han obtenido (departamentos, intercambios, facultades y programas)
    const [departamentos, intercambios, facultades, programas] = await Promise.all([
      firstValueFrom(this.ubicacionesService.obtenerDepartamentosColombia().pipe(catchError(() => of([])))),
      firstValueFrom(this.tipoConvenioIntercambioService.getAll().pipe(catchError(() => of([])))),
      firstValueFrom(this.programaService.getAllFacultades().pipe(catchError(() => of([])))),
      firstValueFrom(this.programaService.getAll().pipe(catchError(() => of([]))))
    ]);
    const deptMap: Record<string,string> = {};
    departamentos.forEach(d => { if (d.id) deptMap[d.id] = d.nombre; });

    const intercambioMap: Record<string,string> = {};
    intercambios.forEach(i => { if (i.id) intercambioMap[i.id] = i.titulo; });

    const facMap: Record<string,string> = {};
    facultades.forEach(f => { if (f.id) facMap[f.id] = f.nombre; });

    const progMap: Record<string,string> = {};
    programas.forEach(p => { if (p.id) progMap[p.id] = p.nombre; });

    // traducir cada convenio
    const prepared = await Promise.all(this.conveniosFiltrados.map(async (c: any) => {
      // traducir ciudad consultando por departamento si hace falta
      let ciudadNombre = c.ciudad || '';
      if (c.departamento && c.ciudad) {
        const cvs = await firstValueFrom(this.ubicacionesService.obtenerMunicipiosPorDepartamento(c.departamento).pipe(
          catchError(() => of([]))
        ));
        const foundCity = cvs.find((u: any) => u.id === c.ciudad);
        if (foundCity) ciudadNombre = foundCity.nombre;
      }
      // determine intercambio title (may already be object from backend)
      let intercambioTitle = '';
      if (c.tipoConvenioIntercambio) {
        if (typeof c.tipoConvenioIntercambio === 'object') {
          intercambioTitle = c.tipoConvenioIntercambio.titulo || '';
        } else {
          intercambioTitle = intercambioMap[c.tipoConvenioIntercambio] || c.tipoConvenioIntercambio;
        }
      }
      // resolve facultad/programa names too
      const facName = c.facultad ? (facMap[c.facultad] || c.facultad) : '';
      const progName = c.programa ? (progMap[c.programa] || c.programa) : '';
      // determine sector title (could arrive as object from backend)
      let sectorTitle = '';
      if (c.sector) {
        if (typeof c.sector === 'object') {
          sectorTitle = c.sector.nombre || '';
        } else {
          sectorTitle = c.sector;
        }
      }
      return {
        ...c,
        pais: this.getPaisNombre(c.pais),
        convenioOpcion: this.getConvenioOpcionNombre(c.convenioOpcion),
        tipoConvenio: c.tipoConvenio ? { titulo: this.getTipoConvenioNombre(c) } : null,
        tipoConvenioIntercambio: intercambioTitle ? { titulo: intercambioTitle } : null,
        sector: sectorTitle ? { nombre: sectorTitle } : null,
        departamento: deptMap[c.departamento] || c.departamento,
        ciudad: ciudadNombre,
        programas: (c.programas || []).map((id: string) => this.programasMap[id] || id),
        facultad: facName || null,
        programa: progName || null,
        fechasProgramadas: c.fechasProgramadas || []
      };
    }));
    // attach fechasProgramadas (historial) to each convenio before exporting
    const preparedWithDates = await Promise.all(prepared.map(async (c: any) => {
      if (c.id) {
        const hist = await firstValueFrom(
          this.convenioService.getHistorial(c.id).pipe(catchError(() => of([])))
        );
        return { ...c, fechasProgramadas: hist };
      }
      return c;
    }));
    console.debug('export payload', preparedWithDates);

    this.convenioService.exportExcel(preparedWithDates).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'convenios.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el Excel' });
      }
    });
  }

  /**
   * Comprueba si el convenio pasado cumple los filtros activos en la UI.
   * Esto permite reutilizar la misma lógica en la tabla y en la exportación.
   */
  private matchesFilters(convenio: Convenio): boolean {
    return this.coincideTexto(convenio.codigo, this.filtroCodigo) &&
           this.coincideCobertura(convenio.convenioOpcion, this.filtroCobertura) &&
           this.coincideFecha(convenio) &&
           this.coincideEstado(convenio);
  }

  aplicarFiltros(): void {
    this.conveniosFiltrados = this.convenios
      .filter(c => this.matchesFilters(c))
      .map(convenio => ({
        ...convenio,
        estadoDisplay: convenio.estadoDisplay,
        paisNombre: this.getPaisNombre(convenio.pais),
        tipoConvenioNombre: this.getTipoConvenioNombre(convenio),
        convenioOpcionNombre: this.getConvenioOpcionNombre(convenio.convenioOpcion)
      }));
  }

  private coincideTexto(texto: string, filtro: string): boolean {
    return !filtro || texto.toLowerCase().includes(filtro.toLowerCase());
  }

  private coincideValor(valor: string, filtro: string): boolean {
    // generic strict equality (not currently used for cobertura)
    return !filtro || valor === filtro;
  }

  private coincideCobertura(valor: string, filtro: string): boolean {
    if (!filtro) return true;
    // direct match (handles case where convenio.convenioOpcion already stores id)
    if (valor === filtro) return true;
    // try to convert valor (may be codigo or id) to the option record
    const opt = this.opcionesCobertura.find(o => o.value === valor || o.codigo === valor);
    if (opt) {
      return opt.value === filtro;
    }
    return false;
  }

  private coincideFecha(convenio: Convenio): boolean {
    if (!this.filtroFechaDesde && !this.filtroFechaHasta) return true;

    const fechaConvenio = new Date(convenio.fechaInicio).getTime();
    const fechaDesde = this.filtroFechaDesde ? new Date(this.filtroFechaDesde).setHours(0, 0, 0, 0) : null;
    const fechaHasta = this.filtroFechaHasta ? new Date(this.filtroFechaHasta).setHours(23, 59, 59, 999) : null;

    return (!fechaDesde || fechaConvenio >= fechaDesde) && (!fechaHasta || fechaConvenio <= fechaHasta);
  }

  private coincideEstado(convenio: Convenio): boolean {
    if (!this.filtroEstado || this.filtroEstado === 'total') return true;
    const estado = convenio.estadoDisplay;
    return estado === this.filtroEstado.toUpperCase().replace('VIGENTES', 'VIGENTE').replace('PORVENCER', 'POR VENCER').replace('VENCIDOS', 'VENCIDO');
  }


  filtrarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  editarConvenio(convenio: Convenio): void {
    this.router.navigate(['/app/convenio'], { queryParams: { id: convenio.id } });
  }

  volverAlFormulario(): void {
    this.router.navigate(['/app/convenio']);
  }

  verDetalle(convenio: Convenio): void {
    this.router.navigate(['/app/convenio'], { queryParams: { id: convenio.id, readonly: true } });
  }

  confirmarEliminar(convenio: Convenio): void {
    this.confirmationService.confirm({
      message: `¿Eliminar "${convenio.codigo}"?`,
      header: 'Confirmar eliminación',
      accept: () => this.eliminarConvenio(convenio.id)
    });
  }

  async eliminarConvenio(id: string): Promise<void> {
    try {
      await this.convenioService.delete(id).toPromise();
      this.cargarConvenios();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Convenio eliminado' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar convenio' });
    }
  }

  getPaisNombre(paisId: string): string {
    if (!paisId) return '';
    const found = this.paises.find(p => ((p.id ?? (p as any).value) ?? '').toString() === paisId.toString());
    return found ? ((found.nombre ?? (found as any).label) ?? '') : '';
  }

  getTipoConvenioNombre(convenio: Convenio): string {
    if (convenio.tipoConvenio?.titulo) {
      return convenio.tipoConvenio.titulo;
    }
    if (convenio.tipoConvenioIntercambio?.titulo) {
      return convenio.tipoConvenioIntercambio.titulo;
    }
    return '';
  }

  getConvenioOpcionNombre(convenioOpcion: string): string {
    if (!convenioOpcion) return '';

    const found = this.opcionesCobertura.find((op: any) => {
      // options now have value property instead of id
      const idMatch = ((op.value ?? '') ?? '') === convenioOpcion;
      const codeMatch = op.codigo != null && op.codigo === convenioOpcion;
      return idMatch || codeMatch;
    });
    if (found) return (found.label ?? convenioOpcion);

    return convenioOpcion;
  }


  renderFechaInicio(convenio: Convenio): string {
    return convenio.fechaInicio ? new Date(convenio.fechaInicio).toLocaleDateString('es-ES') : '';
  }

  getFechaFinTooltip(convenio: Convenio): string {
    return convenio.fechaFin ? `Fecha Fin: ${new Date(convenio.fechaFin).toLocaleDateString('es-ES')}` : 'Fecha Fin: No definida';
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/app']);
    }
  }
}