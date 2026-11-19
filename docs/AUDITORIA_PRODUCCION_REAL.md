# Auditoría profunda para Firebase real

## Alcance

Se revisaron los flujos críticos de ServiGo para abandonar la dependencia del Emulator Suite y ejecutar pruebas finales sobre `servigo-dev`:

- creación de solicitudes;
- ubicación cliente/técnico;
- transición `accepted → en_route → arrived → in_progress → completed`;
- persistencia del presupuesto aceptado;
- habilitación del pago;
- retorno y confirmación Webpay;
- actualización de fotografía de perfil;
- reglas Firestore/Storage;
- Hosting y Cloud Functions.

## Hallazgos críticos corregidos

### 1. GPS bloqueaba el trabajo

El técnico no podía iniciar el viaje cuando el dispositivo o Windows rechazaban la geolocalización. El flujo ahora intenta GPS real y, si no está disponible, publica la ubicación de continuidad:

- Cliente: `-33.60580873981834, -70.57482331349283`
- Técnico: `-33.589965678034076, -70.66675504900094`

La ubicación se etiqueta como `gps` o `fallback`. Si comenzó con respaldo, ServiGo reintenta GPS cada 30 segundos y reemplaza el punto al recuperar permisos o servicio.

### 2. El monto podía desaparecer después de completar

El monto ya no depende de la lista visual de cotizaciones. El backend conserva y reconstruye un snapshot autoritativo del presupuesto aceptado y valida:

- solicitud;
- cliente;
- técnico asignado;
- estado `accepted`;
- componentes del monto;
- total exacto.

Las solicitudes históricas pueden repararse buscando el único presupuesto aceptado asociado al `requestId`. Si existen dos presupuestos aceptados, el backend bloquea el pago para no escoger un monto ambiguo.

### 3. Retorno Webpay incompatible con Hosting estático

Transbank puede retornar por POST, pero una ruta estática de Angular no puede leer ese cuerpo. Se agregó `webpayReturn`, una función HTTP que recibe el POST y redirige mediante 303 a `/payment/webpay-return` con parámetros GET. La confirmación final sigue siendo una callable autenticada.

El commit de pago ahora es idempotente: recargar la pantalla de resultado de una transacción ya aprobada devuelve el resultado almacenado y no lo presenta como error.

### 4. Foto de perfil desactualizada o no visible

La carga de avatar ahora:

- valida tipo y tamaño;
- informa progreso;
- usa metadatos sin caché;
- agrega versión a la URL;
- sincroniza Firestore y Firebase Auth;
- actualiza el perfil observable para refrescar inmediatamente la interfaz.

### 5. Configuración todavía orientada a emuladores

Se eliminó `androidScheme: http` de Capacitor, se configuró Hosting HTTPS y se añadieron scripts que validan que ambos environments tengan `useFirebaseEmulators: false`.

## Controles que permanecen intencionalmente

- El frontend nunca define el monto Webpay.
- El técnico no puede modificar su perfil profesional validado.
- La ubicación fallback se identifica visualmente; no se presenta como GPS real.
- El pago solo se habilita para un servicio `completed` con un presupuesto válido y no pagado.
- Webpay continúa en Integration durante las pruebas finales.


### 6. Intentos de pago no se sobrescriben

Cada intento utiliza `payments/{paymentId}`. Un intento aprobado se conserva y repara el estado del servicio si fuese necesario.
