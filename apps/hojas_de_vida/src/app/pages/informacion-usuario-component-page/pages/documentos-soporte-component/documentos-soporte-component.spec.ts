import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosSoporteComponent } from './documentos-soporte-component';

describe('DocumentosSoporteComponent', () => {
  let component: DocumentosSoporteComponent;
  let fixture: ComponentFixture<DocumentosSoporteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosSoporteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DocumentosSoporteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});