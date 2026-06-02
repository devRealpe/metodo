import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TarifasRegistradasComponent } from './tarifas-registradas.component';

describe('TarifasRegistradasComponent', () => {
  let component: TarifasRegistradasComponent;
  let fixture: ComponentFixture<TarifasRegistradasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarifasRegistradasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TarifasRegistradasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
