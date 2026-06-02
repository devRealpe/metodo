import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';

@Component({
	selector: 'app-internacionalizacion-entry',
	standalone: true,
	imports: [DashboardLayoutComponent],
	template: `<app-dashboard-layout></app-dashboard-layout>`
})
export class RemoteEntry {}
