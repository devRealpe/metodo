import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  Subscription,
  combineLatest,
  map,
  shareReplay,
  startWith,
  switchMap,
  catchError,
  finalize,
  of
} from 'rxjs';

import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { Laboratorio } from '../../core/models/laboratorio.model';

import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import {
  InputComponent,
  TextareaComponent,
  SelectComponent
} from '@microfrontends/shared-ui';

type Opcion = { label: string; value: string | null };

const EST_DISP = 'Disponible';
const EST_OCUP = 'Ocupado';
const EST_MANT = 'Mantenimiento';

@Component({
  selector: 'app-laboratorios-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PanelModule,
    CardModule,
    ButtonModule,
    SelectModule,
    ChartModule,
    ProgressSpinnerModule,
    TagModule,
    MessageModule,
    SelectComponent
  ],
  templateUrl: './laboratorio-dashboard.component.html'
})
export class LaboratoriosDashboardComponent implements OnInit, OnDestroy {
  private svc = inject(LbLaboratoriosAulasService);
  private cd = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private horariosSvc = inject(HorariosOracleService);

  private reload$ = new BehaviorSubject<void>(undefined);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);

  private labsSource$ = this.reload$.pipe(
    map(() => { this.loading$.next(true); this.error$.next(null); return null; }),
    switchMap(() =>
      this.svc.getAll().pipe(
        map(rows => Array.isArray(rows) ? rows.map(r => ({
          id: r.codAula ?? String(r.id),
          nombre: r.nomAula ?? '',
          capacidad: r.numCapacidad ?? 0,
          estado: 'Disponible' as const,
          tipo: r.tipoAula ?? null,
          ubicacion: r.nomBloque ?? null,
          bloque: r.codBloque ?? null,
          descripcion: null,
          ocupados: 0,
        } as Laboratorio)) : []),
        catchError(() => {
          this.error$.next('No se pudo cargar la información de laboratorios.');
          return of([] as Laboratorio[]);
        }),
        finalize(() => this.loading$.next(false))
      )
    ),
    startWith([] as Laboratorio[]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  estadoFiltro: string | null = null;
  tipoFiltro: string | null = null;
  sedeFiltro: string | null = null;

  estadoOptions: Opcion[] = [
    { label: 'Todos', value: null },
    { label: EST_DISP, value: EST_DISP },
    { label: EST_OCUP, value: EST_OCUP },
    { label: EST_MANT, value: EST_MANT }
  ];

  tipoOptions = this.labsSource$.pipe(
    map(rows => {
      const tipos = Array.from(new Set(rows.map(r => (r?.tipo ?? '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
      return [{ label: 'Todos', value: null }, ...tipos.map(t => ({ label: t, value: t }))] as Opcion[];
    }),
    shareReplay(1)
  );

  sedeOptions = this.labsSource$.pipe(
    map(rows => {
      const sedes = Array.from(new Set(rows.map(r => (r?.ubicacion ?? '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
      return [{ label: 'Todos', value: null }, ...sedes.map(s => ({ label: s, value: s }))] as Opcion[];
    }),
    shareReplay(1)
  );

  private estado$ = new BehaviorSubject<string | null>(null);
  private tipo$ = new BehaviorSubject<string | null>(null);
  private sede$ = new BehaviorSubject<string | null>(null);

  private norm = (s?: string | null) =>
    (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();

  baseFiltered$ = combineLatest([this.labsSource$, this.tipo$, this.sede$]).pipe(
    map(([rows, tip, sed]) =>
      rows.filter(r =>
        (!tip || this.norm(r.tipo) === this.norm(tip)) &&
        (!sed || this.norm(r.ubicacion) === this.norm(sed))
      )
    ),
    map(rows => [...rows].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''))),
    startWith([] as Laboratorio[]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  horasHoy$ = this.reload$.pipe(
    switchMap(() => {
      const dia = this.getDiaHoy();
      return this.horariosSvc.getHoras(dia).pipe(
        catchError(() => of([] as HorarioItem[]))
      );
    }),
    startWith([] as HorarioItem[]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  labsConEstado$ = combineLatest([this.baseFiltered$, this.horasHoy$]).pipe(
    map(([rows, horas]) => {
      const porCodigo = new Map<string, HorarioItem[]>();
      const porNombre = new Map<string, HorarioItem[]>();

      horas.forEach(h => {
        const keyCod = h.codAula ? this.norm(h.codAula) : undefined;
        const keyName = h.nomAula ? this.norm(h.nomAula) : undefined;
        if (keyCod) porCodigo.set(keyCod, (porCodigo.get(keyCod) || []).concat(h));
        if (keyName) porNombre.set(keyName, (porNombre.get(keyName) || []).concat(h));
      });

      const ahora = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();

      return rows.map(r => {
        const esMant = this.norm(r.estado) === this.norm(EST_MANT);
        if (esMant) return r;

        const keyId = this.norm(r.id || '');
        const keyName = this.norm(r.nombre || '');
        const candidatos: HorarioItem[] = [
          ...(porCodigo.get(keyId) || []),
          ...(porCodigo.get(keyName) || []),
          ...(porNombre.get(keyName) || []),
          ...(porNombre.get(keyId) || [])
        ];

        const activos = candidatos.filter(h => {
          const s = this.timeStringToMinutes(h.horaInicio || (h as any).startTime);
          const e = this.timeStringToMinutes(h.horaFin || (h as any).endTime);
          if (s === null || e === null) return false;
          let start = s;
          let end = e;
          if (end <= start) end += 24 * 60;
          let now = ahora;
          if (now < start && end > 24 * 60) now += 24 * 60;
          return now >= start && now < end;
        });

        if (activos.length) {
          const horarioDetalle = this.formatHorarioItems(activos);
          return ({ ...r, estado: EST_OCUP, horarioDetalle } as Laboratorio & { horarioDetalle?: string });
        }

        return ({ ...r, estado: EST_DISP } as Laboratorio);
      });
    }),
    startWith([] as Laboratorio[]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  filtered$ = combineLatest([this.labsConEstado$, this.estado$]).pipe(
    map(([rows, est]) => est ? rows.filter(r => this.norm(r.estado) === this.norm(est)) : rows),
    startWith([] as Laboratorio[]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private getDiaHoy(): string {
    const dias = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
    return dias[new Date().getDay()];
  }

  private formatHorarioItems(items: HorarioItem[]): string {
    if (!items || !items.length) return '';
    const it = items[0];
    const inicio = it.horaInicio || (it as any).startTime || '';
    const fin = it.horaFin || (it as any).endTime || '';
    const materia = it.materia ? ` · ${it.materia}` : '';
    const extras = items.length > 1 ? ` (+${items.length - 1} más)` : '';
    return `${inicio} - ${fin}${materia}${extras}`;
  }

  private timeStringToMinutes(t?: string): number | null {
    if (!t) return null;
    const s = String(t).trim();

    const ampm = /\b(am|pm)\b/i.test(s);
    if (ampm) {
      const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (!m) return null;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2] || '0', 10);
      const am = m[3].toLowerCase() === 'am';
      if (hh === 12) hh = am ? 0 : 12;
      if (!am) hh = (hh % 12) + 12;
      return hh * 60 + Math.max(0, Math.min(59, mm));
    }

    const parts = s.split(':');
    if (parts.length >= 2) {
      const hh = parseInt(parts[0] || '0', 10);
      const mm = parseInt((parts[1] || '0').slice(0, 2), 10);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      return Math.max(0, Math.min(23, hh)) * 60 + Math.max(0, Math.min(59, mm));
    }

    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(23, n)) * 60;
    return null;
  }

  kpis$ = this.labsConEstado$.pipe(
    map(rows => {
      const total = rows.length;
      const disp = rows.filter(r => this.norm(r.estado) === this.norm(EST_DISP)).length;
      const ocup = rows.filter(r => this.norm(r.estado) === this.norm(EST_OCUP)).length;
      const mant = rows.filter(r => this.norm(r.estado) === this.norm(EST_MANT)).length;

      const caps = rows.map(r => r.capacidad ?? 0);
      const capTotal = caps.reduce((a, b) => a + b, 0);
      const capProm = caps.length ? Math.round((capTotal / caps.length) * 10) / 10 : 0;
      const capMax = caps.length ? Math.max(...caps) : 0;
      const capMin = caps.length ? Math.min(...caps) : 0;

      return { total, disp, ocup, mant, capProm, capMax, capMin };
    }),
    startWith({ total: 0, disp: 0, ocup: 0, mant: 0, capProm: 0, capMax: 0, capMin: 0 })
  );

  chartHeight = 320;
  donutHeight = 300;

  hbarOptions: any;
  donutOptions: any;

  private withAlpha(colorStr: string, alpha: number): string {
    if (!isPlatformBrowser(this.platformId)) return colorStr;
    const el = document.createElement('span');
    el.style.color = colorStr;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color;
    document.body.removeChild(el);
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return colorStr;
    const [, r, g, b] = m;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private paleta: string[] = [];

  private getCssVar(name: string, docStyle: CSSStyleDeclaration) {
    const v = docStyle.getPropertyValue(name);
    return v && v.trim().length ? v.trim() : undefined;
  }

  private leerVariablesDeTema(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const styles = getComputedStyle(document.documentElement);
    
    const vars = [
      '--p-primary-500', '--p-cyan-500', '--p-orange-500', '--p-gray-500',
      '--p-purple-500', '--p-amber-500', '--p-teal-500', '--p-rose-500',
      '--p-indigo-500', '--p-lime-500', '--p-sky-500', '--p-fuchsia-500'
    ];
    this.paleta = vars.map(v => styles.getPropertyValue(v).trim()).filter(Boolean);
  }

  private colores(n: number): string[] {
    if (!this.paleta.length) return Array(n).fill('#22c55e');
    return Array.from({ length: n }, (_, i) => this.paleta[i % this.paleta.length]);
  }

  private colorsFromTheme(n: number) {
    if (!isPlatformBrowser(this.platformId)) {
      return { bg: Array(n).fill('rgba(100,181,246,.8)'), bd: Array(n).fill('#60a5fa') };
    }
    
    const colores = this.colores(n);
    const bg = colores;
    const bd = colores;
    
    return { bg, bd };
  }

  private initHorizontalBarOptions() {
    if (!isPlatformBrowser(this.platformId)) return;
    const doc = getComputedStyle(document.documentElement);
    const textColor = doc.getPropertyValue('--p-text-color');
    const textMuted = doc.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = doc.getPropertyValue('--p-content-border-color');

    this.hbarOptions = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 13 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.formattedValue}` } }
      },
      scales: {
        x: {
          ticks: { color: textMuted, font: { weight: 500, size: 12 } },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y: {
          ticks: { color: textMuted, font: { size: 12 } },
          grid: { color: surfaceBorder, drawBorder: false }
        }
      }
    };
  }

  private initDonutOptions() {
    if (!isPlatformBrowser(this.platformId)) return;
    const doc = getComputedStyle(document.documentElement);
    const textColor = doc.getPropertyValue('--p-text-color');
    this.donutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'top', labels: { color: textColor, font: { size: 13 } } },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const val = ctx.parsed;
              const data: number[] = ctx.dataset.data as number[];
              const total = data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((val / total) * 100) : 0;
              return `${ctx.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    };
  }

  private toHorizontalBars(labels: string[], data: number[], datasetLabel = 'Serie') {
    const c = this.colorsFromTheme(labels.length);
    return {
      labels,
      datasets: [{
        label: datasetLabel,
        data,
        backgroundColor: c.bg,
        borderColor: c.bd,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 24,
        barPercentage: 0.45,
        categoryPercentage: 0.5
      }]
    };
  }

  private toDisponibilidadDonut(disp: number, ocup: number, mant: number) {
    const total = disp + ocup + mant;
    if (!total) {
      const gris = this.paleta.length > 3 ? this.paleta[3] : '#94a3b8';
      return {
        labels: ['Sin datos'],
        datasets: [{ data: [1], backgroundColor: [gris], borderColor: [gris], borderWidth: 2 }]
      };
    }
    
    const verde = this.paleta.length > 6 ? this.paleta[6] : '#10b981';
    const rojo = this.paleta.length > 7 ? this.paleta[7] : '#f43f5e';
    const naranja = this.paleta.length > 5 ? this.paleta[5] : '#f59e0b';
    
    return {
      labels: [EST_DISP, EST_OCUP, EST_MANT],
      datasets: [{
        data: [disp, ocup, mant],
        backgroundColor: [verde, rojo, naranja],
        borderColor: [verde, rojo, naranja],
        borderWidth: 2
      }]
    };
  }

  disponibilidadDonut$ = this.labsConEstado$.pipe(
    map(rows => {
      const disp = rows.filter(r => this.norm(r.estado) === this.norm(EST_DISP)).length;
      const ocup = rows.filter(r => this.norm(r.estado) === this.norm(EST_OCUP)).length;
      const mant = rows.filter(r => this.norm(r.estado) === this.norm(EST_MANT)).length;
      return this.toDisponibilidadDonut(disp, ocup, mant);
    })
  );

  estadosData$ = this.labsConEstado$.pipe(
    map(rows => {
      const counts = new Map<string, number>();
      rows.forEach(r => {
        const k = this.norm(r.estado) || 'n/d';
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      const pretty = (k: string) => k === 'n/d' ? 'N/D' : k.charAt(0).toUpperCase() + k.slice(1);
      const labels = Array.from(counts.keys()).map(pretty);
      const data = Array.from(counts.values());
      return this.toHorizontalBars(labels, data, 'Estados');
    })
  );

  private topNHorizontal(rows: Laboratorio[], key: 'tipo' | 'ubicacion', n = 8, label = 'Serie') {
    const counts = new Map<string, number>();
    rows.forEach(r => {
      const k = (r[key] ?? 'N/D').toString().trim() || 'N/D';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, n);
    const rest = sorted.slice(n);
    const otros = rest.reduce((a, [, v]) => a + v, 0);
    const labels = top.map(([k]) => k).concat(otros ? ['Otros'] : []);
    const data = top.map(([, v]) => v).concat(otros ? [otros] : []);
    return this.toHorizontalBars(labels, data, label);
  }

  tiposData$ = this.labsConEstado$.pipe(map(rows => this.topNHorizontal(rows, 'tipo', 8, 'Tipos')));
  sedesData$ = this.labsConEstado$.pipe(map(rows => this.topNHorizontal(rows, 'ubicacion', 8, 'Sedes')));

  emptyBar = { labels: [] as string[], datasets: [{ label: '', data: [] as number[] }] };

  private sub = new Subscription();

  ngOnInit(): void {
    this.leerVariablesDeTema();
    this.initHorizontalBarOptions();
    this.initDonutOptions();
    setTimeout(() => {
      this.refreshTheme();
    }, 100);
    if (isPlatformBrowser(this.platformId)) this.cd.markForCheck();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  onEstadoChange(v: string | null) { this.estadoFiltro = v; this.estado$.next(v ?? null); }
  onTipoChange(v: string | null) { this.tipoFiltro = v; this.tipo$.next(v ?? null); }
  onSedeChange(v: string | null) { this.sedeFiltro = v; this.sede$.next(v ?? null); }

  recargar() { this.reload$.next(); }
  limpiarFiltros() { this.onEstadoChange(null); this.onTipoChange(null); this.onSedeChange(null); }

  refreshTheme() {
    this.leerVariablesDeTema();
    this.initHorizontalBarOptions();
    this.initDonutOptions();
    this.estado$.next(this.estadoFiltro);
    if (isPlatformBrowser(this.platformId)) this.cd.markForCheck();
  }

  getSeverity(estado?: string | null): 'success' | 'warn' | 'danger' | 'info' {
    if (!estado) return 'info';
    const n = this.norm(estado);
    if (n === this.norm(EST_DISP)) return 'success';
    if (n === this.norm(EST_OCUP)) return 'warn';
    if (n === this.norm(EST_MANT)) return 'danger';
    return 'info';
  }
}
