export const ACTIVIDADES_ASIGNADAS_CONSTANTS = {
  ESTADO_PENDIENTE: 'pendiente',
  TABLE_HEADERS: {
    NOMBRE: 'Labores Sustantivas',
    COMPROMISO: 'Compromiso',
    VERIFICACION: 'Verificación de Cumplimiento',
    OBSERVACIONES: 'Observaciones',
    ESTADO: 'Estado'
  },
  ACTIONS: {
    EDITAR: {
      LABEL: 'Editar',
      ICON: 'pi pi-pencil',
      TOOLTIP: 'Editar actividad'
    },
    ELIMINAR: {
      LABEL: 'Eliminar',
      ICON: 'pi pi-trash',
      TOOLTIP: 'Eliminar actividad'
    }
  },
  MESSAGES: {
    LOAD_ERROR: 'No se pudieron cargar las actividades',
    SAVE_SUCCESS: 'Actividades asignadas guardadas correctamente',
    SAVE_ERROR: 'Error al guardar los cambios en actividades asignadas',
    MOBILITY_NOT_SPECIFIED: 'No se ha especificado una movilidad'
  }
};