# Matriz de cumplimiento funcional

Leyenda:

- IMPLEMENTADO: existe codigo, ruta y flujo integrado.
- IMPLEMENTADO - PROBAR DISPOSITIVO: requiere hardware o servicio externo.
- PARCIAL: existe el flujo principal, pero la evidencia final depende del ambiente.

## 1. Acceso, registro y seguridad

| Requisito | Estado | Evidencia |
|---|---|---|
| Bienvenida e inicio de sesion | IMPLEMENTADO | Login por correo y Google |
| Creacion de cuenta | IMPLEMENTADO | Registro validado y perfil Firestore |
| Registro con datos ficticios | IMPLEMENTADO | Seed de Emulator Suite |
| Confirmacion de registro | IMPLEMENTADO | Mensaje y redireccion |
| Autenticacion MFA | IMPLEMENTADO | Flujo TOTP y pantalla de seguridad |
| Confirmacion de MFA/ingreso | IMPLEMENTADO | Resolucion MFA y navegacion segura |
| Error de credenciales | IMPLEMENTADO | Mensajes por codigo de Firebase |

## 2. Cliente - Servicios

| Requisito | Estado | Evidencia |
|---|---|---|
| Home cliente | IMPLEMENTADO | `/app/home` |
| Listado de servicios | IMPLEMENTADO | `/app/services` |
| Buscador/filtros | PARCIAL | Filtros operativos en vistas; ampliar catalogo si se agregan mas categorias |
| Detalle de servicio | IMPLEMENTADO | `/app/services/:requestId` |
| Informacion del tecnico | IMPLEMENTADO | Cotizacion y perfil profesional verificado |
| Formulario de solicitud | IMPLEMENTADO | Datos, ubicacion, fotos, fecha y urgencia |
| Resumen previo | IMPLEMENTADO | Revisión y confirmacion antes de publicar/pagar |
| Confirmacion de solicitud | IMPLEMENTADO | Estado de exito y detalle posterior |

## 3. Cliente - Solicitudes

| Requisito | Estado |
|---|---|
| Historial de solicitudes | IMPLEMENTADO |
| Detalle | IMPLEMENTADO |
| Estado | IMPLEMENTADO |
| Cancelacion/gestion | IMPLEMENTADO |

## 4. Tecnico

| Requisito | Estado | Evidencia |
|---|---|---|
| Home tecnico | IMPLEMENTADO | `/app/technician/home` |
| Solicitudes/oportunidades | IMPLEMENTADO | Matching y oportunidades |
| Detalle de oportunidad | IMPLEMENTADO | `/app/technician/opportunity/:requestId` |
| Aceptar/rechazar | IMPLEMENTADO SEGUN MODELO | El tecnico responde mediante cotizacion; el cliente acepta o rechaza |
| Confirmacion de estado | IMPLEMENTADO | Estados autoritativos por Functions |
| Servicios activos | IMPLEMENTADO | Trabajos y detalle |
| Historial | IMPLEMENTADO | Filtros por estado |
| Perfil tecnico | IMPLEMENTADO | Solo lectura para tecnico; CRUD para administrador |

## 5. Notificaciones push

| Requisito | Estado |
|---|---|
| Solicitud de permisos | IMPLEMENTADO - PROBAR DISPOSITIVO |
| Notificacion en telefono | IMPLEMENTADO - PROBAR DISPOSITIVO |
| Navegacion al tocar | IMPLEMENTADO - PROBAR DISPOSITIVO |
| Centro interno | IMPLEMENTADO |

## 6. Pagos Transbank

| Requisito | Estado |
|---|---|
| Resumen y monto | IMPLEMENTADO |
| Inicio de pago | IMPLEMENTADO |
| Formulario Transbank | IMPLEMENTADO - SERVICIO EXTERNO |
| Autenticacion simulador | IMPLEMENTADO - SERVICIO EXTERNO |
| Pago aprobado | IMPLEMENTADO |
| Pago rechazado/abortado | IMPLEMENTADO |
| Estado dentro de ServiGo | IMPLEMENTADO |

## 7. Perfil y cierre de sesion

| Requisito | Estado |
|---|---|
| Perfil cliente | IMPLEMENTADO |
| Edicion de datos | IMPLEMENTADO |
| Configuracion | IMPLEMENTADO |
| Tema oscuro profesional | IMPLEMENTADO |
| Cerrar sesion | IMPLEMENTADO |
| Retorno a login | IMPLEMENTADO |
