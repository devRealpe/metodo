import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaMaquinariaLaboratoriosComponent } from './lista-maquinaria-laboratorios.component';

describe('ListaMaquinariaLaboratoriosComponent', () => {
  let component: ListaMaquinariaLaboratoriosComponent;
  let fixture: ComponentFixture<ListaMaquinariaLaboratoriosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaMaquinariaLaboratoriosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaMaquinariaLaboratoriosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
