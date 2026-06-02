import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuariosOracleConsultaComponent } from './usuarios-oracle-consulta.component';

describe('UsuariosOracleConsultaComponent', () => {
  let component: UsuariosOracleConsultaComponent;
  let fixture: ComponentFixture<UsuariosOracleConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosOracleConsultaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosOracleConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
