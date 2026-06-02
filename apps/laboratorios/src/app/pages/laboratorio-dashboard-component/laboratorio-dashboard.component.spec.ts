import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LaboratorioDashboardComponent } from './laboratorio-dashboard.component';
import { of, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { HorariosOracleService } from '../../core/services/horarios-oracle.service';

describe('LaboratorioDashboardComponent', () => {
  let component: LaboratorioDashboardComponent;
  let fixture: ComponentFixture<LaboratorioDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaboratorioDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LaboratorioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter by estado (computed from horarios: only mantenimiento preserved)', async () => {
    const mockLabs = [
      { id: '1', nombre: 'Lab A', estado: 'Disponible', tipo: 'Tipo1', ubicacion: 'Sede1', capacidad: 20 },
      { id: '2', nombre: 'Lab B', estado: 'Ocupado', tipo: 'Tipo2', ubicacion: 'Sede1', capacidad: 10 },
      { id: '3', nombre: 'Lab C', estado: 'Mantenimiento', tipo: 'Tipo1', ubicacion: 'Sede2', capacidad: 5 }
    ];

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LaboratorioDashboardComponent],
      providers: [
        { provide: LaboratoriosService, useValue: { getAll: () => of(mockLabs) } },
        { provide: HorariosOracleService, useValue: { getHoras: (d?: string) => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LaboratorioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 3)));

    component.onEstadoChange('Disponible');
    const res = await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 2)));
    expect(res.every(r => r.estado === 'Disponible')).toBeTrue();
  });

  it('should show occupied when there is an active horario', async () => {
    const mockLabs = [
      { id: '1', nombre: 'Lab A', estado: 'Disponible', tipo: 'Tipo1', ubicacion: 'Sede1', capacidad: 20 },
      { id: '2', nombre: 'Lab B', estado: 'Ocupado', tipo: 'Tipo2', ubicacion: 'Sede1', capacidad: 10 },
      { id: '3', nombre: 'Lab C', estado: 'Mantenimiento', tipo: 'Tipo1', ubicacion: 'Sede2', capacidad: 5 }
    ];

    const dia = (new Date()).toLocaleString('es-ES', { weekday: 'long' }).toUpperCase();
    const mockHoras = [
      { codAula: '2', nomAula: 'Lab B', diaSemana: dia, horaInicio: '00:00', horaFin: '23:59' }
    ];

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LaboratorioDashboardComponent],
      providers: [
        { provide: LaboratoriosService, useValue: { getAll: () => of(mockLabs) } },
        { provide: HorariosOracleService, useValue: { getHoras: (d?: string) => of(mockHoras) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LaboratorioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 3)));

    component.onEstadoChange('Ocupado');
    const res = await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 1)));
    expect(res[0].id).toBe('2');
    expect(res[0].estado).toBe('Ocupado');
  });

  it('should filter by tipo and sede', async () => {
    const mockLabs = [
      { id: '1', nombre: 'Lab A', estado: 'Disponible', tipo: 'Tipo1', ubicacion: 'Sede1', capacidad: 20 },
      { id: '2', nombre: 'Lab B', estado: 'Ocupado', tipo: 'Tipo2', ubicacion: 'Sede1', capacidad: 10 },
      { id: '3', nombre: 'Lab C', estado: 'Disponible', tipo: 'Tipo1', ubicacion: 'Sede2', capacidad: 5 }
    ];

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LaboratorioDashboardComponent],
      providers: [
        { provide: LaboratoriosService, useValue: { getAll: () => of(mockLabs) } },
        { provide: HorariosOracleService, useValue: { getHoras: (d?: string) => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LaboratorioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 3)));

    component.onTipoChange('Tipo1');
    const byTipo = await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 2)));
    expect(byTipo.every(r => r.tipo === 'Tipo1')).toBeTrue();

    component.onSedeChange('Sede1');
    const bySede = await firstValueFrom(component.filtered$.pipe(filter(a => a.length === 1)));
    expect(bySede.every(r => r.ubicacion === 'Sede1')).toBeTrue();
  });
});
