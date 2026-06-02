package com.umariana.paz_salvo.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.umariana.paz_salvo.models.Auditoria;
import com.umariana.paz_salvo.repositories.AuditoriaRepository;
import com.umariana.paz_salvo.services.AuditoriaService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaServiceImpl implements AuditoriaService {

    private static final String ESQUEMA = "public";
    private static final String BASE_DATOS = "paz_salvo";

    private final AuditoriaRepository auditoriaRepository;
    private final ObjectMapper objectMapper;
    private final HttpServletRequest httpRequest;

    // =========================================================================
    // Métodos públicos
    // =========================================================================

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarInsercion(String modulo, String tabla, String idRegistro, Object valorNuevo) {
        guardar(modulo, tabla, idRegistro, "INSERT",
                "Inserción en " + tabla + " id=" + idRegistro,
                null, valorNuevo, true, null, "BAJO");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarActualizacion(String modulo, String tabla, String idRegistro,
            Object valorAnterior, Object valorNuevo) {
        guardar(modulo, tabla, idRegistro, "UPDATE",
                "Actualización en " + tabla + " id=" + idRegistro,
                valorAnterior, valorNuevo, true, null, "BAJO");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarEliminacion(String modulo, String tabla, String idRegistro, Object valorAnterior) {
        guardar(modulo, tabla, idRegistro, "DELETE",
                "Eliminación en " + tabla + " id=" + idRegistro,
                valorAnterior, null, true, null, "MEDIO");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarError(String modulo, String accion, String descripcion, String mensajeError) {
        guardar(modulo, null, null, accion,
                descripcion, null, null, false, mensajeError, "ALTO");
    }

    // =========================================================================
    // Método interno de persistencia
    // =========================================================================

    private void guardar(String modulo, String tabla, String idRegistro, String accion,
            String descripcion, Object valorAnterior, Object valorNuevo,
            boolean exitoso, String mensajeError, String nivelCriticidad) {
        try {
            String jsonAnterior = toJson(valorAnterior);
            String jsonNuevo = toJson(valorNuevo);

            Auditoria auditoria = Auditoria.builder()
                    // Actor
                    .idUsuario(resolverIdUsuario())
                    .nombreUsuario(resolverNombreUsuario())
                    .rolUsuario(resolverRolUsuario())
                    .idSesion(resolverIdSesion())
                    // Acción
                    .accion(accion)
                    .modulo(modulo)
                    .descripcion(descripcion)
                    .exitoso(exitoso)
                    .mensajeError(mensajeError)
                    // Entidad afectada
                    .nombreBaseDatos(BASE_DATOS)
                    .esquemaAfectado(ESQUEMA)
                    .tablaAfectada(tabla)
                    .idRegistroAfectado(idRegistro)
                    // Datos
                    .datosAnteriores(jsonAnterior)
                    .datosNuevos(jsonNuevo)
                    // Contexto HTTP
                    .ipOrigen(resolverIp())
                    .userAgent(resolverUserAgent())
                    .endpoint(resolverEndpoint())
                    .metodoHttp(resolverMetodoHttp())
                    // Clasificación
                    .nivelCriticidad(nivelCriticidad)
                    .fechaAccion(OffsetDateTime.now())
                    .build();

            auditoriaRepository.save(auditoria);

        } catch (Exception ex) {
            log.error("Error al registrar auditoría modulo={} tabla={} id={} accion={}: {}",
                    modulo, tabla, idRegistro, accion, ex.getMessage());
        }
    }

    // =========================================================================
    // Resolución de contexto HTTP
    // =========================================================================

    private String resolverIp() {
        try {
            String forwarded = httpRequest.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return httpRequest.getRemoteAddr();
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolverUserAgent() {
        try {
            return httpRequest.getHeader("User-Agent");
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolverEndpoint() {
        try {
            String uri = httpRequest.getRequestURI();
            String query = httpRequest.getQueryString();
            return query != null ? uri + "?" + query : uri;
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolverMetodoHttp() {
        try {
            return httpRequest.getMethod();
        } catch (Exception ex) {
            return null;
        }
    }

    // =========================================================================
    // Resolución de contexto de seguridad
    // =========================================================================

    private Long resolverIdUsuario() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return null;
            }
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) {
                return (Long) principal;
            }
            return null;
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolverNombreUsuario() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return "sistema";
            }
            String name = auth.getName();
            return (name != null && !name.isBlank()) ? name : "sistema";
        } catch (Exception ex) {
            return "sistema";
        }
    }

    private String resolverRolUsuario() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getAuthorities() == null) {
                return null;
            }
            return auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .findFirst()
                    .orElse(null);
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolverIdSesion() {
        try {
            String bearer = httpRequest.getHeader("Authorization");
            if (bearer != null && bearer.startsWith("Bearer ")) {
                // Usa los primeros 100 caracteres del token como id de sesión
                String token = bearer.substring(7);
                return token.length() > 100 ? token.substring(0, 100) : token;
            }
            return null;
        } catch (Exception ex) {
            return null;
        }
    }

    // =========================================================================
    // Utilidades
    // =========================================================================

    private String toJson(Object objeto) {
        if (objeto == null)
            return null;
        try {
            return objectMapper.writeValueAsString(objeto);
        } catch (JsonProcessingException ex) {
            log.warn("No se pudo serializar objeto para auditoría: {}", ex.getMessage());
            return null;
        }
    }
}
