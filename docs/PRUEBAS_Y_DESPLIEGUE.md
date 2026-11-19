# Pruebas y despliegue

## Preparacion limpia

```powershell
npm ci
npm --prefix functions ci
```

## Validacion estatica y compilacion

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1 -StaticOnly
```

Incluye:

- lint Angular/TypeScript;
- build Angular;
- lint de Functions;
- build de Functions;
- integridad Git cuando existe repositorio.

## Pruebas unitarias

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-project.ps1
```

## Pruebas de seguridad de perfiles

Detener antes otros emuladores que usen 8080 o 9099:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-profile-security.ps1
```

Casos cubiertos:

- cliente modifica solo sus datos personales;
- cliente no escala roles;
- tecnico no modifica perfil profesional;
- administrador crea y actualiza perfil profesional;
- estado profesional no puede falsificar el estado de la cuenta;
- administrador suspendido pierde privilegios;
- administrador comun no crea superadministradores;
- eliminacion de perfil exige retiro atomico del rol tecnico.

## Pruebas manuales minimas

### Tema

1. Seleccionar Sistema, Claro y Oscuro.
2. Reiniciar la aplicacion y confirmar persistencia.
3. Revisar placeholders, inputs, modales, chat, mapas y Webpay return.
4. Cambiar el tema del dispositivo con preferencia Sistema.

### Perfil cliente

1. Editar todos los campos.
2. Subir, reemplazar y eliminar avatar.
3. Recargar y comprobar persistencia.
4. Intentar eliminar con servicio activo: debe bloquearse.
5. Eliminar cuenta sin operaciones pendientes en un usuario de prueba.

### Perfil tecnico

1. Ingresar como tecnico: la ficha debe ser de solo lectura.
2. Ingresar como administrador.
3. Crear/sincronizar ficha desde una postulacion aprobada.
4. Editar especialidades y cobertura.
5. Intentar eliminar con trabajo activo: debe bloquearse.
6. Eliminar sin trabajos activos: debe retirarse el rol tecnico.

### Notificaciones

1. Cliente y tecnico en sesiones diferentes.
2. Enviar texto e imagen en ambos sentidos.
3. Revisar badge, centro, persistencia y deep link.
4. Probar push en Android con la app abierta, en segundo plano y cerrada.

### Pagos

1. Crear transaccion de integracion.
2. Aprobar, rechazar y abortar.
3. Confirmar que el estado persistido coincide con Transbank.
4. Evitar repetir el pago cuando ya existe uno aprobado.

## Despliegue Firebase

Despues de validar en emuladores:

```powershell
firebase deploy --only firestore:rules,storage,functions
```

Verificar antes:

- proyecto activo en `.firebaserc`;
- variables de entorno productivas;
- proveedor Google habilitado;
- dominios autorizados;
- SHA-1/SHA-256 Android;
- `google-services.json` correcto;
- URL de retorno Webpay publica y HTTPS;
- `PUSH_ENABLED=true` solo cuando FCM este configurado.

## Android

```powershell
npm run build
npx cap sync android
npx cap open android
```

La firma de produccion y el keystore deben mantenerse fuera del repositorio.
