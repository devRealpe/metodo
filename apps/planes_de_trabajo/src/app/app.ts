import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationManagementService, CacheDetectionService, AuthService } from '@microfrontends/shared-services';

@Component({
    imports: [RouterModule,],
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App implements OnInit {
    protected title = 'Planes de trabajo';
    
    constructor(
        private notificationService: NotificationManagementService,
        private cacheDetection: CacheDetectionService,
        private authService: AuthService
    ) {}
    
    ngOnInit(): void {
        // Inicializar detección de cache
        this.cacheDetection.initialize();
        
        // Configurar el contexto del proyecto
        this.notificationService.setProjectContext('planes_de_trabajo');
        
        // Obtener email del usuario autenticado desde AuthService
        this.authService.currentUser$.subscribe(user => {
            if (user && user.email) {
                this.notificationService.setCurrentUserEmail(user.email);
            }
        });
    }
}
