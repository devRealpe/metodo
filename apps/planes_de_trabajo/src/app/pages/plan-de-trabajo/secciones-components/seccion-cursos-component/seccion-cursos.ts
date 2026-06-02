import { Component, Input, Output, EventEmitter, OnInit, signal, computed, effect, inject } from '@angular/core';
import { Curso } from 'apps/planes_de_trabajo/src/app/core/models/curso.model';
import { CursoService } from 'apps/planes_de_trabajo/src/app/core/services/curso.service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { SeccionHijo } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { PlanDeTrabajoModel } from 'apps/planes_de_trabajo/src/app/core/models/planDeTrabajo.model';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-seccion-cursos',
    templateUrl: 'seccion-cursos.html',
    styleUrls: ['./seccion-cursos.scss'],
    standalone: true,
    imports: [TableModule, CommonModule]
})
export class SeccionCursos implements OnInit {
    @Input({ required: true }) planDeTrabajo!: PlanDeTrabajoModel;
    @Input({ required: true }) seccionHijo!: SeccionHijo;

    private idProfesorActual = signal<string | undefined>(undefined);
    private readonly messageService = inject(MessageService);

    cursos = signal<Curso[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    subtotal = computed(() => {
        const cursos = this.cursos();
        if (!cursos || cursos.length === 0) {
            return 0;
        }
        return cursos.reduce((total, curso) => total + (curso.horasPresenciales || 0), 0);
    });

    @Output() horasUsadasChange = new EventEmitter<number>();

    constructor(private cursoService: CursoService) {
        effect(() => {
            const nuevoId = this.planDeTrabajo?.idProfesor;
            if (nuevoId && nuevoId !== this.idProfesorActual()) {
                this.idProfesorActual.set(nuevoId);
                this.cargarCursos(nuevoId);
            }
        });
    }

    ngOnInit() {
    }

    cargarCursos(idProfesor: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.cursoService.getByProfesor(idProfesor).subscribe({
            next: (data: Curso[]) => {
                this.cursos.set(data);
                this.loading.set(false);
                this.emitirHorasUsadas();
            },
            error: (error) => {
                this.showError('Error al cargar los cursos');
                this.error.set('Error al cargar los cursos.');
                this.cursos.set([]);
                this.loading.set(false);
            }
        });
    }

    emitirHorasUsadas(): void {
        const totalHoras = this.subtotal();
        this.horasUsadasChange.emit(totalHoras);
    }

    private showError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 2000
        });
    }
}