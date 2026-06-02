import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FullCalendarModule,
  FullCalendarComponent,
} from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  SelectComponent,
  DatepickerComponent,
} from '@microfrontends/shared-ui';
import {
  HorariosOracleService,
  HorarioItem,
} from '../../core/services/horarios-oracle.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { OraAulas } from '../../core/models/ora-aulas.model';

import { firstValueFrom } from 'rxjs';

interface HorarioItemData extends HorarioItem {
  nomBloque?: string;
  sede?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-labs-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    ToolbarModule,
    ButtonModule,
    CardModule,
    ProgressSpinnerModule,
    AutoCompleteModule,
    ToastModule,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [MessageService],
  templateUrl: './calendario-laboratorio.component.html',
  styleUrls: ['./calendario-laboratorio.component.scss'],
})
export class CalendarioLaboratorioComponent implements OnInit {
  @ViewChild('fc') fc?: FullCalendarComponent;

  private readonly PALETA = [
    '#0F4C5C',
    '#16697A',
    '#8BDAD8',
    '#7BDBDA',
    '#C7F9CC',
    '#ADEED4',
    '#FFBBBB',
    '#FC8282',
    '#FFF676',
    '#FFF3B0',
    '#CAB98F',
    '#9EB4E0',
  ];

  aulasOptions: { label: string; value: string }[] = [];
  sedesOptions: { label: string; value: string }[] = [];

  filter: boolean = true;

  aulasSeleccionadas = '';
  sedesSeleccionadas = '';
  bloqueSeleccionado = '';
  sugerenciasBloque: string[] = [];
  bloquesOptions: { label: string; value: string }[] = [];
  
  private aulasOracleData: OraAulas[] = [];

  get aulasSeleccionadasArray(): string[] {
    return this.aulasSeleccionadas ? [this.aulasSeleccionadas] : [];
  }

  get sedesSeleccionadasArray(): string[] {
    return this.sedesSeleccionadas ? [this.sedesSeleccionadas] : [];
  }

  private normalizarAulasSeleccionadas(valor: string | null | undefined): void {
    this.aulasSeleccionadas =
      valor === null || valor === undefined ? '' : String(valor);
  }

  private normalizarSedesSeleccionadas(valor: string | null | undefined): void {
    this.sedesSeleccionadas =
      valor === null || valor === undefined ? '' : String(valor);
  }

  onSedesChange(valor: string | null | undefined): void {
    this.normalizarSedesSeleccionadas(valor);
    this.marcarFiltrosPendientes();
  }

  onAulasChange(valor: string | null | undefined): void {
    this.normalizarAulasSeleccionadas(valor);
    this.marcarFiltrosPendientes();
  }

  selectedDate: Date | null = new Date();
  loading = false;
  filtrosPendientes = false;
  legendAulas: Array<{
    code: string;
    label: string;
    color: string;
    border: string;
  }> = [];
  trackByCodigo = (_: number, it: { code: string }) => it.code;

  get isMobile(): boolean {
    return window.innerWidth < 768;
  }
  get isTablet(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1280;
  }
  get isSmallMobile(): boolean {
    return window.innerWidth < 480;
  }
  get isDesktop(): boolean {
    return window.innerWidth >= 1280;
  }

  get tieneEventos(): boolean {
    return this.filasBase && this.filasBase.length > 0;
  }

  filasBase: HorarioItem[] = [];
  private nombreAulaPorCodigo = new Map<string, string>();
  private sedeAulaPorNombre = new Map<string, string>();
  private tipoAulaPorNombre = new Map<string, string>();
  private bloqueAulaPorNombre = new Map<string, string>();
  private codigoAulaToColorIndex = new Map<string, number>();
  private siguienteColorIndex = 0;

  private readonly api = inject(HorariosOracleService);
  private readonly oraAulasService = inject(OraAulasService);
  private readonly messageService = inject(MessageService);

  constructor() {
    this.normalizarAulasSeleccionadas('');
    this.normalizarSedesSeleccionadas('');

    window.addEventListener('resize', () => {
      this.actualizarConfiguracionResponsive();
    });
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      this.cargarDatosIniciales();
      await this.recargarEventos();

      setTimeout(() => {
        if (this.fc?.getApi()) {
          this.fc.getApi().render();
        }
      }, 100);
    } finally {
      this.loading = false;
    }
  }

  private cargarDatosIniciales(): void {
    this.oraAulasService.getAll().subscribe({
      next: (aulas) => {
        this.aulasOracleData = aulas;

        const normalize = (text?: string): string =>
          (text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        // Tipos que se incluyen directamente sin condición adicional
        const includedTipos = new Set([
          'laboratorio',
          'laboratorio de informatica',
          'sala de juntas',
          'sala de estudio',
        ]);

        const aulasFiltradasDropdown = aulas
          .filter((aula) => {
            const tipo = normalize(aula.tipoAula);
            const nombre = normalize(aula.nomAula);

            // Incluir si el tipo está en la lista blanca
            if (includedTipos.has(tipo)) return true;

            // Excepción: "Sala Especial" solo si el nombre contiene "salon de investigacion"
            if (tipo === 'sala especial' && nombre.includes('salon de investigacion')) return true;

            return false;
          });

        // Construir aulasOptions
        this.aulasOptions = aulasFiltradasDropdown
          .map((aula) => ({
            label: `${aula.codAula} - ${aula.nomAula}`,
            value: aula.codAula,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'));

        // Construir bloquesOptions desde nomBloque
        const bloquesSet = new Set<string>();
        aulasFiltradasDropdown.forEach((aula) => {
          if (aula.nomBloque?.trim()) {
            bloquesSet.add(aula.nomBloque.trim());
          }
        });

        this.bloquesOptions = [
          { label: 'Todos los bloques', value: '' },
          ...Array.from(bloquesSet)
            .sort()
            .map((b) => ({ label: b, value: b })),
        ];

        // Construir sedesOptions basado en nomBloque
        const sedesSet = new Set<string>();
        aulasFiltradasDropdown.forEach((aula) => {
          const sede = this.determiniarSede(aula.nomBloque);
          if (sede) sedesSet.add(sede);
        });

        this.sedesOptions = Array.from(sedesSet)
          .sort()
          .map((s) => ({ label: s, value: s }));

        // Crear mapeos internos para sedes y tipos
        this.sedeAulaPorNombre.clear();
        this.tipoAulaPorNombre.clear();
        this.bloqueAulaPorNombre.clear();

        aulasFiltradasDropdown.forEach((aula) => {
          const key = this.normalizarTexto(aula.nomAula);
          const sede = this.determiniarSede(aula.nomBloque);
          const tipo = aula.tipoAula?.trim() || '';
          const bloque = aula.nomBloque?.trim() || '';

          if (sede) this.sedeAulaPorNombre.set(key, sede);
          if (tipo) this.tipoAulaPorNombre.set(key, tipo);
          if (bloque) this.bloqueAulaPorNombre.set(key, bloque);
        });

        console.log('Aulas Oracle cargadas:', this.aulasOptions.length);
      },
      error: (err) => {
        console.error('Error al cargar aulas de Oracle:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aulas de Oracle',
        });
      },
    });
  }

  private determiniarSede(nomBloque?: string): string {
    if (!nomBloque) return 'Sede Central';
    const normalizado = nomBloque
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (normalizado.includes('alvernia')) {
      return 'Sede Alvernia';
    }
    return 'Sede Central';
  }

  private actualizarBloques(): void {
    // Los bloques ya se cargan desde Oracle en cargarDatosIniciales()
    // Este método se mantiene para compatibilidad por si se necesita actualizar dinámicamente
    const bloquesEncontrados = new Set<string>();

    this.filasBase.forEach((fila) => {
      const nombreAula = this.obtenerNombreAula(fila.codAula, fila.nomAula);
      const filaData = fila as HorarioItemData;
      const bloqueFila = filaData.nomBloque ? String(filaData.nomBloque).trim() : '';
      const bloqueMap = this.bloqueAulaPorNombre.get(this.normalizarTexto(nombreAula)) || '';

      [bloqueFila, bloqueMap].forEach((bloque) => {
        if (bloque && bloque.length > 0) {
          bloquesEncontrados.add(bloque);
        }
      });
    });

    // Agregar bloques dinámicos encontrados en los eventos
    const bloquesActuales = new Set(this.bloquesOptions.map((b) => b.value));
    bloquesEncontrados.forEach((bloque) => bloquesActuales.add(bloque));

    const opcionesBloques = Array.from(bloquesActuales)
      .filter((b) => b.length > 0)
      .sort()
      .map((b) => ({ label: b, value: b }));
    this.bloquesOptions = [
      { label: 'Todos los bloques', value: '' },
      ...opcionesBloques,
    ];
  }

  irAnterior(): void {
    this.fc?.getApi().prev();
    this.actualizarFechaYRecargar();
  }
  irSiguiente(): void {
    this.fc?.getApi().next();
    this.actualizarFechaYRecargar();
  }
  irHoy(): void {
    this.fc?.getApi().today();
    this.actualizarFechaYRecargar();
  }

  irAFechaSeleccionada(): void {
    if (this.selectedDate && this.fc?.getApi()) {
      this.fc.getApi().gotoDate(this.selectedDate);
      this.verificarYCargarDatosFecha(this.selectedDate);
    }
  }

  private actualizarFechaYRecargar(): void {
    const api = this.fc?.getApi();
    if (api) {
      this.selectedDate = api.getDate();
      this.pintarEventos();
    }
  }

  private async verificarYCargarDatosFecha(fecha: Date): Promise<void> {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const tieneDataParaEsteDia = this.filasBase.some(
      (fila) =>
        fila.diaSemana &&
        this.normalizarTexto(fila.diaSemana) === this.normalizarTexto(diaSemana)
    );

    if (!tieneDataParaEsteDia) {
      await this.recargarEventos();
    } else {
      this.selectedDate = fecha;
      this.pintarEventos();
    }
  }

  buscarSugerenciasBloque(e: { query: string }): void {
    const q = this.normalizarTexto(e?.query || '');
    this.sugerenciasBloque = this.bloquesOptions
      .filter((b) => !q || this.normalizarTexto(b.label).includes(q))
      .map((b) => b.value);
  }

  limpiarFiltroBloque(): void {
    this.bloqueSeleccionado = '';
    this.sugerenciasBloque = [];
    this.normalizarSedesSeleccionadas('');
    this.normalizarAulasSeleccionadas('');
    this.filtrosPendientes = false;
    this.recargarEventos();
  }

  limpiarTodosFiltros(): void {
    this.bloqueSeleccionado = '';
    this.sugerenciasBloque = [];
    this.normalizarSedesSeleccionadas('');
    this.normalizarAulasSeleccionadas('');
    this.filtrosPendientes = false;
    this.recargarEventos();
  }

  marcarFiltrosPendientes(): void {
    this.filtrosPendientes = true;
  }

  aplicarFiltro(): void {
    this.filtrosPendientes = false;
    this.pintarEventos();
  }

  async recargarEventos(): Promise<void> {
    this.loading = true;
    this.codigoAulaToColorIndex.clear();
    this.siguienteColorIndex = 0;

    try {
      const diasSemana = [
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
        'DOMINGO',
      ];

      if (
        this.aulasSeleccionadasArray.length &&
        !this.hayOtrosFiltrosActivos()
      ) {
        const promesas = this.aulasSeleccionadasArray.flatMap((aula) =>
          diasSemana.map((dia) =>
            firstValueFrom(this.api.getHorasByAula(aula, dia))
          )
        );
        const listas = await Promise.all(promesas);
        this.filasBase = listas.flatMap((r) => r ?? []);
      } else {
        const promesas = diasSemana.map((dia) =>
          firstValueFrom(this.api.getHoras(dia))
        );
        const listas = await Promise.all(promesas);
        this.filasBase = listas.flatMap((r) => r ?? []);
      }

      this.filasBase = this.filasBase.filter(
        (f) => !this.esAulaVirtual(f.codAula, f.nomAula)
      );

      this.construirMapaNombres(this.filasBase);
      this.actualizarOpcionesAulas(this.filasBase);
      this.actualizarBloques();

      this.pintarEventos();
      this.ajustarScrollInicial(this.filasBase);
    } finally {
      this.loading = false;
    }
  }

  private hayOtrosFiltrosActivos(): boolean {
    return (
      this.sedesSeleccionadasArray.length > 0 ||
      this.bloqueSeleccionado.trim() !== ''
    );
  }

  private construirMapaNombres(filas: HorarioItem[]): void {
    filas.forEach((fila) => {
      const codigo = fila.codAula?.trim();
      const nombre = fila.nomAula?.trim();
      if (codigo && nombre && !this.esAulaVirtual(codigo, nombre)) {
        this.nombreAulaPorCodigo.set(codigo, nombre);
      }
    });
  }

  private actualizarOpcionesAulas(filas: HorarioItem[]): void {
    const mapaAulas = new Map<
      string,
      { nombre: string; sede: string; bloque: string }
    >();

    filas.forEach((fila) => {
      const codigo = fila.codAula?.trim();
      if (!codigo) return;

      const nombre = this.obtenerNombreAula(codigo, fila.nomAula);
      if (this.esAulaVirtual(codigo, nombre) || mapaAulas.has(codigo)) return;

      const sede =
        this.obtenerSede(nombre) ||
        this.extraerSedeDelNombre(nombre) ||
        this.extraerSedeDelCodigo(codigo);
      const bloque =
        this.bloqueAulaPorNombre.get(this.normalizarTexto(nombre)) ||
        this.extraerBloqueDelNombre(nombre) ||
        this.extraerBloqueDelCodigo(codigo);

      mapaAulas.set(codigo, { nombre, sede, bloque });
    });

    if (mapaAulas.size > 0) {
      const opcionesAulas = Array.from(mapaAulas.entries())
        .map(([codigo, info]) => ({
          label: `${info.nombre}${info.sede ? ` (${info.sede})` : ''}${info.bloque ? ` - Bloque ${info.bloque}` : ''
            }`,
          value: codigo,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));

      this.aulasOptions = opcionesAulas;
    }


  }

  private pintarEventos(): void {
    let datos = [...this.filasBase];

    datos = this.aplicarFiltroBloque(datos);
    datos = this.aplicarFiltroSede(datos);
    datos = this.aplicarFiltroAula(datos);

    datos.sort((a, b) => {
      const porAula = (a.codAula || '').localeCompare(b.codAula || '');
      return porAula !== 0
        ? porAula
        : this.convertirAHora24(a.horaInicio).localeCompare(
          this.convertirAHora24(b.horaInicio)
        );
    });

    const eventos = this.generarEventos(datos);
    this.calendarOptions = { ...this.calendarOptions, events: eventos };
  }

  private aplicarFiltroBloque(datos: HorarioItem[]): HorarioItem[] {
    if (!this.bloqueSeleccionado.trim()) return datos;

    const bloqueNormalizado = this.normalizarTexto(this.bloqueSeleccionado);

    return datos.filter((item) => {
      const nombreAula = this.obtenerNombreAula(item.codAula, item.nomAula);
      const key = this.normalizarTexto(nombreAula);

      const itemData = item as HorarioItemData;
      const bloqueFila = itemData.nomBloque
        ? this.normalizarTexto(String(itemData.nomBloque))
        : '';
      const bloqueMap = this.bloqueAulaPorNombre.get(key)
        ? this.normalizarTexto(this.bloqueAulaPorNombre.get(key) || '')
        : '';
      const bloqueDesdeNombre = this.extraerBloqueDelNombre(nombreAula);
      const bloqueDesCodigo = this.extraerBloqueDelCodigo(item.codAula || '');

      const bloquesEncontrados = [
        bloqueFila,
        bloqueMap,
        bloqueDesdeNombre,
        bloqueDesCodigo,
      ].filter((b) => b.length > 0);



      return bloquesEncontrados.some((bloque) => bloque === bloqueNormalizado);
    });
  }

  private aplicarFiltroSede(datos: HorarioItem[]): HorarioItem[] {
    if (this.sedesSeleccionadasArray.length === 0) {
      return datos;
    }

    const sedesNormalizadas = new Set(
      this.sedesSeleccionadasArray.map((s) => this.canonicalizarSede(s))
    );

    return datos.filter((item) => {
      const nombreAula = this.obtenerNombreAula(item.codAula, item.nomAula);

      const sedeMapa = this.obtenerSede(nombreAula);
      const sedeDesdeNombre = this.extraerSedeDelNombre(nombreAula);
      const sedeDesCodigo = this.extraerSedeDelCodigo(item.codAula || '');

      const itemData = item as HorarioItemData;
      const sedeApi = itemData.sede
        ? this.canonicalizarSede(String(itemData.sede))
        : '';

      const sedesPosibles = [
        sedeMapa,
        sedeDesdeNombre,
        sedeDesCodigo,
        sedeApi,
      ].filter((s) => s.length > 0);

      return sedesPosibles.some((sede) => sedesNormalizadas.has(sede));
    });
  }

  private aplicarFiltroAula(datos: HorarioItem[]): HorarioItem[] {
    if (this.aulasSeleccionadasArray.length === 0) {
      return datos;
    }

    const identificadoresValidos =
      this.obtenerIdentificadoresAulasSeleccionadas(
        datos,
        this.aulasSeleccionadasArray
      );

    return datos.filter((item) => {
      const codigo = (item.codAula || '').trim();
      const nombre = this.obtenerNombreAula(codigo, item.nomAula).trim();

      const coincidePorCodigo = identificadoresValidos.codigos.has(codigo);
      const coincidePorNombre = identificadoresValidos.nombres.has(nombre);

      return coincidePorCodigo || coincidePorNombre;
    });
  }

  private obtenerIdentificadoresAulasSeleccionadas(
    filas: HorarioItem[],
    aulasSeleccionadas: string[]
  ): { codigos: Set<string>; nombres: Set<string> } {
    const codigos = new Set<string>();
    const nombres = new Set<string>();

    const nombreACodigo = new Map<string, string>();
    const codigoANombre = new Map<string, string>();

    filas.forEach((f) => {
      const cod = f.codAula?.trim();
      const nom = this.obtenerNombreAula(cod, f.nomAula).trim();
      if (cod && nom) {
        nombreACodigo.set(nom, cod);
        codigoANombre.set(cod, nom);
      }
    });

    aulasSeleccionadas.forEach((seleccion) => {
      const valor = seleccion.trim();
      if (!valor) return;

      if (codigoANombre.has(valor)) {
        codigos.add(valor);
        const nombre = codigoANombre.get(valor);
        if (nombre) nombres.add(nombre);

        return;
      }

      if (nombreACodigo.has(valor)) {
        nombres.add(valor);
        const codigo = nombreACodigo.get(valor);
        if (codigo) codigos.add(codigo);

        return;
      }

      const valorNormalizado = this.normalizarTexto(valor);

      for (const [nombre, codigo] of nombreACodigo.entries()) {
        if (
          this.normalizarTexto(nombre).includes(valorNormalizado) ||
          valorNormalizado.includes(this.normalizarTexto(nombre))
        ) {
          nombres.add(nombre);
          codigos.add(codigo);

          break;
        }
      }

      for (const [codigo, nombre] of codigoANombre.entries()) {
        if (
          this.normalizarTexto(codigo).includes(valorNormalizado) ||
          valorNormalizado.includes(this.normalizarTexto(codigo))
        ) {
          codigos.add(codigo);
          nombres.add(nombre);

          break;
        }
      }

      if (!codigos.has(valor) && !nombres.has(valor)) {
        codigos.add(valor);

      }
    });



    return { codigos, nombres };
  }

  private generarEventos(datos: HorarioItem[]): EventInput[] {
    const eventos: EventInput[] = [];
    const clavesVistas = new Set<string>();
    const codigosLeyenda = new Set<string>();

    datos.forEach((fila) => {
      const diaSemana = this.mapearDiaSemana(fila.diaSemana);
      if (diaSemana === null) return;

      const inicio = this.convertirAHora24(fila.horaInicio);
      const fin = this.convertirAHora24(fila.horaFin);
      const codigo = fila.codAula?.trim() || '';
      const nombre = this.obtenerNombreAula(codigo, fila.nomAula);

      const clave = `${codigo}|${diaSemana}|${inicio}|${fin}`;
      if (clavesVistas.has(clave)) return;
      clavesVistas.add(clave);
      codigosLeyenda.add(codigo);

      const { fondo, borde, texto } = this.obtenerColores(codigo);
      const sede = this.obtenerSede(nombre);
      const tipo = this.obtenerTipo(nombre);
      const filaData = fila as HorarioItemData;
      const bloqueFila = filaData.nomBloque?.toString() || '';
      const bloqueMap =
        this.bloqueAulaPorNombre.get(this.normalizarTexto(nombre)) || '';
      const bloque = bloqueFila || bloqueMap;

      const evento: EventInput = {
        groupId: codigo,
        title: '',
        daysOfWeek: [diaSemana],
        startTime: inicio,
        endTime: fin,
        backgroundColor: fondo,
        borderColor: borde,
        textColor: texto,
        extendedProps: {
          aulaCode: codigo,
          aulaName: nombre,
          bloque: bloque || undefined,
          sede: sede || undefined,
          tipo: tipo || undefined,
          materia: fila.materia,
          docente: fila.docente,
        },
      };

      eventos.push(evento);
    });

    this.actualizarLeyenda(Array.from(codigosLeyenda));
    return eventos;
  }

  private actualizarLeyenda(codigos: string[]): void {
    this.legendAulas = codigos
      .map((codigo) => {
        const nombre = this.obtenerNombreAula(codigo) || codigo;
        const { fondo, borde } = this.obtenerColores(codigo);
        return { code: codigo, label: nombre, color: fondo, border: borde };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  private ajustarScrollInicial(filas: HorarioItem[]): void {
    const minutos = filas
      .map((f) => {
        const [h, m] = this.convertirAHora24(f.horaInicio)
          .split(':')
          .map(Number);
        return isNaN(h) ? null : h * 60 + (m || 0);
      })
      .filter((m): m is number => m !== null);

    const minimoEventos = minutos.length > 0 ? Math.min(...minutos) - 30 : 480;
    const minimo = Math.max(360, minimoEventos);
    const hh = String(Math.floor(minimo / 60)).padStart(2, '0');
    const mm = String(minimo % 60).padStart(2, '0');

    const scrollTime = `${hh}:${mm}:00`;
    this.calendarOptions = { ...this.calendarOptions, scrollTime };

    setTimeout(() => {
      if (this.fc?.getApi()) {
        this.fc.getApi().scrollToTime(scrollTime);
      }
    }, 200);
  }

  private actualizarConfiguracionResponsive(): void {
    this.calendarOptions = {
      ...this.calendarOptions,
      aspectRatio: this.isMobile ? 0.8 : 1.35,
      contentHeight: this.isMobile ? 'auto' : undefined,
      dayHeaderFormat: this.isMobile
        ? { weekday: 'short', day: 'numeric', month: 'short' }
        : { weekday: 'long', day: 'numeric', month: 'long' },
    };

    setTimeout(() => {
      if (this.fc?.getApi()) {
        this.fc.getApi().updateSize();
      }
    }, 100);
  }

  private obtenerNombreAula(codigo?: string, nombreOpcional?: string): string {
    const cod = codigo?.trim();
    if (!cod) return nombreOpcional || '';
    return this.nombreAulaPorCodigo.get(cod) || nombreOpcional || cod;
  }

  private obtenerSede(nombreAula: string): string {
    const key = this.normalizarTexto(nombreAula);
    return this.sedeAulaPorNombre.get(key) || '';
  }

  private obtenerTipo(nombreAula: string): string {
    const key = this.normalizarTexto(nombreAula);
    return this.tipoAulaPorNombre.get(key) || '';
  }

  private obtenerColores(codigo: string): {
    fondo: string;
    borde: string;
    texto: string;
  } {
    if (!this.codigoAulaToColorIndex.has(codigo)) {
      const index = this.siguienteColorIndex % this.PALETA.length;
      this.codigoAulaToColorIndex.set(codigo, index);
      this.siguienteColorIndex++;
    }

    const colorIndex = this.codigoAulaToColorIndex.get(codigo) || 0;
    const colorFondo = this.PALETA[colorIndex];
    return {
      fondo: colorFondo,
      borde: this.oscurecerColor(colorFondo, 0.05),
      texto: '#374151',
    };
  }

  private extraerBloqueDelNombre(nombreAula: string): string {
    if (!nombreAula) return '';

    const nombreNormalizado = nombreAula.toUpperCase().trim();

    if (
      nombreNormalizado.includes('MARIA INMACULADA') ||
      nombreNormalizado.includes('MARIANA') ||
      nombreNormalizado.includes('INMACULADA')
    ) {
      return 'Maria Inmaculada';
    }
    if (
      nombreNormalizado.includes('SAN JOSE') ||
      nombreNormalizado.includes('SAN JOSÉ')
    ) {
      return 'San José';
    }
    if (
      nombreNormalizado.includes('SAN FRANCISCO') ||
      nombreNormalizado.includes('FRANCISCO')
    ) {
      return 'San Francisco';
    }
    if (
      nombreNormalizado.includes('ALVERNIA') ||
      nombreNormalizado.includes('ALVER')
    ) {
      return 'Alvernia';
    }

    const patrones = [
      /BLOQUE\s*([A-Z0-9 ]+)/i,
      /BL\s*([A-Z0-9 ]+)/i,
      /EDIFICIO\s*([A-Z0-9 ]+)/i,
    ];

    for (const patron of patrones) {
      const match = nombreNormalizado.match(patron);
      if (match && match[1]) {
        const bloque = match[1].trim();
        if (bloque.includes('MARIA') || bloque.includes('INMACULADA'))
          return 'Maria Inmaculada';
        if (bloque.includes('SAN JOSE') || bloque.includes('SAN JOSÉ'))
          return 'San José';
        if (bloque.includes('SAN FRANCISCO') || bloque.includes('FRANCISCO'))
          return 'San Francisco';
        if (bloque.includes('ALVERNIA')) return 'Alvernia';
      }
    }

    return '';
  }

  private extraerBloqueDelCodigo(codigoAula: string): string {
    if (!codigoAula) return '';

    const codigoNormalizado = codigoAula.toUpperCase().trim();

    if (
      codigoNormalizado.startsWith('A') ||
      codigoNormalizado.includes('ALV')
    ) {
      return 'Alvernia';
    }
    if (
      codigoNormalizado.startsWith('M') ||
      codigoNormalizado.includes('MAR') ||
      codigoNormalizado.includes('MARI') ||
      codigoNormalizado.startsWith('C')
    ) {
      return 'Maria Inmaculada';
    }
    if (
      codigoNormalizado.startsWith('SJ') ||
      codigoNormalizado.includes('JOSE')
    ) {
      return 'San José';
    }
    if (
      codigoNormalizado.startsWith('SF') ||
      codigoNormalizado.includes('FRAN')
    ) {
      return 'San Francisco';
    }

    return '';
  }

  private extraerSedeDelNombre(nombreAula: string): string {
    if (!nombreAula) return '';

    const nombreNormalizado = nombreAula.toUpperCase().trim();

    if (
      nombreNormalizado.includes('ALVERNIA') ||
      nombreNormalizado.includes('ALVER') ||
      nombreNormalizado.includes('ALV')
    ) {
      return 'Sede Alvernia';
    }
    if (
      nombreNormalizado.includes('CENTRAL') ||
      nombreNormalizado.includes('MARIANA') ||
      nombreNormalizado.includes('INMACULADA') ||
      nombreNormalizado.includes('MARI') ||
      nombreNormalizado.includes('PRINCIPAL') ||
      nombreNormalizado.includes('MAIN')
    ) {
      return 'Sede Central';
    }

    return '';
  }

  private extraerSedeDelCodigo(codigoAula: string): string {
    if (!codigoAula) return '';

    const codigoNormalizado = codigoAula.toUpperCase().trim();

    if (
      codigoNormalizado.startsWith('A') ||
      codigoNormalizado.includes('ALV') ||
      codigoNormalizado.includes('ALVER')
    ) {
      return 'Sede Alvernia';
    }
    if (
      codigoNormalizado.startsWith('M') ||
      codigoNormalizado.startsWith('C') ||
      codigoNormalizado.includes('MAR') ||
      codigoNormalizado.includes('MARI') ||
      codigoNormalizado.includes('PRIN') ||
      codigoNormalizado.includes('CENTRAL') ||
      codigoNormalizado.includes('MAIN')
    ) {
      return 'Sede Central';
    }

    return '';
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private canonicalizarSede(sede: string): string {
    const normalizado = this.normalizarTexto(sede);
    if (!normalizado) return '';

    if (normalizado.includes('ALVERNIA') || normalizado.includes('ALVER')) {
      return 'Sede Alvernia';
    }
    if (
      normalizado.includes('CENTRAL') ||
      normalizado.includes('PRINCIPAL') ||
      normalizado.includes('MARIANA') ||
      normalizado.includes('INMACULADA') ||
      normalizado.includes('MARI')
    ) {
      return 'Sede Central';
    }
    return sede.trim();
  }

  private esAulaVirtual(codigo?: string, nombre?: string): boolean {
    const c = (codigo || '').toUpperCase().replace(/\s+/g, '');
    const n = (nombre || '').toUpperCase();
    return c.includes('VIRTUAL') || n.includes('VIRTUAL');
  }

  private obtenerDiaSemana(fecha: Date): string {
    const dias = [
      'DOMINGO',
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
      'SABADO',
    ];
    return dias[fecha.getDay()];
  }

  private mapearDiaSemana(dia?: string): number | null {
    if (!dia) return null;
    const mapa: Record<string, number> = {
      DOMINGO: 0,
      LUNES: 1,
      MARTES: 2,
      MIERCOLES: 3,
      MIÉRCOLES: 3,
      JUEVES: 4,
      VIERNES: 5,
      SABADO: 6,
      SÁBADO: 6,
    };
    return mapa[dia.trim().toUpperCase()] ?? null;
  }

  private convertirAHora24(hora: string): string {
    if (!hora) return '00:00';

    const valor = hora.trim().toUpperCase();

    if (!valor.endsWith('AM') && !valor.endsWith('PM')) {
      const [h = '0', m = '0'] = valor.split(':');
      return `${String(Math.min(23, Math.max(0, parseInt(h)))).padStart(
        2,
        '0'
      )}:${String(Math.min(59, Math.max(0, parseInt(m)))).padStart(2, '0')}`;
    }

    const esAm = valor.endsWith('AM');
    const base = valor.replace(/AM|PM|\./g, '').trim();
    const [h = '0', m = '0'] = base.split(':');
    let horas = parseInt(h);
    const minutos = String(parseInt(m)).padStart(2, '0');

    if (esAm) {
      if (horas === 12) horas = 0;
    } else {
      if (horas !== 12) horas += 12;
    }

    return `${String(horas).padStart(2, '0')}:${minutos}`;
  }

  private formatearAmPm(fecha: Date): string {
    const h24 = fecha.getHours();
    const m = fecha.getMinutes();
    const sufijo = h24 >= 12 ? 'PM' : 'AM';
    const h12 = ((h24 + 11) % 12) + 1;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(
      2,
      '0'
    )} ${sufijo}`;
  }

  private oscurecerColor(hex: string, factor: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.floor((num >> 16) * (1 - factor));
    const g = Math.floor(((num >> 8) & 0x00ff) * (1 - factor));
    const b = Math.floor((num & 0x0000ff) * (1 - factor));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridDay',
    initialDate: new Date(),
    headerToolbar: { left: '', center: 'title', right: '' },
    height: '100%',
    aspectRatio: this.isMobile ? 0.8 : 1.35,
    handleWindowResize: true,
    windowResizeDelay: 100,
    expandRows: false,
    contentHeight: this.isMobile ? 'auto' : undefined,
    stickyHeaderDates: true,
    allDaySlot: false,
    slotMinTime: '06:00:00',
    slotMaxTime: '23:00:00',
    slotDuration: '00:30:00',
    scrollTime: '08:00:00',
    slotEventOverlap: false,
    nowIndicator: true,
    editable: false,
    selectable: false,
    eventOrder: 'groupId,start,-duration,title',
    eventOrderStrict: true,
    locale: esLocale,
    buttonText: { today: 'Hoy', day: 'Día' },
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      omitZeroMinute: false,
    },
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      omitZeroMinute: false,
    },
    dayHeaderFormat: this.isMobile
      ? { weekday: 'short', day: 'numeric', month: 'short' }
      : { weekday: 'long', day: 'numeric', month: 'long' },

    eventContent: (arg) => {
      const inicio = arg.event.start ? this.formatearAmPm(arg.event.start) : '';
      const fin = arg.event.end ? this.formatearAmPm(arg.event.end) : '';
      const props =
        (arg.event as unknown as { extendedProps?: Record<string, unknown> })
          .extendedProps || {};
      const materia = (props['materia'] as string) ?? '';
      const docente = (props['docente'] as string) ?? '';

      let subtitulo = '';
      if (materia || docente) {
        if (materia && docente) {
          subtitulo = `<div class="ev-sub text-xs leading-4 font-medium truncate hidden sm:block" style="text-shadow: 1px 1px 1px rgba(0,0,0,0.8);">${materia} · ${docente}</div>`;
          subtitulo += `<div class="ev-sub text-xs leading-3 font-medium truncate block sm:hidden" style="text-shadow: 1px 1px 1px rgba(0,0,0,0.8);">${materia.length > 12 ? materia.substring(0, 10) + '...' : materia
            }</div>`;
        } else {
          const texto = materia || docente;
          subtitulo = `<div class="ev-sub text-xs leading-4 font-medium truncate hidden sm:block" style="text-shadow: 1px 1px 1px rgba(0,0,0,0.8);">${texto}</div>`;
          subtitulo += `<div class="ev-sub text-xs leading-3 font-medium truncate block sm:hidden" style="text-shadow: 1px 1px 1px rgba(0,0,0,0.8);">${texto.length > 12 ? texto.substring(0, 10) + '...' : texto
            }</div>`;
        }
      }

      return {
        html: `
          <div class="ev text-black dark:text-white">
            <div class="ev-time font-extrabold" style="text-shadow: 1px 1px 1px rgba(0,0,0,0.8);">
              <span class="hidden sm:inline">${inicio} – ${fin}</span>
              <span class="inline sm:hidden text-xs">${inicio.split(' ')[0]}-${fin.split(' ')[0]
          }</span>
            </div>
            ${subtitulo}
          </div>
        `,
      };
    },

    eventDidMount: (arg) => {
      const props =
        (arg.event as unknown as { extendedProps?: Record<string, unknown> })
          .extendedProps || {};
      const inicio = arg.event.start ? this.formatearAmPm(arg.event.start) : '';
      const fin = arg.event.end ? this.formatearAmPm(arg.event.end) : '';

      arg.el.title = [
        props['aulaName'] ? `Aula: ${props['aulaName']}` : '',
        props['bloque'] ? `Bloque: ${props['bloque']}` : '',
        props['sede'] ? `Sede: ${props['sede']}` : '',
        props['tipo'] ? `Tipo: ${props['tipo']}` : '',
        props['materia'] ? `Materia: ${props['materia']}` : '',
        props['docente'] ? `Docente: ${props['docente']}` : '',
        inicio && fin ? `Horario: ${inicio} – ${fin}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    },

    events: [],
  };
}
