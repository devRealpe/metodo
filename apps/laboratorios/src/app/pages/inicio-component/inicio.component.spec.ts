import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioComponent } from './inicio.component';
import { AuthService } from '@microfrontends/shared-services';

describe('InicioComponent', () => {
  let component: InicioComponent;
  let fixture: ComponentFixture<InicioComponent>;

  const mockAuthService = {
    getUserRoles: jasmine.createSpy('getUserRoles').and.returnValue([]),
    getUserInfo: jasmine.createSpy('getUserInfo').and.returnValue(null)
  } as unknown as AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide "solicitudes" card when user has no roles', () => {
    (mockAuthService.getUserRoles as jasmine.Spy).and.returnValue([]);
    expect(component.visibleNavigationCards.some(c => c.id === 'solicitudes')).toBeFalse();
  });

  it('should show "solicitudes" card when user has role LAB_PROFESOR', () => {
    (mockAuthService.getUserRoles as jasmine.Spy).and.returnValue(['LAB_PROFESOR']);
    expect(component.visibleNavigationCards.some(c => c.id === 'solicitudes')).toBeTrue();
  });
});
