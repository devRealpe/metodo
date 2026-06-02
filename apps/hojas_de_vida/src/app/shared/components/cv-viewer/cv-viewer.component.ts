import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { PanelModule } from 'primeng/panel';
import { ChipModule } from 'primeng/chip';
import { FieldsetModule } from 'primeng/fieldset';
import { SkeletonModule } from 'primeng/skeleton';

import { Persona } from '../../../core/models/persona.model';

@Component({
  selector: 'app-cv-viewer',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DividerModule,
    TagModule,
    AvatarModule,
    PanelModule,
    ChipModule,
    FieldsetModule,
    SkeletonModule
  ],
  templateUrl: './cv-viewer.component.html',
  styleUrl: './cv-viewer.component.scss',
})
export class CvViewerComponent implements OnInit {
  @Input() persona!: Persona;
  @Input() loading: boolean = false;

  nombreCompleto: string = '';
  edad: number = 0;

  ngOnInit(): void {
    if (this.persona) {
      this.normalizarDatosPersona();
      this.nombreCompleto = this.obtenerNombreCompleto();
      this.edad = this.calcularEdad();
    }
  }

  private normalizarDatosPersona(): void {
    if (this.persona) {
      const personaAny = this.persona as any;
      
      if (personaAny.informacionesAcademicas && !this.persona.informacionAcademica) {
        this.persona.informacionAcademica = personaAny.informacionesAcademicas;
      }
      if (personaAny.informacionesLaborales && !this.persona.informacionLaboral) {
        this.persona.informacionLaboral = personaAny.informacionesLaborales;
      }
      if (personaAny.destrezas && !this.persona.competencias) {
        this.persona.competencias = personaAny.destrezas;
      }
    }
  }

  obtenerNombreCompleto(): string {
    const partes = [
      this.persona.primerNombre,
      this.persona.segundoNombre,
      this.persona.primerApellido,
      this.persona.segundoApellido
    ].filter(Boolean);
    
    return partes.join(' ');
  }

  obtenerIniciales(): string {
    const iniciales = [
      this.persona.primerNombre?.charAt(0),
      this.persona.primerApellido?.charAt(0)
    ].filter(Boolean).join('');
    
    return iniciales.toUpperCase();
  }

  calcularEdad(): number {
    if (!this.persona.fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(this.persona.fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    
    return edad;
  }

  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getSeverityEstadoCivil(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      'Soltero': 'info',
      'Casado': 'success',
      'Union Libre': 'info',
      'Divorciado': 'warn',
      'Viudo': 'secondary' as any
    };
    return map[estado] || 'info';
  }

  getSeverityGenero(genero: string): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      'Masculino': 'info',
      'Femenino': 'danger',
      'Otro': 'warn'
    };
    return map[genero] || 'info';
  }

  formatearSalario(salario: number | undefined): string {
    if (!salario) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(salario);
  }
}
