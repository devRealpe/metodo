import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroSolicitudesComponent } from './registro-solicitudes.component';

describe('RegistroSolicitudesComponent', () => {
  let component: RegistroSolicitudesComponent;
  let fixture: ComponentFixture<RegistroSolicitudesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroSolicitudesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroSolicitudesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
