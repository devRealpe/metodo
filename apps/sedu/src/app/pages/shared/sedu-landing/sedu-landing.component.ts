import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-sedu-landing',
  standalone: true,
  template: '',
})
export class SeduLandingComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const roles = this.authService.getUserRoles();

    if (roles.includes('ADMIN')) {
      this.router.navigate(['/app/admin/dashboard']);
    } else if (roles.includes('ADMIN_GTH')) {
      this.router.navigate(['/app/admin/dashboard']);
    } else if (roles.includes('EVALUADOR')) {
      this.router.navigate(['/app/evaluador/dashboard']);
    } else if (roles.includes('EVALUADO')) {
      this.router.navigate(['/app/evaluado/dashboard']);
    } else {
      // No recognized SEDU role — show the login
      this.router.navigate(['/']);
    }
  }
}
