import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InformacionPersonal2 } from './informacion-personal2';

describe('InformacionPersonal2', () => {
  let component: InformacionPersonal2;
  let fixture: ComponentFixture<InformacionPersonal2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformacionPersonal2],
    }).compileComponents();

    fixture = TestBed.createComponent(InformacionPersonal2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
