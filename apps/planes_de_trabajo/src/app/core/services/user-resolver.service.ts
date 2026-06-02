import { Injectable } from '@angular/core';
import { Profesor } from '../models/profesor.model';
import { ProfesorService } from './profesor.service';
import { firstValueFrom } from 'rxjs';

export interface ResolvedUser {
  name: string;
  email: string;
  avatar: string;
  roles: string[];        
  cargoOracle?: string;
  identificacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserResolverService {
  constructor(private profesorService: ProfesorService) {}

  async resolve(identificacion: string, email: string, keycloakRoles: string[]): Promise<ResolvedUser> {
    const avatar = email
      ? `https://i.pravatar.cc/100?u=${encodeURIComponent(email)}`
      : 'https://i.pravatar.cc/100?img=generic';

    if (keycloakRoles.includes('ADMIN')) {
      let name = 'Administrador';
      try {
        const profesor = await firstValueFrom(this.profesorService.getByCodigo(identificacion));
        if (profesor) {
          name = `${profesor.nombres} ${profesor.apellidos}`.trim() || 'Administrador';
        }
      } catch {}
      return {
        identificacion,
        name,
        email,
        avatar,
        roles: ['ADMIN', ...keycloakRoles.filter(r => r !== 'ADMIN')] 
      };
    }

    const EXTERNAL_ROLES = ['PLANES_SISTEMAS', 'PLANES_GESTION', 'PLANES_PLANEACION', 'PLANES_VICERRECTORIA'];

    const externalRoles = keycloakRoles.filter(r => EXTERNAL_ROLES.includes(r));

    if (externalRoles.length > 0) {
      const rolToNombre: Record<string, string> = {
        'PLANES_SISTEMAS': 'Sistemas',
        'PLANES_GESTION': 'Gestión Humana',
        'PLANES_PLANEACION': 'Planeación',
        'PLANES_VICERRECTORIA': 'Vicerrectoría'
      };

      let nombre = 'Administrador';
      for (const rol of externalRoles) {
        if (rol in rolToNombre) {
          nombre = rolToNombre[rol];
          break;
        }
      }

      return {
        identificacion,
        name: nombre,
        email,
        avatar,
        roles: externalRoles
      };
    }

    try {
      const profesor = await firstValueFrom(this.profesorService.getByCodigo(identificacion));

      if (!profesor) {
        return {
          identificacion,
          name: 'Usuario no registrado',
          email,
          avatar,
          roles: []
        };
      }

      const fullName = `${profesor.nombres} ${profesor.apellidos}`.trim() || 'Usuario';
      let inferredRoles: string[] = [];

      switch (profesor.cargo) {
        case 'DECANO (A)':
          inferredRoles = ['PLANES_DECANO'];
          break;
        case 'DIRECTOR DE PROGRAMA':
          inferredRoles = ['PLANES_DIRECTOR'];
          break;
        case 'PROFESOR': 
          inferredRoles = ['USUARIO'];
          break;
        default:
          inferredRoles = ['USUARIO']; 
      }

      return {
        identificacion,
        name: fullName,
        email,
        avatar,
        roles: inferredRoles,
        cargoOracle: profesor.cargo
      };
    } catch (error) {
      return {
        identificacion,
        name: 'Error de conexión',
        email,
        avatar,
        roles: []
      };
    }
  }
}