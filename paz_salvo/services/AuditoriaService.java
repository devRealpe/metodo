package com.umariana.paz_salvo.services;

public interface AuditoriaService {

    /**
     * Registra la inserción de un nuevo registro en la base de datos.
     *
     * @param modulo     Módulo del sistema que origina la acción (ej.
     *                   "SOLICITUDES")
     * @param tabla      Nombre de la tabla afectada (ej. "ps_solicitud")
     * @param idRegistro Identificador del registro creado (como String)
     * @param valorNuevo Estado nuevo del registro (objeto serializable a JSON)
     */
    void registrarInsercion(String modulo, String tabla, String idRegistro, Object valorNuevo);

    /**
     * Registra la actualización de un registro existente.
     *
     * @param modulo        Módulo del sistema que origina la acción
     * @param tabla         Nombre de la tabla afectada
     * @param idRegistro    Identificador del registro modificado
     * @param valorAnterior Estado previo del registro
     * @param valorNuevo    Estado nuevo del registro
     */
    void registrarActualizacion(String modulo, String tabla, String idRegistro,
            Object valorAnterior, Object valorNuevo);

    /**
     * Registra la eliminación de un registro.
     *
     * @param modulo        Módulo del sistema que origina la acción
     * @param tabla         Nombre de la tabla afectada
     * @param idRegistro    Identificador del registro eliminado
     * @param valorAnterior Estado previo del registro antes de eliminarse
     */
    void registrarEliminacion(String modulo, String tabla, String idRegistro, Object valorAnterior);

    /**
     * Registra un error o fallo en una operación del sistema.
     *
     * @param modulo       Módulo del sistema que origina el error
     * @param accion       Acción que se intentaba realizar
     * @param descripcion  Descripción legible del intento de operación
     * @param mensajeError Mensaje de error técnico
     */
    void registrarError(String modulo, String accion, String descripcion, String mensajeError);
}
