package com.umariana.paz_salvo.repositories;

import com.umariana.paz_salvo.models.RevisionDependencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RevisionDependenciaRepository extends JpaRepository<RevisionDependencia, Long> {
}
