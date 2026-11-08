# Cambios realizados

## Apariencia

- Se implemento tema claro, oscuro y automatico segun el sistema.
- Se agrego ThemeService con persistencia local y reaccion a cambios del dispositivo.
- Se aplico el tema antes de iniciar Angular para evitar cambios visuales bruscos.
- Se migraron estilos de componentes a tokens semanticos.
- Se corrigieron placeholders, inputs, overlays, mapas, barras nativas y elementos Ionic.
- Se agrego pantalla de configuracion de apariencia.
- Se respeto `prefers-reduced-motion`.

## Perfil de cliente

- Lectura y escucha en tiempo real del perfil.
- Edicion de nombre, telefono, comuna, direccion y canal preferido.
- Carga, reemplazo y eliminacion de avatar.
- Sincronizacion segura de nombre y foto con Firebase Authentication.
- Eliminacion de cuenta mediante Cloud Function autoritativa.
- Bloqueo de eliminacion cuando existen servicios activos o pagos pendientes.
- Anonimizacion de solicitudes historicas y limpieza de archivos asociados.

## Perfil profesional tecnico

- Nueva coleccion `technicianProfiles` separada de datos personales y postulaciones.
- Creacion al aprobar una postulacion.
- Migracion de tecnicos aprobados que no tenian ficha profesional.
- Listado, busqueda, edicion y eliminacion desde administracion.
- El tecnico puede visualizar la ficha, pero no modificarla.
- Eliminacion bloqueada si existen trabajos activos.
- Retiro atomico del rol tecnico al eliminar la ficha.

## Seguridad

- Reglas de usuarios con listas estrictas de campos y timestamps del servidor.
- Proteccion contra autoasignacion de roles y escalamiento administrativo.
- Reglas exclusivas para perfiles profesionales.
- Esquema inmutable para mensajes de chat.
- Validacion de tokens FCM por usuario y dispositivo.
- Validacion estricta de geolocalizacion temporal.
- Restricciones adicionales para solicitudes, cotizaciones, postulaciones, oportunidades y Storage.
- Cuentas suspendidas o bloqueadas pierden acceso operativo.
- Nuevas pruebas de seguridad de perfiles con Emulator Suite.

## Navegacion y calidad

- Se corrigio la ubicacion de la ruta de retorno Webpay antes del fallback.
- Se agregaron guards que validan sesion, estado de cuenta y roles.
- Se corrigieron specs que no proveian Router/ActivatedRoute.
- Se elimino un servicio de matching obsoleto.
- Se corrigieron fugas de suscripcion en el formulario de solicitud.
- Se limpiaron registros de depuracion con datos innecesarios.
- Se profesionalizo `.gitignore`.
- Se hicieron portables los scripts de emuladores, seed y validacion.

## Compatibilidad y validacion

- Se actualizo Browserslist para navegadores modernos compatibles con Angular.
- Se ajusto la configuracion de lint para mantener las directivas estructurales existentes sin forzar una migracion cosmetica masiva.
- Se corrigieron los ultimos hallazgos de lint de plantillas.
- Se agrego documentacion de validacion reproducible y limitaciones del entorno.
- La auditoria offline de dependencias no reporto vulnerabilidades en los lockfiles instalados.
