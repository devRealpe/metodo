package com.umariana.paz_salvo.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultadoMasivaResponse {

    private int totalEnArchivo;
    private int exitosos;
    private int fallidos;
    private List<ItemResultadoMasivaResponse> resultados;
}
