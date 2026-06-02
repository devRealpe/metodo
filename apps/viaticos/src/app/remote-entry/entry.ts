import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';

@Component({
  imports: [DashboardLayoutComponent],
  selector: 'app-viaticos-entry',
  template: `<app-dashboard-layout></app-dashboard-layout>`,
  standalone: true,
})
export class RemoteEntry {}
