package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

  /**
   * Verifica si el estudiante ya tiene una solicitud de paz y salvo registrada.
   */
  @Query("""
      SELECT COUNT(s) > 0 FROM Solicitud s
      WHERE s.idUsuario = :cedula
      """)
  boolean existeSolicitudParaEstudiante(@Param("cedula") Long cedula);
}
