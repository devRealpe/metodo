import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LaboratorioEditarComponent } from './laboratorio-editar.component';

describe('LaboratorioEditarComponent', () => {
  let component: LaboratorioEditarComponent;
  let fixture: ComponentFixture<LaboratorioEditarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaboratorioEditarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LaboratorioEditarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
