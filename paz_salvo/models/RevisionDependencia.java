package com.umariana.paz_salvo.models;

import com.umariana.paz_salvo.models.enums.EstadoRevisionEnum;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.dialect.type.PostgreSQLEnumJdbcType;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ps_revision_dependencia", uniqueConstraints = @UniqueConstraint(name = "uq_revision_dependencia", columnNames = {
        "id_solicitud", "id_dependencia" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevisionDependencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @UuidGenerator
    @Column(name = "uuid", unique = true, nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_solicitud", nullable = false)
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_dependencia", nullable = false)
    private Dependencia dependencia;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "estado_revision", nullable = false)
    @Builder.Default
    private EstadoRevisionEnum estado = EstadoRevisionEnum.PENDIENTE;

    @Column(name = "puede_aprobar")
    @Builder.Default
    private Boolean puedeAprobar = false;

    @Column(name = "motivo_bloqueo", columnDefinition = "TEXT")
    private String motivoBloqueo;

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;

    @Column(name = "fecha_revision")
    private LocalDateTime fechaRevision;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
