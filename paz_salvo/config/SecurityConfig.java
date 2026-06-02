package com.umariana.paz_salvo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuración de seguridad para el microservicio de Paz y Salvos.
 *
 * Patrón dos cadenas de filtros:
 * - @Order(1): Endpoints públicos (actuator, swagger) — SIN validación JWT
 * - @Order(2): Endpoints protegidos — Valida firma JWT via JWK (sin validar
 * issuer)
 *
 * No se valida el claim 'iss' del token para evitar rechazos
 * por diferencias http/https o puertos entre el issuer configurado
 * y el que Keycloak incluye en el token.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    /**
     * Cadena para endpoints públicos. No procesa JWT.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain publicFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(
                        "/actuator/health", "/actuator/health/**", "/actuator/info",
                        "/swagger-ui/**", "/v3/api-docs/**", "/api-docs/**", "/swagger-ui.html")
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }

    /**
     * Cadena para endpoints protegidos. Valida firma JWT sin validar issuer.
     *
     * ---
     * DESACTIVADA TEMPORALMENTE para pruebas: acceso libre a todos los endpoints.
     * Para reactivar la seguridad, descomentar este método y eliminar el bean de
     * acceso libre.
     * ---
     */
    // @Bean
    // @Order(2)
    // public SecurityFilterChain protectedFilterChain(HttpSecurity http) throws
    // Exception {
    // http
    // .cors(cors -> cors.disable())
    // .csrf(csrf -> csrf.disable())
    // .sessionManagement(session ->
    // session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    // .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
    // .oauth2ResourceServer(oauth2 -> oauth2
    // .jwt(jwt -> jwt
    // .decoder(jwtDecoder())
    // .jwtAuthenticationConverter(jwtAuthenticationConverter())));
    //
    // return http.build();
    // }

    /**
     * Acceso libre temporal a todos los endpoints (incluidos los protegidos) para
     * pruebas.
     * Eliminar este bean cuando se reactive la seguridad.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain openAllFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes permitidos — ajustar según el entorno del frontend
        config.setAllowedOriginPatterns(List.of("*"));

        // Métodos HTTP permitidos
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Cabeceras permitidas en la petición
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));

        // Cabeceras expuestas al cliente
        config.setExposedHeaders(List.of("Authorization"));

        // Permite el envío de cookies / credenciales
        config.setAllowCredentials(true);

        // Caché de pre-flight (1 hora)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        // Solo validar expiración. La validación de issuer se omite para
        // evitar falsos rechazos por diferencia http/https o puertos.
        decoder.setJwtValidator(new JwtTimestampValidator());
        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess == null || !realmAccess.containsKey("roles")) {
                return List.of();
            }

            @SuppressWarnings("unchecked")
            Collection<String> roles = (Collection<String>) realmAccess.get("roles");
            if (roles == null) {
                return List.of();
            }

            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                    .collect(Collectors.toList());
        });

        return converter;
    }
}
