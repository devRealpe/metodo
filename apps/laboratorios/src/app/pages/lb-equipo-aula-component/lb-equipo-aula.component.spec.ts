import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LbEquipoAulaComponent } from './lb-equipo-aula.component';

describe('LbEquipoAulaComponent', () => {
  let component: LbEquipoAulaComponent;
  let fixture: ComponentFixture<LbEquipoAulaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LbEquipoAulaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LbEquipoAulaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
