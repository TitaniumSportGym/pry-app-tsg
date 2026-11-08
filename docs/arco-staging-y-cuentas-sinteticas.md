# ARCO: activación de pruebas y aislamiento

> Plan anterior de staging y múltiples cuentas, conservado como alternativa
> futura. **No es el procedimiento de la campaña actual.** La instrucción vigente
> usa una sola cuenta nueva en Render / Neon Primary, con cancelación al final y
> confirmación manual: [guía y matriz vigentes](arco-release-cuenta-unica.md).
> Las condiciones de crear staging/cuentas adicionales que siguen no aplican a
> esa campaña. No se ejecutó la infraestructura descrita aquí.

Continuación en `feature/actividad6-seguridad-api`. El usuario confirmó que las
siete tablas ARCO existen en Neon. En esta tarea no se accedió a Neon ni se ejecutó
DDL. Se verificaron por HTTP el aviso publicado, su PDF/hash y tres rechazos 401
sin credenciales. No hay cuentas sintéticas proporcionadas ni cuenta autorizada
para cancelación; no se ejecutaron login, escrituras o cancelaciones reales.

## Configuración móvil preparada

| Perfil EAS | ARCO | Destino y distribución |
| --- | --- | --- |
| `development` | `false` explícito | Cliente de desarrollo habitual. |
| `preview` | `false` explícito | Render existente, APK interna habitual. |
| `production` | `false` explícito | Entorno EAS production; AAB conservado. |
| `arco-debug` | `true` | Hereda development; cliente Debug interno. API: `https://server-titanium.onrender.com`. |
| `arco-release` | `true` | Perfil independiente; APK Release interna. API: `https://server-titanium.onrender.com`. |

Se retiraron los marcadores no operativos por indicación del usuario. Los
perfiles ARCO usan Render; esto **no aísla Neon Primary**. Los perfiles habituales
conservan ARCO desactivado. No se modifica `.env` ni variables remotas de
EAS/Render. Las pruebas comprueban origen real, flags, R8 y distribución interna.

`EXPO_PUBLIC_*` se incorpora al bundle y no es un almacén de secretos. Solo URL y
flag pertenecen a esas variables; nunca contraseñas, JWT, OTP o URL de PostgreSQL.
La bandera es control de despliegue, no autorización del servidor.

## Lo necesario para un staging aislado

Estas son instrucciones para el responsable de infraestructura, **no operaciones
ejecutadas**. No se crearon ramas de Neon, servicios Render, roles ni credenciales.

1. Crear una rama de Neon **solo de esquema**, o una base/proyecto de pruebas
   vacío. Una rama estándar copia también los datos del padre: no convertir una
   copia con clientes reales en el entorno de pruebas ARCO. Neon documenta
   [ramas solo de esquema](https://neon.com/docs/guides/branching-schema-only).
   Si esa opción no está disponible, el responsable debe aprovisionar el esquema
   revisado sobre una base vacía, sin exportar datos de usuarios reales.
2. Verificar proyecto/rama/endpoint y permisos antes de conectar el servicio.
   Separar credenciales de pruebas y roles runtime/administración/reportes.
   Revisar las siete tablas, índices y referencias del contrato. Si se copió solo
   esquema, revisar también el estado del historial de migraciones: no ejecutar
   ciegamente todas las migraciones sobre tablas ya creadas. No ejecutar `sync`,
   borrados o migraciones contra la conexión actual de producción.
3. Preparar otro servicio Render desde el código backend ya aprobado, sin modificar
   el servicio actual. Todas sus conexiones deben usar exclusivamente la rama/base
   de pruebas. El código revisado usa `DATABASE_URL_RUNTIME`,
   `DATABASE_URL_IMPORTER`, `DATABASE_URL_REPORTS` y `DATABASE_URL_ADMIN_DIRECT`.
   No mezclar conexiones de pruebas y producción ni copiar un grupo de secretos
   de producción sin revisar su alcance. Render permite
   [variables y secretos por servicio](https://render.com/docs/configure-environment-variables).
4. Configurar `JWT_SECRET` propio del staging con el responsable. Tokens emitidos
   por producción no deben autenticar el staging. Separar correo Brevo/inbox,
   OAuth y pagos de laboratorio. Revisar `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`,
   `BREVO_SENDER_NAME`, `FRONTEND_URL` y `MOBILE_APP_SCHEME`. Las integraciones
   innecesarias no deben enviar correo/cobros a personas reales.
5. Configurar aviso aprobado mediante `PRIVACY_NOTICE_VERSION`,
   `PRIVACY_NOTICE_SHA256`, `PRIVACY_NOTICE_URL` y decidir explícitamente
   `PRIVACY_REQUIRE_REGISTRATION_CONSENT`. El aviso publicado puede reutilizarse
   solo si el responsable confirma que describe también ese tratamiento.
   No inventar otra versión aprobada ni activar obligatoriedad legal por defecto.
6. Comprobar HTTPS y disponibilidad de `/api/privacy/notice` en staging. Verificar
   que cambios de datos de laboratorio no aparecen en producción y que las
   cuentas reales no se han copiado. Registrar IDs del servicio y rama, SHA
   desplegado, fecha y aprobador; nunca publicar las cadenas de conexión.
7. Si se adopta esta alternativa futura, cambiar ambos perfiles ARCO al origen HTTPS del servicio
   aislado y actualizar la prueba de configuración con ese origen aprobado.
   Conservar `production.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED=false`.

## Procedimiento para crear las cuentas sintéticas

Una vez autorizado el staging, el responsable/tester debe:

1. Crear buzones o aliases bajo un dominio/inbox de laboratorio propio. No usar
   correos de clientes, cuentas históricas ni direcciones ficticias que puedan
   pertenecer a otra persona. Usar identificadores claros de corrida, por ejemplo
   `qa-arco-perfil-<corrida>@<dominio-controlado>`.
2. Generar contraseñas distintas en un gestor de contraseñas y registrarlas por el
   flujo normal de la aplicación/backend de **staging**. Verificar cada correo
   con el OTP enviado al buzón de laboratorio. No fijar `isVerified` ni crear
   usuarios por SQL para aparentar que el flujo de verificación funcionó.
3. Preparar una cuenta de perfil/consentimiento, otra para conflictos de edición,
   una con OTP y otra con TOTP si el entorno lo soporta. Cliente es el rol normal
   del registro; entrenador/administrador requieren asignación por el mecanismo
   administrativo autorizado del backend de pruebas, nunca por campos `role` del
   formulario o cambiando JWT. No reutilizar el correo del administrador real.
4. Preparar una cuenta **exclusiva para cancelación**, sin pedidos, pagos ni
   membresías reales. Anotar expresamente su ID, rol, entorno y permiso de probar
   cancelación. Tener una cuenta no autoriza por sí solo ese trámite. Actualmente
   esa cuenta y autorización no existen; todos los POST de cancelación siguen
   pendientes, incluso los negativos.
5. Guardar secretos únicamente en el gestor o en un archivo local aprobado con
   acceso restringido. Compartir con el agente solo la ruta autorizada y alcance;
   no pegar contraseñas/tokens/OTP en chat, argumentos CLI o reportes. No asumir
   que un archivo con credenciales existe. No registrar JWT en capturas ni logs.
6. Iniciar sesión desde un build apuntando al mismo staging. Confirmar ID/rol del
   perfil antes de cualquier escritura. Mantener un registro de cuentas sintéticas
   con etiquetas/IDs redactados, sin credenciales. Una restauración de nombre o
   preferencia no elimina evidencias de auditoría: usar cuentas dedicadas.

No se proporciona un script que cree usuarios o envíe cancelaciones automáticamente.
Su ejecución requerirá las cuentas y el alcance autorizado anteriores.

## Contratos privados que hay que ejecutar después

No atribuir 403 genérico a falta de rol: estos endpoints son del propio titular
y los tres roles reconocidos pueden tener datos ARCO. Reautenticación fallida
es un 403 de negocio, no expiración de sesión.

| Caso | Operación sobre cuenta sintética | Esperado y evidencia mínima |
| --- | --- | --- |
| AUTH-01 | GET perfil, recibos y preferencias sin Bearer | 401. Ejecutado realmente en Render, sin datos privados persistidos. |
| AUTH-02 | Login/OTP y GET perfil propio | 200, ID/rol correctos y ETag igual a la versión entre comillas. Pendiente autenticado. |
| CONS-01 | GET consentimientos; aceptar expresamente versión vigente | GET 200, POST 201 y recibo con versión/hash/URL correctos; GET confirma. Nunca aceptar automáticamente una cuenta histórica. |
| CONS-02 | Aceptar una versión obsoleta controlada; omitir aceptación | 409 `NOTICE_VERSION_CHANGED` y 422 `CONSENT_REQUIRED`; no recibo falso ni cierre de sesión. No cambiar el aviso del servidor para provocar conflicto. |
| PROFILE-01 | PATCH nombre/teléfono con If-Match vigente; volver a consultar | 200 y nuevo ETag coherente; conservar ID/correo/rol. No enviar campos profesionales. |
| PROFILE-02 | Repetir PATCH usando el ETag anterior | 412 `PROFILE_VERSION_CHANGED`; sin sobrescritura. La app recarga y pide revisar. |
| PROFILE-03 | PATCH con dato inválido o sin If-Match | 422 de validación o 428 de precondición según contrato; sin afirmar éxito. |
| PREF-01 | GET preferencias; cambiar opt-out con versión vigente | 200, versión +1, conservar la otra finalidad. Ausencia de elección sigue siendo null, no opt-in. |
| PREF-02 | PATCH con versión anterior / finalidad inválida | 409 `PREFERENCES_VERSION_CHANGED` / 422 `INVALID_INPUT`. |
| REAUTH-01 | Contraseña actual con purpose de cancelación | 200 con prueba o 202 con reto OTP/TOTP; nunca tratar 202 como prueba. Esperar `notBefore` para TOTP. |
| REAUTH-02 | Un intento de contraseña errónea / cuerpo inválido | 403 `REAUTHENTICATION_FAILED` / 422; conservar sesión y limpiar contraseña. Evitar ráfagas y límites de intentos. |
| REAUTH-03 | Verificar OTP/TOTP fresco, inválido, vencido y reutilizado | 200 solo con código válido; 403 de prueba/reto inválido. No reciclar OTP de login ni alterar reloj del dispositivo/servidor. |
| CANCEL-01 | Solo tras autorización: confirmación exacta y prueba vigente + UUID de idempotencia | 202, folio y `pending_review`. GET propio 200. La cuenta continúa activa, sin borrado automático. |
| CANCEL-02 | Misma clave y mismo cuerpo tras una respuesta perdida | Mismo folio, sin duplicados; no generar otra clave mientras el resultado sea incierto. |
| CANCEL-03 | Prueba ausente/vencida, confirmación incorrecta y clave con otro cuerpo | 403, 422 y 409 según contrato. Todos pendientes hasta autorizar la cuenta exclusiva. |

Registrar solo etiqueta del caso, entorno/build, HTTP, resultado y metadatos
redactados. No persistir cuerpos de perfil, contraseñas, encabezados Authorization,
OTP ni pruebas de reautenticación. No afirmar que se comprobó el log del servidor
si no se obtuvo acceso autorizado a ese log.

## Android Debug y Release

La siguiente matriz debe ejecutarse dos veces sobre la misma infraestructura
aislada. Todas las celdas físicas están **PENDIENTES**: ADB no detectó teléfonos.

| Recorrido | Debug | Release | Evidencia requerida |
| --- | --- | --- | --- |
| Instalación, origen staging y flag ARCO | Pendiente | Pendiente | ID/build EAS, SHA, versión, APK hash y pantalla de aviso versionado. |
| Login y consulta de perfil/ETag | Pendiente | Pendiente | Identidad sintética redactada, versión y respuesta confirmada por staging. |
| Aceptación y comprobante | Pendiente | Pendiente | Checkbox inicialmente vacío, versión y comprobante redactado. |
| Rectificación y conflicto 412 | Pendiente | Pendiente | Valor actualizado, conflicto y ausencia de éxito falso. |
| Opt-out y conflicto 409 | Pendiente | Pendiente | Estado confirmado, nueva versión, otra finalidad conservada. |
| Errores 401/403/422 y recuperación de red | Pendiente | Pendiente | 401 sale de área protegida; 403 de negocio conserva sesión; 422 permite corregir. |
| Reautenticación, OTP/TOTP fresco y expiración | Pendiente | Pendiente | Estado y resultado sin fotografiar códigos/contraseña. |
| Solicitud de cuenta exclusiva | Bloqueado | Bloqueado | Autorización previa, folio redactado y cuenta aún activa. |
| Arranque/reinicio y caché de otra cuenta | Pendiente | Pendiente | Sin datos de una cuenta anterior. |
| APK ofuscada y logs | No aplica R8 | Pendiente | Mapping del mismo build y recorrido completo; revisión de logs sin secretos. |

Comandos preparados (no ejecutados como builds remotos):

```powershell
# Para el procedimiento vigente de una cuenta, seguir la guía enlazada arriba:
npx.cmd eas-cli@latest build --platform android --profile arco-debug --non-interactive --freeze-credentials
npx.cmd eas-cli@latest build --platform android --profile arco-release --non-interactive --freeze-credentials
adb devices -l
adb -s SERIAL reverse tcp:8081 tcp:8081
```

Para Metro, usar variables temporales en una terminal exclusiva, nunca cambiar
la configuración de producción. El origen vigente autorizado es Render:

```powershell
$env:EXPO_PUBLIC_API_URL='https://server-titanium.onrender.com'
$env:EXPO_PUBLIC_ARCO_BACKEND_ENABLED='true'
npx.cmd expo start --dev-client --localhost --clear
```

Cerrar esa terminal al finalizar. El APK Release lleva variables incorporadas:
cambiarlas en Metro no cambia un APK ya compilado. Registrar el ID del build, no
inferir su flag de la configuración actual del ordenador.

La [plantilla de evidencia](plantilla-evidencia-android.md) y
`scripts/capture-android-evidence.ps1` ya permiten capturar metadatos/PNG local:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/capture-android-evidence.ps1 -Variant Release -CaseId ARCO-CONS-01 -Serial SERIAL -Screenshot -Notes "Completar observado, HTTP y comprobante redactado"
```

La captura no aprueba el caso por sí sola. Usar datos sintéticos y ocultar
notificaciones. Para acreditar ausencia de secretos en logs nativos/backend se
necesita acceso de laboratorio autorizado; los spies de console en Jest solo
acreditan los recorridos JavaScript simulados que ejecutaron.
