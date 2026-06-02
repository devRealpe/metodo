import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LbEquipoAlmacenComponent } from './lb-equipo-almacen.component';

describe('LbEquipoAlmacenComponent', () => {
  let component: LbEquipoAlmacenComponent;
  let fixture: ComponentFixture<LbEquipoAlmacenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LbEquipoAlmacenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LbEquipoAlmacenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
