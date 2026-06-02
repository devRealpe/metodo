package com.umariana.paz_salvo.services;

import com.umariana.paz_salvo.dto.request.CrearSolicitudManualRequest;
import com.umariana.paz_salvo.dto.response.ResultadoMasivaResponse;
import com.umariana.paz_salvo.dto.response.SolicitudResponse;
import com.umariana.paz_salvo.dto.response.TipoSolicitudResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface SolicitudService {

    /**
     * Crea una solicitud de paz y salvo de forma individual
     * ingresando manualmente la cédula del estudiante.
     */
    SolicitudResponse crearSolicitudManual(CrearSolicitudManualRequest request);

    /**
     * Crea múltiples solicitudes de paz y salvo a partir de un archivo plano
     * que contiene los números de cédula de los estudiantes (uno por línea).
     * Cada cédula se procesa de forma independiente; si una falla, las demás
     * continúan.
     *
     * @param archivo         Archivo .txt o .csv con cédulas (una por línea)
     * @param idTipoSolicitud ID del tipo de solicitud
     * @param idPrograma      ID del programa académico (opcional)
     * @param idFacultad      ID de la facultad (opcional)
     * @param anio            Año académico
     * @param periodo         Período académico (1 o 2)
     */
    ResultadoMasivaResponse crearSolicitudesMasivas(
            MultipartFile archivo,
            Long idTipoSolicitud,
            String idPrograma,
            String idFacultad,
            Integer anio,
            Integer periodo);

    /**
     * Retorna todos los tipos de solicitud activos ordenados por nombre.
     */
    List<TipoSolicitudResponse> listarTiposSolicitud();
}
