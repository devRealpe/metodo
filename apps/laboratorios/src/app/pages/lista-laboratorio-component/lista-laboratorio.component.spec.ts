import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaLaboratorioComponent } from './lista-laboratorio.component';

describe('ListaLaboratorioComponent', () => {
  let component: ListaLaboratorioComponent;
  let fixture: ComponentFixture<ListaLaboratorioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaLaboratorioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaLaboratorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
