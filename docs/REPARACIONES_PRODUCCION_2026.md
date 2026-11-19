# ServiGo: reparaciones para pruebas en Firebase real

Fecha de auditoría: 8 de noviembre de 2026.

## Objetivo

Esta revisión prepara la rama de pruebas para funcionar sobre servicios reales de Firebase (`servigo-dev`), sin depender del Emulator Suite. Se conservaron los módulos existentes y se corrigieron inconsistencias que impedían completar el ciclo cliente–técnico–pago.

## 1. Ubicación del cliente y del técnico

ServiGo siempre intenta utilizar ubicación real primero.

Cuando el dispositivo, Windows, el navegador o el permiso de geolocalización no permiten obtenerla, se utilizan estas coordenadas de continuidad:

- Cliente: `-33.60580873981834, -70.57482331349283`.
- Técnico: `-33.589965678034076, -70.66675504900094`.

### Cliente

- La ubicación actual usa GPS cuando está disponible.
- La búsqueda de domicilio usa geocodificación desde Cloud Functions.
- Si el proveedor externo no responde, se aplica la ubicación de respaldo del cliente.
- El punto queda visible en el mapa y puede moverse manualmente antes de publicar.

### Técnico

- Al pulsar **Ir en camino**, el backend cambia el estado a `en_route` y publica atómicamente el punto de respaldo del técnico.
- El dispositivo intenta obtener GPS real durante un máximo inicial de ocho segundos.
- Cuando obtiene una posición real, reemplaza el respaldo.
- Si no obtiene GPS, mantiene el respaldo y reintenta cada 30 segundos.
- Al marcar llegada o finalizar, Cloud Functions elimina la ubicación compartida por privacidad.
- El cliente ve claramente si la fuente es `gps` o `fallback`.

Esta estrategia evita bloquear el trabajo por una limitación del equipo, pero nunca presenta el punto de respaldo como si fuera GPS real.

## 2. Presupuesto aceptado, finalización y pago

Se identificó que el pago dependía demasiado de la lista visual de cotizaciones. Esa lista podía no incluir el documento aceptado cuando el trabajo ya estaba avanzado.

La fuente económica ahora se resuelve en backend usando:

1. `quotes/{quoteId}` con estado `accepted`.
2. `serviceRequests/{requestId}.acceptedQuoteSnapshot`.
3. Una búsqueda de reparación por `requestId`, únicamente cuando existe un solo presupuesto aceptado válido.

Al aceptar una cotización se conserva un snapshot con:

- `quoteId`;
- cliente y técnico;
- mano de obra;
- materiales;
- otros;
- total;
- fecha disponible;
- comentario;
- fecha de aceptación.

Al finalizar el trabajo, Cloud Functions vuelve a validar esa información y repara las referencias si es posible. El botón Webpay se habilita solo cuando:

- el servicio está `completed`;
- existe un presupuesto aceptado consistente;
- el total es mayor que cero;
- el servicio todavía no está pagado.

## 3. Intentos de pago e idempotencia

Cada intento de Webpay tiene ahora su propio documento:

```text
payments/{paymentId}
```

No se sobrescribe un intento anterior. Antes de crear uno nuevo, el backend:

- repara el servicio si ya existe un pago aprobado;
- puede reutilizar un intento pendiente reciente y válido;
- crea una nueva identidad para un intento nuevo;
- registra fallos de creación sin marcar el servicio como pagado.

El frontend nunca envía el monto. El backend lo obtiene del presupuesto aceptado.

## 4. Retorno Webpay sobre Firebase Hosting

Transbank retorna por HTTP POST. Una ruta estática de Angular no puede leer directamente el cuerpo de ese POST.

Se incorporó:

```text
/api/webpay-return
```

Firebase Hosting reescribe esa ruta hacia la función HTTP `webpayReturn`. La función recibe los parámetros, aplica `Cache-Control: no-store` y redirige mediante HTTP 303 hacia:

```text
/payment/webpay-return
```

La confirmación final se ejecuta con una callable autenticada y valida token, propietario, orden de compra y monto.

## 5. Ambientes Webpay

La variable obligatoria es:

```text
WEBPAY_MODE=integration
```

Valores permitidos:

- `integration`: utiliza el ambiente de pruebas y sus credenciales públicas si no se especifican otras.
- `production`: exige `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY`; nunca utiliza credenciales de integración como respaldo.

Para las pruebas finales del Capstone debe permanecer en `integration`. Firebase será real, pero Webpay seguirá sin dinero real.

## 6. Fotografía de perfil

La fotografía se almacena en:

```text
profile-avatars/{uid}/avatar
```

La implementación:

- valida JPG, PNG y WEBP;
- limita a 5 MB;
- muestra avance de carga;
- permite reemplazar y eliminar;
- evita caché persistente;
- agrega una versión a la URL;
- sincroniza Firestore y Firebase Authentication;
- actualiza inmediatamente el perfil observable.

Las reglas de Storage permiten escritura solo al propietario activo y validan tamaño y tipo MIME.

## 7. Configuración para Firebase real

Ambos archivos de environment tienen:

```text
useFirebaseEmulators: false
```

El despliegue incluye:

- Firestore Rules;
- índices de Firestore;
- Storage Rules;
- Cloud Functions;
- Firebase Hosting.

La aplicación debe probarse desde la URL HTTPS de Hosting, no desde `ionic serve`, especialmente para geolocalización y retorno Webpay.

## 8. Índices y servicios externos

Se agregó el índice compuesto requerido para buscar cotizaciones por:

- `requestId`;
- `technicianId`.

La geocodificación externa tiene timeout de ocho segundos. Si no responde, el formulario continúa con la ubicación de respaldo del cliente.

## 9. Datos antiguos

Para la prueba final se recomienda crear una solicitud nueva después del despliegue.

Una solicitud antigua puede repararse si todavía conserva:

- el documento de cotización aceptado; o
- `acceptedQuoteSnapshot`.

Si no existe ninguna evidencia económica válida, ServiGo bloquea el pago en lugar de inventar un monto.
