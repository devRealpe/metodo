import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioViaticosComponent } from './inicio-viaticos.component';

describe('InicioViaticosComponent', () => {
  let component: InicioViaticosComponent;
  let fixture: ComponentFixture<InicioViaticosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioViaticosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioViaticosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
