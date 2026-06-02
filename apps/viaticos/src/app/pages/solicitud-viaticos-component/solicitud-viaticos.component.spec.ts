import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitudViaticosComponent } from './solicitud-viaticos.component';

describe('SolicitudViaticosComponent', () => {
  let component: SolicitudViaticosComponent;
  let fixture: ComponentFixture<SolicitudViaticosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudViaticosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudViaticosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
