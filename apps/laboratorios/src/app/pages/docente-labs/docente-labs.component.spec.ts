import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocenteLabsComponent } from './docente-labs.component';

describe('DocenteLabsComponent', () => {
  let component: DocenteLabsComponent;
  let fixture: ComponentFixture<DocenteLabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DocenteLabsComponent] }).compileComponents();
    fixture = TestBed.createComponent(DocenteLabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
