package com.umariana.paz_salvo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoSolicitudResponse {

    private Long id;
    private String nombre;
    private String descripcion;
}
