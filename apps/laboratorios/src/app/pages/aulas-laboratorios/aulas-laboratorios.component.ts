import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { OraAulas } from '../../core/models/ora-aulas.model';
import { InputComponent, SelectComponent } from "@microfrontends/shared-ui";

@Component({
  selector: 'app-aulas-laboratorios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CardModule,
    TooltipModule,
    ProgressSpinnerModule,
    InputComponent,
    SelectComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './aulas-laboratorios.component.html',
  styleUrls: ['./aulas-laboratorios.component.scss']
})
export class AulasLaboratoriosComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private lbAulasService = inject(LbLaboratoriosAulasService); // PostgreSQL - SOLO AULAS HIJAS
  private oraAulasService = inject(OraAulasService); // Oracle - SOLO LECTURA (Aulas Padre)
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  aulasPostgres: LbLaboratoriosAulas[] = []; // AULAS HIJAS (se crean/editan aquí)
  aulasOracle: OraAulas[] = []; // AULAS PADRE (solo lectura, para selectores)
  aulasOracleDropdown: { label: string; value: string }[] = [];
  bloquesOracle: string[] = [];
  bloquesDropdown: { label: string; value: string }[] = [];
  tiposAulaDropdown: { label: string; value: string }[] = [];
  cargando = false;
  modoEdicion = false;
  aulaSeleccionada: LbLaboratoriosAulas | null = null;
  mostrarDialogEdicion = false;

  formAula = this.formBuilder.group({
    codAula: ['', [Validators.required, Validators.maxLength(10)]],
    nomAula: ['', [Validators.required, Validators.maxLength(100)]],
    codBloque: ['', [Validators.required, Validators.maxLength(20)]],
    nomBloque: ['', [Validators.required, Validators.maxLength(100)]],
    tipoAula: ['', [Validators.required, Validators.maxLength(50)]],
    numCapacidad: [0, [Validators.required, Validators.min(1)]],
    idPadre: [''],
    bloqueSelector: ['', Validators.required], // Requerido para forzar selección de bloque
    tipoAulaSelector: ['', Validators.required] // Requerido para forzar selección de tipo
  });

  formEdicion = this.formBuilder.group({
    codAula: ['', [Validators.required, Validators.maxLength(10)]],
    nomAula: ['', [Validators.required, Validators.maxLength(100)]],
    codBloque: ['', [Validators.required, Validators.maxLength(20)]],
    nomBloque: ['', [Validators.required, Validators.maxLength(100)]],
    tipoAula: ['', [Validators.required, Validators.maxLength(50)]],
    numCapacidad: [0, [Validators.required, Validators.min(1)]],
    idPadre: [''],
    bloqueSelector: ['', Validators.required],
    tipoAulaSelector: ['', Validators.required]
  });

  ngOnInit(): void {
    this.cargarDatos();
    
    // Listener para el selector de bloque (formulario principal)
    this.formAula.get('bloqueSelector')?.valueChanges.subscribe(value => {
      this.onBloqueSeleccionado(value);
    });
    
    // Listener para el selector de tipo de aula (formulario principal)
    this.formAula.get('tipoAulaSelector')?.valueChanges.subscribe(value => {
      if (value) {
        this.formAula.patchValue({ tipoAula: value });
      }
    });

    // Listeners para el formulario de edición
    this.formEdicion.get('bloqueSelector')?.valueChanges.subscribe(value => {
      this.onBloqueSeleccionadoEdicion(value);
    });
    
    this.formEdicion.get('tipoAulaSelector')?.valueChanges.subscribe(value => {
      if (value) {
        this.formEdicion.patchValue({ tipoAula: value });
      }
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    
    // ============================================
    // CARGAR AULAS HIJAS desde PostgreSQL
    // ============================================
    this.lbAulasService.getAll().subscribe({
      next: (aulas) => {
        this.aulasPostgres = aulas;
      },
      error: (err) => {
        console.error('Error al cargar aulas hijas de PostgreSQL:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aulas hijas de PostgreSQL'
        });
      }
    });

    // ============================================
    // CARGAR AULAS PADRE desde Oracle (solo lectura)
    // Se usan para selectores: Aula Padre, Bloque, Tipo
    // ============================================
    this.oraAulasService.getAll().subscribe({
      next: (aulas) => {
        this.aulasOracle = aulas;
        // Preparar opciones para el dropdown de aulas padre
        this.aulasOracleDropdown = aulas.map(aula => ({
          label: `${aula.codAula} - ${aula.nomAula}`,
          value: aula.codAula
        }));
        
        // Extraer bloques únicos para los dropdowns
        const bloquesUnicos = new Map<string, string>();
        aulas.forEach(aula => {
          if (aula.codBloque && aula.nomBloque) {
            bloquesUnicos.set(aula.codBloque, aula.nomBloque);
          }
        });
        
        this.bloquesDropdown = Array.from(bloquesUnicos.entries())
          .map(([cod, nom]) => ({
            label: `${cod} - ${nom}`,
            value: JSON.stringify({ codBloque: cod, nomBloque: nom })
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        
        // Extraer tipos de aula únicos
        const tiposUnicos = new Set<string>();
        aulas.forEach(aula => {
          if (aula.tipoAula && aula.tipoAula.trim()) {
            tiposUnicos.add(aula.tipoAula.trim());
          }
        });
        
        this.tiposAulaDropdown = Array.from(tiposUnicos)
          .map(tipo => ({
            label: tipo,
            value: tipo
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        

        const normalize = (text?: string): string =>
          (text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        // Tipos que se incluyen directamente sin condición adicional
        const includedTipos = new Set([
          'laboratorio',
          'laboratorio de informatica',
          'sala de juntas',
          'sala de estudio',
        ]);

        this.aulasOracleDropdown = aulas
          .filter((aula) => {
            const tipo = normalize(aula.tipoAula);
            const nombre = normalize(aula.nomAula);

            // Incluir si el tipo está en la lista blanca
            if (includedTipos.has(tipo)) return true;

            // Excepción: "Sala Especial" solo si el nombre contiene "salon de investigacion"
            if (tipo === 'sala especial' && nombre.includes('salon de investigacion')) return true;

            return false;
          })
          .map((aula) => ({
            label: `${aula.codAula} - ${aula.nomAula}`,
            value: aula.codAula
          }));

        console.log('Aulas Oracle para dropdown:', this.aulasOracleDropdown.length, this.aulasOracleDropdown);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar aulas de Oracle:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las aulas de Oracle'
        });
        this.cargando = false;
      }
    });
  }

  obtenerNombreAulaPadre(codAulaPadre: string | null | undefined): string {
    if (!codAulaPadre) return '-';
    const aulaPadre = this.aulasOracle.find(aula => aula.codAula === codAulaPadre);
    return aulaPadre ? `${aulaPadre.codAula} - ${aulaPadre.nomAula}` : 'No encontrado';
  }

  onBloqueSeleccionado(bloqueJson: string | null): void {
    if (!bloqueJson) {
      this.formAula.patchValue({ codBloque: '', nomBloque: '' });
      return;
    }
    
    try {
      const bloque = JSON.parse(bloqueJson);
      this.formAula.patchValue({
        codBloque: bloque.codBloque,
        nomBloque: bloque.nomBloque
      });
    } catch (error) {
      console.error('Error al parsear bloque:', error);
    }
  }

  onBloqueSeleccionadoEdicion(bloqueJson: string | null): void {
    if (!bloqueJson) {
      this.formEdicion.patchValue({ codBloque: '', nomBloque: '' });
      return;
    }
    
    try {
      const bloque = JSON.parse(bloqueJson);
      this.formEdicion.patchValue({
        codBloque: bloque.codBloque,
        nomBloque: bloque.nomBloque
      });
    } catch (error) {
      console.error('Error al parsear bloque:', error);
    }
  }

  guardar(): void {
    if (this.formAula.invalid) {
      this.formAula.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos (incluyendo bloque y tipo de aula)'
      });
      return;
    }

    this.cargando = true;
    const formValue = this.formAula.value;
    
    // Excluir selectores auxiliares (bloqueSelector y tipoAulaSelector) del payload
    // Solo se envían los datos del AULA HIJA a PostgreSQL
    const { bloqueSelector, tipoAulaSelector, ...datosAula } = formValue;
    
    // Preparar payload para guardar SOLO el AULA HIJA en PostgreSQL
    const payload = {
      ...datosAula,
      idPadre: datosAula.idPadre && datosAula.idPadre !== '' ? datosAula.idPadre : null
    } as Omit<LbLaboratoriosAulas, 'id'>;

    if (this.modoEdicion && this.aulaSeleccionada) {
      // ACTUALIZAR aula hija en PostgreSQL (NO en Oracle)
      this.lbAulasService.update(this.aulaSeleccionada.id, payload).subscribe({
        next: (aula) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Aula hija actualizada correctamente en PostgreSQL'
          });
          this.cargarDatos();
          this.cancelar();
        },
        error: (err) => {
          console.error('Error al actualizar:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el aula hija'
          });
          this.cargando = false;
        }
      });
    } else {
      // CREAR nueva aula hija en PostgreSQL (NO en Oracle)
      this.lbAulasService.create(payload).subscribe({
        next: (aula) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Aula hija creada correctamente en PostgreSQL'
          });
          this.cargarDatos();
          this.cancelar();
        },
        error: (err) => {
          console.error('Error al crear:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el aula hija'
          });
          this.cargando = false;
        }
      });
    }
  }

  editar(aula: LbLaboratoriosAulas): void {
    this.aulaSeleccionada = aula;
    
    // Encontrar el bloque correspondiente en el dropdown
    const bloqueJson = this.bloquesDropdown.find(b => {
      try {
        const parsed = JSON.parse(b.value);
        return parsed.codBloque === aula.codBloque && parsed.nomBloque === aula.nomBloque;
      } catch {
        return false;
      }
    })?.value || '';
    
    this.formEdicion.patchValue({
      codAula: aula.codAula,
      nomAula: aula.nomAula,
      codBloque: aula.codBloque,
      nomBloque: aula.nomBloque,
      tipoAula: aula.tipoAula,
      numCapacidad: aula.numCapacidad,
      idPadre: aula.idPadre || '',
      bloqueSelector: bloqueJson,
      tipoAulaSelector: aula.tipoAula || ''
    });
    
    this.mostrarDialogEdicion = true;
  }

  guardarEdicion(): void {
    if (this.formEdicion.invalid || !this.aulaSeleccionada) {
      this.formEdicion.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.cargando = true;
    const formValue = this.formEdicion.value;
    
    const { bloqueSelector, tipoAulaSelector, ...datosAula } = formValue;
    
    const payload = {
      ...datosAula,
      idPadre: datosAula.idPadre && datosAula.idPadre !== '' ? datosAula.idPadre : null
    } as Omit<LbLaboratoriosAulas, 'id'>;

    this.lbAulasService.update(this.aulaSeleccionada.id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Aula actualizada correctamente'
        });
        this.cargarDatos();
        this.cerrarDialogEdicion();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el aula'
        });
        this.cargando = false;
      }
    });
  }

  cerrarDialogEdicion(): void {
    this.mostrarDialogEdicion = false;
    this.aulaSeleccionada = null;
    this.formEdicion.reset({ numCapacidad: 0, idPadre: '', bloqueSelector: '', tipoAulaSelector: '' });
  }

  eliminar(aula: LbLaboratoriosAulas): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el aula ${aula.nomAula}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.lbAulasService.delete(aula.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Aula eliminada correctamente'
            });
            this.cargarDatos();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el aula'
            });
          }
        });
      }
    });
  }

  cancelar(): void {
    this.modoEdicion = false;
    this.aulaSeleccionada = null;
    this.formAula.reset({ numCapacidad: 0, idPadre: '', bloqueSelector: '', tipoAulaSelector: '' });
  }


}
