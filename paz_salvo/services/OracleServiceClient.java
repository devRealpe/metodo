package com.umariana.paz_salvo.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

/**
 * Cliente HTTP para consultar el oracle-service institucional.
 * Usa API Key interna (X-Internal-Api-Key) para autenticación
 * service-to-service.
 */
@Service
@Slf4j
public class OracleServiceClient {

    private final RestTemplate restTemplate;
    private final String oracleServiceUrl;
    private final String internalApiKey;

    public OracleServiceClient(RestTemplate restTemplate,
            @Value("${oracle.service.url}") String oracleServiceUrl,
            @Value("${internal.api.key:}") String internalApiKey) {
        this.restTemplate = restTemplate;
        this.oracleServiceUrl = oracleServiceUrl.replaceAll("/+$", "");
        this.internalApiKey = internalApiKey;
    }

    /**
     * Busca un estudiante en el oracle-service por su número de identificación.
     *
     * @param identificacion Cédula del estudiante
     * @return Optional con los datos del usuario (campos: identificacion, nombre,
     *         programa, facultad, cargo, semestre, etc.);
     *         vacío si no existe en el sistema institucional.
     * @throws RuntimeException si el servicio no está disponible
     */
    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> buscarEstudiante(String identificacion) {
        String url = oracleServiceUrl + "/usuarios/{identificacion}";
        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class, identificacion);
            return Optional.ofNullable(response.getBody());
        } catch (HttpClientErrorException.NotFound e) {
            log.info("[ORACLE-CLIENT] Estudiante no encontrado con identificación: {}", identificacion);
            return Optional.empty();
        } catch (Exception e) {
            log.error("[ORACLE-CLIENT] Error al consultar oracle-service para identificación {}: {}",
                    identificacion, e.getMessage());
            throw new RuntimeException(
                    "No se pudo verificar la identificación en el sistema institucional. " +
                            "El servicio de consulta no está disponible en este momento.");
        }
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        if (internalApiKey != null && !internalApiKey.isBlank()) {
            headers.set("X-Internal-Api-Key", internalApiKey);
        }
        return headers;
    }
}
