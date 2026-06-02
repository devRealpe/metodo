import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { AuthService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-perfil-usuario',
  standalone: true,
  imports: [CommonModule, CardModule, SkeletonModule, TagModule, AvatarModule],
  templateUrl: './perfil-usuario.component.html',
})
export class PerfilUsuarioComponent implements OnInit {
  usuario = signal<any>(null);
  cargando = signal(true);

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const userInfo = this.authService.getCurrentUser();
    const rawToken = this.authService.getUserInfo();
    this.usuario.set({
      ...userInfo,
      firstName: rawToken?.given_name || rawToken?.firstName || '',
      lastName: rawToken?.family_name || rawToken?.lastName || '',
    });
    this.cargando.set(false);
  }

  get iniciales(): string {
    const u = this.usuario();
    if (!u) return '?';
    const first = (u.firstName?.[0] || '').toUpperCase();
    const last = (u.lastName?.[0] || '').toUpperCase();
    return (first + last) || u.username?.[0]?.toUpperCase() || '?';
  }

  get roles(): string[] {
    return this.usuario()?.roles || [];
  }
}
