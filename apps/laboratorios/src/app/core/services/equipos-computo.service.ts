import { environment } from '@shared/shared-environments';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EquiposComputo } from '../models/equipos-computo.model';
import { map } from 'rxjs/operators';


interface PageResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            sorted: boolean;
            empty: boolean;
            unsorted: boolean;
        };
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    size: number;
    number: number;
    numberOfElements: number;
    empty: boolean;
}

@Injectable({ providedIn: 'root' })
export class EquiposComputoService {
    private readonly base = `${environment.apilaboratoriosLocal}/equipos-computo`;

    constructor(private http: HttpClient) { }

    getAll(page?: number, size?: number, sort?: string): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams();
        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(this.base, { params });
    }

    getById(id: string): Observable<EquiposComputo> {
        return this.http.get<EquiposComputo>(`${this.base}/${id}`);
    }

    create(payload: Omit<EquiposComputo, 'id' | 'creadoEn' | 'actualizadoEn'>): Observable<EquiposComputo> {
        return this.http.post<EquiposComputo>(this.base, payload);
    }

    update(id: string, payload: Partial<EquiposComputo>): Observable<EquiposComputo> {
        return this.http.put<EquiposComputo>(`${this.base}/${id}`, payload);
    }

    patch(id: string, payload: Partial<EquiposComputo>): Observable<EquiposComputo> {
        return this.http.patch<EquiposComputo>(`${this.base}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    getByTipo(tipo: string, page?: number, size?: number, sort?: string): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams();
        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/tipo/${encodeURIComponent(tipo)}`, { params });
    }

    searchByNombre(query: string, page?: number, size?: number, sort?: string): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams().set('q', query);
        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/buscar/nombre`, { params });
    }

    searchByUbicacion(query: string, page?: number, size?: number, sort?: string): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams().set('q', query);
        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/buscar/ubicacion`, { params });
    }

    searchBySerial(query: string, page?: number, size?: number, sort?: string): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams().set('q', query);
        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/buscar/serial`, { params });
    }

    getByFechaAdquisicion(
        desde: string,
        hasta: string,
        page?: number,
        size?: number,
        sort?: string
    ): Observable<PageResponse<EquiposComputo>> {
        let params = new HttpParams()
            .set('desde', desde)
            .set('hasta', hasta);

        if (page !== undefined) params = params.set('page', page.toString());
        if (size !== undefined) params = params.set('size', size.toString());
        if (sort) params = params.set('sort', sort);

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/fecha-adq`, { params });
    }

    getAllSimple(): Observable<EquiposComputo[]> {
        return this.http.get<EquiposComputo[]>(`${this.base}/simple`);
    }

    searchByNombreSimple(query: string): Observable<EquiposComputo[]> {
        const params = new HttpParams()
            .set('q', query)
            .set('size', '10');

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/buscar/nombre`, { params })
            .pipe(
                map(response => response.content)
            );
    }

    searchBySerialSimple(query: string): Observable<EquiposComputo[]> {
        const params = new HttpParams()
            .set('q', query)
            .set('size', '10');

        return this.http.get<PageResponse<EquiposComputo>>(`${this.base}/buscar/serial`, { params })
            .pipe(
                map(response => response.content)
            );
    }
}