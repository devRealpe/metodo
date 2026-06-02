import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { 
  EmailNotificationService, 
  EmailRequest, 
  NotificationManagementService 
} from '@microfrontends/shared-services';
import { 
  NotificationType, 
  NotificationPriority 
} from '@microfrontends/shared-models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-enviar-correo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ],
  template: `
    <p-dialog 
      [(visible)]="visible" 
      [modal]="true" 
      [closable]="true"
      [draggable]="false"
      [style]="{'width': '600px'}"
      (onHide)="onClose()">
      
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-envelope text-2xl"></i>
          <span class="text-xl font-bold">Solicitar Actualización de Información</span>
        </div>
      </ng-template>

      <form [formGroup]="form" class="flex flex-col gap-4">
        <!-- Información del destinatario -->
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-user text-blue-600"></i>
            <span class="font-semibold">Destinatario:</span>
          </div>
          <div class="text-sm">
            <div><strong>Nombre:</strong> {{ nombreUsuario }}</div>
            <div><strong>Correo:</strong> {{ correoUsuario }}</div>
          </div>
        </div>

        <!-- Campo de concepto/mensaje -->
        <div class="flex flex-col gap-2">
          <label for="mensaje" class="font-semibold">
            Concepto de la solicitud <span class="text-red-500">*</span>
          </label>
          <textarea 
            pTextarea 
            id="mensaje"
            formControlName="mensaje"
            rows="6"
            placeholder="Ej: Se requiere actualizar la información de afiliaciones vigentes. Por favor adjunte los documentos de soporte correspondientes..."
            class="w-full"
            [class.ng-invalid]="form.get('mensaje')?.invalid && form.get('mensaje')?.touched">
          </textarea>
          <small class="text-gray-500">
            Describe claramente qué información necesita ser actualizada.
          </small>
          <small *ngIf="form.get('mensaje')?.invalid && form.get('mensaje')?.touched" class="text-red-500">
            El concepto es obligatorio (mínimo 10 caracteres)
          </small>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button 
            label="Cancelar" 
            icon="pi pi-times" 
            [outlined]="true"
            severity="secondary"
            (onClick)="onClose()">
          </p-button>
          <p-button 
            label="Enviar Solicitud" 
            icon="pi pi-send" 
            severity="success"
            [loading]="enviando"
            [disabled]="form.invalid"
            (onClick)="enviarSolicitud()">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dialog-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .p-dialog-content {
        padding: 1.5rem;
      }
    }
  `]
})
export class EnviarCorreoDialogComponent {
  @Input() visible = false;
  @Input() correoUsuario = '';
  @Input() nombreUsuario = '';
  @Input() personaId = '';
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onEnvioExitoso = new EventEmitter<void>();

  form: FormGroup;
  enviando = false;

  constructor(
    private fb: FormBuilder,
    private emailService: EmailNotificationService,
    private notificationService: NotificationManagementService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
  }

  enviarSolicitud(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    const mensaje = this.form.get('mensaje')?.value;

    const emailRequest = {
      to: this.correoUsuario,
      subject: '🔔 Solicitud de Actualización de Hoja de Vida',
      project: 'hojas_de_vida',
      templateType: 'solicitud_actualizacion',
      templateVariables: {
        nombre: this.nombreUsuario,
        mensaje: mensaje
      }
    };

    forkJoin({
      email: this.emailService.sendTemplateEmail(emailRequest).pipe(
        catchError(error => {
          return of({ success: false, message: 'Error al enviar correo', timestamp: new Date().toISOString() });
        })
      ),
      notification: this.notificationService.createNotification({
        title: 'Actualización de Información Requerida',
        message: mensaje,
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        userEmail: this.correoUsuario,
        projectContext: 'hojas_de_vida',
        icon: 'pi pi-exclamation-triangle',
        metadata: {
          personaId: this.personaId,
          fechaSolicitud: new Date().toISOString(),
          solicitadoPor: 'Administrador'
        }
      }).pipe(
        catchError(error => {
          return of(null);
        })
      )
    }).subscribe({
      next: (result) => {
        this.enviando = false;
        
        if (result.email.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Solicitud Enviada',
            detail: `Correo y notificación enviados exitosamente a ${this.nombreUsuario}`,
            life: 5000
          });
          this.onEnvioExitoso.emit();
          this.onClose();
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Envío Parcial',
            detail: 'La notificación se creó pero hubo problemas con el correo.',
            life: 5000
          });
        }
      },
      error: (error) => {
        this.enviando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo enviar la solicitud. Por favor intente nuevamente.',
          life: 5000
        });
      }
    });
  }

  private construirCuerpoCorreo(mensaje: string): string {
    return `<html>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px;">
      <h1 style="margin: 0; font-size: 28px;">🔔 Solicitud de Actualización</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Sistema de Hojas de Vida - UNIMAR</p>
    </div>
    
    <p>Estimado/a <strong>${this.nombreUsuario}</strong>,</p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong style="color: #856404;">⚠️ Acción Requerida</strong>
      <p style="margin: 10px 0 0 0; color: #856404;">Se requiere que actualice información en su hoja de vida registrada en el sistema.</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #dee2e6;">
      <h3 style="margin-top: 0; color: #667eea; font-size: 18px;">📋 Detalle de la Solicitud:</h3>
      <p style="white-space: pre-line; color: #495057; margin: 10px 0 0 0;">${mensaje}</p>
    </div>
    
    <p style="font-weight: bold; margin-top: 25px;">Pasos a seguir:</p>
    <ol style="color: #495057; line-height: 1.8;">
      <li>Inicie sesión en el sistema de Hojas de Vida</li>
      <li>Revise la información solicitada</li>
      <li>Actualice los datos requeridos</li>
      <li>Adjunte los documentos de soporte necesarios</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${window.location.origin}/hojas_de_vida" style="background-color: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        Ir al Sistema
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 20px;">
      Si tiene alguna duda o inconveniente, por favor comuníquese con el área de Recursos Humanos.
    </p>
    
    <div style="background: #343a40; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin: 20px -30px -30px -30px; font-size: 12px;">
      <p style="margin: 0; font-weight: bold; font-size: 14px;">Universidad Mariana</p>
      <p style="margin: 10px 0 0 0; color: #adb5bd;">Este es un mensaje automático del sistema. Por favor no responda a este correo.</p>
      <p style="margin: 5px 0 0 0; color: #6c757d;">© ${new Date().getFullYear()} UNIMAR - Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>`;
  }
}
