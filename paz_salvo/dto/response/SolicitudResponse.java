package com.umariana.paz_salvo.dto.response;

import com.umariana.paz_salvo.models.enums.EstadoSolicitudEnum;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudResponse {

    private Long id;
    private Long idTipoSolicitud;
    private String nombreTipoSolicitud;
    private Long cedula;
    private String idPrograma;
    private String idFacultad;
    private Integer anio;
    private Integer periodo;
    private EstadoSolicitudEnum estado;
    private LocalDateTime fechaCreacion;
    private List<RevisionDependenciaResponse> revisiones;
}
