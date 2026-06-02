import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaEquiposComputoComponent } from './lista-equipos-computo.component';

describe('ListaEquiposComputoComponent', () => {
  let component: ListaEquiposComputoComponent;
  let fixture: ComponentFixture<ListaEquiposComputoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEquiposComputoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEquiposComputoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
