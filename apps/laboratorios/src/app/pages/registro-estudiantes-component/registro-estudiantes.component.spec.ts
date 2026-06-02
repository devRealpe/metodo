import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroEstudiantesComponent } from './registro-estudiantes.component';

describe('RegistroEstudiantesComponent', () => {
  let component: RegistroEstudiantesComponent;
  let fixture: ComponentFixture<RegistroEstudiantesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroEstudiantesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroEstudiantesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
