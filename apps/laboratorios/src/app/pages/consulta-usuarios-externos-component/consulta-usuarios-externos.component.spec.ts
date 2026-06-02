import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultaUsuariosExternosComponent } from './consulta-usuarios-externos.component';

describe('ConsultaUsuariosExternosComponent', () => {
  let component: ConsultaUsuariosExternosComponent;
  let fixture: ComponentFixture<ConsultaUsuariosExternosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaUsuariosExternosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaUsuariosExternosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
