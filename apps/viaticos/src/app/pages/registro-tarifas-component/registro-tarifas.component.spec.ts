import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroTarifasComponent } from './registro-tarifas.component';

describe('RegistroTarifasComponent', () => {
  let component: RegistroTarifasComponent;
  let fixture: ComponentFixture<RegistroTarifasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroTarifasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroTarifasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
