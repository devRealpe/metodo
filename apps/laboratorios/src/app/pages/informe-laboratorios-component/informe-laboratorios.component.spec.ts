import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InformeLaboratoriosComponent } from './informe-laboratorios.component';

describe('InformeLaboratoriosComponent', () => {
  let component: InformeLaboratoriosComponent;
  let fixture: ComponentFixture<InformeLaboratoriosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformeLaboratoriosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InformeLaboratoriosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
