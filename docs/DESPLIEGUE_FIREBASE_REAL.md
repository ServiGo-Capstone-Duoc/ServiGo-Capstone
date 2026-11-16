# Despliegue en Firebase real (`servigo-dev`)

## Requisitos

- Node.js compatible con Angular 22.
- Firebase CLI autenticado.
- Acceso al proyecto `servigo-dev`.
- Authentication, Firestore y Storage habilitados.
- Google habilitado como proveedor si se probará Google Sign-In.

## Instalación en un computador nuevo

```powershell
git clone -b review/servigo-v2 https://github.com/ServiGo-Capstone-Duoc/ServiGo-Capstone.git ServiGo_Pruebas_Finales
cd ServiGo_Pruebas_Finales
npm ci
npm --prefix functions ci
```

## Validación y despliegue

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-real-firebase.ps1 -InstallDependencies
```

El script:

1. escribe `functions/.env.servigo-dev` sin credenciales productivas;
2. valida que los emuladores estén desactivados;
3. compila Functions;
4. compila Ionic/Angular;
5. despliega Firestore Rules, índices, Storage Rules, Functions y Hosting.

La URL esperada es:

```text
https://servigo-dev.web.app
```

## Variables

```text
SERVIGO_ENV=staging
PUSH_ENABLED=false
SERVIGO_WEB_APP_URL=https://servigo-dev.web.app
WEBPAY_RETURN_URL=https://servigo-dev.web.app/api/webpay-return
WEBPAY_MODE=integration
```

Activa push solo cuando la app Android esté instalada y tenga un token FCM válido:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-real-firebase.ps1 -EnablePush
```

## Webpay

Esta versión usa Webpay Integration. No configures credenciales de comercio productivas durante las pruebas del Capstone.
