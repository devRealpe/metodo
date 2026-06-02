import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { of, firstValueFrom } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';

type LabItem = { idVisible: string; codAula: string; nombreClase?: string };

@Component({
  selector: 'app-docente-labs',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, ButtonModule, CardModule],
  providers: [MessageService, UsuariosOracleService, HorariosOracleService],
  templateUrl: './docente-labs.component.html'
})
export class DocenteLabsComponent implements OnInit {
  private usuariosSrv = inject(UsuariosOracleService);
  private horariosSrv = inject(HorariosOracleService);
  private toast = inject(MessageService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  autoLoginIntentado = false;
  cargandoUsuario = false;

  identificacion = '';
  nombreDocente = '';
  loading = false;
  mensaje = '';
  labs: LabItem[] = [];

  horariosDocente: HorarioItem[] = [];
  groupedHorarios: { label: string; items: HorarioItem[] }[] = []; 

  private normalizar(s: string): string {
    return (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');
  }

  private nombresCoinciden(docenteRaw: string, nombreUsuario: string): boolean {
    const A = this.normalizar(docenteRaw);
    const B = this.normalizar(nombreUsuario);
    if (!A || !B) return false;
    if (A === B) return true;
    const toks = B.split(' ').filter(Boolean);
    if (toks.length >= 2 && toks.every(t => A.includes(t))) return true;
    return A.includes(B) || B.includes(A);
  }

  public buscar() {
    const id = (this.identificacion || '').toString().trim();
    if (!/^\d{5,}$/.test(id)) {
      this.toast.add({ severity: 'warn', summary: 'Atención', detail: 'Ingrese una identificación válida (solo números).' });
      return;
    }

    this.loading = true;
    this.mensaje = '';
    this.nombreDocente = '';
    this.labs = [];
    this.horariosDocente = [];
    this.groupedHorarios = []; 

    this.usuariosSrv.getByCodigo(id).subscribe({
      next: (u: UsuarioOracle | null) => {
        if (!u) {
          this.mensaje = 'No se encontró la identificación.';
          this.toast.add({ severity: 'info', summary: 'No encontrado', detail: this.mensaje });
          return;
        }

        this.nombreDocente = (u.nombre || '').trim();
        this.horariosSrv.getHoras().subscribe({
          next: (items: HorarioItem[]) => {
            if (!items || !items.length) {
              this.mensaje = 'No hay horarios disponibles.';
              return;
            }

            const propios = (items as HorarioItem[]).filter(raw => {
              const rawRecord = raw as unknown as Record<string, unknown>;
              const docenteRaw = String(rawRecord['docente'] ?? rawRecord['docenteNombre'] ?? rawRecord['profesor'] ?? rawRecord['nombreProfesor'] ?? '');
              return this.nombresCoinciden(docenteRaw, this.nombreDocente);
            });

            const aulasUnicas = new Map<string, LabItem>();
            for (const h of propios) {
              const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
              const key = this.normalizar(visible);
              if (!aulasUnicas.has(key)) {
                aulasUnicas.set(key, { idVisible: visible, codAula: h.codAula, nombreClase: h.materia || h.docente });
              }
            }

            this.labs = Array.from(aulasUnicas.values());

            const DAY_ORDER: Record<string, number> = { LUN: 1, MAR: 2, MIE: 3, JUE: 4, VIE: 5, SAB: 6, DOM: 7 };
            const ordenarHorarios = (xs: HorarioItem[]) => xs.slice().sort((a, b) => {
              const da = (a.diaSemana || '').toString().trim().toUpperCase().slice(0,3);
              const db = (b.diaSemana || '').toString().trim().toUpperCase().slice(0,3);
              const ra = (DAY_ORDER[da] ?? 99) - (DAY_ORDER[db] ?? 99);
              if (ra !== 0) return ra;
              return (a.horaInicio || '').localeCompare(b.horaInicio || '');
            });

            const uniqMap = new Map<string, HorarioItem>();
            for (const h of propios) {
              const key = `${(h.diaSemana||'').toString().trim().toUpperCase().slice(0,3)}|${h.horaInicio||''}|${h.horaFin||''}|${h.codAula||''}|${(h.materia||h.docente||'')}`;
              if (!uniqMap.has(key)) uniqMap.set(key, h);
            }
            const uniques = Array.from(uniqMap.values());

            this.horariosDocente = ordenarHorarios(uniques);

            const groups = new Map<string, { label: string; items: HorarioItem[] }>();
            for (const h of this.horariosDocente) {
              const dk = (h.diaSemana || '').toString().trim() || 'DESCONOCIDO';
              const key = dk.toUpperCase().slice(0,3);
              if (!groups.has(key)) groups.set(key, { label: dk, items: [] });
              groups.get(key)!.items.push(h);
            }

            this.groupedHorarios = Array.from(groups.values()).sort((a, b) => {
              const ka = a.label.toUpperCase().slice(0,3), kb = b.label.toUpperCase().slice(0,3);
              return (DAY_ORDER[ka] ?? 99) - (DAY_ORDER[kb] ?? 99);
            });

            if (!this.labs.length) {
              this.mensaje = 'No se encontraron laboratorios para este docente.';
            } 
          },
          error: () => { this.mensaje = 'Error cargando horarios.'; }
        });
      },
      error: (e) => { this.mensaje = 'Error consultando usuario'; this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error consultando usuario.' }); },
      complete: () => (this.loading = false)
    });
  }

  ngOnInit(): void {
    this.intentarAutoLogin();
  }

  private async intentarAutoLogin(): Promise<void> {
    try {
      let identificacion: string | null = null;
      let source = 'none';

      const tokenInfo: any = (this.authService as any).getUserInfo ? (this.authService as any).getUserInfo() : null;
      if (tokenInfo) {
        const idFromToken = tokenInfo.identificacion || tokenInfo.preferred_username || tokenInfo.sub || tokenInfo.id;
        if (idFromToken && /^\d{5,}$/.test(idFromToken.toString().trim())) {
          identificacion = idFromToken.toString().trim();
          source = 'auth';
        }
      }

      if (!identificacion) {
        const currentUser: any = (this.authService as any).getCurrentUser ? (this.authService as any).getCurrentUser() : null;
        if (currentUser?.identificacion && /^\d{5,}$/.test(currentUser.identificacion.trim())) {
          identificacion = currentUser.identificacion.trim();
          source = 'auth_fallback';
        }
      }

      if (!identificacion) {
        const identLS = localStorage.getItem('identificacion')?.toString().trim();
        if (identLS && /^\d{5,}$/.test(identLS)) {
          identificacion = identLS;
          source = 'local';
        } else {
          const possibleUserJson = localStorage.getItem('user') || localStorage.getItem('currentUser') || localStorage.getItem('current_user');
          if (possibleUserJson) {
            try {
              const parsed = JSON.parse(possibleUserJson);
              const idFromJson = parsed?.identificacion || parsed?.id || parsed?.identification;
              if (idFromJson && /^\d{5,}$/.test(idFromJson.toString().trim())) {
                identificacion = idFromJson.toString().trim();
                source = 'local_json';
              }
            } catch {
            }
          }
        }
      }

      if (!identificacion) return;

      this.cargandoUsuario = true;
      const usuario = await firstValueFrom(this.consultarUsuario(identificacion));
      if (!usuario) {
        this.cargandoUsuario = false;
        return;
      }

      const rol = this.obtenerRol(usuario);
      if (this.esRolDocente(rol)) {
        this.identificacion = identificacion;
        this.autoLoginIntentado = true;
        this.cargandoUsuario = false;
        await this.buscar();
      } else {
        this.cargandoUsuario = false;
      }
    } catch {
      this.cargandoUsuario = false;
    }
  }

  private consultarUsuario(codigo: string) {
    return this.usuariosSrv.getByCodigo(codigo).pipe(
      catchError(() => {
        const base = (environment as { apiOracle?: string }).apiOracle || '';
        const url = `${base.replace(/\/$/, '')}/usuarios/${encodeURIComponent(codigo)}`;
        return this.http.get<UsuarioOracle>(url, { observe: 'response' }).pipe(
          timeout(8000),
          map(res => res.status === 204 ? null : res.body),
          catchError(() => of(null))
        );
      })
    );
  }

  private obtenerRol(usuario: UsuarioOracle): string {
    return ((usuario as any).cargo || (usuario as any).rol || '').toString().trim().toUpperCase();
  }

  private esRolDocente(rol: string): boolean {
    const rolesDocente = ['DOCENTE', 'PROFESOR', 'PROFESORA'];
    return rolesDocente.includes(rol);
  }
}
