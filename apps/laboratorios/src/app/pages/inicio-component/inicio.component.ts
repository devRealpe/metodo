import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { AuthService } from '@microfrontends/shared-services';

interface NavigationCard {
  id: string;
  title: string;
  piIcon: string;
  description: string;
  route: string;
  color: string;
  requiredRoles?: string[];
}


interface UserInfo {
  nombre: string;
  identificacion: string;
  email: string;
  cargo?: string;
  facultad?: string;
}

@Component({
  selector: 'app-inicio.component',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private usuariosOracleService = inject(UsuariosOracleService);

  userInfo: UserInfo = {
    nombre: 'Usuario',
    identificacion: 'No disponible',
    email: 'No disponible'
  };

  ngOnInit(): void {
    this.cargarInformacionUsuario();
  }

  private cargarInformacionUsuario(): void {
    const tokenInfo = this.authService.getUserInfo();

    if (tokenInfo) {
      const identificacion = tokenInfo.identificacion || tokenInfo.preferred_username || '';

      this.userInfo = {
        nombre: tokenInfo.name || tokenInfo.preferred_username || 'Usuario',
        identificacion: identificacion || 'No disponible',
        email: tokenInfo.email || 'No disponible'
      };

      if (identificacion) {
        this.usuariosOracleService.getByCodigo(identificacion).subscribe({
          next: (usuarioOracle) => {
            if (usuarioOracle) {
              this.userInfo.nombre = usuarioOracle.nombre || this.userInfo.nombre;
              this.userInfo.cargo = usuarioOracle.cargo || 'N/A';
            }
          },
          error: () => {
          }
        });
      }
    } else {
    }
  }

  navigationCards: NavigationCard[] = [
    {
      id: 'asistencia',
      title: 'Usa un Laboratorio ',
      piIcon: 'pi-file-edit',
      description: 'Registra tu participacion en el laboratorio',
      route: '/app/registroEstudiantes',
      color: 'blue',
      requiredRoles: ['ADMIN', 'LAB_LABORATORISTA', 'LAB_PROFESOR']
    },
    {
      id: 'solicitudes',
      title: 'Registro para clases de laboratorio',
      piIcon: 'pi-file-edit',
      description: 'Accede a tu laboratorio de clases',
      route: '/app/solicitudLaboratorio',
      color: 'blue',
      requiredRoles: ['ADMIN', 'LAB_PROFESOR']
    }
  ];

  get visibleNavigationCards(): NavigationCard[] {
    const roles = this.authService.getUserRoles() || [];
    return this.navigationCards.filter(card => {
      if (!card.requiredRoles || card.requiredRoles.length === 0) return true;
      return card.requiredRoles.some(role => roles.includes(role));
    });
  }

  trackByCard(index: number, card: NavigationCard): string {
    return card.id;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getCardColorStyles(color: string): any {
    const colorMap: { [key: string]: any } = {
      blue: {
        'background': 'linear-gradient(135deg, var(--p-blue-500), var(--p-blue-400))',
        'color': 'white',
        'box-shadow': '0 8px 25px -8px var(--p-blue-500)'
      }
    };
    return colorMap[color] || colorMap['blue'];
  }
}
