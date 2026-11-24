# Actividades 6 y 7 — entrega de seguridad móvil

Trabajo local en `feature/actividad6-seguridad-api`, iniciado desde el `develop`
remoto `a0a33d4d1d8a58a07de4d9880987546fb0d156cf`. Auditoría del 7 de noviembre de
2026, Ciudad de México. No se hicieron commit, push, merge, migraciones, builds
remotos, publicación ni cambios de credenciales/backend. `.env`, `eas.json`, CI,
Jest y SonarQube conservan su configuración; el flag ARCO local sigue desactivado.

## Cumplimiento de la Actividad 6

| Criterio | Implementado y verificado aquí | Estado que requiere evidencia externa |
| --- | --- | --- |
| 1. REST/JWT y sesiones | Cliente existente reforzado: validación HTTPS/origen antes de credenciales; SecureStore conservado; invalidación central y caché por Observer; manejo distinto de 401, 403 de permisos/membresía y 403 de JWT inválido. Serialización y compare-and-remove evitan invalidación duplicada y borrado de una sesión nueva. Logout también queda ligado a su token inicial. Login/OTP/restauración/guards probados con HTTP simulado y proveedor real. | Verificación conectada con cuentas sintéticas por rol y backend de pruebas disponible. No se añade refresh porque no existe contrato revisado. |
| 2. Anti-MitM, HTTPS y pinning | Release rechaza HTTP en JS y política nativa; Debug permite HTTP solo a tres hosts locales. CA del sistema, sin trust-all ni CA de usuario. Prebuild y pruebas de política pasan. | Pinning NO implementado por falta de control SPKI/respaldos/rotación en TLS administrado de Render. Certificados inválidos, proxy y TLS nativo real pendientes. No se declara protección absoluta contra MitM. |
| 3. ARCO y consentimiento | Contratos reales revisados en backend merge `0be5fdeb`; migración existe en Git. Se conservan parsers, aviso versionado, aceptación explícita, recibos, If-Match/ETag, opt-out versionado, reautenticación y cancelación idempotente `pending_review`. Las pruebas existentes vuelven a pasar. | Migración aplicada, aviso aprobado/configurado y transacciones reales no confirmados. El flag permanece apagado; el registro antiguo no equivale a evidencia de consentimiento versionado en servidor. |
| 4. R8/ProGuard | Prebuild aislado confirma minify/shrink true, preset optimize y ausencia de reglas que desactiven R8. APK preview/AAB production y recolección de mapping se conservan. | No se compiló un APK/AAB nuevo ni se validaron mapping/firma o reflexión en dispositivo. Configuración correcta no demuestra integridad de un Release instalado. |
| 5. Caja negra Android | Matriz de 26 casos, instrucciones ADB, plantilla y script de captura local preparados para Debug y Release. | Ningún teléfono conectado; casos físicos NO EJECUTADOS. El escáner actual lee QR y evita lecturas repetidas, pero no integra validación/registro de acceso por API. |

La [auditoría inicial](actividad6-auditoria-inicial.md) separa lo preexistente de lo
que faltaba. El [documento de TLS/pinning](actividad6-tls-pinning.md) explica
rotación, expiración, respaldo y recuperación, además del límite de redirecciones
de fetch nativo: revisar la URL final no revierte una redirección ya seguida.

## Preparación de la Actividad 7

| Criterio | Estado |
| --- | --- |
| APK instalable | Perfil preview existente preservado; export Android/Hermes y Prebuild comprobados. Build firmado nuevo pendiente. |
| Debug propio | Se resolvió la dependencia faltante con `expo install expo-dev-client`: versión 58.0.18 compatible con SDK 58. Perfil development existente conservado. Falta compilar/instalar y recorrer la matriz. |
| AAB firmado | Perfil production existente, `app-bundle`, autoincremento remoto. Credenciales/firma/versionCode reales y build pendientes; no se generó material de firma. |
| Permisos | Main manifest generado declara cámara e Internet. Se bloquean micrófono, almacenamiento externo, overlays y vibración sin uso actual. Falta verificar manifiesto fusionado del APK/AAB real. |
| Ficha y requisitos Play | Package, versión, comandos de firma/build y requisitos vigentes documentados. Marca/capturas/contacto/target real y compatibilidad nativa requieren revisión final. |
| Privacidad y Seguridad de datos | Inventario y preguntas para responsable preparados; aviso público, SDKs, compartición, retención y proceso de eliminación requieren confirmación. No se inventan respuestas legales. |
| Testing y publicación | Checklist de pista interna y pasos de Console preparados; ninguna publicación ejecutada. |

Consultar [preparación Google Play y comandos exactos](actividad7-preparacion-google-play.md),
[matriz Android](actividad6-matriz-android.md) y
[plantilla de evidencia](plantilla-evidencia-android.md).

## Cambios de implementación

- `src/config/api-url-policy.ts`: política de transporte, sintaxis y origen.
- `src/config/env.ts`: valida base URL sin credenciales/query/fragmento; conserva normalización.
- `src/services/apiClient.ts`: valida antes de acceder al token; elimina Authorization público;
  liga logout a la credencial inicial; maneja errores autenticados y origen final.
- `src/services/sessionService.ts`: cola de mutaciones, invalidación condicional y cuarentena
  en memoria del token rechazado si falla el almacenamiento. No se almacena en AsyncStorage.
- `src/core/observer/session-events.ts`, `src/providers/auth-provider.tsx`: evento sin JWT
  que cierra usuario/rol y evita restauraciones tardías. RepositoryCache ya observa los eventos.
- `src/types/auth.ts`, `src/hooks/use-authorized-resource.ts` y los dos ViewModels de
  privacidad: identifican la invalidación ya gestionada para no provocar otro logout
  ni invalidar una sesión posterior. Se conservan los fallbacks de errores simulados.
- `src/services/authService.ts`: conserva el contrato de login/OTP/restore; logout usa
  compare-and-remove y no puede borrar el token de un login posterior.
- `src/core/observer/subject.ts`: un fallo de listener registra solo mensaje estático,
  sin volcar errores arbitrarios que puedan contener credenciales.
- `plugins/with-network-security.cjs`, `app.json`: política Android CNG y permisos mínimos.
- `package.json`, `package-lock.json`: solo incorporación compatible de DevClient;
  no se cambia SDK ni React Native, ni se aplica `audit fix --force`.
- `scripts/verify-android-release.cjs`: extiende la comprobación existente a red,
  permisos y copia aislada del plugin, conservando las verificaciones R8.
- `scripts/capture-android-evidence.ps1`: lectura de metadatos y captura PNG opcional;
  nunca instala, borra datos, lee tokens ni marca casos físicos como aprobados.

Pruebas creadas: `src/config/api-url-policy.test.ts`,
`tests/security/api-client.test.ts`, `tests/integration/session-security.test.tsx`.
Se ampliaron `src/config/env.test.ts`, `src/core/observer/subject.test.ts` y
`tests/session/sessionService.test.ts`. Las suites de privacidad
`tests/integration/privacy-center.test.tsx` y `arco-backend.test.tsx` adaptan su
frontera de sesión simulada; la nueva integración valida la frontera real completa.

Documentos creados: esta entrega, auditoría inicial, decisión TLS/pinning,
matriz Android, plantilla de evidencia y preparación Google Play.

## Validaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| ESLint sobre `src tests scripts plugins` | 0 errores; 10 advertencias preexistentes. |
| TypeScript `tsc --noEmit` | Sin errores. |
| Unitarias, cobertura y opciones CI | 503 casos, 53 suites aprobadas. |
| Integración, cobertura y opciones CI | 167 casos, 17 suites aprobadas. |
| Aceptación simulada, cobertura | 29 casos, 7 suites aprobadas. |
| Regresión CI con `collectCoverageFrom=src/**/*.{ts,tsx}` y LCOV | 670 casos, 70 suites aprobadas. |
| Prebuild aislado y R8/red/permisos | Aprobado, Expo 58.0.19 / RN 0.88.0 / build-properties 58.0.12. |
| `expo install --check` offline | Sin desajustes en matriz local; el CLI advierte que la validación offline no consulta el directorio remoto. |
| Export Android de producción | Aprobado; bundle Hermes final `entry-a85fd387eee3797cd5006bb3663fa3cc.hbc`, unos 3.5 MB. No es APK/AAB. |
| Configuración EAS preview | `scripts/eas-preview.cjs validate` aprobado. |
| Script PowerShell | Sintaxis analizada sin errores. No se ejecutó captura física. |
| ADB | Herramienta disponible; lista sin dispositivos. |
| Lecturas públicas Render | GET aviso/perfil/planes sin credenciales: timeout de 20 s; disponibilidad no confirmada. No se enviaron escrituras. |
| Reassure | No se volvió a medir. No afirmar rendimiento aprobado para estos cambios. |

Hay **699 casos distintos**: regresión ya incluye unitarias e integración; aceptación
corre aparte. Son 78 casos adicionales respecto a las 592 pruebas de regresión
de la base. Los mocks se limitan a red y módulos nativos. Las pruebas nuevas
ejecutan almacenamiento/cola, authService, AuthProvider, Observer y Router guards
reales, incluyendo peticiones 401 simultáneas, 401 de otra sesión, logout tardío,
errores de SecureStore, role desconocido y arranque sin red.

El sandbox bloqueó procesos Node/Hermes con EPERM y el acceso npm durante los
primeros intentos. Se completaron las comprobaciones aisladas y la instalación con
la revisión de permisos del entorno. No se eludió la validación TLS ni se relajó
la política de la aplicación. ESLint se ejecutó directamente sobre todos los
directorios afectados, además de las comprobaciones de tipos.

## Cobertura y calidad

| Alcance | Líneas | Ramas |
| --- | ---: | ---: |
| Todo `src`, regresión final | 2442/2987 = 81.75% | 2484/3040 = 81.71% |
| Cambios de esta tarea frente a `develop`, estimación LCOV | 80/81 = 98.77% | 71/75 = 94.67% |

La cobertura combinada local estimada del cambio es **96.79%**. Se validaron 265
fuentes LCOV y sus rangos de línea; ningún archivo nuevo está ausente. La estimación
incluye el archivo TypeScript nuevo sin añadirlo al índice Git. No se modificaron
exclusiones, Quality Gate, umbrales ni pruebas para reducir lo medido. No equivale
a un porcentaje publicado por SonarQube, que decide su propia base y condiciones.

Se consultó el estado remoto: el análisis de `develop` sobre **a0a33d4** está en
**OK**, con `new_coverage=91.2`, umbral 80. También la PR #85 previa está aprobada
sobre `e12fd41`. Esos resultados corresponden a la base, **no a estos cambios locales**;
la rama de esta entrega no tiene un análisis remoto verificado de su nuevo código.

## Dependencias: hallazgos existentes

El registro oficial npm reportó **36 avisos: 1 bajo, 32 moderados y 3 altos**.
Una consulta dentro del sandbox devolvió cero y se descartó como evidencia
contradictoria; la consulta con acceso real al registro confirmó los 36. Los tres
paquetes marcados altos son `@expo/cli`, `node-forge` y `zod` dentro de la cadena
de herramientas. Se conservan sus versiones respecto al lockfile de `develop`.
Para todos los nodos afectados del reporte, se verificó que **ninguno es nuevo ni
cambió de versión con DevClient**. Esto no significa que sean inocuos ni que
la aplicación esté libre de vulnerabilidades.

No se aplicó el arreglo forzado propuesto por npm: varias remediaciones sugerían
cambiar Expo a 52.0.49, incompatible con el objetivo SDK 58. Queda una tarea de
remediación compatible, revisión de alcance build/runtime y reevaluación contra
avisos actualizados. El detalle con enlaces de advisories y comparación de
versiones está en `coverage/security/dependency-findings.json`.

## Pendientes y pasos posteriores

1. Revisar el diff y estos resultados locales. El usuario decide commit/push/PR.
   Tras subir, comprobar el Quality Gate del nuevo SHA; no reutilizar el de la base.
2. Responsable backend confirma entorno de pruebas, cuentas sintéticas por rol,
   versión desplegada y migración ARCO aplicada. Confirmar aviso/configuración
   y habilitar el flag solo en un build de pruebas acordado.
3. Ejecutar contratos conectados: aviso/recibo, ETag y conflicto, preferencias,
   reautenticación fresca y prueba de un uso, cancelación idempotente/folio. No
   ejecutar esos cambios en cuentas reales ni simular aprobación de aviso/retención.
4. Confirmar cuenta EAS/firma remota/versionCode sin crear claves; generar Debug,
   APK Release y AAB cuando lo autorice el responsable, usando los comandos del
   documento de Actividad 7. Conservar mapping del mismo artefacto.
5. Conectar Android y completar ambos recorridos de la matriz, especialmente TLS,
   401/403, permisos, MP sandbox y Release ofuscado. Registrar observado y evidencia.
6. Resolver deuda de dependencias y preparación de privacidad/Google Play, incluida
   solicitud de eliminación dentro de app y recurso web operativo. No publicar
   mientras existan esos bloqueos; no confundir un folio pendiente con borrado.
7. Si se requiere pinning como control adicional, acordar infraestructura y rotación
   SPKI antes de cambiar el cliente nativo. No fijar el certificado temporal actual.

Evidencias locales (no subir datos sensibles): `coverage/security/*.log`,
`jest-*.json`, `regresion/lcov.info`, `regresion/new-code-estimate.json`,
`native-final.log`, `sonar-remote.json`, `public-backend-probe.json` y
`dependency-findings.json`. Proyecto nativo aislado/verificación en
`.expo/android-release-*/verification.json`; bundle en `.expo/security-export/`.
No se generaron nuevos mapping, APK o AAB firmados.

## Cobertura por archivo de implementación afectado

Porcentajes de archivo completo, distintos de la cobertura exclusiva de líneas
nuevas anterior. El plugin y los manifiestos se verifican mediante Prebuild real;
no se presenta esa comprobación como cobertura Jest de código nativo.

| Archivo | Lineas | Ramas |
| --- | ---: | ---: |
| `src/config/api-url-policy.ts` | 100% | 100% |
| `src/config/env.ts` | 100% | 100% |
| `src/core/observer/session-events.ts` | 100% | n/a |
| `src/core/observer/subject.ts` | 100% | n/a |
| `src/features/privacy/viewmodels/use-arco-center-view-model.ts` | 90.72% | 73.21% |
| `src/features/privacy/viewmodels/use-privacy-center-view-model.ts` | 100% | 96% |
| `src/hooks/use-authorized-resource.ts` | 100% | 90.9% |
| `src/providers/auth-provider.tsx` | 83.33% | 78.57% |
| `src/services/apiClient.ts` | 91.54% | 83.72% |
| `src/services/authService.ts` | 89.74% | 79.16% |
| `src/services/sessionService.ts` | 100% | 100% |
| `src/types/auth.ts` | 100% | n/a |
