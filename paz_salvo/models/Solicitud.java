package com.umariana.paz_salvo.models;

import com.umariana.paz_salvo.models.enums.EstadoSolicitudEnum;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.dialect.type.PostgreSQLEnumJdbcType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ps_solicitud")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_solicitud", nullable = false)
    private TipoSolicitud tipoSolicitud;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(name = "id_programa", length = 255)
    private String idPrograma;

    @Column(name = "id_facultad", length = 255)
    private String idFacultad;

    @Column(name = "anio", nullable = false)
    private Integer anio;

    @Column(name = "periodo", nullable = false)
    private Integer periodo;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "estado_solicitud", nullable = false)
    @Builder.Default
    private EstadoSolicitudEnum estado = EstadoSolicitudEnum.PENDIENTE;

    @Column(name = "observacion_general", columnDefinition = "TEXT")
    private String observacionGeneral;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_finalizacion")
    private LocalDateTime fechaFinalizacion;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RevisionDependencia> revisiones = new ArrayList<>();
}
