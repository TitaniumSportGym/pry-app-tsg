# Certificate Pinning temporal para Google Play Alpha

La implementación está activa en la configuración nativa de la app oficial.
Esta entrega no ejecuta EAS Build ni genera/publica un AAB. La verificación del
binario y su comportamiento en dispositivo quedan para la compilación posterior
a la revisión solicitada por el usuario.

## Resultados del 15 de noviembre de 2026

| Verificación ejecutada | Resultado |
| --- | --- |
| Captura TLS pública nueva y `--check` | Aprobados: TLS autorizado, hostname y cadena pública válidos |
| `--negative-control` sobre otra conexión pública | Pin diferente rechazado por la comparación SPKI en Node; no prueba Android |
| `npm run lint` y ESLint directo de JS/CJS/TS nuevos | Aprobados |
| `npx tsc --noEmit` | Aprobado |
| Unitarias `--ci --runInBand --watchman=false` | 62 suites, 630 pruebas aprobadas |
| Integración `--ci --runInBand --watchman=false` | 18 suites, 190 pruebas aprobadas |
| Aceptación `--ci --runInBand --watchman=false` | 7 suites, 29 pruebas aprobadas, simuladas |
| Prebuild aislado `production` | Aprobado: pin XML y Kotlin idénticos, instalación antes de React Native, targetSdk 36, R8, permisos |
| Backend público sin escrituras | `/health`, `/api/privacy/notice`, `/api/privacy/capabilities`: 200; consulta anónima de cancelación: 401 |
| Consulta EAS `build:version:get`, solo lectura | versionCode remoto 4; siguiente incremento previsto 5 |
| Hook `eas-build-post-install` ejecutado localmente con perfil production/Android | Aprobado mediante otra conexión TLS pública; no solicitó un build |
| Gradle/Kotlin compilado, AAB, firma y pinning en dispositivo | Pendientes de la compilación posterior; no se presentan como verificados |

Evidencia local del Prebuild final en
`.expo/android-release-kDMOAW/verification.json`, `prebuild.log`, XML y Kotlin
generados. Es un proyecto aislado ignorado por Git, no un artefacto compilado.
El manifest generado declara CAMERA/INTERNET y las siete eliminaciones de
permisos del proyecto, incluidas fotos y video. No se inspeccionó el manifest
fusionado de un AAB/APK. No se ejecutó EAS Build ni se cambió firma o contador.

Las pruebas nuevas validan el snapshot real y las firmas de certificados
offline, además de casos de captura antigua/futura/caducada, hostname, cadena
no confiable, hash alterado, laboratorio, permisos y versión. La prueba del
transporte Node simula el socket; las suites de UI y aceptación también usan
simulaciones. Las conexiones públicas realizadas por el script de captura sí
fueron reales. Ninguna de estas pruebas sustituye el ensayo del binario Android.

## Base, identidad y autorización

Rama `feature/certificate-pinning-alpha`, desde el último `origin/develop`
`cc26f97`, con fetch y árbol limpio. Se reutilizaron selectivamente los controles
CNG/EAS de `8dda4a9` y el mecanismo de captura del laboratorio `c1dca61`, sin merge.
Las ramas de laboratorio y de preparación con claves propias permanecen intactas.
La autorización nueva permite expresamente un único pin temporal de Render para
evaluación académica limitada. No se requiere proxy, dominio nuevo ni migración.

Se conservan `com.titaniumsportgym.app`, versión `1.0.0`, proyecto EAS
`e2d585a9-0d83-4bcb-ac53-d1a240ed6e74`, origen HTTPS y rutas REST. `app.json`,
`eas.json`, iconos, splash, dependencias, R8 y permisos bloqueados quedan intactos.
No hay modificaciones en `src/`, incluyendo autenticación, SecureStore, JWT,
roles, membresías, pagos, QR, catálogo, pedidos, rutinas y ARCO. Las pantallas y
los paquetes valid/invalid del laboratorio no se incorporan a la app oficial.

## Pin y procedencia

Host: `server-titanium.onrender.com:443`.

Pin SPKI SHA-256 Base64:

```text
8emdl/UmneUm0I4Y/vHzOTQzb9eJwG4voRHtMdNmBPk=
```

En OkHttp se representa como `sha256/` seguido del mismo Base64.

Captura nueva: **2026-11-16T01:21:00.529Z**, equivalente al 15 de noviembre de
2026 a las 19:21:00 en Ciudad de México. Se hicieron conexiones nuevas adicionales
para `--check` y el control negativo. El pin coincide con el antiguo, pero su uso
se basa en esta verificación nueva, no en reutilizar el archivo del laboratorio.

TLS 1.3 autorizado, hostname validado y certificado leaf de `onrender.com`,
emitido por Google Trust Services WE1. El leaf es válido del 21 de septiembre al
20 de diciembre de 2026. La cadena observada se validó contra el bundle de CA
públicas de Node y GTS Root R4. Su copia pública está en
`config/alpha-pinning-public-chain.json`; no contiene claves privadas ni secretos.
Se ignoran CA locales adicionales al pasar explícitamente `tls.rootCertificates`.
No se observó una cadena sustituida por antivirus o proxy con CA local.

El hash se calcula sobre `certificate.publicKey.export({type:'spki',format:'der'})`,
no sobre el certificado completo. Además de validar TLS con Node al capturar,
la lectura verifica hostname, vigencia de todos los certificados, firmas entre
eslabones, anclaje a una CA pública, coincidencia del SPKI, modo académico y fecha.
Estas comprobaciones offline no sustituyen el handshake público completo del hook.
La raíz cross-signed se reconoce por subject y SPKI de su variante pública de
confianza, o por firma de una raíz del bundle; no por igualar el DER cross-signed
con el de la variante autofirmada.

Solo se fija la clave leaf. Los SPKI de CA/intermedios que figuran como evidencia
de la cadena **no se incorporan al pin-set ni a CertificatePinner**. No hay una
segunda clave propia verificada: `operationalBackup` es `null` deliberadamente.

## Aplicación nativa y rúbrica

Se cumple literalmente la mención de `CertificatePinner` de OkHttp recibida en
la solicitud. El plugin genera `TitaniumCertificatePinning.kt`, que configura
`CertificatePinner.Builder().add(host, "sha256/...")` y lo instala mediante
`OkHttpClientProvider.setOkHttpClientFactory`. Usa
`OkHttpClientProvider.createClientBuilder(applicationContext)`, conservando los
defaults de React Native para cookies, caché y timeouts, sin recursión en la fábrica
ni reemplazo de TrustManager/HostnameVerifier. No se añade otra dependencia.

En RN 0.88.1 instalado, `fetch` → whatwg-fetch → XMLHttpRequest → RCTNetworking
Android → NetworkingModule usa ese proveedor OkHttp. `MainApplication.onCreate`
instala el pinner una sola vez después de `super.onCreate()` y antes de
`loadReactNative(this)`. La plantilla y el orden se comprueban durante Prebuild.
React Native expone OkHttp como dependencia API; el catálogo instalado declara
4.9.2. La versión resuelta y compilación Kotlin definitivas se verifican en el build.

El mismo plugin genera el XML de Android con **el mismo pin y hostname**, sin
subdominios, CAs `system` y HTTP bloqueado en Release. Son dos puntos de aplicación
coherentes de una sola política: el pinner explícito del cliente RN cumple la
mención de OkHttp y el trust manager Android aplica Network Security Configuration
a clientes que usan la confianza del sistema. No hay pins independientes ni
fallback entre mecanismos. Android puede rechazar primero en su verificación de
pins; en ese caso OkHttp no llega a ejecutar la suya.

El pinning no reemplaza la validación de cadena/hostname y no habilita certificados
autofirmados. No cubre iOS, Expo Go, web ni navegadores de pago externos. Clientes
que implementen su propio trust manager requerirían una revisión específica;
el cliente API actual no lo hace. Se conservan las restricciones JS existentes
de origen y redirects; no se amplía su garantía sobre redirects ya seguidos.

## Controles de compilación y Google Play

La configuración es explícita y revisada en Git (`mode: academic-alpha`), sin
variable pública para apagar pins. No existe una ruta sin pin cuando falta la
captura o es inválida. Se rechazan perfiles/flags lab y cambios del origen Release.

La captura tiene una ventana de **24 horas para compilar**. No es una expiración
Android: los usuarios instalados siguen verificando el pin sin caducidad ni
fallback. Tras esa ventana es obligatorio recapturar antes de compilar.

El workflow mantiene todas las comprobaciones anteriores de calidad, permisos,
R8, backend y privacidad. Hace `--check` en calidad y otra vez antes de solicitar
el AAB. El hook `eas-build-post-install` repite la verificación en EAS para los
perfiles Android Release; un fallo de red, cadena, fecha o pin detiene el build.
El workflow no recaptura ni acepta una clave nueva automáticamente.

Se mantienen `appVersionSource: remote`, `autoIncrement: true`, formato
`app-bundle`, proyecto y flujo de firma existentes con `--freeze-credentials`.
La consulta real de solo lectura `build:version:get` devolvió `versionCode: 4`.
El siguiente incremento será 5 si el contador no cambia antes. El workflow vuelve
a consultar el contador antes de construir, exige al menos 4 y rechaza el resultado
si su código no supera 4. No se modificó el contador remoto ni las credenciales.
La firma efectiva, el versionCode del manifest compilado y la instalación como
actualización no se pueden certificar hasta disponer del AAB/APK final.

## Verificación antes del AAB, después de revisar esta entrega

Desde la raíz del repositorio:

```powershell
node scripts/verify-alpha-pinning.cjs --check
node scripts/verify-alpha-pinning.cjs --negative-control
node scripts/eas-production.cjs validate
node scripts/eas-production.cjs backend
node scripts/verify-android-release.cjs
npm.cmd run lint
npx.cmd --no-install tsc --noEmit
npm.cmd run test:unit -- --ci --runInBand
npm.cmd run test:integration -- --ci --runInBand
npm.cmd run test:acceptance -- --ci --runInBand
npx.cmd eas-cli@latest build:version:get --platform android --profile production --non-interactive --json
```

`--negative-control` verifica TLS público y después rechaza un hash de control
distinto de todos los SPKI de la cadena. Es una prueba real de comparación de
SPKI en Node sobre una captura nueva, **no una prueba del pinning Android**.
El control incorrecto nunca se escribe en el snapshot oficial ni en Kotlin/XML.

Si la captura tiene más de 24 horas o cambió la clave, ejecutar explícitamente
`node scripts/verify-alpha-pinning.cjs --capture` desde una red confiable, revisar
la cadena y pin nuevos, repetir los checks y guardar el cambio en otro commit.
Un fallo TLS no debe resolverse modificando flags o aceptando una CA interceptora.

Solo después de la revisión y autorización posterior para compilar:

```powershell
npx.cmd eas-cli@latest build --platform android --profile production --non-interactive --freeze-credentials --wait
```

No añadir auto-submit. Si faltan credenciales, detenerse y resolver el acceso a
las existentes; no generar un proyecto o firma nuevos. Antes de subir a la misma
Alpha, inspeccionar con bundletool/Android APK Analyzer el AAB y los APK derivados:
paquete oficial, versión 1.0.0, versionCode >4, targetSdk 36, no debuggable,
manifest y XML compilados con el pin exacto, HTTP bloqueado, CAMERA/INTERNET y
ausencia de READ_MEDIA_IMAGES/VIDEO y paneles lab. Comparar la firma de carga
del AAB y la firma de los APK de Play con los certificados existentes de Console.

En un dispositivo con Release, usar el cliente API normal: login/registro,
roles, QR, pagos, catálogo, pedidos, rutinas y ARCO. Para el control incorrecto,
usar una compilación de prueba aislada y no distribuida con otro pin, manteniendo
certificado público válido y hostname correctos. Exigir causa nativa específica
`Pin verification failed` o `Certificate pinning failure!`, sin respuesta HTTP.
Un timeout, DNS, HTTP 4xx/5xx, certificado inválido, proxy con CA de usuario o mock
de fetch no demuestra rechazo por pin. No incorporar botones/paneles lab al AAB.

## Renovación y recuperación

Una renovación que conserva el mismo SPKI continúa funcionando. Una rotación de
la clave leaf de Render bloqueará esta versión aunque el nuevo certificado sea
públicamente válido. El equipo no controla esa rotación ni dispone de respaldo
operativo. Esta solución es temporal para evaluación; no ofrece continuidad
equivalente a claves TLS administradas por el equipo.

Monitorizar con `--check`, especialmente antes de cada evaluación. Si cambia la
clave, capturar/verificar de nuevo, actualizar el snapshot y distribuir un AAB
firmado con versionCode mayor por la misma Alpha. Las versiones anteriores
pueden permanecer sin conexión hasta actualizarse. Si se decide volver a HTTPS
estándar, preparar explícitamente otra rama desde la versión oficial sin pinning,
mantener correcciones funcionales, pasar calidad y distribuir otro lanzamiento
firmado con contador mayor al último. No degradar TLS ni apagar pins desde JS
como recuperación automática. EAS Update/OTA no modifica XML ni Kotlin nativos.

## Archivos

Nuevos: `app.config.js`, `config/alpha-pinning.cjs`,
`config/alpha-pinning-public-chain.json`, `plugins/alpha-certificate-pinner.cjs`,
`scripts/verify-alpha-pinning.cjs`, `tests/security/alpha-pinning.test.ts` y esta guía.

Modificados: `plugins/with-network-security.cjs`, `scripts/verify-android-release.cjs`,
`scripts/eas-production.cjs`, `scripts/eas-preview.cjs`, `package.json`,
`.github/workflows/eas-production.yml`, `.github/workflows/eas-preview.yml` y
`docs/actividad6-tls-pinning.md`.

## Fuentes primarias

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/),
  [config plugins](https://docs.expo.dev/config-plugins/plugins/),
  [hooks EAS](https://docs.expo.dev/build-reference/npm-hooks/) y
  [versiones remotas](https://docs.expo.dev/build-reference/app-versions/).
- [CertificatePinner de OkHttp 4.9.2](https://github.com/square/okhttp/blob/parent-4.9.2/okhttp/src/main/kotlin/okhttp3/CertificatePinner.kt).
- [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config).
- [TLS administrado y renovación de Render](https://render.com/docs/tls).
