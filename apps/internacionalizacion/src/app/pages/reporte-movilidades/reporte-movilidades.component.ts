import { Component, OnInit, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChartModule } from 'primeng/chart';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Servicios
import { MovilidadService } from '../../core/services/movilidad.service';
import { EstudianteService } from '../../core/services/estudiante.service';
import { ProgramaService } from '../../core/services/programas.service';
import { ConvenioService } from '../../core/services/convenio.service';
import { ApoyoEconomicoService } from '../../core/services/apoyo-economico.service';
import { AutorizacionService } from '../../core/services/autorizacion.service';
import { TipoMovilidadService } from '../../core/services/tipo-movilidad.service';
import { ModalidadService } from '../../core/services/modalidad.service';
import { MovilidadProcesoService } from '../../core/services/movilidad-proceso.service';
import { InternacionalizacionRealtimeService } from '../../core/services/internacionalizacion-realtime.service';

// Modelos
import { Movilidad } from '../../core/models/movilidad.model';
import { Estudiante } from '../../core/models/estudiante.model';
import { Convenio } from '../../core/models/convenio.model';
import { TipoMovilidad } from '../../core/models/tipo-movilidad.model';
import { Modalidad } from '../../core/models/modalidad.model';
import { Autorizacion, AprobacionNivel } from '../../core/models/autorizacion.model';
import { MovilidadProceso } from '../../core/models/movilidad-proceso.model';
import { ApoyoEconomico } from '../../core/models/apoyo-economico.model';

// Librerías de exportación
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

// Constantes
import { MOVILIDADESTADO, COBERTURA } from '../../core/constants/movilidad-constants';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';

interface Programa {
  id: string;
  nombre: string;
  idFacultad: string;
}

interface MovilidadCompleta {
  movilidad: Movilidad;
  estudiantes: Estudiante[];
  programa?: Programa;
  convenio?: Convenio;
  apoyosEconomicos: any[];
}

@Component({
  selector: 'app-reporte-movilidades',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ProgressSpinnerModule,
    InputComponent,
    SelectComponent,
    MultiSelectModule,
    ChartModule,
    TabsModule,
    AccordionModule,
    FieldsetModule,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: './reporte-movilidades.component.html',
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

    .metric-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .metric-card:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2);
    }

    .chart-container {
      position: relative;
      height: 250px;
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 200px;
      }
    }
  `]
})
export class ReporteMovilidadesComponent implements OnInit {
  private readonly movilidadService = inject(MovilidadService);
  private readonly estudianteService = inject(EstudianteService);
  private readonly programaService = inject(ProgramaService);
  private readonly convenioService = inject(ConvenioService);
  private readonly apoyoService = inject(ApoyoEconomicoService);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly tipoMovilidadService = inject(TipoMovilidadService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly realtimeService = inject(InternacionalizacionRealtimeService);

  // Señales para estado reactivo
  movilidadesCompletas = signal<MovilidadCompleta[]>([]);
  movilidadesFiltradas = signal<MovilidadCompleta[]>([]);
  cargando = signal(false);

  // Control de UI
  mostrarFiltros = false;

  // Nuevos datos para reportes avanzados
  autorizaciones = signal<AprobacionNivel[]>([]);
  procesosMovilidad = signal<MovilidadProceso[]>([]);
  apoyosEconomicos = signal<ApoyoEconomico[]>([]);

  // Datos maestros
  conveniosCompletos = signal<Convenio[]>([]);

  // Estadísticas
  estadisticas = signal({
    total: 0,
    activas: 0,
    inactivas: 0,
    nacional: 0,
    internacional: 0,
    estudiantil: 0,
    profesoral: 0,
    // Nuevas métricas para dashboard
    paisesDistintos: 0,
    programasDistintos: 0,
    conveniosActivos: 0,
    apoyosTotales: 0,
    presupuestoTotal: 0,
    estudiantesTotales: 0,
    tasaEjecucion: 0,
    // Estadísticas de autorizaciones
    autorizacionesPendientes: 0,
    autorizacionesAprobadas: 0,
    autorizacionesRechazadas: 0,
    tiempoPromedioAprobacion: 0,
    // Estadísticas presupuestarias
    presupuestoEjecutado: 0,
    presupuestoDisponible: 0,
    tiposApoyoMasUsados: [] as any[]
  });

  // Formulario de filtros
  filtroForm: FormGroup;

  // Opciones para filtros
  opcionesModalidad: Modalidad[] = [];
  readonly opcionesEstado = MOVILIDADESTADO;
  opcionesTipo: TipoMovilidad[] = [];
  readonly opcionesCobertura = COBERTURA;

  paises: { label: string; value: string }[] = [];
  programas: { label: string; value: string }[] = [];
  convenios: { label: string; value: string }[] = [];

  // Propiedades para gráficos
  chartOptions: any;
  chartDataCobertura: any;
  chartDataTipo: any;
  chartDataEstado: any;
  chartDataAutorizaciones: any;
  chartDataPresupuesto: any;
  chartDataGeografico: any;
  chartDataTiempo: any;

  constructor() {
    this.filtroForm = this.fb.group({
      texto: [''],
      modalidad: [null],
      tipo: [null],
      estado: [''],
      cobertura: [''],
      pais: [''],
      programa: [''],
      convenio: ['']
    });

    this.filtroForm.valueChanges.subscribe(() => this.aplicarFiltros());
    this.inicializarGraficos();

    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          this.messageService.add({
            severity: 'info',
            summary: 'Datos actualizados',
            detail: 'Se han detectado cambios, actualizando reportes...',
            life: 4000
          });
          this.realtimeService.resetAll();
          this.cargarDatos();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando.set(true);

      // Cargar datos maestros en paralelo
      const [movilidades, programas, convenios, autorizaciones, tiposMovilidad, modalidades] = await forkJoin([
        this.movilidadService.getAll().pipe(catchError(() => of([]))),
        this.programaService.getAll().pipe(catchError(() => of([]))),
        this.convenioService.getAll().pipe(catchError(() => of([]))),
        this.autorizacionService.getAprobaciones().pipe(catchError(() => of([]))),
        this.tipoMovilidadService.getAllActive().pipe(catchError(() => of([]))),
        this.modalidadService.getAll().pipe(catchError(() => of([])))
      ]).toPromise() || [[], [], [], [], [], []];

      // Cargar opciones para filtros
      this.opcionesTipo = tiposMovilidad || [];
      this.opcionesModalidad = modalidades || [];

      // Cargar datos adicionales
      this.autorizaciones.set(autorizaciones || []);
      this.procesosMovilidad.set([]);

      // Almacenar convenios completos para exportación
      this.conveniosCompletos.set(convenios || []);

      // Procesar cada movilidad para obtener datos completos
      const movilidadesCompletasPromises = movilidades.map(async (movilidad: Movilidad) => {
        // Obtener estudiantes para esta movilidad
        const estudiantes = await this.estudianteService.getByMovilidad(movilidad.id!)
          .pipe(catchError(() => of([])))
          .toPromise() || [];

        // Obtener apoyos económicos para esta movilidad
        const apoyos = await this.apoyoService.getByMovilidadId(movilidad.id!)
          .pipe(catchError(() => of([])))
          .toPromise() || [];

        // Buscar programa por nombre (ya que en movilidad.programa está el nombre)
        const programa = programas?.find((p: any) => p.nombre === movilidad.programa);

        // Buscar convenio por código
        const convenio = convenios?.find((c: any) => c.codigo === movilidad.codigoConvenio);

        return {
          movilidad,
          estudiantes,
          programa,
          convenio,
          apoyosEconomicos: apoyos
        } as MovilidadCompleta;
      });

      const movilidadesCompletas = await Promise.all(movilidadesCompletasPromises);

      this.movilidadesCompletas.set(movilidadesCompletas);
      this.movilidadesFiltradas.set(movilidadesCompletas);

      this.calcularEstadisticas();
      this.calcularEstadisticasAutorizaciones();
      this.calcularEstadisticasPresupuesto();
      this.cargarOpcionesFiltros();

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los datos del reporte'
      });
    } finally {
      this.cargando.set(false);
    }
  }

  calcularEstadisticas(): void {
    const movilidades = this.movilidadesCompletas();
    const convenios = this.conveniosCompletos();

    // Estadísticas básicas
    const stats = {
      total: movilidades.length,
      activas: movilidades.filter(m => m.movilidad.estado === 'ACTIVO').length,
      inactivas: movilidades.filter(m => m.movilidad.estado === 'INACTIVO').length,
      nacional: movilidades.filter(m => m.movilidad.cobertura?.nombre === 'Nacional').length,
      internacional: movilidades.filter(m => m.movilidad.cobertura?.nombre === 'Internacional').length,
      estudiantil: movilidades.filter(m => m.movilidad.modalidad?.nombre === 'Estudiantil').length,
      profesoral: movilidades.filter(m => m.movilidad.modalidad?.nombre === 'Profesoral').length,

      // Nuevas métricas
      paisesDistintos: [...new Set(movilidades.map(m => m.movilidad.pais).filter(Boolean))].length,
      programasDistintos: [...new Set(movilidades.map(m => m.programa?.id).filter(Boolean))].length,
      conveniosActivos: convenios.filter(c => c.estado === 'ACTIVO').length,
      apoyosTotales: movilidades.reduce((total, m) => total + m.apoyosEconomicos.length, 0),
      estudiantesTotales: movilidades.reduce((total, m) => total + m.estudiantes.length, 0),
      presupuestoTotal: movilidades.reduce((total, m) =>
        total + m.apoyosEconomicos.reduce((sum, a: any) => sum + (a.montoAsignado || 0), 0), 0),
      tasaEjecucion: movilidades.length > 0 ?
        Math.round((movilidades.filter(m => m.movilidad.estado === 'ACTIVO').length / movilidades.length) * 100) : 0,
      // Estadísticas de autorizaciones (inicializadas en 0)
      autorizacionesPendientes: 0,
      autorizacionesAprobadas: 0,
      autorizacionesRechazadas: 0,
      tiempoPromedioAprobacion: 0,
      // Estadísticas presupuestarias (inicializadas en 0)
      presupuestoEjecutado: 0,
      presupuestoDisponible: 0,
      tiposApoyoMasUsados: []
    };

    this.estadisticas.set(stats);
    this.actualizarGraficos();
  }

  calcularEstadisticasAutorizaciones(): void {
    const autorizaciones = this.autorizaciones();
    const stats = this.estadisticas();

    stats.autorizacionesPendientes = autorizaciones.filter(a => a.estado === 'pendiente').length;
    stats.autorizacionesAprobadas = autorizaciones.filter(a => a.estado === 'aprobado').length;
    stats.autorizacionesRechazadas = autorizaciones.filter(a => a.estado === 'rechazado').length;

    // Calcular tiempo promedio de aprobación (simplificado)
    const aprobadas = autorizaciones.filter(a => a.estado === 'aprobado' && a.fechaCreacion && a.fechaActualizacion);
    if (aprobadas.length > 0) {
      const tiempos = aprobadas.map(a => {
        const inicio = new Date(a.fechaCreacion!).getTime();
        const fin = new Date(a.fechaActualizacion!).getTime();
        return (fin - inicio) / (1000 * 60 * 60 * 24); // días
      });
      stats.tiempoPromedioAprobacion = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
    }

    this.estadisticas.set(stats);
  }

  calcularEstadisticasPresupuesto(): void {
    const movilidades = this.movilidadesCompletas();
    const stats = this.estadisticas();

    // Calcular presupuesto ejecutado vs disponible
    const apoyos = movilidades.flatMap(m => m.apoyosEconomicos);
    stats.presupuestoEjecutado = apoyos.reduce((total, a: any) => total + (a.montoAsignado || 0), 0);
    stats.presupuestoDisponible = apoyos.reduce((total, a: any) => total + (a.montoDisponible || 0), 0);

    // Tipos de apoyo más usados
    const tiposCount: { [key: string]: number } = {};
    apoyos.forEach((a: any) => {
      const tipo = a.tipoApoyoEconomico?.nombre || 'Sin tipo';
      tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });

    stats.tiposApoyoMasUsados = Object.entries(tiposCount)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    this.estadisticas.set(stats);
  }

  cargarOpcionesFiltros(): void {
    const movilidades = this.movilidadesCompletas();

    // Extraer países únicos
    const paisesUnicos = [...new Set(movilidades.map(m => m.movilidad.pais).filter(Boolean))];
    this.paises = paisesUnicos.map(pais => ({ label: pais, value: pais }));

    // Extraer programas únicos
    const programasUnicos = [...new Set(movilidades.map(m => m.programa?.nombre).filter(Boolean))];
    this.programas = programasUnicos.map(nombre => ({ label: nombre!, value: nombre! }));

    // Extraer convenios únicos
    const conveniosUnicos = [...new Set(movilidades.map(m => m.convenio?.codigo).filter(Boolean))];
    this.convenios = conveniosUnicos.map(codigo => ({ label: codigo!, value: codigo! }));
  }

  aplicarFiltros(): void {
    const filtros = this.filtroForm.value;
    let filtradas = [...this.movilidadesCompletas()];

    if (filtros.texto) {
      const texto = filtros.texto.toLowerCase();
      filtradas = filtradas.filter(m =>
        m.movilidad.nombreMovilidad?.toLowerCase().includes(texto) ||
        m.estudiantes.some(e => e.nombre?.toLowerCase().includes(texto)) ||
        m.programa?.nombre?.toLowerCase().includes(texto) ||
        m.convenio?.objeto?.toLowerCase().includes(texto)
      );
    }

    if (filtros.modalidad) {
      const modalidadId = typeof filtros.modalidad === 'string' ? filtros.modalidad : filtros.modalidad.id;
      filtradas = filtradas.filter(m => m.movilidad.modalidad?.id === modalidadId);
    }

    if (filtros.tipo) {
      const tipoNombre = typeof filtros.tipo === 'string' ? filtros.tipo : filtros.tipo.nombre;
      filtradas = filtradas.filter(m => m.movilidad.tipoMovilidad === tipoNombre);
    }

    if (filtros.estado) {
      filtradas = filtradas.filter(m => m.movilidad.estado === filtros.estado);
    }

    if (filtros.cobertura) {
      filtradas = filtradas.filter(m => m.movilidad.cobertura === filtros.cobertura);
    }

    if (filtros.pais) {
      filtradas = filtradas.filter(m => m.movilidad.pais === filtros.pais);
    }

    if (filtros.programa) {
      filtradas = filtradas.filter(m => m.programa?.nombre === filtros.programa);
    }

    if (filtros.convenio) {
      filtradas = filtradas.filter(m => m.convenio?.codigo === filtros.convenio);
    }

    this.movilidadesFiltradas.set(filtradas);
  }

  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.movilidadesFiltradas.set(this.movilidadesCompletas());
  }

  exportarCSV(): void {
    const datos = this.prepararDatosExportacion();
    const csvContent = this.convertirACSV(datos);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-movilidades-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportarExcel(): void {
    const total = this.movilidadesCompletas().length;
    const filtradas = this.movilidadesFiltradas().length;

    if (filtradas === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin Datos', detail: 'No hay movilidades para exportar' });
      return;
    }

    // si no hay filtros (se están mostrando todas), podemos aprovechar el backend
    if (filtradas === total) {
      this.cargando.set(true);
      this.movilidadService.generateExcelAll().subscribe(
        blob => {
          const fileName = `reporte-movilidades-${new Date().toISOString().split('T')[0]}.xlsx`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);
          this.cargando.set(false);
        },
        () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar el Excel desde el servidor' });
        }
      );
    } else {
      // hay filtros aplicados, construir localmente para respetarlos
      const datos = this.prepararDatosExportacion();
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movilidades');
      XLSX.writeFile(wb, `reporte-movilidades-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  }

  exportarPDF(): void {
    // descargar cada PDF desde backend y empaquetar en ZIP
    const filas = this.movilidadesFiltradas();
    if (filas.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin Datos', detail: 'No hay movilidades para exportar' });
      return;
    }

    this.cargando.set(true);
    const requests = filas.map(m =>
      this.movilidadService.generatePdf(m.movilidad.id!).pipe(
        map(blob => ({ nombre: m.movilidad.nombreMovilidad || m.movilidad.id!, blob })),
        catchError(err => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: `No se pudo generar PDF para ${m.movilidad.nombreMovilidad}` });
          return of(null as any);
        })
      )
    );

    forkJoin(requests).subscribe(results => {
      const zip = new JSZip();
      results.forEach(r => {
        if (r) {
          const safeName = r.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          zip.file(`${safeName}.pdf`, r.blob);
        }
      });
      zip.generateAsync({ type: 'blob' }).then(z => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(z);
        link.download = `movilidades-pdfs-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
        this.cargando.set(false);
      });
    }, () => {
      this.cargando.set(false);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar los PDFs' });
    });
  }

  exportarConveniosExcel(): void {
    const convenios = this.conveniosCompletos();

    if (convenios.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Datos',
        detail: 'No hay convenios para exportar'
      });
      return;
    }

    // Preparar datos para exportación
    const datosConvenios = convenios.map(convenio => ({
      'Código': convenio.codigo || '',
      'Objeto': convenio.objeto || '',
      'Tipo Convenio': convenio.tipoConvenio || '',
      'Institución Destino': convenio.institucionDestino || '',
      'País': convenio.pais || '',
      'Departamento': convenio.departamento || '',
      'Ciudad': convenio.ciudad || '',
      'Fecha Fin': convenio.fechaFin ? new Date(convenio.fechaFin).toLocaleDateString() : '',
      'Estado': convenio.estado || '',
      'Clasificación': convenio.clasificacion || '',
      'Facultad': convenio.facultad || '',
      'Programa': convenio.programa || '',
      'Alcance': convenio.alcance || '',
      'Sector': convenio.sector || '',
      'Tipo Duración': convenio.tipoDuracion || '',
      'Responsable': convenio.responsable || '',
      'Contacto Convenio': convenio.contactoConvenio || '',
      'Observaciones': convenio.observaciones || '',
      'Vigente': convenio.vigente ? 'Sí' : 'No',
      'Prórroga': convenio.prorroga ? 'Sí' : 'No',
      'Descripción Prórroga': convenio.prorrogaDescripcion || ''
    }));

    // Crear hoja de Excel
    const ws = XLSX.utils.json_to_sheet(datosConvenios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Convenios');

    // Configurar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Código
      { wch: 50 }, // Objeto
      { wch: 20 }, // Tipo Convenio
      { wch: 30 }, // Institución Destino
      { wch: 15 }, // País
      { wch: 15 }, // Departamento
      { wch: 15 }, // Ciudad
      { wch: 12 }, // Fecha Inicio
      { wch: 12 }, // Fecha Fin
      { wch: 10 }, // Estado
      { wch: 15 }, // Clasificación
      { wch: 20 }, // Facultad
      { wch: 20 }, // Programa
      { wch: 15 }, // Alcance
      { wch: 15 }, // Sector
      { wch: 10 }, // Duración
      { wch: 15 }, // Tipo Duración
      { wch: 25 }, // Responsable
      { wch: 25 }, // Contacto Convenio
      { wch: 50 }, // Observaciones
      { wch: 8 },  // Vigente
      { wch: 8 },  // Prórroga
      { wch: 25 }  // Descripción Prórroga
    ];
    ws['!cols'] = colWidths;

    // Descargar archivo
    XLSX.writeFile(wb, `convenios-completos-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private prepararDatosExportacion(): any[] {
    return this.movilidadesFiltradas().map(m => ({
      nombreMovilidad: m.movilidad.nombreMovilidad,
      estudiantes: m.estudiantes.map(e => e.nombre).join('; '),
      documentosEstudiantes: m.estudiantes.map(e => e.idEstudiante).join('; '),
      nombrePrograma: m.programa?.nombre,
      facultad: m.programa?.idFacultad,
      codigoConvenio: m.convenio?.codigo,
      objetoConvenio: m.convenio?.objeto,
      institucionDestino: m.convenio?.institucionDestino,
      pais: m.movilidad.pais,
      departamento: m.movilidad.departamento,
      ciudad: m.movilidad.ciudad,
      tipoMovilidad: m.movilidad.tipoMovilidad,
      modalidad: m.movilidad.modalidad,
      cobertura: m.movilidad.cobertura,
      fechaInicio: m.movilidad.fechaInicio,
      fechaFin: m.movilidad.fechaFin,
      estado: m.movilidad.estado,
      apoyosCount: m.apoyosEconomicos.length,
      tiposApoyo: m.apoyosEconomicos.map((a: any) => a.tipoApoyoEconomico?.nombre).filter(Boolean).join('; '),
      presupuestosDisponibles: m.apoyosEconomicos.filter((a: any) => a.presupuestoDisponible).length,
      centrosCostos: m.apoyosEconomicos.map((a: any) => a.centroCostos).filter(Boolean).join('; ')
    }));
  }

  private convertirACSV(datos: any[]): string {
    if (datos.length === 0) return '';

    const headers = Object.keys(datos[0]);
    const csvRows = [
      headers.join(','),
      ...datos.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene coma o comillas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  contarApoyosConPresupuesto(apoyos: any[]): number {
    return apoyos.filter((a: any) => a.presupuestoDisponible).length;
  }

  obtenerSeveridadEstado(estado: string): 'success' | 'danger' | 'secondary' {
    return estado === 'ACTIVO' ? 'success' : estado === 'INACTIVO' ? 'danger' : 'secondary';
  }

  obtenerSeveridadCobertura(cobertura: string): 'info' | 'success' {
    return cobertura === 'Nacional' ? 'info' : 'success';
  }

  inicializarGraficos(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      }
    };
  }

  actualizarGraficos(): void {
    const movilidades = this.movilidadesCompletas();

    // Gráfico de cobertura
    this.chartDataCobertura = {
      labels: ['Nacional', 'Internacional'],
      datasets: [{
        data: [
          movilidades.filter(m => m.movilidad.cobertura?.nombre === 'Nacional').length,
          movilidades.filter(m => m.movilidad.cobertura?.nombre === 'Internacional').length
        ],
        backgroundColor: ['#fbbf24', '#8b5cf6'],
        hoverBackgroundColor: ['#f59e0b', '#7c3aed']
      }]
    };

    // Gráfico de tipo de movilidad
    this.chartDataTipo = {
      labels: ['Estudiantil', 'Profesoral'],
      datasets: [{
        data: [
          movilidades.filter(m => m.movilidad.modalidad?.nombre === 'Estudiantil').length,
          movilidades.filter(m => m.movilidad.modalidad?.nombre === 'Profesoral').length
        ],
        backgroundColor: ['#10b981', '#6366f1'],
        hoverBackgroundColor: ['#059669', '#4f46e5']
      }]
    };

    // Gráfico de estado
    this.chartDataEstado = {
      labels: ['Activas', 'Inactivas'],
      datasets: [{
        data: [
          movilidades.filter(m => m.movilidad.estado === 'ACTIVO').length,
          movilidades.filter(m => m.movilidad.estado === 'INACTIVO').length
        ],
        backgroundColor: ['#22c55e', '#ef4444'],
        hoverBackgroundColor: ['#16a34a', '#dc2626']
      }]
    };

    // Gráfico de autorizaciones
    this.chartDataAutorizaciones = {
      labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
      datasets: [{
        data: [
          this.estadisticas().autorizacionesPendientes,
          this.estadisticas().autorizacionesAprobadas,
          this.estadisticas().autorizacionesRechazadas
        ],
        backgroundColor: ['#fbbf24', '#22c55e', '#ef4444'],
        hoverBackgroundColor: ['#f59e0b', '#16a34a', '#dc2626']
      }]
    };

    // Gráfico de presupuesto
    this.chartDataPresupuesto = {
      labels: this.estadisticas().tiposApoyoMasUsados.map((t: any) => t.tipo),
      datasets: [{
        label: 'Uso por Tipo',
        data: this.estadisticas().tiposApoyoMasUsados.map((t: any) => t.count),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        hoverBackgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed']
      }]
    };

    // Gráfico geográfico (top países)
    const paisesCount: { [key: string]: number } = {};
    movilidades.forEach(m => {
      const pais = m.movilidad.pais || 'Sin país';
      paisesCount[pais] = (paisesCount[pais] || 0) + 1;
    });

    const topPaises = Object.entries(paisesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    this.chartDataGeografico = {
      labels: topPaises.map(([pais]) => pais),
      datasets: [{
        label: 'Movilidades',
        data: topPaises.map(([,count]) => count),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'],
        hoverBackgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#65a30d', '#ea580c']
      }]
    };

    // Gráfico de evolución temporal (últimos 12 meses)
    const monthlyData = this.generarDatosMensuales(movilidades);
    this.chartDataTiempo = {
      labels: monthlyData.labels,
      datasets: [{
        label: 'Movilidades Creadas',
        data: monthlyData.data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  private generarDatosMensuales(movilidades: MovilidadCompleta[]): { labels: string[], data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];

    // Generar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = movilidades.filter(m => {
        const fechaMov = new Date(m.movilidad.fechaInicio);
        return fechaMov >= monthStart && fechaMov <= monthEnd;
      }).length;

      labels.push(monthName);
      data.push(count);
    }

    return { labels, data };
  }

  // Getters computados para el template
  get movilidadesFiltradasActivas(): number {
    return this.movilidadesFiltradas().filter(m => m.movilidad.estado === 'ACTIVO').length;
  }

  get totalEstudiantesFiltrados(): number {
    return this.movilidadesFiltradas().reduce((total, m) => total + m.estudiantes.length, 0);
  }

  get totalApoyosFiltrados(): number {
    return this.movilidadesFiltradas().reduce((total, m) => total + m.apoyosEconomicos.length, 0);
  }

  // Métodos para cálculos en template
  calcularTasaAprobacion(): number {
    const stats = this.estadisticas();
    const total = stats.autorizacionesAprobadas + stats.autorizacionesRechazadas;
    return total > 0 ? Math.round((stats.autorizacionesAprobadas / total) * 100) : 0;
  }

  calcularEjecucionPresupuestaria(): number {
    const stats = this.estadisticas();
    const total = stats.presupuestoEjecutado + stats.presupuestoDisponible;
    return total > 0 ? Math.round((stats.presupuestoEjecutado / total) * 100) : 0;
  }
}