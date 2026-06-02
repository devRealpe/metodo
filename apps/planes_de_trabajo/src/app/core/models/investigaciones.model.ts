export interface Investigaciones {
  id: string;
  grupo: GrupoDeInvestigacion;
  codigo: string;
  nombreProyecto: string;
  momentoInvestigacion: MomentoInvestigacion;
  productos: ProductosEsperados[];
  horas: number;
}

export interface GrupoDeInvestigacion{
  id: string;
  nombre: string;
  sigla: string;
  fechaCreacion: string;
  ultimaCategoriaMinciencias: string;
  codigo: string;
  facultad: string;
}

export interface MomentoInvestigacion{
  id: string;
  nombre: string;
}

export interface ProductosEsperados{
  id: string, 
  nombre: string,
  tipoProducto: TipoProducto;
}

export interface CrearProductoEsperado{
  nombre: string,
  idTipoProducto: string,
  idInvestigacionExtension: string
}

export interface TipoProducto{
  id: string, 
  nombre: string,
  descripcion: string,
  hijos: TipoProductoHijo
}

export interface TipoProductoHijo{
  id: string, 
  nombre: string,
  descripcion: string
}

export interface CrearInvestigaciones {
  codigo: string;
  nombreProyecto: string;
  idPt: string;
  idGrupo: string;
  idMomento: string;
  idSeccion: string;
}

export interface UpdateInvestigaciones {
  horas: number;
}