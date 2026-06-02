package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.Solicitud;
import com.umariana.paz_salvo.models.enums.EstadoSolicitudEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

  /**
   * Verifica si ya existe una solicitud activa (no rechazada ni finalizada)
   * para el mismo estudiante, tipo, año y período.
   */
  @Query("""
      SELECT COUNT(s) > 0 FROM Solicitud s
      WHERE s.idUsuario = :cedula
        AND s.tipoSolicitud.id = :idTipo
        AND s.anio = :anio
        AND s.periodo = :periodo
        AND s.estado NOT IN :estadosExcluidos
      """)
  boolean existeSolicitudActiva(
      @Param("cedula") Long cedula,
      @Param("idTipo") Long idTipo,
      @Param("anio") Integer anio,
      @Param("periodo") Integer periodo,
      @Param("estadosExcluidos") List<EstadoSolicitudEnum> estadosExcluidos);
}
