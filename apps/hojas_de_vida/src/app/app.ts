
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationManagementService, CacheDetectionService, AuthService } from '@microfrontends/shared-services';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'hojas de vida';
  
  constructor(
    private notificationService: NotificationManagementService,
    private cacheDetection: CacheDetectionService, 
    private authService: AuthService 
  ) {
  }
  
  ngOnInit(): void {
    this.cacheDetection.initialize();
    
    this.notificationService.setProjectContext('hojas_de_vida');
    
    this.authService.currentUser$.subscribe(user => {
      if (user && user.email) {
        this.notificationService.setCurrentUserEmail(user.email);
      }
    });
  }
}
