import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstudiantesOracleConsultaComponent } from './estudiantes-oracle-consulta.component';

describe('EstudiantesOracleConsultaComponent', () => {
  let component: EstudiantesOracleConsultaComponent;
  let fixture: ComponentFixture<EstudiantesOracleConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudiantesOracleConsultaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EstudiantesOracleConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
