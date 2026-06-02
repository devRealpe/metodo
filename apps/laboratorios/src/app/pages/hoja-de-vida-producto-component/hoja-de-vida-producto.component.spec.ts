import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HojaDeVidaProductoComponent } from './hoja-de-vida-producto.component';

describe('HojaDeVidaProductoComponent', () => {
  let component: HojaDeVidaProductoComponent;
  let fixture: ComponentFixture<HojaDeVidaProductoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HojaDeVidaProductoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HojaDeVidaProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
