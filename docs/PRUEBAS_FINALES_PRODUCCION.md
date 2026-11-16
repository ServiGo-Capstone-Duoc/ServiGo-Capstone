# Pruebas finales en Firebase real

## Preparación

Usa Firebase real `servigo-dev`, Firebase Hosting HTTPS y Webpay Integration. No ejecutes Emulator Suite ni cargues el seed local.

Usa sesiones distintas:

- Cliente: Chrome normal.
- Técnico: Edge, incógnito o segundo equipo.
- Administrador: otro perfil de navegador cuando se requiera.

Crea usuarios nuevos en Firebase Authentication real.

## Flujo obligatorio

1. Cliente crea una solicitud nueva.
2. Con ubicación habilitada, confirma que usa GPS o geocodificación real.
3. Con ubicación bloqueada, confirma el punto de respaldo del cliente: `-33.60580873981834, -70.57482331349283`.
4. Técnico recibe la oportunidad y envía presupuesto.
5. Cliente acepta el presupuesto y registra el monto mostrado.
6. Técnico pulsa **Ir en camino**.
7. El estado debe pasar a `en_route` aunque el equipo no entregue GPS.
8. Con GPS bloqueado, el cliente debe ver el punto de respaldo del técnico: `-33.589965678034076, -70.66675504900094`.
9. Si luego se habilita GPS, el documento debe cambiar de `source: fallback` a `source: gps`.
10. Técnico marca llegada, inicia y finaliza el trabajo.
11. Cliente abre el detalle y ve exactamente el monto aceptado.
12. El botón **Pagar con Webpay** debe estar habilitado.
13. Completa una operación aprobada y otra rechazada/abortada en Webpay Integration.
14. Confirma que el servicio pasa a `paid` solo después de un commit aprobado.
15. Cliente reemplaza la fotografía de perfil.
16. Recarga la página y comprueba que la imagen nueva persiste.

## Verificación Firestore

### Solicitud

```text
serviceRequests/{requestId}
```

Campos esperados:

```text
acceptedQuoteId
acceptedQuoteSnapshot.totalAmount
assignedTechnicianId
status
paymentStatus
paymentId
```

### Ubicación temporal

```text
technicianLocations/{requestId}
```

Mientras está `en_route` debe contener:

```text
source: fallback | gps
latitude
longitude
updatedAt
```

Después de marcar llegada, el documento debe eliminarse.

### Pago

```text
payments/{paymentId}
```

Un pago aprobado debe contener:

```text
requestId
quoteId
amount
status: approved
authorizationCode
paidAt
```

Solo entonces:

```text
serviceRequests/{requestId}.paymentStatus == paid
```

## Prueba de foto de perfil

1. Abre **Perfil → Editar perfil**.
2. Selecciona JPG, PNG o WEBP menor a 5 MB.
3. Guarda y verifica el progreso.
4. Confirma `users/{uid}.photoUrl`.
5. Confirma el objeto `profile-avatars/{uid}/avatar` en Storage.
6. Recarga y comprueba que no aparece la imagen anterior en caché.

## Evidencia mínima

Captura:

- solicitud publicada;
- presupuesto enviado y aceptado;
- monto aceptado;
- técnico en camino con respaldo y con GPS real cuando sea posible;
- finalización del trabajo;
- botón Webpay habilitado;
- retorno aprobado y rechazado;
- documento de pago;
- foto anterior y foto actualizada.
