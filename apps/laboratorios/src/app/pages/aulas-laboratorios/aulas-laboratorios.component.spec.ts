import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AulasLaboratoriosComponent } from './aulas-laboratorios.component';

describe('AulasLaboratoriosComponent', () => {
  let component: AulasLaboratoriosComponent;
  let fixture: ComponentFixture<AulasLaboratoriosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulasLaboratoriosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AulasLaboratoriosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
