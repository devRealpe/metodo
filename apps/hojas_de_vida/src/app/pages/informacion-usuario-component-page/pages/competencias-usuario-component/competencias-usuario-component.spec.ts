import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompetenciasUsuarioComponent } from './competencias-usuario-component';

describe('CompetenciasUsuarioComponent', () => {
  let component: CompetenciasUsuarioComponent;
  let fixture: ComponentFixture<CompetenciasUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetenciasUsuarioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompetenciasUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
