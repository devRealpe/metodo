import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { UsuarioExterno } from '../../core/models/usuario-externos.model';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-consulta-usuarios-externos.component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    PanelModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    InputComponent,
    SelectComponent
],
  providers: [MessageService, ConfirmationService, DatePipe],
  templateUrl: './consulta-usuarios-externos.component.html',
  styleUrl: './consulta-usuarios-externos.component.scss'
})
export class ConsultaUsuariosExternosComponent implements OnInit {
  usuariosExternos: UsuarioExterno[] = [];
  usuariosFiltrados: UsuarioExterno[] = [];
  cargando = false;
  filtroIdentificacion = '';
  filtroTipoUsuario = '';
  
  // Modal de edición
  mostrarModalEdicion = false;
  usuarioSeleccionado: UsuarioExterno | null = null;
  formularioEdicion: FormGroup;
  guardandoEdicion = false;

  opcionesGenero = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'Otro' }
  ];
  tiposUsuario = [
    { label: 'Externo', value: 'Externo' },
    { label: 'Visitante', value: 'Visitante' },
    { label: 'Terceros', value: 'Terceros' }
  ];

  ocupaciones = [
    { label: 'Seleccionar...', value: '' },
    { label: 'Profesional', value: 'Profesional' },
    { label: 'Técnico', value: 'Técnico' },
    { label: 'Investigador', value: 'Investigador' },
    { label: 'Consultor', value: 'Consultor' },
    { label: 'Estudiante de otra institución', value: 'Estudiante de otra institución' },
    { label: 'Otro', value: 'Otro' }
  ];

  tiposUsuarioFiltro = [
    { label: 'Todos', value: '' },
    ...this.tiposUsuario
  ];

  filter: boolean = true;

  private usuariosExternosService = inject(UsuariosExternosService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.formularioEdicion = this.crearFormularioEdicion();
  }

  ngOnInit(): void {
    this.cargarUsuariosExternos();
  }

  cargarUsuariosExternos(): void {
    this.cargando = true;
    
    this.usuariosExternosService.obtenerUsuariosExternos().subscribe({
      next: (usuarios) => {
        this.usuariosExternos = usuarios;
        this.usuariosFiltrados = usuarios;
        this.cargando = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios externos' });
        this.cargando = false;
      }
    });
  }

  filtrarPorIdentificacion(): void {
    this.aplicarFiltros();
  }

  filtrarPorTipo(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let usuariosFiltrados = this.usuariosExternos;

    if (this.filtroIdentificacion.trim()) {
      const filtroId = this.filtroIdentificacion.toLowerCase();
      usuariosFiltrados = usuariosFiltrados.filter(usuario =>
        usuario.identificacion.toLowerCase().includes(filtroId)
      );
    }

    if (this.filtroTipoUsuario) {
      usuariosFiltrados = usuariosFiltrados.filter(usuario =>
        usuario.tipoUsuario === this.filtroTipoUsuario
      );
    }

    this.usuariosFiltrados = usuariosFiltrados;
  }

  limpiarFiltro(): void {
    this.filtroIdentificacion = '';
    this.filtroTipoUsuario = '';
    this.usuariosFiltrados = this.usuariosExternos;
  }

  formatearGenero(genero: string): string {
    switch (genero?.trim().toUpperCase()) {
      case 'M':
      case 'MASCULINO':
        return 'Masculino';
      case 'F':
      case 'FEMENINO':
        return 'Femenino';
      case 'OTRO':
        return 'Otro';
      default:
        return genero || 'No especificado';
    }
  }

  formatearTipoUsuario(tipoUsuario: string): string {
    const tipo = this.tiposUsuario.find(t => t.value === tipoUsuario);
    return tipo ? tipo.label : (tipoUsuario || 'No especificado');
  }

  crearFormularioEdicion(): FormGroup {
    return this.fb.group({
      identificacion: ['', [Validators.required]],
      genero: ['', [Validators.required]],
      cargo: [''],
      tipoUsuario: ['', [Validators.required]]
    });
  }

  editarUsuario(usuario: UsuarioExterno): void {
    this.usuarioSeleccionado = { ...usuario };
    this.formularioEdicion.patchValue({
      identificacion: usuario.identificacion,
      genero: usuario.genero ?? '',
      cargo: usuario.cargo ?? '',
      tipoUsuario: usuario.tipoUsuario
    });
    this.mostrarModalEdicion = true;
  }

  guardarEdicion(): void {
    if (this.formularioEdicion.invalid || !this.usuarioSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.guardandoEdicion = true;
    const datosActualizados = { ...this.formularioEdicion.value };

    this.usuariosExternosService.actualizarUsuarioExterno(this.usuarioSeleccionado.identificacion, datosActualizados).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario actualizado correctamente en la base de datos'
        });
        this.cerrarModalEdicion();
        this.cargarUsuariosExternos();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el usuario en la base de datos'
        });
        this.guardandoEdicion = false;
      },
      complete: () => {
        this.guardandoEdicion = false;
      }
    });
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.usuarioSeleccionado = null;
    this.formularioEdicion.reset();
  }

  eliminarUsuario(usuario: UsuarioExterno): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar al usuario ${usuario.identificacion}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.usuariosExternosService.eliminarUsuarioExterno(usuario.identificacion).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Usuario eliminado correctamente de la base de datos'
            });
            this.cargarUsuariosExternos();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el usuario de la base de datos'
            });
          }
        });
      }
    });
  }

  private valorCelda(usuario: UsuarioExterno, key: string): string {
    switch (key) {
      case 'identificacion': return usuario.identificacion || '—';
      case 'genero': return this.formatearGenero(usuario.genero ?? '');
      case 'cargo': return usuario.cargo || 'No especificado';
      case 'tipoUsuario': return this.formatearTipoUsuario(usuario.tipoUsuario);
      default: return (usuario as unknown as Record<string, unknown>)[key]?.toString() ?? '—';
    }
  }

  onExportCSV(): void {
    if (!this.usuariosFiltrados.length) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Sin datos', 
        detail: 'No hay usuarios para exportar.' 
      });
      return;
    }

    const header = ['identificacion', 'genero', 'cargo', 'tipoUsuario'];

    const csv = [
      header.join(','),
      ...this.usuariosFiltrados.map((usuario) =>
        [
          usuario.identificacion,
          this.formatearGenero(usuario.genero ?? ''),
          usuario.cargo ?? 'No especificado',
          this.formatearTipoUsuario(usuario.tipoUsuario)
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
    a.download = `usuarios_externos_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Exportación exitosa',
      detail: 'El archivo CSV se ha descargado correctamente.'
    });
  }

  async exportarXLSX(): Promise<void> {
    if (!this.usuariosFiltrados.length) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Sin datos', 
        detail: 'No hay usuarios para exportar.' 
      });
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const header = ['Identificación', 'Género', 'Cargo', 'Tipo de Usuario'];

      const body = this.usuariosFiltrados.map(usuario => [
        this.valorCelda(usuario, 'identificacion'),
        this.valorCelda(usuario, 'genero'),
        this.valorCelda(usuario, 'cargo'),
        this.valorCelda(usuario, 'tipoUsuario')
      ]);

      const aoa = [header, ...body];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const maxLenByCol = header.map((h, idx) => {
        const headerLen = h.length;
        const dataMax = Math.max(0, ...body.map(row => String(row[idx]).length));
        return Math.min(60, Math.max(10, Math.max(headerLen, dataMax) + 2));
      });
      (ws as Record<string, unknown>)['!cols'] = maxLenByCol.map(wch => ({ wch }));

      XLSX.utils.book_append_sheet(wb, ws, 'Usuarios Externos');
      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      XLSX.writeFile(wb, `usuarios_externos_${date}.xlsx`);

      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: 'El archivo XLSX se ha descargado correctamente.'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de exportación',
        detail: 'Para exportar a Excel instala: npm i xlsx'
      });
    }
  }

  async exportarPDF(): Promise<void> {
    if (!this.usuariosFiltrados.length) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Sin datos', 
        detail: 'No hay usuarios para exportar.' 
      });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('l', 'pt', 'a4');

      doc.setFontSize(16);
      doc.text('Reporte de Usuarios Externos', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

      const header = ['Identificación', 'Género', 'Cargo', 'Tipo de Usuario'];

      const body = this.usuariosFiltrados.map(usuario => [
        this.valorCelda(usuario, 'identificacion'),
        this.valorCelda(usuario, 'genero'),
        this.valorCelda(usuario, 'cargo'),
        this.valorCelda(usuario, 'tipoUsuario')
      ]);

      autoTable(doc, {
        head: [header],
        body: body,
        styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fillColor: [33, 150, 243] },
        margin: { top: 48, left: 24, right: 24, bottom: 24 },
        startY: 50
      });

      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      doc.save(`usuarios_externos_${date}.pdf`);

      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: 'El archivo PDF se ha descargado correctamente.'
      });
    } catch {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error de exportación', 
        detail: '' 
      });
    }
  }
}
