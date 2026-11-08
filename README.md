# ServiGo

ServiGo es una aplicacion Ionic/Angular que conecta clientes con tecnicos para solicitar, cotizar, ejecutar y pagar servicios a domicilio.

## Stack

- Angular 22 + Ionic 9
- Capacitor 8 (Android)
- Firebase Authentication, Firestore, Storage, Functions y FCM
- Transbank Webpay Plus
- Leaflet para mapas
- Cloud Functions Node.js 22

## Modulos principales

- Acceso por correo, Google y MFA/TOTP
- Home y catalogo de servicios para clientes
- Creacion, seguimiento y cancelacion de solicitudes
- Cotizaciones y pagos Webpay
- Flujo tecnico: oportunidades, trabajos, estados y geolocalizacion
- Chat con texto e imagenes
- Centro de notificaciones y push Android
- CRUD de perfil de cliente
- Perfil profesional tecnico administrado exclusivamente por administradores
- Tema claro, oscuro y automatico segun el sistema

## Requisitos

- Node.js 22
- npm
- Ionic CLI
- Firebase CLI
- Java 21 para Firebase Emulator Suite y Android
- Android Studio para compilacion nativa

## Instalacion

```powershell
npm ci
npm --prefix functions ci
```

Crea la configuracion local de Functions a partir de:

```text
functions/.env.example
```

No versiones archivos `.env`, cuentas de servicio, keystores ni credenciales productivas.

## Desarrollo local

Terminal 1:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-emulators.ps1
```

Terminal 2, luego de que los emuladores esten activos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-emulator.ps1
```

Terminal 3:

```powershell
ionic serve
```

Firebase Emulator UI:

```text
http://127.0.0.1:4000
```

### Usuarios locales

| Rol | Correo | Clave |
|---|---|---|
| Cliente | cliente@servigo.test | ServiGo123! |
| Tecnico | tecnico@servigo.test | ServiGo123! |
| Administrador | admin@servigo.test | ServiGo123! |

Los usuarios anteriores existen solo en Emulator Suite despues de ejecutar el seed.

## Validacion

Validacion completa en Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\test-profile-security.ps1
```

Validacion estatica solamente:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1 -StaticOnly
```

## Seguridad de perfiles

- El cliente puede crear, leer, actualizar y solicitar la eliminacion de su propia cuenta.
- El cliente no puede modificar roles, estado, rating ni datos profesionales.
- El tecnico puede leer su ficha profesional, pero no editarla.
- Solo administradores activos pueden crear, editar o eliminar perfiles profesionales.
- La eliminacion de un perfil tecnico exige retirar el rol tecnico en la misma operacion atomica.
- Un administrador comun no puede crear administradores ni superadministradores.

## Tema visual

La preferencia se administra en `Perfil > Configuracion`:

- Sistema
- Claro
- Oscuro

El tema usa tokens semanticos globales, se aplica antes del bootstrap para evitar parpadeos y tambien actualiza la barra de estado nativa.

## Documentacion

- [Auditoria tecnica](docs/AUDITORIA_TECNICA.md)
- [Matriz de cumplimiento](docs/MATRIZ_CUMPLIMIENTO.md)
- [Pruebas y despliegue](docs/PRUEBAS_Y_DESPLIEGUE.md)
- [Validacion realizada](docs/VALIDACION_REALIZADA.md)
- [Arquitectura de perfiles y seguridad](docs/ARQUITECTURA_PERFILES_Y_SEGURIDAD.md)
- [Cambios realizados](CAMBIOS_REALIZADOS.md)
