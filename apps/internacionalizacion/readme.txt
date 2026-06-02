# 📚 DOCUMENTACIÓN API - MICROSERVICIO INTERNACIONALIZACIÓN

## 📋 INFORMACIÓN GENERAL

- *Base URL*: http://localhost:8086/internacionalizacion/api
- *Puerto*: 8086
- *Esquema de Base de Datos*: internacionalizacion
- *Formato de respuesta*: JSON
- *Content-Type*: application/json

---

## 🔵 ENDPOINTS DE USUARIOS

### 1. *POST /usuarios* - Crear Usuario
bash
curl -X POST http://localhost:8086/internacionalizacion/api/usuarios \
     -H "Content-Type: application/json" \
     -d '{
       "nombre": "María",
       "primerApellido": "Salazar",
       "segundoApellido": "García",
       "tipoDocumento": "CC",
       "identificacion": "54545545",
       "paisExpedicion": "Colombia",
       "departamentoExpedicion": "Cundinamarca",
       "ciudadExpedicion": "Bogotá",
       "fechaExpedicion": "2000-01-01T00:00:00",
       "paisNacimiento": "Colombia",
       "departamentoNacimiento": "Cundinamarca",
       "ciudadNacimiento": "Bogotá",
       "fechaNacimiento": "1990-05-20T00:00:00",
       "genero": "Femenino",
       "estadoCivil": "Soltera",
       "paisResidencia": "Colombia",
       "departamentoResidencia": "Cundinamarca",
       "ciudadResidencia": "Bogotá",
       "barrio": "Centro",
       "direccion": "Calle 1 #2-3",
       "sector": "Centro",
       "telefono": "3001234567",
       "celular1": "3001234567",
       "celular2": "3007654321",
       "correo": "ejemplo@email.com",
       "discapacidad": "Ninguna",
       "nacionalidad": "Colombiana"
     }'


*Respuesta*:
json
{
  "id": "703b5ee2-3a76-48c6-8178-cbad35198202",
  "nombre": "María",
  "primerApellido": "Salazar",
  "segundoApellido": "García",
  "tipoDocumento": "CC",
  "identificacion": "54545545",
  // ... resto de campos
}


### 2. *GET /usuarios* - Obtener Todos los Usuarios
bash
curl -X GET http://localhost:8086/internacionalizacion/api/usuarios \
     -H "Content-Type: application/json"


### 3. *GET /usuarios/{id}* - Obtener Usuario por ID
bash
curl -X GET http://localhost:8086/internacionalizacion/api/usuarios/{usuarioId} \
     -H "Content-Type: application/json"


### 4. *PUT /usuarios/{id}* - Actualizar Usuario
bash
curl -X PUT http://localhost:8086/internacionalizacion/api/usuarios/{usuarioId} \
     -H "Content-Type: application/json" \
     -d '{
       "nombre": "María Actualizada",
       "primerApellido": "Salazar",
       // ... resto de campos
     }'


### 5. *DELETE /usuarios/{id}* - Eliminar Usuario
bash
curl -X DELETE http://localhost:8086/internacionalizacion/api/usuarios/{usuarioId}


---

## 🎓 ENDPOINTS DE INFORMACIÓN ACADÉMICA

### 1. *POST /info_academica* - Crear Información Académica
bash
curl -X POST http://localhost:8086/internacionalizacion/api/info_academica \
     -H "Content-Type: application/json" \
     -d '{
       "usuario": "703b5ee2-3a76-48c6-8178-cbad35198202",
       "tipoEstudio": "Pregrado",
       "programa": "Ingeniería de Sistemas",
       "universidad": "Universidad Nacional de Colombia",
       "promedio": 4.3,
       "periodo": "2012-1",
       "facultad": "Facultad de Ingeniería",
       "fechaInicio": "2012-02-01T00:00:00",
       "fechaGrado": "2017-06-15T00:00:00"
     }'


*Respuesta*:
json
{
  "id": "f4bf3f97-c95f-4ba7-9282-5b01c14087e0",
  "usuario": "703b5ee2-3a76-48c6-8178-cbad35198202",
  "tipoEstudio": "Pregrado",
  "programa": "Ingeniería de Sistemas",
  "universidad": "Universidad Nacional de Colombia",
  "promedio": 4.3,
  "periodo": "2012-1",
  "facultad": "Facultad de Ingeniería",
  "fechaInicio": "2012-02-01T00:00:00",
  "fechaGrado": "2017-06-15T00:00:00"
}


### 2. *GET /info_academica* - Obtener Todas las Informaciones Académicas
bash
curl -X GET http://localhost:8086/internacionalizacion/api/info_academica


### 3. *GET /info_academica/{id}* - Obtener Información Académica por ID
bash
curl -X GET http://localhost:8086/internacionalizacion/api/info_academica/{infoAcademicaId}


### 4. *GET /info_academica/usuario/{usuarioId}* - Obtener Info Académica por Usuario
bash
curl -X GET http://localhost:8086/internacionalizacion/api/info_academica/usuario/{usuarioId}


### 5. *PUT /info_academica* - Actualizar Información Académica
bash
curl -X PUT http://localhost:8086/internacionalizacion/api/info_academica \
     -H "Content-Type: application/json" \
     -d '{
       "id": "f4bf3f97-c95f-4ba7-9282-5b01c14087e0",
       "tipoEstudio": "Maestría",
       "programa": "Maestría en Ingeniería de Software",
       "universidad": "Universidad Nacional de Colombia",
       "promedio": 4.5,
       "periodo": "2018-1",
       "facultad": "Facultad de Ingeniería",
       "fechaInicio": "2018-02-01T00:00:00",
       "fechaGrado": "2020-12-15T00:00:00"
     }'


### 6. *DELETE /info_academica/{id}* - Eliminar Información Académica
bash
curl -X DELETE http://localhost:8086/internacionalizacion/api/info_academica/{infoAcademicaId}


---

## 💼 ENDPOINTS DE INFORMACIÓN LABORAL

### 1. *POST /info_laboral* - Crear Información Laboral
bash
curl -X POST http://localhost:8086/internacionalizacion/api/info_laboral \
     -H "Content-Type: application/json" \
     -d '{
       "usuario": "703b5ee2-3a76-48c6-8178-cbad35198202",
       "trabajaUniversidad": true,
       "cargoUniversidad": "Desarrolladora Senior",
       "area": "Tecnología",
       "dependencia": "Oficina de Informática",
       "programaAcademico": "Ingeniería de Sistemas",
       "facultad": "Facultad de Ingeniería",
       "tipoContratacion": "Tiempo Completo",
       "rol": "Desarrolladora"
     }'


*Respuesta*:
json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "usuario": "703b5ee2-3a76-48c6-8178-cbad35198202",
  "trabajaUniversidad": true,
  "cargoUniversidad": "Desarrolladora Senior",
  "area": "Tecnología",
  "dependencia": "Oficina de Informática",
  "programaAcademico": "Ingeniería de Sistemas",
  "facultad": "Facultad de Ingeniería",
  "tipoContratacion": "Tiempo Completo",
  "rol": "Desarrolladora"
}


### 2. *GET /info_laboral* - Obtener Toda la Información Laboral
bash
curl -X GET http://localhost:8086/internacionalizacion/api/info_laboral


### 3. *GET /info_laboral/{id}* - Obtener Información Laboral por ID
bash
curl -X GET http://localhost:8086/internacionalizacion/api/info_laboral/{infoLaboralId}


### 4. *PUT /info_laboral* - Actualizar Información Laboral
bash
curl -X PUT http://localhost:8086/internacionalizacion/api/info_laboral \
     -H "Content-Type: application/json" \
     -d '{
       "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
       "usuario": "703b5ee2-3a76-48c6-8178-cbad35198202",
       "trabajaUniversidad": false,
       "area": "Desarrollo de Software",
       "dependencia": "Departamento de TI",
       "tipoContratacion": "Freelance",
       "rol": "Full Stack Developer"
     }'


### 5. *DELETE /info_laboral/{id}* - Eliminar Información Laboral
bash
curl -X DELETE http://localhost:8086/internacionalizacion/api/info_laboral/{infoLaboralId}


---

## 📊 MODELOS DE DATOS

### UsuarioDTO
json
{
  "id": "UUID",
  "nombre": "string",
  "primerApellido": "string",
  "segundoApellido": "string",
  "tipoDocumento": "string",
  "identificacion": "string",
  "fechaExpedicion": "datetime",
  "fechaNacimiento": "datetime",
  "paisNacimiento": "string",
  "departamentoNacimiento": "string",
  "ciudadNacimiento": "string",
  "paisExpedicion": "string",
  "departamentoExpedicion": "string",
  "ciudadExpedicion": "string",
  "genero": "string",
  "estadoCivil": "string",
  "nacionalidad": "string",
  "discapacidad": "string",
  "paisResidencia": "string",
  "departamentoResidencia": "string",
  "ciudadResidencia": "string",
  "barrio": "string",
  "direccion": "string",
  "sector": "string",
  "telefono": "string",
  "celular1": "string",
  "celular2": "string",
  "correo": "string",
  "infoAcademicas": "InfoAcademicaDTO[]"
}


### InfoAcademicaDTO
json
{
  "id": "UUID",
  "usuario": "UUID",
  "tipoEstudio": "string",
  "programa": "string",
  "universidad": "string",
  "promedio": "double",
  "periodo": "string",
  "facultad": "string",
  "fechaInicio": "datetime",
  "fechaGrado": "datetime"
}


### InfoLaboralDTO
json
{
  "id": "UUID",
  "usuario": "UUID",
  "trabajaUniversidad": "boolean",
  "cargoUniversidad": "string",
  "area": "string",
  "dependencia": "string",
  "programaAcademico": "string",
  "facultad": "string",
  "tipoContratacion": "string",
  "rol": "string"
}


---

## 🔧 CÓDIGOS DE RESPUESTA HTTP

| Código | Descripción |
|--------|-------------|
| 200    | OK - Operación exitosa |
| 201    | Created - Recurso creado exitosamente |
| 204    | No Content - Eliminación exitosa |
| 400    | Bad Request - Error en la solicitud |
| 404    | Not Found - Recurso no encontrado |
| 500    | Internal Server Error - Error del servidor |

---

## 📝 NOTAS IMPORTANTES PARA EL FRONTEND

### Formatos de Datos:
- *UUIDs*: Formato estándar UUID v4
- *Fechas*: ISO 8601 (YYYY-MM-DDTHH:MM:SS)
- *Booleanos*: true / false (no como strings)
- *Números decimales*: Format double (ej: 4.5)

### Validaciones:
- *Campos obligatorios Usuario*: nombre, primerApellido, tipoDocumento, identificacion, correo
- *Campos obligatorios InfoAcademica*: tipoEstudio, programa, universidad, usuario
- *Campos obligatorios InfoLaboral*: usuario
- *Email válido* en campo correo
- *Identificación única* por usuario

### Relaciones:
- Un *Usuario* puede tener múltiples *InfoAcademica*
- Un *Usuario* puede tener múltiples *InfoLaboral*
- Para crear InfoAcademica/InfoLaboral, primero debe existir el Usuario

### Flujo Recomendado:
1. *Crear Usuario* → Obtener UUID del usuario
2. *Crear InfoAcademica/InfoLaboral* usando el UUID del usuario
3. *Consultar por usuario* para obtener información completa

---

## 🚀 EJEMPLOS DE INTEGRACIÓN FRONTEND

### JavaScript/Fetch:
javascript
// Crear usuario
const createUser = async (userData) => {
  const response = await fetch('http://localhost:8086/internacionalizacion/api/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Obtener usuario por ID
const getUserById = async (userId) => {
  const response = await fetch(`http://localhost:8086/internacionalizacion/api/usuarios/${userId}`);
  return response.json();
};

// Crear información académica
const createAcademicInfo = async (academicData) => {
  const response = await fetch('http://localhost:8086/internacionalizacion/api/info_academica', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(academicData)
  });
  return response.json();
};


### Axios:
javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8086/internacionalizacion/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Crear usuario
const createUser = (userData) => api.post('/usuarios', userData);

// Obtener usuarios
const getUsers = () => api.get('/usuarios');

// Crear información académica
const createAcademicInfo = (academicData) => api.post('/info_academica', academicData);


---

## 📞 CONTACTO Y SOPORTE

- *Backend Developer*: [Tu nombre]
- *Documentación actualizada*: [Fecha]
- *Repositorio*: um-microservicios/internacionalizacion
- *Rama*: feature/HU-03-crear-convocatorias

---

Documentación generada automáticamente para el microservicio de Internacionalización