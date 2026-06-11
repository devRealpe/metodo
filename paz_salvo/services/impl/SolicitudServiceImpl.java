package com.umariana.paz_salvo.services.impl;

import com.umariana.paz_salvo.dto.request.CrearSolicitudManualRequest;
import com.umariana.paz_salvo.dto.response.ItemResultadoMasivaResponse;
import com.umariana.paz_salvo.dto.response.ResultadoMasivaResponse;
import com.umariana.paz_salvo.dto.response.RevisionDependenciaResponse;
import com.umariana.paz_salvo.dto.response.SolicitudResponse;
import com.umariana.paz_salvo.dto.response.TipoSolicitudResponse;
import com.umariana.paz_salvo.exceptions.BusinessException;
import com.umariana.paz_salvo.models.*;
import com.umariana.paz_salvo.models.enums.EstadoRevisionEnum;
import com.umariana.paz_salvo.models.enums.EstadoSolicitudEnum;
import com.umariana.paz_salvo.repositories.*;
import com.umariana.paz_salvo.services.AuditoriaService;
import com.umariana.paz_salvo.services.OracleServiceClient;
import com.umariana.paz_salvo.services.SolicitudService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SolicitudServiceImpl implements SolicitudService {

        private static final long MAX_FILE_SIZE_BYTES = 2L * 1024 * 1024; // 2 MB
        private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("txt", "csv");
        private static final String REGEX_CEDULA = "^\\d{7,10}$";

        private final SolicitudRepository solicitudRepository;
        private final TipoSolicitudRepository tipoSolicitudRepository;
        private final TipoDependenciaRepository tipoDependenciaRepository;
        private final RevisionDependenciaRepository revisionDependenciaRepository;
        private final AuditoriaService auditoriaService;
        private final OracleServiceClient oracleServiceClient;
        private final TransactionTemplate transactionTemplate;

        public SolicitudServiceImpl(
                        SolicitudRepository solicitudRepository,
                        TipoSolicitudRepository tipoSolicitudRepository,
                        TipoDependenciaRepository tipoDependenciaRepository,
                        RevisionDependenciaRepository revisionDependenciaRepository,
                        AuditoriaService auditoriaService,
                        OracleServiceClient oracleServiceClient,
                        PlatformTransactionManager transactionManager) {
                this.solicitudRepository = solicitudRepository;
                this.tipoSolicitudRepository = tipoSolicitudRepository;
                this.tipoDependenciaRepository = tipoDependenciaRepository;
                this.revisionDependenciaRepository = revisionDependenciaRepository;
                this.auditoriaService = auditoriaService;
                this.oracleServiceClient = oracleServiceClient;
                this.transactionTemplate = new TransactionTemplate(transactionManager);
        }

        // -------------------------------------------------------------------------
        // Historia 2: Solicitud manual (individual)
        // -------------------------------------------------------------------------

        @Override
        @Transactional
        public SolicitudResponse crearSolicitudManual(CrearSolicitudManualRequest request) {
                TipoSolicitud tipoSolicitud = buscarTipoSolicitud(request.getIdTipoSolicitud());

                validarEstudianteRegistrable(request.getCedula(), request.getIdPrograma());

                List<TipoDependencia> flujo = tipoDependenciaRepository
                                .findByTipoSolicitudIdWithDependenciaOrderByOrdenFlujoAsc(tipoSolicitud.getId());

                if (flujo.isEmpty()) {
                        throw new BusinessException(
                                        "El tipo de solicitud no tiene dependencias configuradas en el flujo",
                                        HttpStatus.valueOf(422));
                }

                Solicitud solicitud = construirSolicitud(
                                request.getCedula(), tipoSolicitud,
                                request.getIdPrograma(), request.getIdFacultad(),
                                request.getAnio(), request.getPeriodo());
                solicitud = solicitudRepository.save(solicitud);

                // Auditoría: registro de la nueva solicitud
                auditoriaService.registrarInsercion("SOLICITUDES", "ps_solicitud",
                                String.valueOf(solicitud.getId()), snaphotSolicitud(solicitud));

                List<RevisionDependencia> revisiones = crearRevisionesFlujo(solicitud, flujo);

                log.info("Solicitud manual creada para cédula {}", request.getCedula());

                return mapearSolicitudResponse(solicitud, tipoSolicitud, flujo, revisiones);
        }

        // -------------------------------------------------------------------------
        // Historia 1: Carga masiva desde archivo plano
        // -------------------------------------------------------------------------

        @Override
        public ResultadoMasivaResponse crearSolicitudesMasivas(
                        MultipartFile archivo,
                        Long idTipoSolicitud,
                        String idPrograma,
                        String idFacultad,
                        Integer anio,
                        Integer periodo) {

                validarArchivo(archivo);

                // Carga previa de datos de referencia (lectura, fuera del bucle)
                TipoSolicitud tipoSolicitud = buscarTipoSolicitud(idTipoSolicitud);
                List<TipoDependencia> flujo = tipoDependenciaRepository
                                .findByTipoSolicitudIdWithDependenciaOrderByOrdenFlujoAsc(idTipoSolicitud);

                if (flujo.isEmpty()) {
                        throw new BusinessException(
                                        "El tipo de solicitud no tiene dependencias configuradas en el flujo",
                                        HttpStatus.valueOf(422));
                }

                List<Long> cedulas = parsearArchivo(archivo);

                List<ItemResultadoMasivaResponse> resultados = new ArrayList<>(cedulas.size());
                for (Long cedula : cedulas) {
                        ItemResultadoMasivaResponse item = procesarCedulaEnTransaccionIndependiente(
                                        cedula, tipoSolicitud, flujo, idPrograma, idFacultad, anio, periodo);
                        resultados.add(item);
                }

                long exitosos = resultados.stream()
                                .filter(r -> "EXITOSO".equals(r.getEstado()))
                                .count();

                log.info("Carga masiva finalizada — total: {}, exitosos: {}, fallidos: {}",
                                cedulas.size(), exitosos, cedulas.size() - exitosos);

                return ResultadoMasivaResponse.builder()
                                .totalEnArchivo(cedulas.size())
                                .exitosos((int) exitosos)
                                .fallidos(cedulas.size() - (int) exitosos)
                                .resultados(resultados)
                                .build();
        }

        // -------------------------------------------------------------------------
        // Métodos privados de soporte
        // -------------------------------------------------------------------------

        /**
         * Procesa una cédula en su propia transacción para que un fallo
         * no afecte el resto del lote.
         */
        private ItemResultadoMasivaResponse procesarCedulaEnTransaccionIndependiente(
                        Long cedula,
                        TipoSolicitud tipoSolicitud,
                        List<TipoDependencia> flujo,
                        String idPrograma,
                        String idFacultad,
                        Integer anio,
                        Integer periodo) {
                try {
                        transactionTemplate.execute(status -> {
                                validarEstudianteRegistrable(cedula, idPrograma);
                                Solicitud solicitud = construirSolicitud(
                                                cedula, tipoSolicitud, idPrograma, idFacultad, anio, periodo);
                                solicitud = solicitudRepository.save(solicitud);

                                // Auditoría: registro de la nueva solicitud (dentro de la transacción
                                // independiente)
                                auditoriaService.registrarInsercion("SOLICITUDES", "ps_solicitud",
                                                String.valueOf(solicitud.getId()), snaphotSolicitud(solicitud));

                                crearRevisionesFlujo(solicitud, flujo);
                                return null;
                        });

                        return ItemResultadoMasivaResponse.builder()
                                        .cedula(cedula)
                                        .estado("EXITOSO")
                                        .build();

                } catch (Exception ex) {
                        log.warn("Error al procesar cédula {}: {}", cedula, ex.getMessage());
                        return ItemResultadoMasivaResponse.builder()
                                        .cedula(cedula)
                                        .estado("FALLIDO")
                                        .error(ex.getMessage())
                                        .build();
                }
        }

        private TipoSolicitud buscarTipoSolicitud(Long idTipoSolicitud) {
                return tipoSolicitudRepository.findById(idTipoSolicitud)
                                .orElseThrow(() -> new BusinessException(
                                                "Tipo de solicitud no encontrado con id: " + idTipoSolicitud,
                                                HttpStatus.NOT_FOUND));
        }

        private void validarEstudianteRegistrable(Long cedula, String programaDirector) {
                if (solicitudRepository.existeSolicitudParaEstudiante(cedula)) {
                        throw new BusinessException(String.format(
                                        "El estudiante con cédula %d ya tiene un paz y salvo registrado",
                                        cedula));
                }

                validarProgramaConDirector(cedula, programaDirector);
        }

        private void validarProgramaConDirector(Long cedula, String programaDirector) {
                String programaDirectorNormalizado = normalizarTexto(programaDirector);
                if (programaDirectorNormalizado.isBlank()) {
                        throw new BusinessException(
                                        "No se pudo identificar el programa del director que realiza el registro");
                }

                Map<String, Object> estudiante = oracleServiceClient.buscarEstudiante(String.valueOf(cedula))
                                .orElseThrow(() -> new BusinessException(String.format(
                                                "No se encontró el estudiante con cédula %d en el sistema institucional",
                                                cedula),
                                                HttpStatus.NOT_FOUND));

                String programaEstudiante = estudiante.get("programa") != null
                                ? estudiante.get("programa").toString()
                                : "";

                if (normalizarTexto(programaEstudiante).isBlank()) {
                        throw new BusinessException(String.format(
                                        "No se pudo identificar el programa del estudiante con cédula %d",
                                        cedula));
                }

                if (!programaDirectorNormalizado.equals(normalizarTexto(programaEstudiante))) {
                        throw new BusinessException(String.format(
                                        "El estudiante con cédula %d pertenece al programa \"%s\" y no puede ser registrado por un director del programa \"%s\"",
                                        cedula, programaEstudiante, programaDirector));
                }
        }

        private String normalizarTexto(String valor) {
                return valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        }

        private Solicitud construirSolicitud(
                        Long cedula, TipoSolicitud tipoSolicitud,
                        String idPrograma, String idFacultad,
                        Integer anio, Integer periodo) {
                return Solicitud.builder()
                                .tipoSolicitud(tipoSolicitud)
                                .idUsuario(cedula)
                                .idPrograma(idPrograma)
                                .idFacultad(idFacultad)
                                .anio(anio)
                                .periodo(periodo)
                                .estado(EstadoSolicitudEnum.PENDIENTE)
                                .fechaCreacion(LocalDateTime.now())
                                .build();
        }

        /**
         * Crea los registros de revisión para cada dependencia del flujo.
         * Solo la(s) dependencia(s) del primer orden reciben puedeAprobar=true.
         */
        private List<RevisionDependencia> crearRevisionesFlujo(Solicitud solicitud, List<TipoDependencia> flujo) {
                int ordenInicial = flujo.get(0).getOrdenFlujo();

                List<RevisionDependencia> revisiones = flujo.stream()
                                .map(td -> RevisionDependencia.builder()
                                                .solicitud(solicitud)
                                                .dependencia(td.getDependencia())
                                                .estado(EstadoRevisionEnum.PENDIENTE)
                                                .puedeAprobar(td.getOrdenFlujo() == ordenInicial)
                                                .build())
                                .collect(Collectors.toList());

                return revisionDependenciaRepository.saveAll(revisiones);
        }

        /**
         * Crea un mapa plano con los campos básicos de la solicitud para serialización
         * segura.
         * Evita serializar proxies lazy de Hibernate (relaciones @ManyToOne
         * / @OneToMany).
         */
        private Map<String, Object> snaphotSolicitud(Solicitud solicitud) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", solicitud.getId());
                map.put("idTipoSolicitud",
                                solicitud.getTipoSolicitud() != null ? solicitud.getTipoSolicitud().getId() : null);
                map.put("idUsuario", solicitud.getIdUsuario());
                map.put("idPrograma", solicitud.getIdPrograma());
                map.put("idFacultad", solicitud.getIdFacultad());
                map.put("anio", solicitud.getAnio());
                map.put("periodo", solicitud.getPeriodo());
                map.put("estado", solicitud.getEstado());
                map.put("fechaCreacion", solicitud.getFechaCreacion());
                return map;
        }

        // -------------------------------------------------------------------------
        // Validación y parseo de archivo
        // -------------------------------------------------------------------------

        private void validarArchivo(MultipartFile archivo) {
                if (archivo == null || archivo.isEmpty()) {
                        throw new BusinessException("El archivo no puede estar vacío");
                }
                if (archivo.getSize() > MAX_FILE_SIZE_BYTES) {
                        throw new BusinessException("El archivo supera el tamaño máximo permitido de 2 MB");
                }
                String nombre = archivo.getOriginalFilename();
                if (nombre == null || !nombre.contains(".")) {
                        throw new BusinessException("El archivo debe tener extensión .txt o .csv");
                }
                String extension = nombre.substring(nombre.lastIndexOf('.') + 1).toLowerCase();
                if (!EXTENSIONES_PERMITIDAS.contains(extension)) {
                        throw new BusinessException("Solo se permiten archivos .txt y .csv");
                }
        }

        /**
         * Lee el archivo línea por línea y extrae cédulas válidas.
         * Ignora líneas vacías y comentarios (# ...).
         * Para CSV, toma solo la primera columna.
         */
        private List<Long> parsearArchivo(MultipartFile archivo) {
                try (BufferedReader reader = new BufferedReader(
                                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

                        List<Long> cedulas = reader.lines()
                                        .map(String::trim)
                                        .filter(linea -> !linea.isEmpty() && !linea.startsWith("#"))
                                        .map(linea -> linea.split(",")[0].trim())
                                        .filter(valor -> valor.matches(REGEX_CEDULA))
                                        .map(Long::parseLong)
                                        .distinct()
                                        .collect(Collectors.toList());

                        if (cedulas.isEmpty()) {
                                throw new BusinessException(
                                                "El archivo no contiene cédulas válidas. "
                                                                + "Cada línea debe tener un número entre 7 y 10 dígitos.");
                        }

                        log.info("Archivo procesado: {} cédulas únicas encontradas", cedulas.size());
                        return cedulas;

                } catch (BusinessException ex) {
                        throw ex;
                } catch (IOException ex) {
                        throw new BusinessException("No se pudo leer el archivo: " + ex.getMessage(),
                                        HttpStatus.INTERNAL_SERVER_ERROR);
                }
        }

        // -------------------------------------------------------------------------
        // Mapeo de respuesta
        // -------------------------------------------------------------------------

        private SolicitudResponse mapearSolicitudResponse(
                        Solicitud solicitud,
                        TipoSolicitud tipoSolicitud,
                        List<TipoDependencia> flujo,
                        List<RevisionDependencia> revisiones) {

                // Mapa dependencia -> orden para enriquecer la respuesta
                Map<Long, TipoDependencia> tipoPorDependencia = flujo.stream()
                                .collect(Collectors.toMap(
                                                td -> td.getDependencia().getId(),
                                                td -> td));

                List<RevisionDependenciaResponse> revisionesResponse = revisiones.stream()
                                .map(r -> {
                                        TipoDependencia td = tipoPorDependencia.get(r.getDependencia().getId());
                                        return RevisionDependenciaResponse.builder()
                                                        .id(r.getId())
                                                        .idDependencia(r.getDependencia().getId())
                                                        .nombreDependencia(r.getDependencia().getNombre())
                                                        .estado(r.getEstado())
                                                        .puedeAprobar(r.getPuedeAprobar())
                                                        .motivoBloqueo(r.getMotivoBloqueo())
                                                        .ordenFlujo(td != null ? td.getOrdenFlujo() : null)
                                                        .flujoParalelo(td != null ? td.getFlujoParalelo() : null)
                                                        .build();
                                })
                                .sorted(Comparator.comparingInt(r -> r.getOrdenFlujo() != null ? r.getOrdenFlujo() : 0))
                                .collect(Collectors.toList());

                return SolicitudResponse.builder()
                                .id(solicitud.getId())
                                .idTipoSolicitud(tipoSolicitud.getId())
                                .nombreTipoSolicitud(tipoSolicitud.getNombre())
                                .cedula(solicitud.getIdUsuario())
                                .idPrograma(solicitud.getIdPrograma())
                                .idFacultad(solicitud.getIdFacultad())
                                .anio(solicitud.getAnio())
                                .periodo(solicitud.getPeriodo())
                                .estado(solicitud.getEstado())
                                .fechaCreacion(solicitud.getFechaCreacion())
                                .revisiones(revisionesResponse)
                                .build();
        }

        // -------------------------------------------------------------------------
        // Tipos de solicitud
        // -------------------------------------------------------------------------

        @Override
        public List<TipoSolicitudResponse> listarTiposSolicitud() {
                return tipoSolicitudRepository.findByActivoTrueOrderByNombreAsc().stream()
                                .map(t -> TipoSolicitudResponse.builder()
                                                .id(t.getId())
                                                .nombre(t.getNombre())
                                                .descripcion(t.getDescripcion())
                                                .build())
                                .collect(Collectors.toList());
        }
}
