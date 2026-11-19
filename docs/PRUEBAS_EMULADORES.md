# ServiGo - pruebas completas con Firebase Emulator Suite

Esta entrega está preparada para trabajar sin Firebase Blaze ni servicios de pago de Google.

## Servicios locales

- Authentication: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Cloud Functions: `127.0.0.1:5001`
- Storage: `127.0.0.1:9199`
- Emulator UI: `http://127.0.0.1:4000`
- Ionic: `http://localhost:8100`

## Instalación inicial

```powershell
npm ci
npm --prefix functions ci
```

## Validación estática

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-emulator-config.ps1
```

## Terminal 1 - Firebase Emulator Suite

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-emulators.ps1
```

El script compila Functions y genera `functions/.env.local` con:

- `SERVIGO_ENV=development`
- `PUSH_ENABLED=false`
- `SERVIGO_WEB_APP_URL=http://localhost:8100`
- `WEBPAY_MODE=integration`
- retorno de Webpay hacia `webpayReturn` en Functions Emulator.

Los datos se guardan en `.firebase-emulator-data` cuando los emuladores se cierran con `Ctrl+C`.

## Terminal 2 - datos de prueba

Solo es necesario la primera vez o cuando se inicia una base limpia:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-emulator.ps1
```

Usuarios:

- `cliente@servigo.test` / `ServiGo123!`
- `tecnico@servigo.test` / `ServiGo123!`
- `admin@servigo.test` / `ServiGo123!`

## Terminal 3 - aplicación

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-app-emulator.ps1
```

También se puede usar:

```powershell
ionic serve
```

`environment.ts` está configurado con `useFirebaseEmulators: true`.

## Foto de perfil

Ruta:

`Perfil -> Datos personales -> Cambiar foto`

La imagen se almacena en Storage Emulator:

`profile-avatars/{uid}/avatar`

Formatos: JPG, PNG y WEBP. Máximo: 5 MB.

La URL se guarda en `users/{uid}.photoUrl` y se sincroniza con Firebase Auth Emulator.

## Ubicación

ServiGo intenta GPS real primero. Cuando no es posible:

- Cliente: `-33.60580873981834, -70.57482331349283`
- Técnico: `-33.589965678034076, -70.66675504900094`

El técnico puede pasar a `en_route` aunque la ubicación esté bloqueada. Functions Emulator publica el punto fallback y la app lo reemplaza por GPS real si posteriormente logra obtenerlo.

## Pago

Webpay permanece en `Integration/Sandbox`.

Flujo esperado:

1. Técnico envía presupuesto.
2. Cliente acepta presupuesto.
3. Se guarda `acceptedQuoteId` y `acceptedQuoteSnapshot`.
4. Técnico finaliza el trabajo.
5. Cliente ve el mismo monto aceptado.
6. `Pagar con Webpay` queda habilitado.
7. Functions Emulator crea la transacción en Webpay Integration.
8. Transbank retorna al endpoint local `webpayReturn`.
9. La función redirige a `http://localhost:8100/payment/webpay-return`.
10. ServiGo confirma el resultado y actualiza el pago en Firestore Emulator.

No utilizar tarjetas reales.

## Notificaciones

El centro de notificaciones funciona mediante Firestore/Functions Emulator. `PUSH_ENABLED=false` evita intentar FCM real durante las pruebas web.
