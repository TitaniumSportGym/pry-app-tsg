# Continuación ARCO — resultados reales y pendientes

Rama `feature/actividad6-seguridad-api`. Esta verificación actualiza el estado
del aviso público descrito como pendiente en auditorías anteriores. No se
modificaron backend, cuentas existentes, `.env`, secretos ni infraestructura;
no se hicieron commit, push o merge.

## Verificación conectada realmente ejecutada

`node --use-system-ca scripts/verify-arco-public.cjs` realizó cinco GET sin
credenciales. No inicia sesión, registra cuentas, cambia datos ni solicita
cancelaciones. Sus evidencias no incluyen cuerpos de perfil o respuestas privadas.

| Caso real | Resultado |
| --- | --- |
| `GET /api/privacy/notice` | HTTP 200; versión `2026-11-08-v1`. |
| PDF público | HTTP 200, firma `%PDF-` y SHA-256 igual al backend. |
| `GET /api/user/profile`, sin Bearer | HTTP 401. |
| `GET /api/user/privacy-consents`, sin Bearer | HTTP 401. |
| `GET /api/user/privacy-preferences`, sin Bearer | HTTP 401. |

SHA-256 verificado:
`7ae0e648561f1ba64aa4f3e09a8f271d644cc6dce4927abfd5c683d1a863c7ea`.
Documento:
[aviso publicado](https://titaniumsportgym.vercel.app/avisos/aviso-privacidad-titanium-sport-gym.pdf).
El backend devuelve `requiredForRegistration: false`; esto no registra ni implica
consentimiento automático. La aplicación conserva aceptación explícita cuando se
solicita registrar un recibo.

Las siete tablas en Neon se consideran confirmadas **por el usuario**. No se
accedió a la base ni se ejecutaron migraciones para volver a probar esa afirmación.
La disponibilidad del aviso no demuestra por sí sola los recorridos privados.

## Activación aislada preparada

- `production`, `preview` y `development` fijan el flag ARCO en `false`.
- Solo `arco-debug` y `arco-release` fijan `true`, con distribución interna.
- Ambos apuntan a `https://arco-staging.example.invalid`, marcador sin servicio
  operativo que sustituye expresamente el Render heredado. No están listos para
  pruebas conectadas hasta configurar el staging aprobado.
- No se cambió la bandera del `.env` actual, que permanece desactivada, ni las
  variables remotas de EAS o el binario de producción.
- Se añadieron pruebas de herencia de perfiles, origen separado, APK Release,
  cliente Debug y activación exclusiva mediante el valor exacto `true`.

El [procedimiento de staging y cuentas sintéticas](arco-staging-y-cuentas-sinteticas.md)
incluye rama Neon solo de esquema/base vacía, conexiones y secretos propios,
correo de laboratorio, verificación normal de cuentas y cuenta exclusiva para
cancelación. No se crearon esos recursos ni se generaron credenciales.

## Pruebas automatizadas ejecutadas

| Verificación | Resultado |
| --- | --- |
| ESLint `src tests scripts plugins --no-cache` | 0 errores; 10 advertencias anteriores. |
| TypeScript `tsc --noEmit` | Sin errores. |
| Unitarias | 519 casos, 56 suites aprobadas. |
| Integración | 171 casos, 17 suites aprobadas. |
| Aceptación simulada | 29 casos, 7 suites aprobadas. |
| Regresión completa con LCOV de todo `src` | 690 casos, 73 suites aprobadas. |
| Validador local de configuración preview | Aprobado. |
| Export Android/Hermes local con ARCO `true` y origen `.invalid` solo en el proceso | Aprobado; bundle de unos 3.5 MB en `.expo/arco-release-check/`. No es un APK/AAB ni una prueba física. |

Regresión ya incluye unitarias e integración; aceptación es otra ejecución:
**719 pruebas distintas**, sin fallos ni casos omitidos. Se añadieron 20 casos
respecto a la base de 670: 16 unitarios/configuración/evidencia y cuatro de
integración. No se sustituyeron funcionalidades ARCO, APIs o ViewModels por otra
implementación. Los contratos existentes se revisaron y se conservaron.

Cobertura global de regresión: **81.75% de líneas y 81.77% de ramas**. Reporte:
`coverage/arco-activation/regresion/lcov.info`. No se cambiaron umbrales,
exclusiones ni Quality Gate; no se afirma aprobación remota de estos cambios.

| Escenario | Qué se comprobó |
| --- | --- |
| Aviso publicado | Parser existente acepta versión/hash/URL reales y `requiredForRegistration=false`; no se fija esa versión en la lógica de producción. |
| 401 | Rechazo real sin credenciales y pruebas existentes de invalidación/restauración con HTTP simulado. |
| 403 | Reautenticación rechazada con HTTP simulado conserva sesión y limpia contraseña. |
| 409 | Cambio de versión de aviso desmarca aceptación y vuelve a consultar; conflicto de preferencias existente recarga estado. HTTP simulado. |
| 412 | Conflicto ETag existente recarga perfil sin afirmar éxito; se conserva su cobertura de integración. HTTP simulado. |
| 422 | Rectificación inválida conserva borrador, no muestra éxito; fallo de reautenticación limpia contraseña. HTTP simulado. |
| Cancelación | Suites existentes comprueban proof, OTP/TOTP, idempotencia y `pending_review` con datos simulados. No hubo POST real. |

Los spies de `console.log/warn/error` verifican que el recorrido HTTP simulado de
contraseña/JWT/OTP/prueba/cancelación no registra secretos, también al fallar la
reautenticación. Se revisaron servicios, registro y privacidad: no se añadieron
logs sensibles. El script público solo persiste estado HTTP, resultado y datos
públicos del documento; sus pruebas verifican que un cuerpo privado inesperado y
un error de transporte no pasan al reporte.

Esto no acredita ausencia de secretos en logs nativos, plataforma o backend:
esas verificaciones necesitan dispositivo y acceso autorizado a registros de
staging, todavía no disponibles.

## Android y operaciones que siguen pendientes

ADB está disponible, pero no hay dispositivos conectados. La
[matriz ARCO Debug/Release](arco-staging-y-cuentas-sinteticas.md#android-debug-y-release)
y la [plantilla de evidencia](plantilla-evidencia-android.md) están preparadas.
No hay pruebas físicas aprobadas ni builds remotos nuevos en esta tarea.

No se ejecutaron pruebas autenticadas conectadas de consentimiento, perfil,
rectificación, preferencias, reautenticación o cancelación. El usuario confirmó
que no ha proporcionado credenciales ni cuenta para cancelación y no autoriza
cambios sobre cuentas reales. Las siguientes condiciones deben resolverse:

1. Aprobar un servicio de staging y rama/base Neon aislada sin datos reales.
2. Configurar conexiones, JWT y correo propios de staging, y validar su esquema
   y aviso sin tocar producción.
3. Crear/verificar cuentas sintéticas con correo/contraseña propios; proporcionar
   un mecanismo seguro de acceso y alcance autorizado para las escrituras.
4. Autorizar aparte la cuenta exclusiva para cancelación. Hasta entonces no
   ejecutar siquiera sus POST negativos contra el backend real.
5. Reemplazar el marcador de los perfiles ARCO por el origen aprobado, generar
   builds internos con firma existente y completar la matriz física en Android.

## Archivos de esta continuación

- `eas.json`: perfiles internos y flags explícitos; producción permanece apagada.
- `src/features/privacy/models/arco-config.ts`: comentario de despliegue actualizado.
- `src/features/privacy/models/arco-config.test.ts`: siete casos de flag.
- `src/features/privacy/models/arco-contracts.test.ts`: contrato del aviso publicado.
- `tests/security/arco-environments.test.ts`: seis comprobaciones de perfiles.
- `tests/security/arco-public-evidence.test.ts`: dos comprobaciones de redacción.
- `tests/integration/arco-backend.test.tsx`: cuatro casos nuevos y verificación
  de logs en el recorrido OTP existente.
- `scripts/verify-arco-public.cjs`: verificación conectada reproducible, solo lectura.
- Estos dos documentos: resultados y procedimiento de staging/cuentas/Android.

Se preservó `aviso-publicado.pdf`, archivo local no seguido por Git que ya existía
al iniciar. No se usó como sustituto de descargar y verificar el PDF publicado.

Evidencias locales en `coverage/arco-activation/`: `public-verification.json`,
`published-notice.json`, `jest-*.json`, logs de lint/tipos/suites y
`regresion/coverage-summary.json`/`lcov.info`. Los comandos de tests reproducen los
scripts del proyecto con `--ci --runInBand`; la regresión usa
`--collectCoverageFrom='src/**/*.{ts,tsx}'` y reporteros text/json-summary/lcov.
El log `android-release-export.log` documenta el export local aislado, sin
reescribir `.env` y sin conectarse a cuentas del backend.
