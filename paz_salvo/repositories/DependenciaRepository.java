package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.Dependencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DependenciaRepository extends JpaRepository<Dependencia, Long> {
}
