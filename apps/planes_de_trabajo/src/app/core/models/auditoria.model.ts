export interface Auditoria{
    id: string;
    tipoCambio: string;
    accion: string;
    fecha: string;
}

export interface CreateAuditoria{
    idPt: string;
    tipoCambio: string;
    accion: string;
}