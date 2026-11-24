# ARCO Release: una cuenta sintética en Render / Neon Primary

## Alcance preparado

Rama `feature/actividad6-seguridad-api`. Esta campaña usa el backend existente
`https://server-titanium.onrender.com` y Neon Primary, por decisión del usuario.
El aislamiento es del **perfil de compilación y la cuenta**, no de la base de
datos. No se crearon servicios, ramas Neon ni usuarios en esta preparación.
No se enviaron solicitudes ARCO reales, ni siquiera negativas.

`arco-release` es independiente de `preview`: distribución interna, sin cliente
de desarrollo, entorno EAS `preview`, Android `apk`, URL anterior **sin `/api`**
y `EXPO_PUBLIC_ARCO_BACKEND_ENABLED=true`. Los endpoints agregan `/api` una sola
vez. `arco-debug` también usa el origen real; se retiraron los marcadores ficticios.
Los perfiles habituales `development`, `preview` y `production` se conservan
sin cambios y mantienen ARCO en `false`. No se modifica `.env` ni EAS remoto.

Se conservaron `app.json`, `src/config/env.ts` y los contratos ARCO existentes.
El plugin `expo-build-properties` ya habilita minificación R8 y reducción de
recursos en Release, con `proguard-android-optimize.txt`. El perfil conserva
`android/app/build/outputs/mapping/release/**` como artefacto del build.

## Compilar e instalar manualmente

Comando preparado; **no ejecutado remotamente**:

```powershell
npx.cmd eas-cli@latest build --platform android --profile arco-release --non-interactive --freeze-credentials
```

Requiere sesión EAS autorizada y credenciales Android ya disponibles. Si faltan,
detenerse y resolver la firma con el responsable; el comando no genera nuevas
credenciales. No usar `--auto-submit`. Las variables públicas del perfil quedan
incorporadas al bundle; no son un lugar para secretos. No activar ARCO en las
variables remotas habituales de producción o preview.

Descargar la APK desde la página del build EAS y guardar el ID, commit de base,
diff local revisado (estos cambios aún no tienen commit), fecha, versión, hash
del APK y mapping del **mismo build**. Comprobar que el archivo descargado
corresponde al perfil `arco-release`.

En un dispositivo dedicado a pruebas con depuración USB autorizada:

```powershell
Get-FileHash .\Titanium-arco-release.apk -Algorithm SHA256
adb devices -l
adb -s SERIAL install -r .\Titanium-arco-release.apk
adb -s SERIAL shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p com.titaniumsportgym.app
```

Sustituir `SERIAL` por el dispositivo elegido. El paquete sigue siendo
`com.titaniumsportgym.app`: puede reemplazar una instalación existente con firma
compatible. Usar un teléfono de pruebas sin sesión de un usuario real. Ante
conflicto de firma, detenerse; no desinstalar ni borrar datos automáticamente.
No ejecutar `pm clear`, borrados de cuentas ni limpiezas SQL.

El Prebuild aislado solo verifica configuración nativa generada. R8 ejecutado,
mapping real, permisos fusionados del binario, arranque y recorridos de Release
solo podrán acreditarse al compilar e instalar esa APK.

## Preparar la única cuenta

El tester creará manualmente **un cliente nuevo**, por el registro normal de la
app, con buzón/alias que controle y contraseña nueva guardada en su gestor.
Usar nombre sintético y ningún dato de personas reales; dejar teléfono vacío
si el contrato lo admite. Resolver la verificación de correo normal si se exige.
No crear usuarios mediante SQL, cambiar roles ni editar cuentas existentes.

Asignar etiqueta `ARCO-UNICA-01` a la cuenta y confirmar ID/rol cliente antes de
cualquier escritura. Guardar el ID completo y credenciales únicamente en el
registro privado del tester; usar etiqueta o ID redactado en evidencias.
No poner correo/contraseña, JWT, OTP, prueba de reautenticación o cadenas Neon
en el repositorio, chat, argumentos CLI, capturas o logs. No extraer SecureStore
ni almacenar respuestas privadas completas. No asumir credenciales preexistentes.

## Matriz secuencial para esa misma cuenta

Todos los casos siguientes están **PENDIENTES EN BACKEND REAL / APK**. Las suites
automatizadas usan respuestas simuladas; no sustituyen esta ejecución manual.
Registrar por caso: etiqueta, build/hash, fecha, resultado, HTTP observado cuando
sea verificable de forma autorizada y evidencia redactada. Si no se dispone de
observabilidad HTTP segura, marcar HTTP como no verificado, sin inventarlo.

| Orden / caso | Acción manual sobre ARCO-UNICA-01 | Resultado que comprobar |
| --- | --- | --- |
| 1 REG | Registrar un cliente con correo propio y contraseña nueva; verificar correo si procede. | Registro 201 según contrato, sin cuenta ajena ni consentimiento inventado. Aviso vigente visible. Si se marca aceptación explícita, recibo coherente. |
| 2 LOGIN | Iniciar sesión con esa cuenta; completar OTP si aplica. | Sesión correcta, ID propio y rol cliente; sin secretos visibles en logs. |
| 3 ACCESO | Consultar centro ARCO, perfil, consentimiento y preferencias. | GET 200; ETag válido, datos propios, sin datos de ejemplo; estado sin elección sigue siendo null. El usuario ya confirmó aviso 200/401 sin sesión; no se repitieron aquí. |
| 4 RECT | Cambiar nombre/teléfono sintéticos con ETag vigente; consultar otra vez; cerrar sesión y volver a entrar en la misma cuenta. | PATCH 200, nuevo ETag, dato persistente; ID/correo/rol sin cambios. No volver a crear otra cuenta. |
| 5 RECT-CONFLICTO | Con observabilidad/herramienta privada autorizada, reutilizar el ETag anterior sobre esa cuenta. Probar un dato inválido permitido por el plan. | 412 sin sobrescritura, recarga y revisión del borrador; 422 sin falso éxito. Si la UI impide enviar el dato inválido, comprobar validación local y dejar HTTP pendiente. |
| 6 CONS | Consultar recibos y aceptar expresamente el aviso vigente si aún no consta; volver a consultar. | GET 200 / POST 201 y recibo con versión/hash/URL correctos. Si el registro ya produjo recibo, verificarlo; no fabricar otra aceptación. |
| 7 CONS-CONFLICTO | Solo con herramienta privada autorizada, enviar versión obsoleta controlada u omitir aceptación sobre la misma cuenta. No cambiar el aviso del servidor. | 409 NOTICE_VERSION_CHANGED / 422 según contrato, sin recibo falso. Si no se ejecuta, dejar pendiente real. |
| 8 OPOSICIÓN | Activar oposición/opt-out de una finalidad opcional y consultar; después la otra si procede. | PATCH 200, versión +1, otra finalidad conservada, persistencia tras nueva consulta. No convertir null en consentimiento afirmativo. |
| 9 PREF-CONFLICTO | Solo si se dispone de herramienta privada autorizada, usar versión anterior / finalidad inválida en la misma cuenta. | 409 PREFERENCES_VERSION_CHANGED / 422; no sobrescribir estado ni mostrar éxito falso. |
| 10 REAUTH | Antes de la cancelación, comprobar una contraseña incorrecta como máximo y luego la correcta; completar reto fresco si existe. | 403 de negocio conserva sesión; 200 con prueba o 202 con reto, que aún no es autorización. OTP/TOTP fresco, respetando notBefore y expiración; nunca usar OTP de login. Cuerpo inválido 422 solo si se ejecuta con autorización. |
| 11 PAUSA | Reunir resultados anteriores y solicitar confirmación manual del usuario para enviar **una solicitud de cancelación** de ARCO-UNICA-01 en Render / Neon Primary. | No pulsar el botón ni enviar POST mientras falte esa confirmación. Tener una cuenta o una prueba de reautenticación no equivale a autorización. |
| 12 CANCELACIÓN — ÚLTIMA | Solo después de la confirmación: renovar reautenticación si expiró; escribir SOLICITAR CANCELACIÓN y pulsar manualmente una vez. | POST 202, folio y pending_review. No significa cuenta borrada. Consultar el mismo folio como parte de este último caso si está autorizado; sin más escrituras ni pruebas posteriores. |

No ejecutar POST de cancelación negativos antes de la confirmación manual. Los
casos 403/409/422 de cancelación se mantienen únicamente simulados en esta campaña
de una sola solicitud. Ante respuesta perdida, conservar la misma clave UUID de
idempotencia y cuerpo; no crear otra solicitud a ciegas. Resolver el estado del
primer envío con el responsable antes de reintentar. No borrar la cuenta al
terminar, ni eliminar su auditoría, ni ejecutar cancelaciones sobre cuentas reales.

## Evidencia y logs

Las pruebas de integración existentes ejecutan contratos, ViewModels y vistas
reales con HTTP simulado y verifican que console no recibe contraseña/JWT/OTP/
prueba de reautenticación en los recorridos cubiertos. Esto no acredita los logs
del backend, plataforma o dispositivo: deben revisarse con acceso autorizado y
redacción local, sin volcar logcat o trazas HTTP completas al repositorio.

Usar [plantilla Android](plantilla-evidencia-android.md) y, opcionalmente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/capture-android-evidence.ps1 -Variant Release -CaseId ARCO-ACCESO -Serial SERIAL -Screenshot -Notes "Resultado observado sin datos sensibles"
```

Ocultar notificaciones y no capturar pantallas de contraseñas/códigos. La captura
por sí sola no demuestra el estado HTTP. No hay resultados físicos aprobados aún.

## Resultados locales de esta preparación

| Verificación ejecutada | Resultado |
| --- | --- |
| `npx.cmd tsc --noEmit` | Aprobado, sin errores. |
| `npx.cmd eslint src tests scripts plugins --no-cache` | 0 errores; 10 advertencias existentes en tests. |
| `npm.cmd run test:unit -- --ci --runInBand` | 529 pruebas, 56 suites aprobadas. |
| `npm.cmd run test:integration -- --ci --runInBand` | 171 pruebas, 17 suites aprobadas. |
| `npm.cmd run test:acceptance -- --ci --runInBand` | 29 pruebas, 7 suites aprobadas; HTTP simulado. |
| Regresión completa con LCOV de `src/**/*.{ts,tsx}` | 700 pruebas, 73 suites aprobadas; sin fallos ni casos omitidos. |
| `node scripts/eas-preview.cjs validate` | Aprobado. |
| Comparación JSON de perfiles habituales contra HEAD `131d318` | development, preview y production idénticos. |
| `node scripts/verify-android-release.cjs` | Prebuild sin red aprobado; minify/shrink habilitados, preset optimizado, Release sin HTTP en claro. No ejecuta Gradle ni EAS. |

Regresión contiene unitarias e integración; aceptación es independiente:
**729 pruebas distintas** aprobadas. Se agregaron diez comprobaciones de
configuración/resolución real de URL, sin red. Se conservan los escenarios ARCO
de integración de 401/403/409/412/422, ETag, consentimiento, preferencias,
reautenticación, cancelación idempotente y ausencia de secretos en console.
No son resultados autenticados del backend desplegado.

Cobertura global de regresión: líneas **81.75%** (2442/2987), ramas **81.77%**
(2486/3040). No se cambiaron umbrales ni exclusiones; no se afirma aprobación
remota de SonarQube.

Evidencias locales ignoradas por Git en `coverage/arco-primary/`: logs de tipos,
lint y suites, `jest-{unitarias,integracion,aceptacion,regresion}.json`,
`regresion/coverage-summary.json`, `regresion/lcov.info` y `native-release.log`.
Este último referencia `.expo/android-release-OCov5O/verification.json` y los
archivos nativos generados, con hashes de fuentes y `gradleBuildExecuted=false`.
SHA-256 de `eas.json` verificado por Prebuild:
`c4b8756ab7bc0fe61377a85ea0ec30d68deaa7f36b5e5289939a27a91d8ee8c0`.

Pendientes: build EAS/APK, instalación y recorrido físico Release, creación manual
de la única cuenta, todos los casos autenticados reales, inspección autorizada de
logs nativos/backend y confirmación manual para la cancelación final. Las
verificaciones previas del aviso/PDF/401 se toman de la confirmación del usuario;
no se repitieron en esta tarea. No hubo commit, push, merge, SQL ni cambios backend.

## Referencias de configuración

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/).
- [APK interna con EAS](https://docs.expo.dev/build-reference/apk/).
- [EAS CLI: build / freeze-credentials](https://docs.expo.dev/eas/cli/).
- [Alternativa futura: staging aislado](arco-staging-y-cuentas-sinteticas.md).
