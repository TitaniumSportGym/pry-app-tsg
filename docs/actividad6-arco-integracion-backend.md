# Integración móvil ARCO con el backend

## Fuente verificada

Se consultó GitHub directamente, sin modificar el checkout backend:

- Repositorio: https://github.com/CASTROMJRM/pry_TinaniumSportGymWeb
- Rama: `feature/actividad6-arco-backend`
- Commit remoto consultado: `1e5f1bf00e0397c73e614c7e3830dffeac781442`.
- [Contratos de ese commit](https://github.com/CASTROMJRM/pry_TinaniumSportGymWeb/blob/1e5f1bf00e0397c73e614c7e3830dffeac781442/backend/docs/actividad6-arco-backend.md).
- Se leyeron además `routes/userPrivacyRoutes.js`, `routes/privacyRoutes.js`,
  `routes/authRoutes.js`, `controllers/privacyController.js`, el registro de
  `controllers/authController.js`, `services/privacyService.js`,
  `services/accountCancellationService.js`, `config/privacyNotice.js` y
  `utils/privacyValidation.js`.

La consulta web del blob no estaba disponible en la herramienta de navegación;
se verificó la referencia con `git ls-remote` y se descargaron los archivos de
`raw.githubusercontent.com` fijando ese SHA. No se usaron las propuestas
anteriores como si fueran rutas ya implementadas.

El repositorio móvil ya tenía trabajo sin commit en la rama
`feature/actividad6-seguridad-privacidad`. Se conservó. El documento
`actividad6-arco-consentimiento.md` describe ese estado anterior y las propuestas;
este documento describe la conexión al código backend efectivamente publicado.

## Activación y aislamiento de producción

**Los endpoints nuevos de Render de producción no se consultaron y la conexión
ARCO permanece desactivada por defecto.**

`isArcoBackendEnabled()` solo habilita los flujos nuevos cuando
`EXPO_PUBLIC_ARCO_BACKEND_ENABLED` vale exactamente `true`. Sin ese ajuste:

- El centro conserva el acceso básico y la rectificación de entrenador anteriores.
- No se solicitan aviso versionado, recibos, preferencias ni reautenticación/cancelación.
- El registro conserva el contrato anterior, sin inventar evidencia de aceptación.

Para validar posteriormente, usar únicamente un backend de pruebas autorizado
que tenga esos endpoints y su aviso aprobados. Toda la app, incluido el login,
debe apuntar al mismo backend de pruebas mediante `EXPO_PUBLIC_API_URL`.
No se creó un segundo cliente HTTP ni se mandan JWT de producción a una URL nueva.

Ejemplo orientativo para un entorno local de desarrollo; **no se escribió en
la configuración actual**:

```dotenv
EXPO_PUBLIC_API_URL=https://backend-staging.example.test
EXPO_PUBLIC_ARCO_BACKEND_ENABLED=true
```

Reiniciar Expo/Metro después de cambiar variables públicas. El flag es un control
de despliegue del cliente; la autenticación y autorización siguen correspondiendo
al servidor. No habilitarlo contra producción mientras el backend no esté listo.
No se modificaron `.env`, EAS, R8, configuración nativa, dependencias ni SonarQube.

## Comparación e integración de contratos

| Antes en privacy | Ahora, con ARCO habilitado |
| --- | --- |
| Acceso básico de los tres roles | Perfil personal ampliado, validado por ID/rol y ETag. |
| Solo entrenador podía editar identidad con GET + PUT completo | Los tres roles usan PATCH propio con If-Match; no se reenvía información profesional. |
| Aceptación de registro solo en memoria | Consulta de aviso aprobado y envío explícito de noticeId/version/accepted; validación del recibo antes de navegar. |
| Sin preferencias consultables | Preferencias leídas del servidor, conservando null como ausencia de elección. |
| Cancelación por canal manual | Contraseña, reto fresco cuando corresponda, confirmación escrita, prueba de un uso y solicitud idempotente. |
| Sin consulta de folio | Consulta de una solicitud propia mediante UUID. |

### Endpoints conectados

| Método | Ruta | Tratamiento móvil |
| --- | --- | --- |
| GET | `/api/privacy/notice` | Público, sin Bearer; valida versión, SHA-256 y URL HTTPS. |
| POST | `/api/auth/register` | Extiende el servicio existente con privacyConsent; exige 201 y recibo coherente cuando se envía aceptación versionada. |
| GET | `/api/user/profile` | Reutiliza la ruta; valida titular, rol, campos personales y ETag exacto. |
| PATCH | `/api/user/profile` | Envía nombre/teléfono y cabecera If-Match. Sin userId, correo, rol ni campos profesionales. |
| GET, POST | `/api/user/privacy-consents` | Consulta históricos o registra aceptación expresa del titular autenticado. |
| GET, PATCH | `/api/user/privacy-preferences` | Guarda una finalidad opcional con versión del estado consultado. |
| POST | `/api/auth/reauthenticate` | Siempre empieza por contraseña local y purpose account-cancellation. |
| POST | `/api/auth/reauthenticate/verify` | Valida un reto ARCO con código nuevo; separado del login. |
| POST | `/api/user/account-cancellation-requests` | Confirmación exacta, prueba vigente y Idempotency-Key UUID. Solo 202 confirma recepción. |
| GET | `/api/user/account-cancellation-requests/:requestId` | Consulta folio; valida que la respuesta corresponda al UUID solicitado. |

Diferencias frente a las propuestas iniciales:

- La versión del perfil es un string opaco; se conserva ETag, sin inventar un entero.
- OTP/TOTP no inician solos la reautenticación: primero se verifica la contraseña.
- Un 202 de reautenticación es un reto, sin prueba válida todavía.
- TOTP debe esperar `notBefore` y el servidor decide si el código es fresco.
- Google sin contraseña local devuelve `REAUTHENTICATION_METHOD_UNAVAILABLE`.
  No se modifica ni se simula un OAuth fresco; queda disponible el canal manual.
- La cancelación solo admite `pending_review`. La política de conservación figura
  como pendiente de aprobación, sin inventar fundamentos, plazos ni eliminación.

## Arquitectura y datos sensibles

Se conserva MVVM:

- `models/arco-contracts.ts`: contratos tipados, parsers con campos permitidos y mensajes.
- `models/arco-config.ts`: habilitación explícita del despliegue.
- `api/arco-api.ts`: comunicación a través del `apiClient` existente.
- `viewmodels/use-arco-center-view-model.ts`: estados, validación, retos y operaciones.
- `views/arco-center-view.tsx`: presentación y controles.
- `views/privacy-center-view.tsx`: guarda de autenticación, selección del flujo y
  remonte por cuenta/rol, que descarta los datos previos.
- Se conserva el flujo anterior para el backend todavía no desplegado.

`apiClient.ts` añade solamente un callback opcional para estado HTTP y cabeceras
de respuestas satisfactorias. Se conservan su retorno, Bearer, tratamiento de
401/403 y las funciones de SecureStore. `authService.registerMobile()` acepta un
tercer argumento opcional; login, OTP de login, restauración y cierre de sesión
mantienen su funcionamiento. Los tipos de registro reflejan el nuevo campo.

No hay tokens, contraseñas o códigos en rutas, parámetros de navegación, logs,
correos preparados, caché de repositorios ni almacenamiento persistente nuevo.
Las pruebas y retos ARCO permanecen en memoria; se descartan al salir/cambiar de
cuenta. La contraseña se limpia tras reautenticar y el código tras verificar.
El formulario de registro limpia sus contraseñas al completar el registro.
No se muestra la prueba de reautenticación en la interfaz.

Los parsers descartan campos inesperados y rechazan respuestas incompletas,
propietarios/roles incorrectos, recibos de otro aviso, ausencia de ETag, versiones
contradictorias y estados de cancelación no soportados. El ViewModel también
aplica solo los campos personales de una rectificación, conservando correo y rol.

### Confirmación, errores y concurrencia

- No se marca aceptación al abrir el documento; cada elección nueva empieza desmarcada.
- Aviso no disponible bloquea el registro versionado; una cuenta histórica no se
  considera aceptada por existir o por tener login Google.
- `NOTICE_VERSION_CHANGED` desmarca la aceptación y consulta de nuevo el aviso.
- PATCH de perfil 412/428 recarga y obliga a revisar una nueva edición.
- Preferencias 409 recarga el estado. No se actualizan switches optimistamente.
- `optOut: null` se muestra como “Sin elección registrada”. El switch apagado no
  se presenta como un opt-in; `false` se distingue como no oposición registrada.
- Los errores 403 de reautenticación y 409 de negocio conservan la sesión.
  Un 401 sigue invalidándola mediante los servicios existentes.
- Se bloquean operaciones simultáneas y dobles envíos.
- Una pérdida de respuesta de cancelación conserva en memoria el mismo UUID,
  cuerpo y prueba para reintentar la misma operación. Una confirmación válida
  muestra folio y estado pendiente; no cierra sesión ni anuncia una baja efectiva.
- El reintento idempotente se conserva solo mientras permanece esta pantalla.
  Si se abandona tras una respuesta incierta y no se conoce el folio, corresponde
  el canal manual; el backend no ofrece listado de solicitudes y evita dos
  solicitudes pendientes. No se persisten pruebas para eludir esa limitación.
- Se ignoran resultados tardíos tras abandonar la pantalla.

## Archivos de esta conexión

| Área | Archivos |
| --- | --- |
| Nuevos contratos y API | `src/features/privacy/models/arco-config.ts`, `arco-contracts.ts`, `api/arco-api.ts` |
| Nuevo MVVM | `src/features/privacy/viewmodels/use-arco-center-view-model.ts`, `views/arco-center-view.tsx` |
| Integración en privacy | `src/features/privacy/views/privacy-center-view.tsx`, `models/personal-data.ts` |
| Cliente y tipos | `src/services/apiClient.ts`, `authService.ts`, `src/types/auth.ts` |
| Registro | `src/features/registration/viewmodels/use-registration-view-model.ts`, `views/registration-form-view.tsx` |
| Pruebas nuevas | `arco-contracts.test.ts`, `arco-api.test.ts`, `use-arco-center-view-model.test.ts`, `use-registration-versioned.test.ts`, `tests/integration/arco-backend.test.tsx`, `tests/acceptance/arco-connected.acceptance.tsx`, `tests/fixtures/arco.ts` |
| Harness | `tests/acceptance/setup.ts`: inicializa el wrapper real de Switch antes de resetAllMocks; evita que el mock nativo de codegen quede sin implementación al cargarlo tarde. |
| Documentación | Este documento y referencia de actualización en `actividad6-arco-consentimiento.md`. |

Los demás cambios previos de cuenta, legales, rutas, fixtures y pruebas anteriores
no se sustituyeron ni se descartaron.

## Pruebas ejecutadas

```powershell
npm.cmd run lint -- --max-warnings=0
npx.cmd tsc --noEmit
npm.cmd test -- --ci --runInBand
npm.cmd run test:acceptance -- --ci --runInBand
git diff --check
```

| Verificación | Resultado |
| --- | --- |
| ESLint | Sin errores ni advertencias. |
| TypeScript | Sin errores. |
| Regresión | 61 suites, 517 pruebas aprobadas. |
| Aceptación simulada | 6 suites, 25 pruebas aprobadas. |
| Diff | Sin errores de whitespace. |

Se probaron parsers y adaptadores, estados MVVM y pantallas con el cliente HTTP
real y fetch simulado: Bearer, peticiones públicas sin JWT, ETag/If-Match,
consentimiento, rechazo de respuestas inválidas, los tres roles, preferencias,
conflictos, OTP/TOTP, Google no disponible, vencimiento, confirmación, idempotencia
tras respuesta perdida, consulta de folio y falta/expiración de sesión.

Las pruebas no llamaron a Render, Google, correo ni a bases de datos. Las pruebas
de aceptación simulan las fronteras de servicios y mantienen vistas, ViewModels
y providers reales. No se redujeron umbrales, se excluyeron suites ni se cambió
SonarQube. Los logs sintéticos locales están en `coverage/arco-backend/`,
ya ignorado por Git; no son evidencia de validación con el backend desplegado.

## Pendiente para validar integración real

1. Disponer de staging autorizado con los endpoints desplegados y el aviso
   aprobado/configurado. Las migraciones y permisos son responsabilidad del
   backend; no se ejecutaron en esta tarea.
2. Habilitar el flag exclusivamente en ese entorno y usar una cuenta de prueba
   autenticada allí. Verificar HTTPS, CORS/ETag donde aplique y respuestas reales.
3. Confirmar recibos persistidos, elección histórica vacía, rectificación entre
   dispositivos y preferencias después de volver a entrar.
4. Probar correo ARCO y TOTP reales, límites y expiración sin usar códigos de login.
5. Validar idempotencia y consulta de folio sobre la base de staging.
6. Resolver en backend el procedimiento Google y la política/operación de bajas
   y conservación. La app no puede decidirlas ni presentar 202 como eliminación.

No se generaron APK, builds, commits, push ni merge.
