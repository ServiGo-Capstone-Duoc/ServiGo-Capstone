# Arquitectura de perfiles y seguridad

## Perfil personal

Ruta:

```text
users/{uid}
```

Campos editables por el propietario:

- displayName
- phone
- photoUrl
- commune
- address
- preferredContact

Campos protegidos:

- uid
- roles
- status
- averageRating
- ratingCount
- createdAt

El correo solo puede sincronizarse con el correo autenticado.

## Perfil profesional tecnico

Ruta:

```text
technicianProfiles/{uid}
```

Campos principales:

- especialidades;
- experiencia;
- comuna base;
- radio de servicio;
- certificaciones;
- descripcion publica;
- estado profesional;
- estado de la cuenta;
- auditoria de creacion y actualizacion.

Permisos:

| Actor | Leer | Crear | Editar | Eliminar |
|---|---:|---:|---:|---:|
| Cliente activo | Perfiles publicos activos | No | No | No |
| Tecnico propietario | Si | No | No | No |
| Administrador activo | Si | Si | Si | Si, con restricciones |
| Superadministrador activo | Si | Si | Si | Si, con restricciones |

Eliminar una ficha profesional exige retirar el rol `tecnico` en la misma escritura atomica. Si existen servicios activos, la interfaz bloquea la accion.

## Eliminacion de cuenta cliente

La eliminacion se ejecuta mediante `deleteMyAccount` en Cloud Functions.

Controles:

1. Sesion autenticada.
2. Confirmacion exacta del correo.
3. Texto `ELIMINAR`.
4. Cuenta no administrativa.
5. Sin servicios activos.
6. Sin servicios completados con pago pendiente.
7. Anonimizacion de solicitudes historicas.
8. Limpieza de tokens, postulaciones, perfiles, ubicaciones, notificaciones e imagenes.
9. Eliminacion final de Firebase Authentication.

## Roles

Roles permitidos:

- cliente
- tecnico
- administrador
- superadmin

Todo usuario conserva el rol base `cliente`. Un administrador comun no puede otorgar roles administrativos. Los cambios privilegiados se limitan a campos explicitamente permitidos por Firestore Rules.
