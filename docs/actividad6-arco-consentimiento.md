# Actividad 6, criterio 3: derechos ARCO y consentimiento

> Actualización: este documento conserva el estado previo y las propuestas iniciales.
> La conexión al backend publicado y sus pruebas se describen en
> [actividad6-arco-integracion-backend.md](actividad6-arco-integracion-backend.md).
> Los flujos nuevos permanecen desactivados por defecto hasta disponer de staging.

## Qué existía y qué se comprobó

El móvil ya tenía registro con verificación de correo, login y segundo factor,
sesión JWT, un menú de cuenta por rol y pantallas de términos y aviso de
privacidad. El aviso es texto estático con fecha «septiembre 2025» y un enlace
`mailto:` al contacto ARCO del gimnasio. Abrir ese enlace prepara el correo;
no acredita envío, recepción ni resolución de una solicitud.

`getCurrentUser()` ya consumía `GET /api/user/profile`. `apiClient.ts` añade el
Bearer desde `sessionService.ts`, rechaza peticiones protegidas sin token e
invalida credenciales ante 401 o un 403 identificado como fallo de sesión.
Un 403 por permisos conserva la sesión. El token móvil se guarda mediante
SecureStore; estos mecanismos no se modificaron.

Se revisaron, solo en lectura, las fuentes locales de
`../pry_TinaniumSportGymWeb/backend` (HEAD `edac327`), especialmente
`routes/userRoutes.js`, `routes/trainer/profileRoutes.js`,
`controllers/trainerProfileController.js`, `routes/profileRoutes.js`,
`controllers/profileController.js`, `controllers/authController.js`, los modelos
y el middleware de autenticación. No se ejecutaron peticiones reales a Render
ni se confirmó que ese checkout coincida con su despliegue actual.

Hallazgos de esa revisión:

- `GET /api/user/profile` devuelve identidad y metadatos de autenticación,
  pero no un expediente completo ni preferencias/consentimientos.
- Hay `GET` y `PUT /api/trainer/profile` con JWT, sesión, blacklist y autorización
  de entrenador. Permiten rectificar nombre y teléfono sin cambiar el correo.
- Hay `GET`/`PUT /api/profile/me`, pero su contrato es un perfil físico/deportivo,
  no una edición general de identidad. Su middleware `requireAuth` comprueba
  JWT/usuario sin la misma comprobación de sesión revocada que `verifyToken`.
  No se incorporó una nueva captura de datos de salud ni se reutilizó esa ruta
  para modificar campos que no acepta.
- El registro no valida ni almacena aceptación del aviso. `prompt: "consent"`
  en Google OAuth no es evidencia de aceptación del aviso de Titanium.
- No se encontraron rutas de preferencias de privacidad, solicitud de
  cancelación de cuenta o reautenticación vinculada a ese trámite. Las rutas
  administrativas de usuarios tampoco proporcionan una eliminación de cuenta.

## Funcionalidad implementada

### Consentimiento en el registro

La casilla empieza desmarcada en cada formulario nuevo. La validación del
ViewModel bloquea botón y envío desde teclado sin aceptación. Abrir el aviso
no marca la casilla. El bloqueo de envíos simultáneos evita solicitudes de
registro duplicadas mientras hay una petición pendiente.

La ruta `/privacy-notice` presenta el aviso existente sin exigir sesión y
regresa a `/register` cuando no hay historial. No lleva correo, contraseña,
JWT ni elección de consentimiento en parámetros de navegación.

La elección permanece solo en memoria del formulario. El cuerpo real de
`POST /api/auth/register` sigue siendo `{ email, password, client: "mobile" }`.
No se envía un `privacyConsent: true` que el servidor vaya a ignorar, ni se
escribe una aceptación inventada en SecureStore, caché o sesión. La interfaz
explica que no se emite un comprobante y que la casilla no incluye promociones
ni otros fines opcionales. El control cliente no sustituye la validación y
evidencia pendientes en el servidor.

### Centro de privacidad

«Mi perfil» abre un centro compartido de privacidad dentro del área de cada rol:

| Rol | Ruta |
| --- | --- |
| Cliente | `/account/personal-data` |
| Entrenador | `/trainer/account/personal-data` |
| Administrador | `/admin/account/personal-data` |

El aviso de cada rol también ofrece «Mis datos y derechos ARCO» cuando hay una
sesión y un rol válidos. El aviso público de registro no ofrece ese acceso.

| Derecho | Alcance real |
| --- | --- |
| Acceso | Consulta autenticada de ID, correo, rol, proveedor y método de autenticación para los tres roles. Para entrenadores, también nombre y teléfono. No se presenta como copia completa del expediente. |
| Rectificación | Entrenadores pueden editar o vaciar nombre y teléfono opcionales mediante el `PUT` existente. La edición general de identidad de clientes y administradores queda pendiente. |
| Cancelación | Se informa de que no hay eliminación automática y se remite al canal ARCO existente. No hay botón de borrado, contraseña recolectada sin destino ni confirmación de una eliminación inexistente. |
| Oposición | Se informa de que no hay preferencias consultables/modificables en la app. Se conserva el canal ARCO manual. No se dibujan switches con un estado inventado. |

La vista evita montar el cargador de datos para visitantes o durante la carga
de sesión. Al cambiar de usuario, rol o cerrar sesión se descartan los datos y
el borrador anteriores. Se verifican ID/rol del perfil y propietario del perfil
del entrenador, y solo se muestran campos permitidos, nunca respuestas enteras,
contraseñas, tokens o secretos de autenticación.

El `PUT` actual del entrenador vacía campos omitidos. Por eso, antes de escribir,
se hace un GET nuevo y se preservan especialidad, certificaciones, experiencia,
biografía y enfoque. La foto no se modifica. Se valida la respuesta del PUT
antes de anunciar confirmación y después se recarga el perfil. No se envía el
PUT si la pantalla/sesión cambió durante el GET previo. Existe todavía una
ventana de concurrencia entre GET y PUT: un PATCH parcial con control de versión
en el backend sería preferible para evitar sobrescrituras entre dispositivos.

## Endpoints existentes utilizados

Todos se ejecutan sobre la URL Render ya configurada, mediante `apiClient` y
HTTPS. Nunca se envía un `userId` elegido por el formulario para seleccionar
la cuenta que se modifica.

### `GET /api/user/profile`

- Autenticación: `Authorization: Bearer <accessToken>`, sesión vigente.
- Cuerpo: ninguno.
- Respuesta existente:

```json
{
  "id": "<id del usuario autenticado>",
  "email": "persona@example.com",
  "rol": "cliente",
  "authMethod": "otp",
  "provider": "local",
  "loginMethod": "local"
}
```

### `GET /api/trainer/profile`

- Autenticación: Bearer, sesión/blacklist y rol `entrenador`.
- Cuerpo: ninguno.
- Respuesta: `{ "profile": { "trainerId": "...", "fullName": "...", "phone":
  "...", "specialty": "...", "certifications": "...", "experienceYears": 5,
  "bio": "...", "focus": "...", ... } }`.

### `PUT /api/trainer/profile`

- Autenticación: igual que el GET. El propietario proviene del JWT.
- Cuerpo JSON usado por el móvil, sin foto:

```json
{
  "fullName": "Nombre corregido",
  "phone": "7711234567",
  "specialty": "<valor actual del GET>",
  "certifications": "<valor actual del GET>",
  "experienceYears": 5,
  "bio": "<valor actual del GET>",
  "focus": "<valor actual del GET>"
}
```

- `fullName` admite hasta 160 caracteres y `phone` hasta 30; ambos pueden
  enviarse vacíos para limpiar esos datos opcionales. El controller convierte
  cadenas vacías a `null` y las serializa de vuelta como cadenas vacías.
- Respuesta existente: `{ "message": "...", "profile": { ... } }`.
- El móvil exige que la respuesta pertenezca al mismo entrenador y refleje los
  dos valores solicitados. Una respuesta incompleta o contradictoria no se
  muestra como guardado satisfactorio. Un 404/403/error de red tampoco se
  reemplaza por datos simulados.

## Contratos pendientes del backend: propuestas, no rutas implementadas

Las siguientes URLs y respuestas son propuestas concretas para acordar con el
backend. **El móvil no las invoca hoy.** Sus operaciones deberán validar
propiedad, autorización, entradas y sesión revocada en el servidor; ocultar una
opción en el móvil no es un control de autorización suficiente.

### 1. Aviso versionado y evidencia de consentimiento

`GET /api/privacy/notice`, público, sin cuerpo:

```json
{
  "noticeId": "privacy-notice",
  "version": "<versión aprobada por el responsable>",
  "contentSha256": "<hash del documento>",
  "documentUrl": "<URL HTTPS del aviso aprobado>",
  "requiredForRegistration": true
}
```

Extender el `POST /api/auth/register` existente, todavía sin JWT:

```json
{
  "email": "persona@example.com",
  "password": "<contraseña>",
  "client": "mobile",
  "privacyConsent": {
    "noticeId": "privacy-notice",
    "version": "<versión consultada>",
    "accepted": true
  }
}
```

Solo debe devolver `201` con `message` y
`privacyConsent: { receiptId, noticeId, version, contentSha256, acceptedAt }`
cuando la cuenta y la evidencia se hayan persistido correctamente. La fecha,
identidad y hash los determina el servidor; no se acepta una marca de tiempo
cliente como prueba. Falta/negativa: `422 CONSENT_REQUIRED`; aviso desactualizado:
`409 NOTICE_VERSION_CHANGED`. Un evento debe distinguir el consentimiento
necesario de cualquier finalidad opcional y conservar su trazabilidad.

`GET /api/user/privacy-consents`, Bearer, sin cuerpo: `200 { "consents": [
{ "receiptId": "...", "noticeId": "...", "version": "...", "acceptedAt":
"<fecha servidor>", "revokedAt": null } ] }`. Una cuenta histórica sin prueba
debe devolver lista vacía, no una aceptación retroactiva. Hay que contemplar
también el alta vía Google y el alta de entrenadores por administrador, sin
convertir un login o una cuenta creada por un tercero en aceptación del titular.

### 2. Rectificación general

Ampliar el `GET /api/user/profile` para devolver `fullName`, `phone`, `updatedAt`
y una versión/ETag cuando exista almacenamiento para esos campos en todos los
roles. No confundirlos con atributos inexistentes en el modelo `User` actual.

`PATCH /api/user/profile`, Bearer y sesión vigente:

```json
{ "fullName": "Nombre corregido", "phone": null }
```

Respuesta `200 { "id": "<usuario JWT>", "fullName": "Nombre corregido",
"phone": null, "updatedAt": "<fecha servidor>", "version": 2 }` después de
persistir. Admitir solo los campos aprobados; no permitir cambiar `id`, rol,
proveedor o estado de verificación mediante asignación masiva. Corregir el
correo necesita un flujo específico de verificación del correo nuevo.
Usar `If-Match`/ETag o versión, con `409/412` ante cambios concurrentes, y
`422` con errores por campo. Un PATCH equivalente para el entrenador evitaría
reenviar su información profesional.

### 3. Preferencias opcionales para switches Opt-Out

`GET /api/user/privacy-preferences`, Bearer y sesión vigente, sin cuerpo:

```json
{
  "version": 1,
  "preferences": [
    { "purpose": "promotional_communications", "optOut": null, "updatedAt": null },
    { "purpose": "satisfaction_surveys", "optOut": null, "updatedAt": null }
  ]
}
```

`null` significa que no hay una elección registrada, no `false`. Las finalidades
y su fundamento deberán aprobarse con el aviso; mientras no haya autorización
aplicable no se deben habilitar esos usos opcionales por omisión.

`PATCH /api/user/privacy-preferences`, misma autenticación y control de versión:

```json
{
  "version": 1,
  "preferences": [
    { "purpose": "promotional_communications", "optOut": true }
  ]
}
```

Respuesta `200` con la lista persistida, nueva versión y fecha del servidor.
`true` significa oposición: un switch «No recibir promociones» encendido
representará ese valor. Los avisos indispensables de cuenta/pagos no se mezclan
con promociones. Los envíos y procesos de analítica deben respetar la elección
en el servidor, no solo en el dispositivo que la cambió. Rechazar finalidades
desconocidas con `422` y conflictos de versión con `409/412`.

Cuando exista este contrato, el móvil podrá mostrar switches con estado
consultado, indicar estado desconocido sin inventar un valor, deshabilitarlos
mientras se guarda y actualizar la confirmación solo tras la respuesta válida.

### 4. Reautenticación y solicitud de cancelación

`POST /api/auth/reauthenticate`, Bearer de sesión vigente, por ejemplo:

```json
{
  "purpose": "account-cancellation",
  "method": "password",
  "password": "<contraseña actual>"
}
```

El backend deberá definir también pruebas frescas para cuentas Google y
segundo factor; no se debe tratar un OTP de login antiguo como prueba de
cancelación. Respuesta `200 { "reauthenticationToken": "<prueba de un solo uso>",
"expiresAt": "<fecha servidor>" }`, vinculada a usuario, sesión y propósito,
con caducidad corta y límites de intentos. Si requiere un reto adicional,
devolver un estado explícito de reto, no una prueba válida anticipadamente.
Los secretos se transportan solo por HTTPS y no se guardan en logs,
parámetros de rutas, almacenamiento persistente o correos.

Para concretar esos retos en el contrato propuesto:

- `POST /api/auth/reauthenticate` con `{ "purpose": "account-cancellation",
  "method": "otp" }` o `"totp"`: respuesta `202 { challengeId, method,
  expiresAt }`, sin prueba de cancelación todavía. El servidor envía un código
  nuevo cuando corresponde y determina los factores requeridos por la cuenta.
- `POST /api/auth/reauthenticate/verify`, Bearer, cuerpo
  `{ "challengeId": "...", "code": "<código fresco>" }`: `200` con la prueba
  de un solo uso únicamente al completar los factores exigidos.
- Para Google, el inicio usa `method: "google"` y devuelve `202 { challengeId,
  authorizationUrl, expiresAt }`. La verificación recibe `{ challengeId,
  authorizationCode, codeVerifier, state }`. El servidor debe validar PKCE,
  estado, nonce, identidad del proveedor y frescura de la autenticación antes
  de emitir la prueba. La autorización OAuth previa no autoriza por sí sola
  la cancelación. Estos contratos requieren implementación y revisión de
  seguridad; no se reutiliza ni modifica el login actual para simularlos.

`POST /api/user/account-cancellation-requests`, Bearer, prueba fresca y cabecera
`Idempotency-Key: <UUID de la operación>`:

```json
{
  "confirmation": "SOLICITAR CANCELACIÓN",
  "reauthenticationToken": "<prueba vigente y vinculada a esta operación>"
}
```

El móvil deberá mostrar antes una confirmación explícita con el impacto
informado. Respuesta `202` solo tras persistir una solicitud:

```json
{
  "requestId": "<folio>",
  "status": "pending_review",
  "createdAt": "<fecha servidor>",
  "membershipImpact": { "requiresReview": true },
  "retentionSummary": [
    { "category": "payment_records", "reason": "<fundamento validado>", "retainUntil": "<fecha o criterio validado>" }
  ]
}
```

`202` significa solicitud recibida, no cuenta eliminada. Añadir
`GET /api/user/account-cancellation-requests/:requestId`, sin cuerpo, con
propiedad verificada y respuesta `200 { requestId, status, createdAt, resolvedAt,
retentionSummary }`; nunca permitir consultar folios ajenos. Definir `401` para
sesión vencida, `403 REAUTHENTICATION_REQUIRED` para prueba ausente/no válida,
`422` para confirmación incorrecta y `409` para conflictos. Repetir la misma
clave idempotente debe devolver el mismo trámite, no duplicarlo.

El proceso de cancelación debe revisar membresías activas, saldos, reembolsos,
pagos, comprobantes, auditoría e historial; no aplicar un borrado en cascada de
toda esa información. El responsable debe definir qué se elimina, anonimiza,
bloquea o conserva y sus fundamentos/plazos por categoría, incluidos respaldos.
Una membresía activa puede requerir revisión, no fingir que la solicitud ya fue
resuelta ni borrar obligaciones financieras. Al ejecutar la baja efectiva,
revocar sesiones/JWT y accesos asociados, impedir nuevos accesos y comunicar
el resultado por un canal apropiado. Los datos sujetos a conservación deben
quedar restringidos al fin que justifique conservarlos. No se fija aquí un
plazo legal arbitrario ni se implementa esa política en el móvil.
La política y el aviso deberán revisarse con el responsable conforme a la
[LFPDPPP vigente publicada por la Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf);
esta implementación no acredita por sí sola cumplimiento legal integral.

## Archivos modificados

- Registro: `registration-model.ts`, su prueba, `use-registration-view-model.ts`,
  su nueva prueba y `registration-form-view.tsx`.
- Legales: `legal-area.ts`, `use-legal-view-model.ts`, su nueva prueba y
  `privacy-view.tsx`. El texto oficial del aviso y los términos no se reescribió.
- Cuenta: `account-menu.ts` y su prueba, para habilitar «Mi perfil» por rol.
- Rutas: `(auth)/privacy-notice.tsx` y los tres `account/personal-data.tsx`.
- Feature nueva `features/privacy/`: modelo, API, ViewModel y vista, con pruebas
  unitarias del modelo, API y ViewModel.
- Pruebas: `tests/integration/registration-consent.test.tsx`,
  `tests/integration/privacy-center.test.tsx`, `tests/fixtures/privacy.ts`,
  `tests/acceptance/privacy.acceptance.tsx` y el mock de registro en
  `tests/acceptance/setup.ts`.
- Este documento. No se modificaron `apiClient.ts`, servicios JWT, backend,
  URL Render, dependencias, R8, EAS, perfiles APK/AAB ni configuración SonarQube.

## Validación y evidencia

Las pruebas usan respuestas ficticias y límites de infraestructura simulados;
ninguna registra cuentas, modifica perfiles ni envía solicitudes a Render.
La integración del centro ejecuta el `apiClient` real con `fetch` simulado y
comprueba Bearer, ausencia de JWT, 401/403, red, reintento, cambio de identidad,
respuestas tardías, validación y preservación de campos del PUT. Las pruebas de
registro comprueban casilla inicial, retirar la aceptación, navegación pública,
envío por teclado, errores y bloqueo de duplicados.

Para repetir las comprobaciones en PowerShell:

```powershell
npm.cmd run lint -- --max-warnings=0
npx.cmd eslint src tests/integration/privacy-center.test.tsx tests/integration/registration-consent.test.tsx tests/fixtures/privacy.ts tests/acceptance/privacy.acceptance.tsx --max-warnings=0
npx.cmd tsc --noEmit
npm.cmd test -- --ci --runInBand --coverage "--collectCoverageFrom=src/**/*.{ts,tsx}" --coverageDirectory=coverage/arco-final --coverageReporters=text-summary --coverageReporters=json-summary --coverageReporters=lcov
npm.cmd run test:acceptance -- --ci --runInBand
```

Se conserva la cobertura LCOV y se compara con una ejecución de la misma suite,
con los mismos patrones sobre todo `src`, anterior a los cambios. No hay
exclusiones nuevas ni modificación de umbrales. Los informes locales quedan en
`coverage/arco-baseline/`, `coverage/arco-final/` y `coverage/arco-acceptance/`.

### Resultados locales

| Verificación | Resultado |
| --- | --- |
| ESLint y TypeScript | Aprobados, sin errores ni advertencias. |
| Regresión | 56 suites, 463 pruebas aprobadas; antes: 49 suites, 385 pruebas. |
| Aceptación | 5 suites, 20 pruebas aprobadas; antes: 4 suites, 17 pruebas. |
| Cobertura de líneas de la nueva feature `privacy` | 100% en modelo, API, ViewModel y vista. |

| Cobertura global de todo `src` | Antes | Después |
| --- | ---: | ---: |
| Sentencias | 69.66% | 74.87% |
| Ramas | 70.75% | 75.40% |
| Funciones | 70.76% | 74.13% |
| Líneas | 69.76% | 74.85% |

El resultado oficial de SonarQube requiere su ejecución en CI; no se ejecutó
análisis remoto ni se modificó su configuración.

## Pendiente para completar la rúbrica

1. Acordar e implementar los contratos pendientes, almacenamiento y autorización
   del lado servidor, incluida evidencia transaccional del consentimiento.
2. Revisar y aprobar el aviso/versiones y las finalidades opcionales. Resolver
   consentimiento de cuentas históricas, Google y altas realizadas por terceros.
3. Conectar la rectificación general, switches Opt-Out y cancelación con prueba
   fresca y confirmación solo después de disponer de soporte comprobable.
4. Validar con una cuenta de prueba autorizada contra el backend desplegado,
   revisar concurrencia y verificar la política real de conservación y baja.
5. Completar pruebas de esos contratos y evidencias de punta a punta; abrir un
   correo o pasar Jest no equivale a un trámite ARCO recibido y resuelto.

El criterio queda avanzado, no completamente cubierto: hay consentimiento
explícito en UI, acceso básico y rectificación del entrenador; faltan las
operaciones servidor que impiden hacer funcionales las demás acciones.
No se ejecutaron builds, APK, commit, push ni merge.
