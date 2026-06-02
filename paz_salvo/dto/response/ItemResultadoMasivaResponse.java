package com.umariana.paz_salvo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemResultadoMasivaResponse {

    private Long cedula;
    private String estado; // "EXITOSO" | "FALLIDO"
    private String error; // presente si fallido
}
