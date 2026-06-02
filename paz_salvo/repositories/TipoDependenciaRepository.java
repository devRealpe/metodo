package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.TipoDependencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TipoDependenciaRepository extends JpaRepository<TipoDependencia, Long> {

        /**
         * Obtiene el flujo de dependencias de un tipo de solicitud con JOIN FETCH
         * para evitar el problema N+1 al acceder a la dependencia.
         */
        @Query("""
                        SELECT td FROM TipoDependencia td
                        JOIN FETCH td.dependencia
                        WHERE td.tipoSolicitud.id = :idTipoSolicitud
                        ORDER BY td.ordenFlujo ASC
                        """)
        List<TipoDependencia> findByTipoSolicitudIdWithDependenciaOrderByOrdenFlujoAsc(
                        @Param("idTipoSolicitud") Long idTipoSolicitud);
}
