import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioPazSalvosComponent } from './inicio-paz-salvos.component';

describe('InicioPazSalvosComponent', () => {
  let component: InicioPazSalvosComponent;
  let fixture: ComponentFixture<InicioPazSalvosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioPazSalvosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPazSalvosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
