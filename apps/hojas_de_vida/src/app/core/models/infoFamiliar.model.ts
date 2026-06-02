export interface InfoFamiliar {
    id?: string;
    nombres: string;
    identificacion: string;
    tipoDocumento: string;
    lugarExpedicion: string;
    fechaNacimiento: Date | string;
    ocupacion: string;
    celular: string;
    correo: string;
    dependeEconomicamente: boolean;
    parentesco: string;
    persona: string;
}