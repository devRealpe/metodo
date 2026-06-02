import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaViaticosComponent } from './lista-viaticos.component';

describe('ListaViaticosComponent', () => {
  let component: ListaViaticosComponent;
  let fixture: ComponentFixture<ListaViaticosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaViaticosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaViaticosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
