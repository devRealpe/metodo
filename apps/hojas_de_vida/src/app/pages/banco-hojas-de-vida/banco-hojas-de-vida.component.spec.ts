import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BancoHojasDeVidaComponent } from '../banco-hojas-de-vida/banco-hojas-de-vida.component';

describe('BancoHojasDeVidaComponent', () => {
  let component: BancoHojasDeVidaComponent;
  let fixture: ComponentFixture<BancoHojasDeVidaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BancoHojasDeVidaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BancoHojasDeVidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
