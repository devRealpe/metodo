package com.umariana.paz_salvo.dto.response;

import com.umariana.paz_salvo.models.enums.EstadoRevisionEnum;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevisionDependenciaResponse {

    private Long id;
    private Long idDependencia;
    private String nombreDependencia;
    private EstadoRevisionEnum estado;
    private Boolean puedeAprobar;
    private String motivoBloqueo;
    private Integer ordenFlujo;
    private Boolean flujoParalelo;
}
