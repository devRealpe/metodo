import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';

@Component({
  imports: [DashboardLayoutComponent],
  selector: 'app-sedu-entry',
  template: `<app-dashboard-layout></app-dashboard-layout>`,
})
export class RemoteEntry {}
