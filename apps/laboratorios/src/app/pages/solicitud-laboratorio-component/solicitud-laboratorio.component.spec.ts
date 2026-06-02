import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitudLaboratorioComponent } from './solicitud-laboratorio.component';

describe('SolicitudLaboratorioComponent', () => {
  let component: SolicitudLaboratorioComponent;
  let fixture: ComponentFixture<SolicitudLaboratorioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudLaboratorioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudLaboratorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
