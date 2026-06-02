import {
  Component,
  AfterViewInit,
  ViewChild,
  ViewContainerRef,
  Type,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@microfrontends/shared-services';
import { SistemasHomeComponent } from './sistemas-home/sistemas-home.component';
import { ProfesorHome } from './profesor_home/profesor_home';
import { DecanoHome } from './decano_home/decano_home';
import { DirectorHome } from './director-home/director-home';
import { GestionHumanaHomeComponent } from './gestion-humana-home/gestion-humana-home';
import { PlaneacionHome } from './planeacion-home/planeacion-home';
import { VicerrectoriaHome } from './vicerrectoria-home/vicerrectoria-home';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: [
    './sistemas-home/sistemas-home.component.scss',
    './profesor_home/profesor_home.scss',
    './decano_home/decano_home.scss',
    './director-home/director-home.scss',
    './gestion-humana-home/gestion-humana-home.scss',
    './planeacion-home/planeacion-home.scss',
    './vicerrectoria-home/vicerrectoria-home.scss',
    './modales/modal-crear-pt/modal-crear-pt.scss',
  ],
  standalone: true,
})
export class Home implements AfterViewInit {
  @ViewChild('dynamicComponent', { read: ViewContainerRef })
  container!: ViewContainerRef;

  constructor(private authService: AuthService, private router: Router) {}

  ngAfterViewInit(): void {
    this.loadComponentBasedOnRole();
  }

  private loadComponentBasedOnRole(): void {
    const userRoles = this.authService.getUserRoles();
    this.container.clear();

    let componentToLoad: Type<any> | null = null;

    if (userRoles.includes('ADMIN')) {
      this.router.navigate(['/app/admin']);
      return;
    } else if (userRoles.includes('PLANES_DIRECTOR')) {
      componentToLoad = DirectorHome;
    } else if (userRoles.includes('PLANES_GESTION')) {
      componentToLoad = GestionHumanaHomeComponent;
    } else if (userRoles.includes('PLANES_DECANO')) {
      componentToLoad = DecanoHome;
    } else if (userRoles.includes('PLANES_PLANEACION')) {
      componentToLoad = PlaneacionHome;
    } else if (userRoles.includes('PLANES_PLANEACION')) {
      componentToLoad = PlaneacionHome;
    } else if (userRoles.includes('PLANES_VICERRECTORIA')) {
      componentToLoad = VicerrectoriaHome;
    } else if (userRoles.includes('PLANES_SISTEMAS')) {
      componentToLoad = SistemasHomeComponent;
    } else if (userRoles.includes('USUARIO')) {
      componentToLoad = ProfesorHome;
    }

    if (componentToLoad) {
      this.container.createComponent(componentToLoad);
    }
  }
}
