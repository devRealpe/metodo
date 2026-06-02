import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { AuthService } from '@microfrontends/shared-services';

interface NavigationCard {
  title: string;
  description: string;
  route: string;
  piIcon: string;
  color: string;
}

interface UserInfo {
  nombre: string;
  identificacion: string;
  email: string;
  cargo?: string;
  facultad?: string;
}

@Component({
  selector: 'app-inicio-viaticos.component',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './inicio-viaticos.component.html',
  styleUrl: './inicio-viaticos.component.scss',
})
export class InicioViaticosComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private usuariosOracleService = inject(UsuariosOracleService);

  userInfo: UserInfo = {
    nombre: 'Usuario',
    identificacion: 'No disponible',
    email: 'No disponible'
  };

  navigationCards: NavigationCard[] = [
    {
      title: 'Solicitar Viático',
      description: 'Crea una nueva solicitud de viáticos para tus viajes de trabajo',
      route: 'app/solicitudViaticos',
      piIcon: 'pi-plus-circle',
      color: 'blue'
    },
    {
      title: 'Mis Viáticos',
      description: 'Consulta y gestiona todas tus solicitudes de viáticos',
      route: 'app/misViaticos',
      piIcon: 'pi-list',
      color: 'green'
    }
  ];

  ngOnInit(): void {
    this.cargarInformacionUsuario();
  }

  /**
   * Carga la información del usuario autenticado desde el token JWT
   * y complementa con datos de Oracle
   */
  private cargarInformacionUsuario(): void {
    const tokenInfo = this.authService.getUserInfo();
    
    if (tokenInfo) {
      const identificacion = tokenInfo.identificacion || tokenInfo.preferred_username || '';
      
      // Información básica del token
      this.userInfo = {
        nombre: tokenInfo.name || tokenInfo.preferred_username || 'Usuario',
        identificacion: identificacion || 'No disponible',
        email: tokenInfo.email || 'No disponible'
      };
      
      // Consultar información adicional de Oracle
      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle) {
              // Actualizar con el nombre completo de Oracle
              this.userInfo.nombre = usuarioOracle.nombre || this.userInfo.nombre;
              this.userInfo.cargo = usuarioOracle.cargo;
              this.userInfo.facultad = usuarioOracle.facultad;
              
            } 
          }
        });
      }
    } 
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  trackByCard(index: number, card: NavigationCard): string {
    return card.route;
  }

  getCardColorStyles(color: string): { [key: string]: string } {
    return {
      'background': `var(--p-${color}-100)`,
      'border': `2px solid var(--p-${color}-300)`,
      'color': `var(--p-${color}-700)`
    };
  }
}
