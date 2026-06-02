import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConvocatoriasPublicasComponent } from './convocatorias-publicas-component';

describe('ConvocatoriasPublicasComponent', () => {
  let component: ConvocatoriasPublicasComponent;
  let fixture: ComponentFixture<ConvocatoriasPublicasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConvocatoriasPublicasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConvocatoriasPublicasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
