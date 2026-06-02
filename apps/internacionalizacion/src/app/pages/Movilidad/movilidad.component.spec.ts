import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { SimpleChange } from '@angular/core';

import { MovilidadComponent } from './movilidad.component';
import { ConvenioService } from '../../core/services/convenio.service';
import { MessageService } from 'primeng/api';

// minimal stubs for injected services that are not needed in these tests
class StubConvenioService {}
class StubMessageService {}

describe('MovilidadComponent', () => {
  let component: MovilidadComponent;
  let fixture: ComponentFixture<MovilidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [MovilidadComponent],
      providers: [
        { provide: ConvenioService, useClass: StubConvenioService },
        { provide: MessageService, useClass: StubMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovilidadComponent);
    component = fixture.componentInstance;
    // run initialization logic that normally happens on component creation
    component.ngOnInit();
  });

  it('should consider null and empty convenio id identical when checking for changes', () => {
    component.modoEdicion = true;
    component.movilidadSeleccionada = { convenioAsociado: null } as any;
    // set the form value to null
    component.formMovilidad.get('convenioAsociado')?.setValue(null);
    expect(component.hasFormChanges).toBe(false);

    // changing to empty string should still be considered no change
    component.formMovilidad.get('convenioAsociado')?.setValue('');
    expect(component.hasFormChanges).toBe(false);
  });

  // wizard/pasoActual logic has been removed; the following test was dead and
  // has been deleted.  If additional form state tests are needed they can be
  // added later.

});