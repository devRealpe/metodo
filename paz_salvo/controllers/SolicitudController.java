package com.umariana.paz_salvo.controllers;

import com.umariana.paz_salvo.dto.request.CrearSolicitudManualRequest;
import com.umariana.paz_salvo.dto.response.ResultadoMasivaResponse;
import com.umariana.paz_salvo.dto.response.SolicitudResponse;
import com.umariana.paz_salvo.dto.response.TipoSolicitudResponse;
import com.umariana.paz_salvo.services.SolicitudService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@RequiredArgsConstructor
@Validated
@Tag(name = "Solicitudes", description = "Gestión de solicitudes de paz y salvo")
public class SolicitudController {

        private final SolicitudService solicitudService;

        // -------------------------------------------------------------------------
        // Tipos de solicitud
        // -------------------------------------------------------------------------

        @GetMapping("/tipos")
        @Operation(summary = "Listar tipos de solicitud activos", description = "Retorna todos los tipos de solicitud activos disponibles para registrar una nueva solicitud.")
        public ResponseEntity<List<TipoSolicitudResponse>> listarTipos() {
                return ResponseEntity.ok(solicitudService.listarTiposSolicitud());
        }

        // -------------------------------------------------------------------------
        // Historia 2: Registro manual de solicitud
        // -------------------------------------------------------------------------

        @PostMapping("/registro-individual")
        @Operation(summary = "Registrar solicitud individual", description = "Crea una solicitud de paz y salvo para un estudiante "
                        + "ingresando manualmente su número de cédula. "
                        + "Genera automáticamente los registros de revisión para cada dependencia del flujo.")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Solicitud creada exitosamente"),
                        @ApiResponse(responseCode = "400", description = "Datos inválidos o solicitud duplicada"),
                        @ApiResponse(responseCode = "404", description = "Tipo de solicitud no encontrado"),
                        @ApiResponse(responseCode = "422", description = "El flujo de dependencias no está configurado")
        })
        public ResponseEntity<SolicitudResponse> crearSolicitudManual(
                        @Valid @RequestBody CrearSolicitudManualRequest request) {

                SolicitudResponse response = solicitudService.crearSolicitudManual(request);
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }

        // -------------------------------------------------------------------------
        // Historia 1: Carga masiva desde archivo plano
        // -------------------------------------------------------------------------

        @PostMapping(value = "/registro-masivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        @Operation(summary = "Cargar solicitudes masivas desde archivo", description = "Crea múltiples solicitudes de paz y salvo a partir de un archivo plano "
                        + "(.txt o .csv) con los números de cédula de los estudiantes, uno por línea. "
                        + "Las líneas vacías y las que comiencen con '#' se ignoran. "
                        + "Cada cédula se procesa de forma independiente: un fallo en una no afecta las demás. "
                        + "Tamaño máximo del archivo: 2 MB.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Proceso completado — revisar resultados individuales", content = @Content(schema = @Schema(implementation = ResultadoMasivaResponse.class))),
                        @ApiResponse(responseCode = "400", description = "Archivo inválido o parámetros incorrectos"),
                        @ApiResponse(responseCode = "413", description = "El archivo supera el tamaño máximo permitido"),
                        @ApiResponse(responseCode = "404", description = "Tipo de solicitud no encontrado"),
                        @ApiResponse(responseCode = "422", description = "El flujo de dependencias no está configurado")
        })
        public ResponseEntity<ResultadoMasivaResponse> crearSolicitudesMasivas(
                        @Parameter(description = "Archivo .txt o .csv con cédulas (una por línea)", required = true) @RequestPart("archivo") MultipartFile archivo,

                        @Parameter(description = "ID del tipo de solicitud", required = true) @RequestParam Long idTipoSolicitud,

                        @Parameter(description = "Año académico (ej. 2026)", required = true) @RequestParam @Min(2000) @Max(2100) Integer anio,

                        @Parameter(description = "Período académico (1 o 2)", required = true) @RequestParam @Min(1) @Max(2) Integer periodo,

                        @Parameter(description = "Nombre/código del programa académico (opcional)") @RequestParam(required = false) String idPrograma,

                        @Parameter(description = "Nombre de la facultad (opcional)") @RequestParam(required = false) String idFacultad) {

                ResultadoMasivaResponse response = solicitudService.crearSolicitudesMasivas(
                                archivo, idTipoSolicitud, idPrograma, idFacultad, anio, periodo);
                return ResponseEntity.ok(response);
        }
}
