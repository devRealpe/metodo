import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { ArchivosUsuarios } from '../models/archivousuarios.model';

@Injectable({
    providedIn: 'root',
})
export class ArchivosUsuariosService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiViaticos}/archivos-usuarios`;

    /**
     * Subir un archivo con código de solicitud opcional
     */
    subirArchivo(
        file: File, 
        identificacionUsuario: string, 
        codigoSolicitud?: string
    ): Observable<ArchivosUsuarios> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('identificacionUsuario', identificacionUsuario);
        
        if (codigoSolicitud) {
            formData.append('codigoSolicitud', codigoSolicitud);
        }

        return this.http.post<ArchivosUsuarios>(`${this.apiUrl}/subir`, formData).pipe(
            map(archivo => this.convertirFechas(archivo))
        );
    }

    /**
     * Obtener todos los archivos
     */
    obtenerTodos(): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(this.apiUrl).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Obtener archivo por ID
     */
    obtenerPorId(id: number): Observable<ArchivosUsuarios> {
        return this.http.get<ArchivosUsuarios>(`${this.apiUrl}/${id}`).pipe(
            map(archivo => this.convertirFechas(archivo))
        );
    }

    /**
     * Obtener archivos por usuario
     */
    obtenerPorUsuario(identificacionUsuario: string): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(`${this.apiUrl}/usuario/${identificacionUsuario}`).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Obtener archivos por tipo
     */
    obtenerPorTipo(tipoArchivo: string): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(`${this.apiUrl}/tipo/${tipoArchivo}`).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Obtener archivos por usuario y tipo
     */
    obtenerPorUsuarioYTipo(identificacionUsuario: string, tipoArchivo: string): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(
            `${this.apiUrl}/usuario/${identificacionUsuario}/tipo/${tipoArchivo}`
        ).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Obtener archivos por solicitud
     */
    obtenerPorSolicitud(codigoSolicitud: string): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(`${this.apiUrl}/solicitud/${codigoSolicitud}`).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Obtener archivos por solicitud y tipo
     */
    obtenerPorSolicitudYTipo(codigoSolicitud: string, tipoArchivo: string): Observable<ArchivosUsuarios[]> {
        return this.http.get<ArchivosUsuarios[]>(
            `${this.apiUrl}/solicitud/${codigoSolicitud}/tipo/${tipoArchivo}`
        ).pipe(
            map(archivos => archivos.map(archivo => this.convertirFechas(archivo)))
        );
    }

    /**
     * Descargar archivo
     */
    descargarArchivo(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/descargar/${id}`, {
            responseType: 'blob'
        });
    }

    /**
     * Descargar archivo y obtener nombre del header
     */
    descargarArchivoConNombre(id: number): Observable<{ blob: Blob; nombre: string }> {
        return this.http.get(`${this.apiUrl}/descargar/${id}`, {
            responseType: 'blob',
            observe: 'response'
        }).pipe(
            map(response => {
                const contentDisposition = response.headers.get('Content-Disposition');
                let nombre = 'archivo-descargado';
                
                if (contentDisposition) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                    if (matches?.[1]) {
                        nombre = matches[1].replace(/['"]/g, '');
                    }
                }

                return {
                    blob: response.body!,
                    nombre: nombre
                };
            })
        );
    }

    /**
     * Actualizar metadatos del archivo
     */
    actualizarArchivo(id: number, archivo: Partial<ArchivosUsuarios>): Observable<ArchivosUsuarios> {
        return this.http.put<ArchivosUsuarios>(`${this.apiUrl}/${id}`, archivo).pipe(
            map(archivoActualizado => this.convertirFechas(archivoActualizado))
        );
    }

    /**
     * Eliminar archivo
     */
    eliminarArchivo(id: number): Observable<string> {
        return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
    }

    /**
     * Método auxiliar para descargar y guardar archivo en el navegador
     */
    descargarYGuardarArchivo(id: number): void {
        this.descargarArchivoConNombre(id).subscribe({
            next: ({ blob, nombre }) => {
                this.guardarArchivoEnNavegador(blob, nombre);
            },
            error: (error) => {
                throw error;
            }
        });
    }

    /**
     * Guardar archivo en el navegador
     */
    private guardarArchivoEnNavegador(blob: Blob, nombreArchivo: string): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Validar tamaño de archivo (20MB según configuración del backend)
     */
    validarTamanioArchivo(file: File): boolean {
        const maxSize = 20 * 1024 * 1024; // 20MB en bytes
        return file.size <= maxSize;
    }

    /**
     * Obtener mensaje de error de validación de tamaño
     */
    obtenerMensajeErrorTamanio(file: File): string | null {
        if (!this.validarTamanioArchivo(file)) {
            return `El archivo "${file.name}" excede el tamaño máximo permitido de 20MB. Tamaño actual: ${this.formatearTamanio(file.size)}`;
        }
        return null;
    }

    /**
     * Validar tipo de archivo (opcional)
     */
    validarTipoArchivo(file: File, tiposPermitidos: string[]): boolean {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension ? tiposPermitidos.includes(extension) : false;
    }

    /**
     * Formatear tamaño de archivo
     */
    formatearTamanio(bytes?: number): string {
        if (!bytes || bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Obtener icono según tipo de archivo
     */
    obtenerIconoArchivo(tipoArchivo?: string): string {
        if (!tipoArchivo) return 'description';

        const tipo = tipoArchivo.toLowerCase();
        
        if (tipo.includes('pdf')) return 'picture_as_pdf';
        if (tipo.includes('word') || tipo.includes('document')) return 'description';
        if (tipo.includes('excel') || tipo.includes('spreadsheet')) return 'grid_on';
        if (tipo.includes('image') || tipo.includes('png') || tipo.includes('jpg') || tipo.includes('jpeg')) return 'image';
        if (tipo.includes('video')) return 'videocam';
        if (tipo.includes('audio')) return 'audiotrack';
        if (tipo.includes('zip') || tipo.includes('rar') || tipo.includes('compressed')) return 'folder_zip';
        if (tipo.includes('text')) return 'text_snippet';
        
        return 'insert_drive_file';
    }

    /**
     * Convertir fechas de string a Date
     */
    private convertirFechas(archivo: ArchivosUsuarios): ArchivosUsuarios {
        return {
            ...archivo,
            fechaSubida: archivo.fechaSubida ? new Date(archivo.fechaSubida) : undefined
        };
    }

    /**
     * Validar archivo antes de subir
     */
    validarArchivo(file: File, tiposPermitidos?: string[]): { valido: boolean; mensaje?: string } {
        // Validar tamaño
        if (!this.validarTamanioArchivo(file)) {
            return {
                valido: false,
                mensaje: this.obtenerMensajeErrorTamanio(file) || 'Archivo demasiado grande'
            };
        }

        // Validar tipo si se especificaron tipos permitidos
        if (tiposPermitidos && tiposPermitidos.length > 0) {
            if (!this.validarTipoArchivo(file, tiposPermitidos)) {
                return {
                    valido: false,
                    mensaje: `Tipo de archivo no permitido. Tipos aceptados: ${tiposPermitidos.join(', ')}`
                };
            }
        }

        return { valido: true };
    }
}