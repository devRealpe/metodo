import { Injectable, ElementRef, inject } from '@angular/core';
import { FormGroup, FormArray, AbstractControl, Validators } from '@angular/forms';
import { NotificationService } from '@microfrontends/shared-services';

export interface FormFieldLabel {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormUtilsService {
  private notificationService = inject(NotificationService);

  markFormGroupTouched(form: FormGroup | FormArray): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        this.markControlTouched(control);
      }
    });
  }

  private markControlTouched(control: AbstractControl): void {
    control.markAsTouched();

    if (control instanceof FormGroup) {
      this.markFormGroupTouched(control);
    } else if (control instanceof FormArray) {
      control.controls.forEach(childControl => {
        this.markControlTouched(childControl);
      });
    }
  }

  resetFormState(form: FormGroup | FormArray): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        this.resetControlState(control);
      }
    });
  }

  private resetControlState(control: AbstractControl): void {
    control.markAsUntouched();
    control.setErrors(null);

    if (control instanceof FormGroup) {
      this.resetFormState(control);
    } else if (control instanceof FormArray) {
      control.controls.forEach(childControl => {
        this.resetControlState(childControl);
      });
    }
  }

  validateRequiredFields(form: FormGroup): boolean {
    let isValid = true;

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control?.hasValidator(Validators.required) && !control.value) {
        control.markAsTouched();
        isValid = false;
      }
    });

    return isValid;
  }

  scrollToFirstInvalidField(form: FormGroup, formContainer: ElementRef, fieldLabels?: FormFieldLabel): void {
    if (!formContainer) return;

    const formElement = formContainer.nativeElement;
    const invalidControls = Object.keys(form.controls).filter(key => {
      const control = form.get(key);
      return control && control.invalid && control.touched;
    });

    if (invalidControls.length === 0) return;

    const firstInvalidControl = invalidControls[0];
    const element = this.findFormControlElement(formElement, firstInvalidControl);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        if (element.focus) {
          const active = document.activeElement as HTMLElement | null;
          // Evitar intentar focus si ya hay otro elemento enfocado (evita el warning del navegador)
          if (active && active !== document.body && active !== element) {
            console.log('SKIP focus -> ya hay un elemento con focus:', active, 'target:', element);
          } else {
            try {
              element.focus();
            } catch (err) {
              console.warn('Focus falló para elemento:', element, err);
            }
          }
        }
      }, 500);

      const label = fieldLabels?.[firstInvalidControl] || this.getDefaultFieldLabel(firstInvalidControl);
      this.notificationService.showNotification('error', {
        summary: 'Campo requerido',
        detail: `Por favor complete el campo: ${label}`
      });
    }
  }

  hasFormChanges(form: FormGroup, originalValues: any, fieldsToCompare: string[]): boolean {
    const currentValues = form.getRawValue();

    for (const field of fieldsToCompare) {
      const originalValue = originalValues[field];
      const currentValue = currentValues[field];

      if (this.isDateField(field)) {
        const originalDate = this.normalizeDate(originalValue);
        const currentDate = this.normalizeDate(currentValue);

        if (originalDate !== currentDate) {
          return true;
        }
      } else if (originalValue !== currentValue) {
        return true;
      }
    }

    return false;
  }

  createFormSnapshot(form: FormGroup): any {
    return { ...form.getRawValue() };
  }

  controlHasVisibleErrors(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }

  getFirstError(control: AbstractControl): string | null {
    if (!control.errors) return null;

    const errorKeys = Object.keys(control.errors);
    if (errorKeys.length === 0) return null;

    const firstErrorKey = errorKeys[0];
    const errorValue = control.errors[firstErrorKey];

    // Manejar errores comunes
    switch (firstErrorKey) {
      case 'required':
        return 'Este campo es requerido';
      case 'email':
        return 'Ingrese un email válido';
      case 'minlength':
        return `Mínimo ${errorValue.requiredLength} caracteres`;
      case 'maxlength':
        return `Máximo ${errorValue.requiredLength} caracteres`;
      case 'pattern':
        return 'Formato inválido';
      case 'min':
        return `Valor mínimo: ${errorValue.min}`;
      case 'max':
        return `Valor máximo: ${errorValue.max}`;
      default:
        return 'Campo inválido';
    }
  }

  private findFormControlElement(formElement: HTMLElement, controlName: string): HTMLElement | null {
    // Buscar por formControlName
    let element = formElement.querySelector(`[formcontrolname="${controlName}"]`) as HTMLElement;

    // Si no se encuentra, buscar por id
    if (!element) {
      element = formElement.querySelector(`[id="${controlName}"]`) as HTMLElement;
    }

    // Buscar en inputs, selects, textareas con formControlName
    if (!element) {
      element = formElement.querySelector(`input[formcontrolname="${controlName}"]`) as HTMLElement;
    }
    if (!element) {
      element = formElement.querySelector(`select[formcontrolname="${controlName}"]`) as HTMLElement;
    }
    if (!element) {
      element = formElement.querySelector(`textarea[formcontrolname="${controlName}"]`) as HTMLElement;
    }

    return element;
  }

  private isDateField(fieldName: string): boolean {
    const dateFields = ['fechaInicio', 'fechaFin', 'fechaBaseDuracion', 'fechaProgramada', 'fechaFinVigencia'];
    return dateFields.includes(fieldName);
  }

  private normalizeDate(date: any): string | null {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getDefaultFieldLabel(fieldName: string): string {
    const fieldLabels: FormFieldLabel = {
      'codigo': 'Código',
      'objeto': 'Objeto',
      'convenioOpcion': 'Cobertura de Convenio',
      'institucionDestino': 'Institución de Convenio',
      'fechaInicio': 'Fecha de Inicio',
      'fechaFin': 'Fecha de Fin',
      'responsable': 'Responsable',
      'contactoConvenio': 'Contacto',
      'telefono': 'Teléfono',
      'pais': 'País',
      'departamento': 'Departamento',
      'ciudad': 'Ciudad',
      'facultad': 'Facultad',
      'programa': 'Programa',
      'observaciones': 'Observaciones'
    };
    return fieldLabels[fieldName] || fieldName;
  }
}