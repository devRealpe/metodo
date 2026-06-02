import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroExternosComponent } from './registro-externos.component';

describe('RegistroExternosComponent', () => {
  let component: RegistroExternosComponent;
  let fixture: ComponentFixture<RegistroExternosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroExternosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroExternosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
