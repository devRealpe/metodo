import { Component, OnInit, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { AccordionModule } from 'primeng/accordion';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { ConvocatoriasPublicasService } from '../../core/services/convocatorias-publicas.service';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { PostulacionSeleccionada } from '../../core/models/postulacion-seleccionada.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ConvocatoriaCerrada extends OfertaLaboral {
  preseleccionados: PostulacionSeleccionada[];
  loadingPreseleccionados: boolean;
}

interface ConvocatoriaFinalizada extends OfertaLaboral {
  seleccionados: PostulacionSeleccionada[];
  loadingSeleccionados: boolean;
}

@Component({
  selector: 'app-convocatorias-publicas-component',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TabsModule,
    DividerModule,
    ProgressSpinnerModule,
    ChipModule,
    BadgeModule,
    AccordionModule,
    InputTextModule,
    TooltipModule,
    MessageModule,
    DialogModule,
  ],
  templateUrl: './convocatorias-publicas-component.html',
  styleUrl: './convocatorias-publicas-component.scss',
})
export class ConvocatoriasPublicasComponent implements OnInit, AfterViewInit {
  // State
  loading = signal(true);
  activeTab = signal(0);
  searchTerm = signal('');
  showDetail = signal(false);
  selectedOferta = signal<OfertaLaboral | null>(null);

  // Link al manual/instructivo (archivo local en `public/assets/manuales`)
  // Note: espacios codificados para URL
  readonly manualInstructivoUrl = 'assets/manuales/Manual%20Aspirante%20Hojas%20de%20vida.pdf';

  // Modal state for showing the manual PDF
  showManualModal = signal(false);

  // Safe resource URL for iframe (used in template)
  manualSafeUrl = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.manualInstructivoUrl));

  // Two-way binding helper for PrimeNG dialog
  get manualVisible(): boolean {
    return this.showManualModal();
  }
  set manualVisible(v: boolean) {
    this.showManualModal.set(v);
  }

  // Two-way binding helper for active tab (PrimeNG `p-tabs` value)
  get activeTabIndex(): number {
    return this.activeTab();
  }
  set activeTabIndex(v: number) {
    this.activeTab.set(v);
  }

  // Data
  convocatoriasAbiertas = signal<OfertaLaboral[]>([]);
  convocatoriasCerradas = signal<ConvocatoriaCerrada[]>([]);
  convocatoriasFinalizadas = signal<ConvocatoriaFinalizada[]>([]);

  // Computed filtered lists
  filteredAbiertas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const ahora = new Date();
    return this.convocatoriasAbiertas()
      .filter(c => {
        // Excluir convocatorias cuya fecha de cierre ya pasó completamente.
        // El día de cierre es inclusivo: la oferta permanece abierta durante TODO ese día
        // (hasta las 23:59:59) y se cierra al pasar a la medianoche siguiente.
        // Se usan componentes UTC para evitar el desfase horario en fechas ISO con zona "Z".
        if (c.fechaCierre) {
          const parsed = new Date(c.fechaCierre);
          const finDelDiaDeCierre = new Date(
            parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999
          );
          if (finDelDiaDeCierre < ahora) return false;
        }
        return (
          !term ||
          c.cargoRequerido?.toLowerCase().includes(term) ||
          c.departamentoSolicitante?.toLowerCase().includes(term) ||
          c.numeroConvocatoria?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const da = this.normalizeDateForCards(a.fechaPublicacion);
        const db = this.normalizeDateForCards(b.fechaPublicacion);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
  });

  filteredCerradas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.convocatoriasCerradas()
      .filter(c =>
        !term ||
        c.cargoRequerido?.toLowerCase().includes(term) ||
        c.departamentoSolicitante?.toLowerCase().includes(term) ||
        c.numeroConvocatoria?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const da = this.normalizeDateForCards(a.fechaPublicacion);
        const db = this.normalizeDateForCards(b.fechaPublicacion);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
  });

  filteredFinalizadas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.convocatoriasFinalizadas()
      .filter(c =>
        !term ||
        c.cargoRequerido?.toLowerCase().includes(term) ||
        c.departamentoSolicitante?.toLowerCase().includes(term) ||
        c.numeroConvocatoria?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const da = this.normalizeDateForCards(a.fechaPublicacion);
        const db = this.normalizeDateForCards(b.fechaPublicacion);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
  });

  currentYear = new Date().getFullYear();
  showAnnouncementBanner = false;
  // Base href for the app (used to build URLs that respect <base href>)
  baseHref = '/';

  constructor(
    private publicService: ConvocatoriasPublicasService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // Resolve base href from document so asset URLs work when the app is hosted under a subpath
    const baseEl = document.getElementsByTagName('base')[0];
    this.baseHref = (baseEl && baseEl.getAttribute('href')) ? baseEl.getAttribute('href')! : '/';

    this.loadData();
    this.showAnnouncementBanner = true;
  }

  ngAfterViewInit() {
    // PrimeNG p-tabs focuses the active tab on init, which causes the browser to scroll down.
    // A small timeout lets PrimeNG finish its initialization before we reset the scroll.
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    }, 50);
  }

  closeBanner() {
    this.showAnnouncementBanner = false;
  }

  private loadData() {
    this.loading.set(true);

    forkJoin({
      activas: this.publicService.getActivas().pipe(catchError(() => of<OfertaLaboral[]>([])),),
      cerradas: this.publicService.getCerradas().pipe(catchError(() => of<OfertaLaboral[]>([])),),
    }).subscribe({
      next: ({ activas, cerradas }) => {
        this.convocatoriasAbiertas.set(activas);
        this.procesarCerradas(cerradas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private procesarCerradas(cerradas: OfertaLaboral[]) {
    const conPreseleccionados: ConvocatoriaCerrada[] = [];
    const finalizadas: ConvocatoriaFinalizada[] = [];

    cerradas.forEach(oferta => {
      // Load fase3 first to classify
      this.publicService.listarSeleccionadosFase3PorOferta(oferta.id!).subscribe({
        next: (seleccionadosFase3) => {
          if (seleccionadosFase3 && seleccionadosFase3.length > 0) {
            // Has fase3 selections → goes to "Resultados Finales"
            finalizadas.push({
              ...oferta,
              seleccionados: seleccionadosFase3,
              loadingSeleccionados: false,
            });
            this.convocatoriasFinalizadas.set([...finalizadas]);
          } else {
            // No fase3 → goes to "Preseleccionados" tab
            const cerradaItem: ConvocatoriaCerrada = {
              ...oferta,
              preseleccionados: [],
              loadingPreseleccionados: true,
            };
            conPreseleccionados.push(cerradaItem);
            this.convocatoriasCerradas.set([...conPreseleccionados]);

            // Load seleccionados fase2
            this.publicService.listarSeleccionadosFase2PorOferta(oferta.id!).subscribe({
              next: (seleccionados) => {
                cerradaItem.preseleccionados = seleccionados;
                cerradaItem.loadingPreseleccionados = false;
                this.convocatoriasCerradas.set([...conPreseleccionados]);
              },
              error: () => {
                cerradaItem.loadingPreseleccionados = false;
                this.convocatoriasCerradas.set([...conPreseleccionados]);
              },
            });
          }
        },
        error: () => {
          // If we can't check fase3, treat as cerrada with preseleccionados
          const cerradaItem: ConvocatoriaCerrada = {
            ...oferta,
            preseleccionados: [],
            loadingPreseleccionados: true,
          };
          conPreseleccionados.push(cerradaItem);
          this.convocatoriasCerradas.set([...conPreseleccionados]);

          this.publicService.listarSeleccionadosFase2PorOferta(oferta.id!).subscribe({
            next: (seleccionados) => {
              cerradaItem.preseleccionados = seleccionados;
              cerradaItem.loadingPreseleccionados = false;
              this.convocatoriasCerradas.set([...conPreseleccionados]);
            },
            error: () => {
              cerradaItem.loadingPreseleccionados = false;
              this.convocatoriasCerradas.set([...conPreseleccionados]);
            },
          });
        },
      });
    });
  }

  navigateToSystem() {
    window.location.href = window.location.origin + '/hojas_de_vida/register';
  }

  openDetail(oferta: OfertaLaboral) {
    this.selectedOferta.set(oferta);
    this.showDetail.set(true);
  }

  openManual() {
    this.showManualModal.set(true);
  }

  closeManual() {
    this.showManualModal.set(false);
  }

  private normalizeDateForCards(date: string | Date | null | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) {
      const d = date;
      if (isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    // Use UTC components to avoid timezone shifts when the source is an ISO Z string
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0);
  }

  formatDate(date: string | Date): string {
    const d = this.normalizeDateForCards(date);
    if (!d) return '';
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getDaysRemaining(fechaCierre: string | Date): number {
    const cierre = this.normalizeDateForCards(fechaCierre);
    if (!cierre) return 0;
    const today = new Date();
    const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    return Math.ceil((cierre.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24));
  }

  getUrgencySeverity(fechaCierre: string | Date): 'success' | 'warn' | 'danger' | 'info' {
    const days = this.getDaysRemaining(fechaCierre);
    if (days <= 0) return 'warn';   // Cierra hoy — aún abierta, pero último día
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warn';
    return 'success';
  }

  /** Etiqueta amigable para el plazo de cierre. */
  getDeadlineLabel(fechaCierre: string | Date): string {
    const days = this.getDaysRemaining(fechaCierre);
    if (days <= 0) return 'Cierra hoy';
    if (days === 1) return '1 día restante';
    return `${days} días restantes`;
  }

  // Extract a competencias description from requisitos (if present)
  getCompetenciasSnippet(oferta: any): string | null {
    if (!oferta || !Array.isArray(oferta.requisitos)) return null;
    const comp = oferta.requisitos.find((r: any) => {
      const key = (r.titulo || r.nombre || '').toString().toLowerCase();
      return key.includes('competenc') || key.includes('competitia') || key.includes('compet');
    });
    if (!comp || !comp.descripcion) return null;
    const text = comp.descripcion as string;
    return text.length > 350 ? text.slice(0, 350).trim() + '...' : text;
  }

  // Extract primary requisitos focusing on academic/formación items
  getRequisitosPrincipales(oferta: any): string | null {
    if (!oferta || !Array.isArray(oferta.requisitos) || oferta.requisitos.length === 0) return null;

    const keywords = [
      'pregrado', 'posgrado', 'grado', 'título', 'titulo', 'formación', 'formacion',
      'educación', 'educacion', 'formacion academica', 'formación académica', 'nivel', 'estudio'
    ];

    const isPlaceholder = (s: any) => {
      if (s === null || s === undefined) return true;
      const t = String(s).trim().toLowerCase();
      if (!t) return true;
      return ['n/a', 'na', 'n. a.', 'n. a', 'no aplica', 'noaplica', '—', '-', 'sin información', 'sin informacion']
        .some(x => t === x || t === x.replace(/\s+/g, ''));
    };

    // Find requisitos that look like academic entries
    const matches = oferta.requisitos.filter((r: any) => {
      const key = (r.titulo || r.nombre || '').toString().toLowerCase();
      return keywords.some(k => key.includes(k));
    });

    const candidates = (matches && matches.length > 0) ? matches : oferta.requisitos.slice(0, 3);

    const lines: string[] = [];

    for (const r of candidates) {
      // When using academic structure, collect all titles from all groups
      if (r.usaEstructuraAcademica && Array.isArray(r.gruposAcademicos) && r.gruposAcademicos.length > 0) {
        for (const grupo of r.gruposAcademicos) {
          if (!Array.isArray(grupo.titulos)) continue;
          for (const t of grupo.titulos) {
            if (t.activo === false) continue;
            const nombre = (t.tituloAcademico || '').trim();
            if (nombre && !isPlaceholder(nombre)) {
              lines.push('• ' + nombre);
            }
          }
        }
      } else {
        // Plain description
        const desc = r.descripcion || r.titulo || r.nombre || '';
        const text = typeof desc === 'string' ? desc.trim() : String(desc).trim();
        if (!isPlaceholder(text)) {
          lines.push('• ' + (text.length > 120 ? text.slice(0, 120).trim() + '...' : text));
        }
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  getInitials(nombre: string | undefined): string {
    if (!nombre) return '?';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  }
}
