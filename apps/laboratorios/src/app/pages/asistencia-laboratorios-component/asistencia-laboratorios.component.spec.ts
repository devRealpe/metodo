import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsistenciaLaboratoriosComponent } from './asistencia-laboratorios.component';

describe('AsistenciaLaboratoriosComponent', () => {
  let component: AsistenciaLaboratoriosComponent;
  let fixture: ComponentFixture<AsistenciaLaboratoriosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciaLaboratoriosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AsistenciaLaboratoriosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
