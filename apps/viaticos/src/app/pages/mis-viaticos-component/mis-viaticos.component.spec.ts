import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisViaticosComponent } from './mis-viaticos.component';

describe('MisViaticosComponent', () => {
  let component: MisViaticosComponent;
  let fixture: ComponentFixture<MisViaticosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisViaticosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MisViaticosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
