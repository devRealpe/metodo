import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';

@Component({
  selector: 'app-laboratorios-entry',
  imports: [DashboardLayoutComponent],
  template: `<app-dashboard-layout></app-dashboard-layout>`,
  standalone: true
})
export class RemoteEntry {}
