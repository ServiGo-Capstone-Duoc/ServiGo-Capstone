# Auditoria tecnica profunda de ServiGo

## Alcance

La revision cubrio frontend Angular/Ionic, Firebase Authentication, Firestore, Storage, Cloud Functions, rutas, perfiles, notificaciones, pagos, geolocalizacion, pruebas, scripts y configuracion Android.

La estrategia fue conservar los flujos existentes y agregar mejoras compatibles, sin reescribir funcionalidades que ya estaban operativas.

## Hallazgos principales corregidos

### 1. Tema oscuro incompleto

El proyecto dependia de la preferencia del sistema, pero gran parte de los componentes usaba colores fijos. Esto producia perdida de placeholders, bajo contraste y superficies inconsistentes.

Correccion:

- tokens semanticos para fondo, superficie, texto, bordes y estados;
- tres preferencias: sistema, claro y oscuro;
- persistencia local;
- soporte para Ionic, Leaflet y StatusBar;
- aplicacion temprana para evitar flash de tema incorrecto.

### 2. Perfil de cliente sin CRUD real

La vista de perfil era principalmente informativa y la accion de editar no persistia datos.

Correccion:

- modelo de datos ampliado;
- formulario reactivo con validaciones;
- avatar en Storage;
- actualizacion segura de Firestore y Auth;
- eliminacion autoritativa con validaciones operativas.

### 3. Perfil tecnico sin separacion de responsabilidades

Los datos profesionales estaban ligados a la postulacion y no existia una ficha administrable independiente.

Correccion:

- coleccion `technicianProfiles`;
- administracion exclusiva por roles administrativos;
- perfil de solo lectura para el tecnico;
- integracion con matching y visualizacion para clientes;
- migracion de datos antiguos.

### 4. Reglas con superficies de escalamiento

Se identificaron permisos demasiado amplios sobre roles, estados, rating, ubicaciones y tokens de dispositivos.

Correccion:

- allowlists de campos;
- timestamps del servidor;
- operaciones atomicas para rol tecnico;
- bloqueo de escalamiento a administrador/superadministrador;
- cuenta activa obligatoria para operaciones de negocio;
- validacion exacta de mensajes, tokens y ubicaciones.

### 5. Rutas y codigo obsoleto

La ruta de retorno Webpay podia quedar opacada por el fallback y existia un servicio de matching no utilizado.

Correccion:

- ruta Webpay reordenada;
- servicio obsoleto eliminado;
- guards fortalecidos;
- retorno posterior al login limitado a rutas internas seguras.

### 6. Entorno local poco reproducible

Los scripts dependian de una ruta fija y el comando de emuladores no incluia Storage.

Correccion:

- rutas relativas a la raiz del proyecto;
- persistencia automatica de datos;
- Auth, Firestore, Functions y Storage en un solo comando;
- seed repetible con cliente, tecnico y administrador;
- scripts de validacion y seguridad.

## Riesgos externos que requieren validacion real

- Recepcion push con la aplicacion cerrada en un dispositivo Android fisico.
- Google Sign-In nativo y huellas SHA configuradas en Firebase.
- Flujo completo Webpay contra el ambiente de integracion de Transbank.
- Permisos GPS y comportamiento en segundo plano segun la version de Android.
- Despliegue de reglas y Functions en el proyecto Firebase objetivo.

## Decisiones de arquitectura

- Los datos personales viven en `users/{uid}`.
- Los datos profesionales viven en `technicianProfiles/{uid}`.
- La postulacion es evidencia del proceso, no la fuente editable del perfil publico.
- Los clientes administran solo sus datos personales.
- El backend controla roles, estados sensibles, pagos, ratings y eliminaciones.
- Las operaciones historicas se conservan y se anonimizan cuando corresponde.
