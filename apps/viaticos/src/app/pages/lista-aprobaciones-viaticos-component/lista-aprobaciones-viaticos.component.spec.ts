import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaAprobacionesViaticosComponent } from './lista-aprobaciones-viaticos.component';

describe('ListaAprobacionesViaticosComponent', () => {
  let component: ListaAprobacionesViaticosComponent;
  let fixture: ComponentFixture<ListaAprobacionesViaticosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaAprobacionesViaticosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaAprobacionesViaticosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
