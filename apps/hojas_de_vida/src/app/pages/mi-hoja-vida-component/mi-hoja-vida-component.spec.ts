import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiHojaVidaComponent } from './mi-hoja-vida-component';

describe('MiHojaVidaComponent', () => {
  let component: MiHojaVidaComponent;
  let fixture: ComponentFixture<MiHojaVidaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiHojaVidaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MiHojaVidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
