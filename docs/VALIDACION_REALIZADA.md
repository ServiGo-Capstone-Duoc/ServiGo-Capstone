# Validacion realizada

Fecha de cierre de auditoria: **8 de noviembre de 2026**.

## Comprobaciones ejecutadas correctamente

Las siguientes validaciones se ejecutaron sobre el codigo revisado y finalizaron sin errores:

- TypeScript de la aplicacion (`tsc -p tsconfig.app.json --noEmit`).
- Compilador de plantillas Angular (`ngc`).
- Lint completo de TypeScript y plantillas HTML (`ng lint`).
- TypeScript de los archivos de prueba (`tsc -p tsconfig.spec.json --noEmit`).
- TypeScript de Cloud Functions.
- ESLint de Cloud Functions.
- Compilacion individual de los **29 archivos SCSS**.
- Verificacion de que los componentes no mantengan colores fijos fuera del sistema de tokens.
- Sintaxis Node de scripts y pruebas de seguridad.
- Balance estructural de `firestore.rules` y `storage.rules`.
- Auditoria offline de dependencias del frontend y Functions: **0 vulnerabilidades registradas en los lockfiles instalados**.
- Resolucion de Browserslist limitada a versiones modernas soportadas.

## Validaciones preparadas para Windows

El paquete original incluia `node_modules` instalado en Windows. El entorno de auditoria es Linux y, por ello, los ejecutables nativos incluidos para `esbuild`, `rollup/rolldown` y herramientas relacionadas no pueden ejecutarse aqui.

Por esa incompatibilidad de plataforma no se presenta como aprobada en este entorno la ejecucion runtime de:

- `npm run build`;
- `npm run test:unit`;
- pruebas Vitest de Functions;
- pruebas de reglas con Firebase Emulator Suite.

Esto no corresponde a un error del codigo fuente: el compilador TypeScript, el compilador Angular de plantillas, los linters y SCSS si finalizaron correctamente. El paquete final no incluye `node_modules`, por lo que en Windows deben instalarse dependencias limpias y ejecutar la validacion completa.

## Comandos finales recomendados

Desde PowerShell, en la raiz del proyecto:

```powershell
npm ci
npm --prefix functions ci
powershell -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\test-profile-security.ps1
```

Para pruebas funcionales locales:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-emulators.ps1
```

En otra terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-emulator.ps1
ionic serve
```

## Pruebas que requieren ambiente externo o dispositivo

- Google Sign-In nativo con SHA-1/SHA-256 configuradas.
- Push FCM con la aplicacion abierta, en segundo plano y cerrada.
- Permisos y seguimiento GPS en Android real.
- Webpay Plus contra el ambiente de integracion de Transbank.
- Despliegue real de Rules, Storage Rules y Cloud Functions.
