# Validación de la entrega para Firebase real

## Validaciones aprobadas en la auditoría

- TypeScript del frontend con `tsc -p tsconfig.app.json --noEmit`.
- Compilador estricto de plantillas Angular con `ngc`.
- TypeScript de archivos de prueba.
- ESLint de TypeScript y HTML del frontend.
- TypeScript y ESLint de Cloud Functions.
- Compilación directa y ejecución de comprobaciones de dominio para:
  - presupuesto aceptado;
  - cancelaciones;
  - cotizaciones;
  - ratings.
- Validación JSON de `firebase.json` y `firestore.indexes.json`.
- Compilación individual de los 29 archivos SCSS.
- Mayor salida CSS comprimida: 19.104 bytes, bajo el límite configurado de 32 kB.
- Verificación de que los environments real y productivo no activan emuladores.
- Verificación de Hosting, retorno Webpay, índices y variables de ambiente.
- Escaneo de claves privadas, cuentas de servicio, keystores y `.env` reales.
- Auditoría offline de dependencias: cero vulnerabilidades conocidas en ambos lockfiles.

## Ajustes adicionales detectados durante la validación

TypeScript 6 exige un `rootDir` explícito en ciertas compilaciones con emisión. Se agregó:

```json
"rootDir": "./src"
```

a `tsconfig.app.json` y `tsconfig.spec.json`.

## Pruebas que deben ejecutarse en Windows

El entorno de auditoría utiliza Node.js `22.16.0`. Angular CLI 22.1.8 exige una versión posterior, por lo que el build integral debe ejecutarse en el computador de pruebas con Node.js 24.22.2 o una versión compatible.

Vitest no pudo iniciar en el contenedor porque los `node_modules` disponibles habían sido instalados en Windows y contenían bindings nativos incompatibles con Linux. El paquete final no incluye `node_modules`; una instalación limpia corrige esa condición.

```powershell
npm ci
npm --prefix functions ci
npm run lint
npm run build
npm run lint:functions
npm run build:functions
npm run test:unit
npm run test:functions
```

## Alcance y honestidad de la validación

La auditoría confirma consistencia estática, compilación parcial independiente, reglas de negocio y configuración de producción. No declara un despliegue exitoso ni una transacción Webpay end-to-end desde este entorno.

La aceptación final exige desplegar en `servigo-dev`, crear una solicitud nueva y completar el ciclo cliente–técnico–pago descrito en `PRUEBAS_FINALES_PRODUCCION.md`.
