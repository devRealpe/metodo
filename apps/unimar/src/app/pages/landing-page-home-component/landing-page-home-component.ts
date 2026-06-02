import { Component, OnInit, OnDestroy, HostListener, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { ToolbarModule } from 'primeng/toolbar';
import { PanelModule } from 'primeng/panel';
import { BadgeModule } from 'primeng/badge';
import { environment } from '@shared/shared-environments';

export interface Sistema {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'beta' | 'new' | 'down';
  tags: string[];
  route: string;
  color: string;
  size: 'large' | 'medium' | 'small';
}

@Component({
  selector: 'app-landing-page-home-component',
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    RippleModule,
    TooltipModule,
    CardModule,
    DividerModule,
    ChipModule,
    ToolbarModule,
    PanelModule,
    BadgeModule,
  ],
  templateUrl: './landing-page-home-component.html',
  styleUrls: ['./landing-page-home-component.scss'],
})
export class LandingPageHomeComponent implements OnInit, OnDestroy {
  isScrolled = signal(false);
  activeNav = signal('inicio');
  isDarkTheme = signal(true);
  currentYear = new Date().getFullYear();

  navLinks = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'sistemas', label: 'Sistemas' },
    { id: 'acerca', label: 'Acerca de' },
    { id: 'contacto', label: 'Contacto' },
  ];

  sistemas: Sistema[] = [
    {
      id: 'hojas_de_vida',
      name: 'Hojas de Vida',
      description:
        'Gestión integral de hojas de vida institucionales. Administra información personal, académica, laboral, competencias y procesos de selección de talento humano.',
      icon: 'pi pi-id-card',
      status: 'active',
      tags: ['Talento Humano', 'Selección', 'RRHH'],
      route: '/hojas-de-vida',
      color: 'cyan',
      size: 'large',
    },
    {
      id: 'viaticos',
      name: 'Viáticos',
      description:
        'Solicitud y aprobación de viáticos institucionales. Gestiona tarifas, aprobaciones y seguimiento de gastos de desplazamiento.',
      icon: 'pi pi-wallet',
      status: 'active',
      tags: ['Finanzas', 'Aprobaciones', 'Gestión'],
      route: '/viaticos',
      color: 'violet',
      size: 'medium',
    },
    {
      id: 'laboratorios',
      name: 'Laboratorios',
      description:
        'Administración de laboratorios, equipos, suministros y programación de espacios. Control de inventario y mantenimiento.',
      icon: 'pi pi-wrench',
      status: 'active',
      tags: ['Equipos', 'Inventario', 'Espacios'],
      route: '/laboratorios',
      color: 'emerald',
      size: 'medium',
    },
    {
      id: 'planes_de_trabajo',
      name: 'Planes de Trabajo',
      description:
        'Planificación estratégica y seguimiento de actividades por roles institucionales: docentes, directores, decanos y vicerrectoría.',
      icon: 'pi pi-calendar',
      status: 'active',
      tags: ['Planeación', 'Seguimiento', 'Reportes'],
      route: '/planes-de-trabajo',
      color: 'amber',
      size: 'medium',
    },
    {
      id: 'internacionalizacion',
      name: 'Internacionalización',
      description:
        'Gestión de convenios internacionales, movilidad académica, cooperación institucional y relaciones internacionales.',
      icon: 'pi pi-globe',
      status: 'active',
      tags: ['Convenios', 'Movilidad', 'Cooperación'],
      route: '/internacionalizacion',
      color: 'rose',
      size: 'medium',
    },
  ];

  stats = [
    { value: '5', label: 'Sistemas Integrados', icon: 'pi pi-server' },
    { value: '100%', label: 'Cobertura Institucional', icon: 'pi pi-building' },
    { value: '24/7', label: 'Disponibilidad', icon: 'pi pi-shield' },
    { value: 'SSO', label: 'Acceso Unificado', icon: 'pi pi-lock' },
  ];

  statusMap: Record<string, { label: string; severity: string }> = {
    active: { label: 'Activo', severity: 'success' },
    down: { label: 'Inactivo', severity: 'danger' },
    beta: { label: 'Beta', severity: 'warning' },
    new: { label: 'Nuevo', severity: 'info' },
  };

  private particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
  private animationId: number = 0;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private themeMediaQuery!: MediaQueryList;
  private cyanRGB = { r: 0, g: 229, b: 255 };

  private readonly http = inject(HttpClient);

  /** Endpoints de health check vía Gateway */
  private readonly healthEndpoints: Record<string, string> = {
    hojas_de_vida:       `${environment.apiHojasDeVida}/hojas-de-vida/actuator/health`,
    viaticos:            `${environment.apiViaticos}/actuator/health`,
    laboratorios:        `${environment.apilaboratoriosLocal}/actuator/health`,
    planes_de_trabajo:   `${environment.apiPlanesDeTraba}/actuator/health`,
    internacionalizacion:`${environment.internacionalizacionApi}/actuator/health`,
  };

  /** URLs base de cada sistema (standalone con su propio login) */
  private readonly systemUrls: Record<string, string> = environment.authApi
    ? {
        '/hojas-de-vida':       'https://apps.umariana.edu.co/hojas_de_vida/',
        '/viaticos':            'https://apps.umariana.edu.co/viaticos/',
        '/laboratorios':        'https://apps.umariana.edu.co/laboratorios/',
        '/planes-de-trabajo':   'https://apps.umariana.edu.co/planes_de_trabajo/',
        '/internacionalizacion':'https://apps.umariana.edu.co/internacionalizacion/',
      }
    : {
        '/hojas-de-vida':       'http://localhost:4201/',
        '/viaticos':            'http://localhost:4202/',
        '/laboratorios':        'http://localhost:4203/',
        '/planes-de-trabajo':   'http://localhost:4204/',
        '/internacionalizacion':'http://localhost:4205/',
      };

  constructor() {}

  @HostListener('window:scroll', [])
  onScroll() {
    this.isScrolled.set(window.scrollY > 60);
  }

  ngOnInit() {
    this.applySystemTheme();
    this.initParticles();
    this.checkSystemsHealth();
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.themeMediaQuery?.removeEventListener('change', this.onThemeChange);
  }

  scrollToSection(id: string) {
    this.activeNav.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  navigateToSystem(route: string) {
    const url = this.systemUrls[route];
    if (url) {
      window.location.href = url;
    }
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'warn' | 'info' | 'danger'> = {
      active: 'success',
      down: 'danger',
      beta: 'warn',
      new: 'info',
    };
    return map[status] || 'info';
  }

  getStatusLabel(status: string): string {
    return this.statusMap[status]?.label || status;
  }

  get activeCount(): number {
    return this.sistemas.filter(s => s.status === 'active' || s.status === 'beta' || s.status === 'new').length;
  }

  get allOperational(): boolean {
    return this.activeCount === this.sistemas.length;
  }

  get systemsStatusText(): string {
    return this.allOperational
      ? 'Todos los sistemas operativos'
      : `${this.activeCount} de ${this.sistemas.length} sistemas operativos`;
  }

  private initParticles() {
    setTimeout(() => {
      this.canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d')!;
      this.resizeCanvas();
      this.updateCyanColor();
      this.createParticles();
      this.animateParticles();
      window.addEventListener('resize', () => this.resizeCanvas());
    }, 100);
  }

  private resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private createParticles() {
    this.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }

  private animateParticles() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.cyanRGB.r}, ${this.cyanRGB.g}, ${this.cyanRGB.b}, ${p.opacity})`;
      this.ctx.fill();
    });

    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach((p2) => {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 120) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(${this.cyanRGB.r}, ${this.cyanRGB.g}, ${this.cyanRGB.b}, ${0.08 * (1 - dist / 120)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      });
    });

    this.animationId = requestAnimationFrame(() => this.animateParticles());
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('my-app-dark');
    this.isDarkTheme.set(isDark);
    this.updateCyanColor();
  }

  private applySystemTheme() {
    const isDarkAlready = document.documentElement.classList.contains('my-app-dark');
    this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.themeMediaQuery.addEventListener('change', this.onThemeChange);

    if (!isDarkAlready && this.themeMediaQuery.matches) {
      document.documentElement.classList.add('my-app-dark');
    }
    this.isDarkTheme.set(document.documentElement.classList.contains('my-app-dark'));
  }

  private onThemeChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      document.documentElement.classList.add('my-app-dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
    }
    this.isDarkTheme.set(e.matches);
    this.updateCyanColor();
  };

  private updateCyanColor() {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--color-cyan').trim();
    if (hex.startsWith('#') && hex.length === 7) {
      this.cyanRGB = {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
      };
    }
  }

  private checkSystemsHealth() {
    this.sistemas.forEach(sistema => {
      const url = this.healthEndpoints[sistema.id];
      if (!url) return;

      this.http.get<{ status: string }>(url).subscribe({
        next: (res) => {
          sistema.status = res.status === 'UP' ? 'active' : 'down';
        },
        error: (err: HttpErrorResponse) => {
          // 503 = circuit breaker fallback → servicio caído
          // 0   = error de red → gateway o servicio inalcanzable
          // Otro (401, 404, etc.) = el servicio respondió → está activo
          if (err.status === 503 || err.status === 0) {
            sistema.status = 'down';
          } else {
            sistema.status = 'active';
          }
        },
      });
    });
  }
}
