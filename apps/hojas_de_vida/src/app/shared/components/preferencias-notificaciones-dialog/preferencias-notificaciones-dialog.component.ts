import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-preferencias-notificaciones-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
    FormsModule
  ],
  template: `
    <div class="preferencias-notificaciones-container">
      <!-- Header con icono -->
      <div class="header-section">
        <i class="pi pi-bell" style="font-size: 3rem; color: #667eea;"></i>
        <h2>¿Deseas recibir notificaciones por correo?</h2>
      </div>

      <!-- Contenido explicativo -->
      <div class="content-section">
        <p class="description">
          Te mantendremos informado sobre nuevas <strong>convocatorias laborales</strong> 
          que se publiquen en el sistema.
        </p>

        <div class="info-box">
          <i class="pi pi-info-circle"></i>
          <div class="info-text">
            <p><strong>¿Qué recibirás?</strong></p>
            <ul>
              <li>Notificación cuando se publique una nueva convocatoria</li>
              <li>Solo para convocatorias que coincidan con tu perfil</li>
              <li>Puedes cambiar esta preferencia en cualquier momento</li>
            </ul>
          </div>
        </div>

        <!-- Checkbox de preferencia -->
        <div class="checkbox-container">
          <p-checkbox 
            [(ngModel)]="recibirNotificaciones" 
            [binary]="true" 
            inputId="notificaciones"
            label="Sí, quiero recibir notificaciones por correo electrónico"
          />
        </div>

        <div class="note">
          <i class="pi pi-lock"></i>
          <span>No te enviaremos spam. Solo notificaciones importantes sobre convocatorias.</span>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="actions-section">
        <button 
          pButton 
          label="Ahora no" 
          class="p-button-text p-button-secondary"
          (click)="rechazar()"
        ></button>
        <button 
          pButton 
          [label]="recibirNotificaciones ? 'Activar notificaciones' : 'Continuar sin notificaciones'" 
          [icon]="recibirNotificaciones ? 'pi pi-check' : 'pi pi-times'"
          (click)="confirmar()"
        ></button>
      </div>
    </div>
  `,
  styles: [`
    .preferencias-notificaciones-container {
      padding: 1.5rem;
      max-width: 550px;
    }

    .header-section {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .header-section h2 {
      margin-top: 1rem;
      color: #2c3e50;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .content-section {
      margin-bottom: 1.5rem;
    }

    .description {
      text-align: center;
      color: #555;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .info-box {
      display: flex;
      gap: 1rem;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .info-box i {
      color: #667eea;
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 0.2rem;
    }

    .info-text p {
      margin: 0 0 0.5rem 0;
      font-weight: 600;
      color: #2c3e50;
    }

    .info-text ul {
      margin: 0;
      padding-left: 1.2rem;
      color: #555;
    }

    .info-text ul li {
      margin-bottom: 0.3rem;
      line-height: 1.5;
    }

    .checkbox-container {
      display: flex;
      justify-content: center;
      padding: 1rem;
      background: #fff;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .checkbox-container ::ng-deep .p-checkbox-label {
      font-size: 1rem;
      color: #2c3e50;
      font-weight: 500;
    }

    .note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .note i {
      color: #28a745;
    }

    .actions-section {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    ::ng-deep .p-checkbox .p-checkbox-box {
      width: 1.5rem;
      height: 1.5rem;
    }

    ::ng-deep .p-checkbox .p-checkbox-box .p-checkbox-icon {
      font-size: 1rem;
    }

    @media (max-width: 576px) {
      .preferencias-notificaciones-container {
        padding: 1rem;
      }

      .actions-section {
        flex-direction: column-reverse;
      }

      .actions-section button {
        width: 100%;
      }
    }
  `]
})
export class PreferenciasNotificacionesDialogComponent {
  recibirNotificaciones = true; 

  constructor(
    private dialogRef: DynamicDialogRef
  ) {}

  confirmar(): void {
    this.dialogRef.close({
      aceptado: true,
      recibirNotificaciones: this.recibirNotificaciones
    });
  }

  rechazar(): void {
    this.dialogRef.close({
      aceptado: false,
      recibirNotificaciones: false
    });
  }
}
