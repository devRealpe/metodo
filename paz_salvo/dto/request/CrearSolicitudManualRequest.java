package com.umariana.paz_salvo.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrearSolicitudManualRequest {

    @NotNull(message = "La cédula del estudiante es obligatoria")
    @Min(value = 1000000, message = "La cédula debe tener al menos 7 dígitos")
    @Max(value = 9_999_999_999L, message = "La cédula no puede superar 10 dígitos")
    private Long cedula;

    @NotNull(message = "El tipo de solicitud es obligatorio")
    private Long idTipoSolicitud;

    @NotNull(message = "El año es obligatorio")
    @Min(value = 2000, message = "El año debe ser mayor a 2000")
    @Max(value = 2100, message = "El año debe ser menor a 2100")
    private Integer anio;

    @NotNull(message = "El período es obligatorio")
    @Min(value = 1, message = "El período debe ser 1 o 2")
    @Max(value = 2, message = "El período debe ser 1 o 2")
    private Integer periodo;

    @Size(max = 255, message = "El nombre del programa no puede superar 255 caracteres")
    private String idPrograma;

    @Size(max = 255, message = "El nombre de la facultad no puede superar 255 caracteres")
    private String idFacultad;
}
