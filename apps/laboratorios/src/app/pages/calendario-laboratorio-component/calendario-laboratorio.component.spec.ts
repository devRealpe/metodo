import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarioLaboratorioComponent } from './calendario-laboratorio.component';

describe('CalendarioLaboratorioComponent', () => {
  let component: CalendarioLaboratorioComponent;
  let fixture: ComponentFixture<CalendarioLaboratorioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarioLaboratorioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarioLaboratorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
