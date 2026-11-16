# ServiGo - versión de pruebas con Firebase Emulator Suite

ServiGo es una aplicación Ionic/Angular que conecta clientes con técnicos para solicitar, cotizar, ejecutar y pagar servicios a domicilio.

Esta entrega está configurada deliberadamente para **Firebase Emulator Suite**. No requiere Firebase Blaze ni Firebase Storage real.

## Stack

- Angular 22 + Ionic 9
- Capacitor 8
- Firebase Authentication Emulator
- Firestore Emulator
- Storage Emulator
- Cloud Functions Emulator
- Transbank Webpay Plus Integration/Sandbox
- Leaflet

## Funcionalidades conservadas

- Login por correo, Google y MFA/TOTP
- Cliente y técnico
- Solicitudes y cotizaciones
- Chat con texto e imágenes
- Centro de notificaciones
- CRUD de perfil cliente
- **Foto de perfil mediante Storage Emulator**
- Perfil profesional técnico administrado por administradores
- Documentación de postulantes técnicos mediante Storage Emulator
- Tema claro/oscuro/sistema
- Ubicación real cuando está disponible
- Fallback de ubicación cuando el dispositivo la bloquea
- Persistencia del presupuesto aceptado
- Pago mediante Webpay Integration/Sandbox

## Instalación

```powershell
npm ci
npm --prefix functions ci
```

## Validar configuración

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-emulator-config.ps1
```

## Ejecutar

Terminal 1:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-emulators.ps1
```

Terminal 2, si los datos de prueba aún no existen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-emulator.ps1
```

Terminal 3:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-app-emulator.ps1
```

Emulator UI:

```text
http://127.0.0.1:4000
```

Aplicación:

```text
http://localhost:8100
```

## Usuarios de prueba

```text
Cliente
cliente@servigo.test
ServiGo123!

Técnico
tecnico@servigo.test
ServiGo123!

Administrador
admin@servigo.test
ServiGo123!
```

## Ubicación de respaldo

ServiGo intenta obtener ubicación real. Si no puede:

- Cliente: `-33.60580873981834, -70.57482331349283`
- Técnico: `-33.589965678034076, -70.66675504900094`

El fallback no impide continuar el flujo. Si posteriormente aparece GPS real, reemplaza el punto temporal.

## Webpay

Webpay permanece en **Integration/Sandbox**. El monto proviene únicamente del presupuesto aceptado y validado por Functions.

Durante pruebas locales el retorno de Transbank llega al `webpayReturn` del Functions Emulator y luego vuelve a:

```text
http://localhost:8100/payment/webpay-return
```

No utilizar tarjetas reales.

## Foto de perfil

En:

```text
Perfil -> Datos personales -> Cambiar foto
```

Se permiten JPG, PNG y WEBP de hasta 5 MB. El archivo queda en:

```text
profile-avatars/{uid}/avatar
```

dentro de Storage Emulator.

## Seguridad

La versión de pruebas mantiene reglas de Firestore y Storage. El cliente no puede modificarse roles, rating ni perfil técnico; el perfil profesional solo puede ser administrado por usuarios autorizados.

## Despliegue Firebase real

Esta entrega no está destinada a desplegarse en Firebase real. `environment.ts` y `environment.prod.ts` mantienen `useFirebaseEmulators: true` y el script de despliegue real exige una confirmación explícita adicional.

Consulta [docs/PRUEBAS_EMULADORES.md](docs/PRUEBAS_EMULADORES.md) para el flujo completo.
