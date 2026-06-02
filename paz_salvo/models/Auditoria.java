package com.umariana.paz_salvo.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ps_auditoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    // =========================================================================
    // IDENTIFICACIÓN
    // =========================================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @UuidGenerator
    @Column(name = "id_log", unique = true, nullable = false, updatable = false)
    private UUID idLog;

    // =========================================================================
    // IDENTIDAD DEL ACTOR
    // =========================================================================

    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "id_usuario_externo")
    private UUID idUsuarioExterno;

    @Column(name = "nombre_usuario", nullable = false, length = 150)
    @Builder.Default
    private String nombreUsuario = "sistema";

    @Column(name = "rol_usuario", length = 100)
    private String rolUsuario;

    @Column(name = "id_sesion", length = 100)
    private String idSesion;

    // =========================================================================
    // ACCIÓN REALIZADA
    // =========================================================================

    @Column(name = "accion", nullable = false, length = 100)
    private String accion;

    @Column(name = "modulo", nullable = false, length = 100)
    private String modulo;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "exitoso", nullable = false)
    @Builder.Default
    private Boolean exitoso = true;

    @Column(name = "mensaje_error", columnDefinition = "TEXT")
    private String mensajeError;

    // =========================================================================
    // ENTIDAD AFECTADA
    // =========================================================================

    @Column(name = "nombre_base_datos", length = 100)
    private String nombreBaseDatos;

    @Column(name = "esquema_afectado", length = 100)
    private String esquemaAfectado;

    @Column(name = "tabla_afectada", length = 100)
    private String tablaAfectada;

    @Column(name = "id_registro_afectado", length = 100)
    private String idRegistroAfectado;

    // =========================================================================
    // TRAZABILIDAD DE DATOS
    // =========================================================================

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "datos_anteriores", columnDefinition = "jsonb")
    private String datosAnteriores;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "datos_nuevos", columnDefinition = "jsonb")
    private String datosNuevos;

    // =========================================================================
    // CONTEXTO TÉCNICO
    // =========================================================================

    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "endpoint", length = 255)
    private String endpoint;

    @Column(name = "metodo_http", length = 10)
    private String metodoHttp;

    @Column(name = "duracion_ms")
    private Integer duracionMs;

    // =========================================================================
    // CLASIFICACIÓN
    // =========================================================================

    @Column(name = "nivel_criticidad", nullable = false, length = 20)
    @Builder.Default
    private String nivelCriticidad = "BAJO";

    @Column(name = "fecha_accion", nullable = false, columnDefinition = "TIMESTAMPTZ")
    @Builder.Default
    private OffsetDateTime fechaAccion = OffsetDateTime.now();
}
