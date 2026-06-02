package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.TipoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TipoSolicitudRepository extends JpaRepository<TipoSolicitud, Long> {

    List<TipoSolicitud> findByActivoTrueOrderByNombreAsc();
}
