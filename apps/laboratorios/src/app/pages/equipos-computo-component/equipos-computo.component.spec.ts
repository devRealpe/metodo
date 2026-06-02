import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EquiposComputoComponent } from './equipos-computo.component';

describe('EquiposComputoComponent', () => {
  let component: EquiposComputoComponent;
  let fixture: ComponentFixture<EquiposComputoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquiposComputoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EquiposComputoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
