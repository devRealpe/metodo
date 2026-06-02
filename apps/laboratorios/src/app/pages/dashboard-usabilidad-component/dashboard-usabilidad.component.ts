import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, OnInit, Input, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';

import {
  UsosLaboratorioQueryService,
  DashboardFila,
  DashboardUsabilidadResponse,
} from '../../core/services/usos-laboratorio-query.service';

type RangoFechas = [Date | null, Date | null];

@Component({
  selector: 'app-dashboard-uso-labs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PanelModule,
    CardModule,
    ChartModule,
    ButtonModule,
    TagModule,
    MessageModule,
    TableModule,
    ToastModule,
    DatePickerModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-usabilidad.component.html',
})
export class DashboardUsabilidad implements OnInit {
  private consultas = inject(UsosLaboratorioQueryService);
  private toast = inject(MessageService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  @Input() dataIn: any[] | null | undefined;

  rangoFechas: RangoFechas = [
    atStartOfDay(new Date(new Date().getFullYear(), 0, 1)),
    atStartOfDay(new Date()),
  ];

  fechaInicioDate: Date | null = atStartOfDay(new Date(new Date().getFullYear(), 0, 1));
  fechaFinDate: Date | null = atStartOfDay(new Date());

  fechaInicio: string = formatearFechaYMD(atStartOfDay(new Date(new Date().getFullYear(), 0, 1)));
  fechaFin: string = formatearFechaYMD(atStartOfDay(new Date()));

  hoy: Date = atStartOfDay(new Date());
  fechaMaxima: string = formatearFechaYMD(atStartOfDay(new Date()));

  cargando = false;
  private _totalRegistros = 0;

  kpiTotalUsos = 0;
  kpiTotalAsistencias = 0;
  kpiTotalHoras = 0;
  kpiTotalMinutos = 0;
  kpiPromedioHoras = 0;
  kpiPromedioMin = 0;
  kpiLaboratoriosUnicos = 0;
  kpiPromedioAsistentesPorClase = 0;
  kpiPersonasUnicas = 0;

  filasLaboratorio: DashboardFila[] = [];
  filasPrograma: DashboardFila[] = [];
  filasFacultad: DashboardFila[] = [];
  filasSemestre: DashboardFila[] = [];
  filasGenero: DashboardFila[] = [];
  filasMateria: DashboardFila[] = [];
  filasDiaSemana: DashboardFila[] = [];
  filasMotivo: DashboardFila[] = [];
  datosTendencia: { fecha: string; clases: number; asistencias: number }[] = [];

  graficoLaboratorio: any;
  graficoPrograma: any;
  graficoFacultad: any;
  graficoSemestre: any;
  graficoGenero: any;
  graficoMateria: any;
  graficoDiaSemana: any;
  graficoMotivo: any;
  graficoTendencia: any;
  mostrarGraficas = true;

  private colorTexto = '#495057';
  private colorTextoSuave = '#6c757d';
  private colorGrid = '#e9ecef';
  private paleta: string[] = [];

  get hayDatos(): boolean {
    return this._totalRegistros > 0;
  }
  get sinDatos(): boolean {
    return this._totalRegistros === 0;
  }
  get totalRegistros(): number {
    return this._totalRegistros;
  }

  ngOnInit(): void {
    this.leerVariablesDeTema();
    this.aplicarFiltros();
  }

  onFechaInicioChange(val: any) {
    const newDate = val instanceof Date ? atStartOfDay(val) : atStartOfDay(new Date(val));
    this.fechaInicioDate = new Date(newDate.getTime());
    this.fechaInicio = formatearFechaYMD(this.fechaInicioDate);

    if (this.fechaFinDate && this.fechaInicioDate > this.fechaFinDate) {
      this.fechaFinDate = new Date(this.fechaInicioDate.getTime());
      this.fechaFin = formatearFechaYMD(this.fechaFinDate);
    }
    this.aplicarFiltros();
  }

  onFechaFinChange(val: any) {
    const newDate = val instanceof Date ? atStartOfDay(val) : atStartOfDay(new Date(val));
    this.fechaFinDate = new Date(newDate.getTime());
    this.fechaFin = formatearFechaYMD(this.fechaFinDate);

    if (this.fechaInicioDate && this.fechaFinDate < this.fechaInicioDate) {
      this.fechaInicioDate = new Date(this.fechaFinDate.getTime());
      this.fechaInicio = formatearFechaYMD(this.fechaInicioDate);
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    if (this.fechaInicioDate) this.fechaInicio = formatearFechaYMD(this.fechaInicioDate);
    if (this.fechaFinDate) this.fechaFin = formatearFechaYMD(this.fechaFinDate);

    const d1 = this.fechaInicio ? new Date(this.fechaInicio) : null;
    const d2 = this.fechaFin ? new Date(this.fechaFin) : null;
    this.rangoFechas = [d1, d2];

    const desde = this.fechaInicio || undefined;
    const hasta = this.fechaFin || undefined;

    this.cargando = true;
    this.consultas.getDashboard(desde, hasta).subscribe({
      next: (res) => {
        this.asignarDashboard(res);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información con esos filtros.',
        });
      },
    });
  }

  limpiarFiltros(): void {
    this.fechaInicioDate = null;
    this.fechaFinDate = null;
    this.rangoFechas = [null, null];
    this.cdr.detectChanges();

    setTimeout(() => {
      const start = atStartOfDay(new Date(new Date().getFullYear(), 0, 1));
      const end = atStartOfDay(new Date());

      this.fechaInicioDate = new Date(start.getTime());
      this.fechaFinDate = new Date(end.getTime());
      this.rangoFechas = [new Date(start.getTime()), new Date(end.getTime())];

      this.fechaInicio = formatearFechaYMD(this.fechaInicioDate);
      this.fechaFin = formatearFechaYMD(this.fechaFinDate);

      this.cdr.detectChanges();
      this.aplicarFiltros();

      this.toast.add({
        severity: 'info',
        summary: 'Filtros limpiados',
        detail: `Fechas restablecidas: ${this.fechaInicio} a ${this.fechaFin}`,
        life: 3000,
      });
    }, 0);
  }

  private asignarDashboard(res: DashboardUsabilidadResponse): void {
    const kpis = res.kpis;
    this.kpiTotalUsos = kpis.totalUsos;
    this.kpiTotalAsistencias = kpis.totalAsistencias;
    this.kpiTotalMinutos = kpis.totalMinutos;
    this.kpiTotalHoras = kpis.totalHoras;
    this.kpiPromedioMin = kpis.promedioMin;
    this.kpiPromedioHoras = kpis.promedioHoras;
    this.kpiLaboratoriosUnicos = kpis.laboratoriosUnicos;
    this.kpiPromedioAsistentesPorClase = kpis.promedioAsistentesPorClase;
    this.kpiPersonasUnicas = kpis.personasUnicas;
    this._totalRegistros = res.totalRegistros;

    this.filasLaboratorio = res.filasLaboratorio ?? [];
    this.filasPrograma = res.filasPrograma ?? [];
    this.filasFacultad = res.filasFacultad ?? [];
    this.filasSemestre = res.filasSemestre ?? [];
    this.filasGenero = res.filasGenero ?? [];
    this.filasMateria = res.filasMateria ?? [];
    this.filasDiaSemana = res.filasDiaSemana ?? [];
    this.filasMotivo = res.filasMotivo ?? [];
    this.datosTendencia = res.datosTendencia ?? [];

    this.construirGraficosConTema();
    this.cdr.detectChanges();
  }


  private seleccionarConteo(filas: DashboardFila[]) {
    return filas.map((f) => ({ etiqueta: f.etiqueta, valor: f.usos }));
  }


  private leerVariablesDeTema(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const styles = getComputedStyle(document.documentElement);
    this.colorTexto = styles.getPropertyValue('--p-text-color').trim() || '#495057';
    this.colorTextoSuave = styles.getPropertyValue('--p-text-muted-color').trim() || '#6c757d';
    this.colorGrid = styles.getPropertyValue('--p-content-border-color').trim() || '#e9ecef';

    const vars = [
      '--p-primary-500',
      '--p-cyan-500',
      '--p-orange-500',
      '--p-gray-500',
      '--p-purple-500',
      '--p-amber-500',
      '--p-teal-500',
      '--p-rose-500',
      '--p-indigo-500',
      '--p-lime-500',
      '--p-sky-500',
      '--p-fuchsia-500',
    ];
    this.paleta = vars.map((v) => styles.getPropertyValue(v).trim()).filter(Boolean);
  }

  construirGraficosConTema(): void {
    this.mostrarGraficas = false;
    this.leerVariablesDeTema();

    const prog = this.seleccionarConteo(this.filasPrograma);
    const fac = this.seleccionarConteo(this.filasFacultad);
    const sem = this.seleccionarConteo(this.filasSemestre);
    const gen = this.seleccionarVParaDona(this.filasGenero);
    const mat = this.filasMateria.map((f) => ({ etiqueta: f.etiqueta, valor: f.usos }));
    const dia = this.filasDiaSemana.map((f) => ({ etiqueta: f.etiqueta, valor: f.usos }));
    const mot = this.filasMotivo.map((f) => ({ etiqueta: f.etiqueta, valor: Math.max(f.usos, 0.1) }));

    this.graficoLaboratorio = { ...this.construirLaboratorioChart(this.filasLaboratorio, 'Clases') };
    this.graficoPrograma = { ...this.construirHorizontalBarChart(prog, 'Registros') };
    this.graficoFacultad = { ...this.construirBarChart(fac, 'Registros') };
    this.graficoSemestre = { ...this.construirBarChart(sem, 'Registros') };
    this.graficoGenero = { ...this.construirDoughnutChart(gen) };
    this.graficoMateria = { ...this.construirHorizontalBarChart(mat, 'Clases') };
    this.graficoDiaSemana = { ...this.construirBarChart(dia, 'Clases') };
    this.graficoMotivo = { ...this.construirDoughnutChart(mot) };
    this.graficoTendencia = { ...this.construirLineChart(this.datosTendencia) };

    setTimeout(() => {
      this.mostrarGraficas = true;
      this.cdr.detectChanges();
    }, 0);
  }

  private seleccionarVParaDona(filas: DashboardFila[]) {
    return filas.map((f) => {
      if (f.personas !== undefined) {
        return { etiqueta: f.etiqueta, valor: Math.max(f.personas, 0.1) };
      }
      return { etiqueta: f.etiqueta, valor: Math.max(redondear1(f.minutos / 60), 0.1) };
    });
  }

  private construirBarChart(rows: { etiqueta: string; valor: number }[], label: string) {
    const colores = this.colores(rows.length);
    const labels = rows.map((r) => r.etiqueta);
    const data = rows.map((r) => r.valor);

    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            label,
            data: [...data],
            backgroundColor: [...colores],
            borderColor: [...colores],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: this.colorTexto } } },
        scales: {
          x: {
            ticks: { color: this.colorTextoSuave, font: { weight: 500 } },
            grid: { color: this.colorGrid, drawBorder: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: this.colorTextoSuave, stepSize: 1 },
            grid: { color: this.colorGrid, drawBorder: false },
          },
        },
      },
    };
  }

  private construirLaboratorioChart(filasLaboratorio: DashboardFila[], metricaLabel: string) {
    const colores = this.colores(filasLaboratorio.length);
    const valores = filasLaboratorio.map((lab) => lab.usos);
    const labels = filasLaboratorio.map((lab) => lab.etiqueta);

    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            label: metricaLabel,
            data: [...valores],
            backgroundColor: [...colores],
            borderColor: [...colores],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { intersect: false, mode: 'index' as const },
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
            labels: { color: this.colorTexto, font: { size: 12, weight: '500' } },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ddd',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: (context: any) => {
                const index = context[0].dataIndex;
                return filasLaboratorio[index].etiqueta;
              },
              label: (context: any) => {
                const i = context.dataIndex;
                const lab = filasLaboratorio[i];
                const lineas: string[] = [];
                lineas.push(`Clases: ${lab.usos}`);
                lineas.push(`Asistencias: ${lab.asistentes || 0}`);
                if (lab.minutos > 0) {
                  lineas.push(`Tiempo total: ${this.formatearMinutos(lab.minutos)}`);
                  lineas.push(`Promedio por clase: ${this.getPromedioFormatoPorUso(lab)}`);
                }
                return lineas;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: this.colorTextoSuave, font: { weight: '500', size: 11 }, maxRotation: 60, minRotation: 0 },
            grid: { color: this.colorGrid, drawBorder: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: this.colorTextoSuave, font: { size: 11 }, stepSize: 1 },
            grid: { color: this.colorGrid, drawBorder: false },
            title: { display: true, text: metricaLabel, color: this.colorTexto, font: { size: 12, weight: '600' } },
          },
        },
      },
    };
  }

  private construirHorizontalBarChart(rows: { etiqueta: string; valor: number }[], label: string) {
    const colores = this.colores(rows.length);
    const labels = rows.map((r) => r.etiqueta);
    const data = rows.map((r) => r.valor);

    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            label,
            data: [...data],
            backgroundColor: [...colores],
            borderColor: [...colores],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: this.colorTexto } } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: this.colorTextoSuave, stepSize: 1 },
            grid: { color: this.colorGrid, drawBorder: false },
          },
          y: {
            ticks: { color: this.colorTextoSuave, font: { weight: 500 } },
            grid: { color: this.colorGrid, drawBorder: false },
          },
        },
      },
    };
  }

  private construirDoughnutChart(rows: { etiqueta: string; valor: number }[]) {
    const colores = this.colores(rows.length);
    const labels = rows.map((r) => r.etiqueta);
    const data = rows.map((r) => r.valor);

    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            data: [...data],
            backgroundColor: [...colores],
            borderColor: [...colores],
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: this.colorTexto } },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ddd',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (context: any) => {
                const valor = Math.round(context.parsed);
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
                return `${context.label}: ${valor} (${porcentaje}%)`;
              },
            },
          },
        },
      },
    };
  }

  private construirLineChart(datos: { fecha: string; clases: number; asistencias: number }[]) {
    const labels = datos.map((d) => d.fecha);
    const colores = this.colores(2);

    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            label: 'Clases',
            data: datos.map((d) => d.clases),
            borderColor: colores[0] || '#4f46e5',
            backgroundColor: (colores[0] || '#4f46e5') + '33',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Asistencias',
            data: datos.map((d) => d.asistencias),
            borderColor: colores[1] || '#06b6d4',
            backgroundColor: (colores[1] || '#06b6d4') + '33',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { intersect: false, mode: 'index' as const },
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
            labels: { color: this.colorTexto, font: { size: 12, weight: '500' } },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ddd',
            borderWidth: 1,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { color: this.colorTextoSuave, font: { size: 10 }, maxRotation: 45, minRotation: 0 },
            grid: { color: this.colorGrid, drawBorder: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: this.colorTextoSuave, stepSize: 1 },
            grid: { color: this.colorGrid, drawBorder: false },
          },
        },
      },
    };
  }

  private colores(n: number): string[] {
    if (!this.paleta.length) return Array(n).fill('#22c55e');
    return Array.from({ length: n }, (_, i) => this.paleta[i % this.paleta.length]);
  }

  inicioDeMes(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  formatearMinutos(min: number): string {
    if (min <= 0 || !isFinite(min)) return '0 min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h} h ${m} min`;
    if (h > 0) return `${h} h`;
    return `${m} min`;
  }

  getPromedioFormatoPorUso(lab: DashboardFila): string {
    if (lab.usos === 0) return '0 min';
    const promMin = Math.round(lab.minutos / lab.usos);
    return this.formatearMinutos(promMin);
  }

  getPromedioHorasPorUso(lab: DashboardFila): number {
    if (lab.usos === 0) return 0;
    return redondear1(lab.minutos / lab.usos / 60);
  }

  trackByEtiqueta = (_: number, row: DashboardFila) => row.etiqueta;

  getPorcentajeGenero(): Array<{ etiqueta: string; porcentaje: number; valor: number }> {
    if (this.filasGenero.length === 0) return [];
    const total = this.filasGenero.reduce((sum, gen) => sum + (gen.personas || 0), 0);
    return this.filasGenero.map((gen) => {
      const valor = gen.personas || 0;
      return {
        etiqueta: gen.etiqueta,
        porcentaje: total > 0 ? Math.round((valor / total) * 100) : 0,
        valor,
      };
    });
  }

  async exportarPDF(): Promise<void> {
    if (!this.hayDatos) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay datos para exportar.' });
      return;
    }

    try {
      this.toast.add({ severity: 'info', summary: 'Generando PDF', detail: 'Por favor espere...' });

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 40;
      const marginRight = 40;
      let yPos = 40;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard de Usabilidad de Laboratorios', pageWidth / 2, yPos, { align: 'center' });
      yPos += 25;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${this.fechaInicio} a ${this.fechaFin}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Clave', marginLeft, yPos);
      yPos += 20;

      const kpis = [
        ['Total de Tiempo', this.formatearMinutos(this.kpiTotalMinutos), `(${this.kpiTotalHoras.toFixed(1)} horas)`],
        ['Total de Clases', this.kpiTotalUsos.toString(), 'sesiones de clase agrupadas'],
        ['Promedio por Clase', this.formatearMinutos(this.kpiPromedioMin), `(${this.kpiPromedioHoras.toFixed(1)} h/clase)`],
        ['Laboratorios Únicos', this.kpiLaboratoriosUnicos.toString(), 'laboratorios'],
        ['Prom. Asistentes/Clase', this.kpiPromedioAsistentesPorClase.toString(), 'estudiantes por sesión'],
        ['Personas Únicas', this.kpiPersonasUnicas.toString(), 'identificaciones distintas'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Indicador', 'Valor', 'Detalles']],
        body: kpis,
        styles: { fontSize: 10, cellPadding: 8, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: marginLeft, right: marginRight },
      });

      yPos = (doc as any).lastAutoTable.finalY + 25;

      const addSection = (titulo: string, head: string[][], body: any[][]) => {
        if (!body.length) return;
        if (yPos > 650) {
          doc.addPage();
          yPos = 40;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo, marginLeft, yPos);
        yPos += 20;

        autoTable(doc, {
          startY: yPos,
          head,
          body,
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: marginLeft, right: marginRight },
        });

        yPos = (doc as any).lastAutoTable.finalY + 25;
      };

      addSection(
        'Laboratorios Más Utilizados',
        [['#', 'Laboratorio', 'Horas', 'Minutos', 'Clases', 'Asistencias', 'Promedio/Clase']],
        this.filasLaboratorio.map((lab, i) => [
          (i + 1).toString(),
          lab.etiqueta,
          lab.horas.toFixed(1),
          lab.minutos.toString(),
          lab.usos.toString(),
          (lab.asistentes || 0).toString(),
          this.getPromedioFormatoPorUso(lab),
        ])
      );

      addSection(
        'Uso por Programa Académico',
        [['#', 'Programa', 'Horas', 'Minutos', 'Usos']],
        this.filasPrograma.map((prog, i) => [
          (i + 1).toString(),
          prog.etiqueta,
          prog.horas.toFixed(1),
          prog.minutos.toString(),
          prog.usos.toString(),
        ])
      );

      addSection(
        'Uso por Facultad',
        [['#', 'Facultad', 'Horas', 'Minutos', 'Usos']],
        this.filasFacultad.map((fac, i) => [
          (i + 1).toString(),
          fac.etiqueta,
          fac.horas.toFixed(1),
          fac.minutos.toString(),
          fac.usos.toString(),
        ])
      );

      addSection(
        'Uso por Semestre',
        [['Semestre', 'Horas', 'Minutos', 'Usos']],
        this.filasSemestre.map((sem) => [sem.etiqueta, sem.horas.toFixed(1), sem.minutos.toString(), sem.usos.toString()])
      );

      if (this.filasGenero.length) {
        const porcentajes = this.getPorcentajeGenero();
        addSection(
          'Distribución por Género',
          [['Género', 'Personas', 'Porcentaje', 'Usos']],
          porcentajes.map((gen) => [
            gen.etiqueta,
            gen.valor.toString(),
            `${gen.porcentaje}%`,
            this.filasGenero.find((f) => f.etiqueta === gen.etiqueta)?.usos.toString() || '0',
          ])
        );
      }

      addSection(
        'Top Materias',
        [['#', 'Materia', 'Clases', 'Asistencias']],
        this.filasMateria.map((m, i) => [
          (i + 1).toString(),
          m.etiqueta,
          m.usos.toString(),
          (m.asistentes || 0).toString(),
        ])
      );

      addSection(
        'Uso por Día de la Semana',
        [['Día', 'Clases', 'Asistencias']],
        this.filasDiaSemana.map((d) => [
          d.etiqueta,
          d.usos.toString(),
          (d.asistentes || 0).toString(),
        ])
      );

      addSection(
        'Por Motivo de Uso',
        [['Motivo', 'Registros']],
        this.filasMotivo.map((m) => [m.etiqueta, m.usos.toString()])
      );

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Página ${i} de ${totalPages} - Generado el ${new Date().toLocaleDateString('es-CO')}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      }

      const fecha = formatearFechaYMD(new Date()).replace(/-/g, '');
      doc.save(`Dashboard_Laboratorios_${fecha}.pdf`);

      this.toast.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: 'El archivo PDF se ha descargado correctamente',
      });
    } catch {
      this.toast.add({
        severity: 'error',
        summary: 'Error de exportación',
        detail: 'Para exportar a PDF instale: npm i jspdf jspdf-autotable',
      });
    }
  }
}

function atStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function formatearFechaYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}
