# Certificate Pinning SHA-256: laboratorio Android

Implementación exclusiva de la rama `feature/certificate-pinning-lab`. No cambia
los cinco perfiles habituales, el paquete `com.titaniumsportgym.app`, el backend,
la autenticación, los workflows ni las credenciales de producción.

## Variantes

| Perfil EAS | Nombre | Paquete | Esquema |
| --- | --- | --- | --- |
| `pinning-lab-valid` | Titanium Lab Valid | `com.titaniumsportgym.app.lab.valid` | `titaniumlabvalid` |
| `pinning-lab-invalid` | Titanium Lab Invalid | `com.titaniumsportgym.app.lab.invalid` | `titaniumlabinvalid` |

Son APK Release internas, sin dev client ni incremento automático de versión.
Usan el entorno EAS `development` y perfiles independientes. `APP_VARIANT` y
`TSG_PINNING_LAB_PROFILE` están definidos en el `env` de cada perfil: EAS los
expone tanto al evaluar la configuración local como en el constructor remoto.
Si existe `EAS_BUILD_PROFILE`, debe coincidir; cualquier mezcla con los perfiles
habituales o iOS falla antes de Prebuild. La configuración base es `app.json`.

El plugin genera un `domain-config` para **solo**
`server-titanium.onrender.com`, sin subdominios. Se heredan las CAs del sistema y
la prohibición de HTTP. Se añade un único `pin-set` SHA-256 sin expiración. No hay
CAs de usuario, `debug-overrides`, validadores permisivos ni cambios al trust
manager. En los cinco perfiles habituales, main/debug conservan sus XML originales.

No hay dependencia nueva. Un observador OkHttp generado únicamente para el
laboratorio mantiene el builder estándar de React Native y registra el resultado
nativo de GET `/health`. No registra JWT, cabeceras, cuerpos, queries o respuestas.

## Archivos de la implementación

Modificados:

- `eas.json`: dos perfiles nuevos; los cinco originales conservan todos sus campos.
- `plugins/with-network-security.cjs`: XML y diagnóstico nativo condicionados al laboratorio.
- `scripts/verify-android-release.cjs`: evaluación real de Expo config y matriz de Prebuild.
- `src/app/_layout.tsx`: montaje del panel, que devuelve `null` fuera del laboratorio.
- `src/services/apiClient.ts`: opciones explícitas de cookies y cancelación; los clientes existentes conservan sus valores por defecto.
- `docs/actividad6-tls-pinning.md`: referencia a este laboratorio separado.

Creados:

- `app.config.js` y `config/pinning-lab.cjs`: configuración dinámica y validaciones.
- `config/pinning-lab-public-chain.json`: captura TLS verificada; certificados y pins públicos temporales.
- `plugins/pinning-lab-diagnostics.cjs`: generador del observador Kotlin para ADB.
- `scripts/capture-pinning-lab.cjs` y `scripts/eas-profile-environment.cjs`.
- `src/features/pinning-lab/data/health-check.ts`.
- `src/features/pinning-lab/models/pinning-lab.ts`.
- `src/features/pinning-lab/viewmodels/use-pinning-lab-view-model.ts`.
- `src/features/pinning-lab/views/pinning-lab-panel.tsx`.
- `tests/security/pinning-lab.test.ts` y `tests/security/pinning-capture.test.ts`.
- `tests/integration/pinning-lab.test.tsx` y `tests/acceptance/pinning-lab.acceptance.tsx`.
- `tests/fixtures/eas-before-pinning-lab.json`: copia de los perfiles anteriores para detectar regresiones.
- `docs/certificate-pinning-lab.md`: esta guía.

## Obtener el pin público verificado

Desde la raíz del repositorio, en una red que permita validar el TLS público:

```powershell
node scripts/capture-pinning-lab.cjs
node scripts/capture-pinning-lab.cjs --check
```

La primera orden hace exclusivamente un handshake con SNI, verificación del
hostname y `rejectUnauthorized: true`, usando CAs públicas incluidas en Node.
No envía HTTP ni credenciales. Exporta la clave pública de cada certificado como
**DER SubjectPublicKeyInfo**, calcula SHA-256 y representa los 32 bytes en Base64.
No utiliza la huella SHA-256 del certificado completo.

Guarda `config/pinning-lab-public-chain.json`: contiene únicamente certificados
públicos, metadatos, fecha y pins. El pin positivo corresponde al leaf validado.
El negativo se deriva de un texto de control y se comprueba diferente de TODOS
los SPKI de la cadena observada. No se generan certificados o claves privadas.
`--check` verifica nuevamente Render sin sobrescribir la captura.

La configuración verifica formato, SPKI contra los certificados públicos,
hostname, vigencia y antigüedad máxima de siete días. Esta última es una barrera
explícita al compilar, **no** una expiración Android que desactive el pinning.
Los perfiles habituales no necesitan ni leen esta captura.

Si TLS no se puede validar, no se crea una captura ni se sustituye el pin por uno
inventado. Ambas variantes quedan bloqueadas. Debe resolverse la cadena/red en
una conexión confiable; no usar `NODE_TLS_REJECT_UNAUTHORIZED=0`, una CA de
intercepción como pin de Render ni modificar los indicadores del JSON a mano.

**Captura verificada el 10 de noviembre de 2026:** se creó
`config/pinning-lab-public-chain.json` y `--check` aprobó una segunda conexión.
TLS 1.3 autorizado y hostname correcto, usando únicamente `tls.rootCertificates`,
sin `--use-system-ca`. El leaf de `onrender.com` está emitido por Google Trust
Services WE1. La ruta de confianza se verificó contra la raíz pública GTS Root R4
incluida en Node; no se observaron certificados de Avast o inspección HTTPS.

La cadena presentada contiene un GTS Root R4 firmado por GlobalSign. Se comprobó
que su clave SPKI y subject coinciden con la versión autofirmada de GTS Root R4
del bundle público de Node, y que esta valida la firma de WE1. No se exige que las
huellas del certificado completo de ambas versiones sean iguales. También se
recalcularon todos los hashes a partir de SPKI DER y se comprobó la diferencia del
pin negativo respecto de toda la cadena capturada.

La captura inicial fallaba porque Avast sustituía la cadena por una emitida por
su raíz local. El usuario desactivó temporalmente esa inspección para esta
comprobación; el código de captura mantuvo sus verificaciones TLS intactas.

Render renueva certificados automáticamente y no garantiza aquí claves de
respaldo bajo control del equipo. Una rotación de SPKI exige nueva captura y
nuevos binarios de laboratorio. El pin temporal no debe promoverse a producción
ni sustituirse por una CA pública compartida para eludir esa rotación.

## Verificaciones locales

```powershell
npx.cmd --no-install expo lint --no-cache
npx.cmd --no-install eslint app.config.js config plugins scripts/capture-pinning-lab.cjs scripts/eas-profile-environment.cjs scripts/verify-android-release.cjs tests/security/pinning-lab.test.ts tests/security/pinning-capture.test.ts tests/integration/pinning-lab.test.tsx tests/acceptance/pinning-lab.acceptance.tsx --no-cache
npx.cmd --no-install tsc --noEmit
npm.cmd run test:unit -- --ci --runInBand --watchman=false
npm.cmd run test:integration -- --ci --runInBand --watchman=false
npm.cmd run test:acceptance -- --ci --runInBand --watchman=false
node scripts/verify-android-release.cjs --all-profiles
```

El verificador lee los perfiles reales de `eas.json`, resuelve la herencia y
ejecuta Expo config y Prebuild para cada perfil en copias bajo `.expo/`. No
ejecuta Gradle ni EAS. Comprueba paquete, nombre, esquema, permisos, R8, reducción
de recursos, manifiesto, XML y presencia/ausencia del diagnóstico nativo.
Los resultados permanecen en `verification.json`, `config.log` y `prebuild.log`.
Un perfil bloqueado falla en Expo config antes de generar Android.

La ejecución sin argumentos conserva la verificación de producción que usan los
workflows existentes. También se puede elegir `--profile preview`, por ejemplo.
`--all-profiles` devuelve un código distinto de cero si falta la captura de
laboratorio: no debe presentarse como siete perfiles aprobados.

Las pruebas unitarias usan certificados públicos existentes como fixtures y mocks
de verificación de hostname únicamente dentro de Jest. Nunca los escriben como
captura de Render. Las pruebas de UI usan respuestas simuladas: no prueban TLS ni
el pinning de una APK real.

Resultados del laboratorio del 10 de noviembre de 2026. Las suites completas se
ejecutaron al implementar; tras capturar el SPKI se repitieron ESLint, TypeScript,
la regresión de seguridad del pinning y la matriz de los siete perfiles.

| Verificación | Resultado |
| --- | --- |
| ESLint directo, misma configuración del proyecto, código fuente y archivos nuevos | Aprobado |
| `expo lint --no-cache` | Interrumpido tras quedarse sin salida; no se cuenta como aprobado |
| TypeScript `--noEmit` | Aprobado |
| Suite unitaria, implementación inicial | 63 suites, 633 pruebas aprobadas |
| Integración, implementación inicial | 19 suites, 200 pruebas aprobadas |
| Aceptación simulada, implementación inicial | 8 suites, 30 pruebas aprobadas |
| TLS público, SPKI DER y control negativo | Aprobados; captura y `--check` correctos |
| Expo config y Prebuild de los cinco perfiles originales | Aprobados |
| Expo config y Prebuild de ambos laboratorios | Aprobados; paquetes y pins independientes |
| APK, AAB, compilación Kotlin/Gradle y ejecución Android | No realizados |

El resumen de la matriz queda en `.expo/pinning-lab-matrix.json`. No cambiaron
`app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, los workflows,
los servicios de autenticación/sesión ni las políticas JS de URL.

## Compilar posteriormente, solo con autorización

Antes de solicitar builds: captura verificada, `--check` aprobado, matriz de siete
perfiles aprobada, acceso al proyecto EAS y credenciales de firma existentes y
autorizadas para ambos paquetes de laboratorio. No cambiar las de producción.
Los comandos siguientes congelan credenciales: si faltan, se debe resolver ese
requisito con autorización separada, sin generar claves automáticamente.

```powershell
node scripts/capture-pinning-lab.cjs --check
node scripts/verify-android-release.cjs --all-profiles
npx.cmd eas-cli@latest build --platform android --profile pinning-lab-valid --freeze-credentials --wait
npx.cmd eas-cli@latest build --platform android --profile pinning-lab-invalid --freeze-credentials --wait
```

No usar el workflow actual de preview para solicitar estos perfiles: selecciona
`preview` para esta rama. No se necesita envío a Play ni EAS Update. Los pins
forman parte del binario nativo y no se cambian con una actualización JS.

## Demostración Android y ADB

1. Inspeccionar las APK finales con Android SDK (`apkanalyzer`/`aapt2`): comprobar
   los dos paquetes, `debuggable=false`, el atributo `networkSecurityConfig` del
   manifiesto y el XML compilado `res/xml/titanium_network_security.xml`.
   Confirmar el único hostname, digest SHA-256, pin elegido, ausencia de expiración,
   CAs del sistema y prohibición de HTTP. No basta revisar el XML del Prebuild.
2. Verificar firmas con `apksigner verify --verbose` y registrar el SHA-256 de
   cada APK, perfil y captura. Confirmar otra vez el SPKI remoto con `--check`.
3. Instalar ambas APK; los identificadores distintos permiten coexistir con la
   app original. Usar el mismo dispositivo, red y una ventana corta de tiempo.

```powershell
adb install .\TitaniumLabValid.apk
adb install .\TitaniumLabInvalid.apk
adb logcat -v time -s TitaniumPinningLab
```

En otra terminal, iniciar el control positivo con un proceso nuevo:

```powershell
adb shell am force-stop com.titaniumsportgym.app.lab.valid
adb shell am start -n com.titaniumsportgym.app.lab.valid/.MainActivity
```

Sin iniciar sesión, abrir **Laboratorio TLS** y pulsar **Comprobar conexión**.
La UI debe mostrar HTTP 200. El log debe identificar `HEALTH_START
variant=pinning-lab-valid` y `HTTP_RESPONSE status=200`. `TLS_HANDSHAKE_OK`
también aparece cuando esa llamada abre la conexión; puede faltar si OkHttp
reutilizó una conexión previamente validada. No se permite usar una respuesta de
caché como evidencia: la petición incluye `Cache-Control: no-cache, no-store`.

Repetir con el control negativo:

```powershell
adb shell am force-stop com.titaniumsportgym.app.lab.invalid
adb shell am start -n com.titaniumsportgym.app.lab.invalid/.MainActivity
```

La UI debe mostrar error de conexión. Para atribuirlo al pinning se requiere el
registro **`PIN_VERIFICATION_FAILED`**, cuya cadena de causas contiene
`Pin verification failed`, y ausencia de respuesta HTTP para esa llamada.
`CONNECTION_FAILED` indica otro error o una causa no clasificada y no prueba
pinning. DNS, timeout, servidor dormido, certificados vencidos y respuestas
HTTP 4xx/5xx no son una demostración de rechazo por pin.

Repetir positivo → negativo → positivo y conservar los logs por variante y hora.
Si hay una rotación, `--check` falla o ambos controles fallan, detener el ensayo
y diagnosticar sin debilitar TLS. Rechazar un proxy con una CA de usuario tampoco
prueba pinning: la política normal ya rechaza esas CAs. Expo Go, web, mocks y
Node no sustituyen esta comprobación en el binario Android.

Hasta completar compilación, inspección de APK y esta prueba, el pinning se
considera implementado en configuración pero **no verificado en ejecución**.
Tampoco se declara cobertura de navegadores externos, pagos o iOS.

## Referencias

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/).
- [Variantes y evaluación local/remota](https://docs.expo.dev/build-reference/variants/).
- [Config plugins](https://docs.expo.dev/config-plugins/plugins/).
- [Network Security Configuration](https://developer.android.com/privacy-and-security/security-config).
- [TLS administrado de Render](https://render.com/docs/tls).
- [Verificación dinámica OWASP](https://mas.owasp.org/MASTG/tests/android/MASVS-NETWORK/MASTG-TEST-0244/).
