package com.umariana.paz_salvo.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ps_tipo_dependencia", uniqueConstraints = @UniqueConstraint(name = "uq_tipo_dependencia", columnNames = {
        "id_tipo_solicitud", "id_dependencia" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoDependencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @UuidGenerator
    @Column(name = "uuid", unique = true, nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_solicitud", nullable = false)
    private TipoSolicitud tipoSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_dependencia", nullable = false)
    private Dependencia dependencia;

    @Column(name = "orden_flujo", nullable = false)
    private Integer ordenFlujo;

    @Column(name = "obligatorio")
    @Builder.Default
    private Boolean obligatorio = true;

    @Column(name = "flujo_paralelo")
    @Builder.Default
    private Boolean flujoParalelo = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
