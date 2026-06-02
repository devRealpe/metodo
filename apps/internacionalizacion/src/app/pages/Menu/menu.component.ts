
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { Router } from '@angular/router';
import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';

interface NavigationCard {
  id: string;
  title: string;
  piIcon: string;
  description: string;
  route?: string;
  color: string;
  subRoutes?: { label: string; route: string }[];
}


@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule,
    CardModule,
  ],
  templateUrl: './menu.component.html',
})
export class MenuComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private usuariosOracleService = inject(UsuariosOracleService);

  // Información básica del usuario para mostrar en el dashboard
  userInfo: { identificacion: string; nombre: string; email: string } = {
    identificacion: '',
    nombre: 'Usuario',
    email: ''
  };

  ngOnInit(): void {
    // Cargar información del usuario desde el token y desde Oracle si está disponible
    const tokenInfo = this.authService.getUserInfo();
    if (tokenInfo) {
      const identificacion = tokenInfo.identificacion || tokenInfo.preferred_username || '';
      this.userInfo = {
        identificacion,
        nombre: tokenInfo.name || tokenInfo.preferred_username || 'Usuario',
        email: tokenInfo.email || ''
      };

      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle) {
              const nombreCompleto = [usuarioOracle.nombres, usuarioOracle.apellidos]
                .filter(Boolean)
                .join(' ')
                .trim();
              if (nombreCompleto) {
                this.userInfo = { ...this.userInfo, nombre: nombreCompleto };
              }
            }
          },
          error: () => {
          }
        });
      }
    }
  }


  navigationCards: NavigationCard[] = [
    {
      id: 'Convenios',
      title: 'Registro de Convenios',
      piIcon: 'pi-file-edit',
      description: 'Registra los convenios',
      route: '/app/convenio',
      color: 'blue'
    },
    {
      id: 'ListaConvenios',
      title: 'Lista de Convenios',
      piIcon: 'pi-list',
      description: 'Ver todos los convenios registrados',
      route: '/app/convenios-list',
      color: 'blue'
    },
    {
      id: 'Convocatorias',
      title: 'Convocatorias',
      piIcon: 'pi-megaphone',
      description: 'Gestiona las convocatorias de movilidad',
      route: '/app/convocatorias',
      color: 'blue'
    },
    {
      id: 'Movilidades',
      title: 'Registro de Movilidades',
      piIcon: 'pi-file-edit',
      description: 'Registra las movilidades',
      route: '/app/movilidad',
      color: 'blue'
    },
    {
      id: 'ListaGeneralMovilidades',
      title: 'Listado general de Movilidades',
      piIcon: 'pi-list',
      description: 'Ver todas las movilidades registradas (general)',
      route: '/app/movilidad-list',
      color: 'blue'
    },
    {
      id: 'ListaMovilidades',
      title: 'Lista de Movilidades',
      piIcon: 'pi-list',
      description: 'Ver todas las movilidades postulantes',
      route: '/app/movilidad-saliente-list',
      color: 'blue'
    },
    {
      id: 'ListasMovilidades',
      title: 'Listas de Movilidades',
      piIcon: 'pi-list',
      description: 'Ver todas las movilidades estudiantiles',
      route: '/app/movilidad-estudiantes-list',
      color: 'blue'
    },
    {
      id: 'Autorizaciones',
      title: 'Autorizaciones de Movilidad',
      piIcon: 'pi-check-circle',
      description: 'Gestiona las autorizaciones',
      route: '/app/autorizacion',
      color: 'green'
    },    
    {
      id: 'MovilidadesProceso',
      title: 'Seguimiento de Movilidades',
      piIcon: 'pi-chart-line',
      description: 'Seguimiento y gestión del proceso de movilidades aprobadas',
      route: '/app/movilidades-proceso',
      color: 'green'
    },
    {
      id: 'ReporteMovilidades',
      title: 'Reporte de Movilidades',
      piIcon: 'pi-chart-bar',
      description: 'Reportes avanzados de movilidades con filtros y exportación',
      route: '/app/reporte-movilidades',
      color: 'purple'
    },
  ];

  getCardsByCategory(category: string): NavigationCard[] {
    const categoryMap: { [key: string]: string[] } = {
      'convenios': ['Convenios', 'ListaConvenios', 'Convocatorias'],
      'movilidades': ['Movilidades', 'ListaGeneralMovilidades', 'ListaMovilidades', 'ListasMovilidades'],
      'autorizaciones': ['Autorizaciones', 'MovilidadesProceso'],
      'reportes': ['ReporteMovilidades']

    };
    
    return this.navigationCards.filter(card => 
      categoryMap[category]?.includes(card.id)
    );
  }

  trackByCard(index: number, card: NavigationCard): string {
    return card.id;
  }

  navigateTo(route?: string): void {
    if (!route) return;
    this.router.navigate([route]);
  }  

  getCardColorStyles(color: string): any {
    const colorMap: { [key: string]: any } = {
      blue: {
        'background': 'linear-gradient(135deg, var(--p-blue-500), var(--p-blue-400))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-500)'
      },
      'blue-300': {
        'background': 'linear-gradient(135deg, var(--p-blue-300), var(--p-blue-200))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-300)'
      },
      'blue-400': {
        'background': 'linear-gradient(135deg, var(--p-blue-400), var(--p-blue-300))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-400)'
      },
      'blue-500': {
        'background': 'linear-gradient(135deg, var(--p-blue-500), var(--p-blue-400))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-500)'
      },
      'blue-600': {
        'background': 'linear-gradient(135deg, var(--p-blue-600), var(--p-blue-500))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-600)'
      },
      'blue-800': {
        'background': 'linear-gradient(135deg, var(--p-blue-800), var(--p-blue-700))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-800)'
      },
      purple: {
        'background': 'linear-gradient(135deg, var(--p-purple-500), var(--p-purple-400))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-purple-500)'
      },
      green: {
        'background': 'linear-gradient(135deg, var(--p-green-500), var(--p-green-400))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-green-500)'
      }
    };
    return colorMap[color] || colorMap['blue'];
  }
} 