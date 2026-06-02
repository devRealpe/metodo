import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardUsabilidadComponent } from './dashboard-usabilidad.component';

describe('DashboardUsabilidadComponent', () => {
  let component: DashboardUsabilidadComponent;
  let fixture: ComponentFixture<DashboardUsabilidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardUsabilidadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardUsabilidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
