# Actividad 6, criterio 4: ofuscación Android con R8

## Estado y alcance

Configuración implementada en `feature/actividad6-seguridad-privacidad` para Expo
SDK 58. La generación nativa se comprobó localmente con Expo 58.0.19, React Native
0.88.0 y `expo-build-properties` 58.0.12. No se compiló una APK/AAB, no se ejecutó
EAS Build ni se analizó un binario con JADX/MobSF durante esta implementación.

La plantilla `node_modules/expo/template.tgz` ya establece
`android.enableMinifyInReleaseBuilds=true`. Por tanto, R8 estaba habilitado de
forma implícita en la plantilla instalada. La reducción de recursos tenía un
valor predeterminado de `false`. El proyecto no tenía `android/` ni `ios/`:
utiliza Continuous Native Generation (CNG).

## Archivos y configuración

| Archivo | Cambio |
| --- | --- |
| `app.json` | Declara el plugin `expo-build-properties` con minificación y reducción de recursos Release en `true`. |
| `package.json`, `package-lock.json` | Añaden la versión compatible del plugin mediante `npx expo install expo-build-properties`. El plugin requiere actualizar su dependencia transitiva `@expo/schema-utils` de 58.0.2 a 58.0.3. Expo y React Native conservan sus versiones. |
| `eas.json` | Conserva `preview` como APK y `production` como AAB; añade la recolección de informes R8 de Android mediante `buildArtifactPaths`. |
| `scripts/verify-android-release.cjs` | Ejecuta Prebuild en una copia aislada y verifica las propiedades y sus referencias en el Gradle generado. No ejecuta Gradle ni EAS. |
| `.github/workflows/eas-preview.yml` | Añade la comprobación nativa al job de calidad y conserva sus evidencias durante 14 días. El workflow sigue siendo manual y el build depende de que pase calidad. |
| Este documento | Explica la revisión de reglas, las comprobaciones y la evidencia pendiente. |

La configuración del plugin es:

```json
[
  "expo-build-properties",
  {
    "android": {
      "enableMinifyInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true
    }
  }
]
```

La API del plugin corresponde a la
[documentación de Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/).
No se utiliza la opción antigua `enableProguardInReleaseBuilds`.

Prebuild genera estas propiedades en `android/gradle.properties`:

```properties
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

El `android/app/build.gradle` generado contiene:

```groovy
def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()

// Dentro de android.buildTypes.release:
def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
shrinkResources enableShrinkResources.toBoolean()
minifyEnabled enableMinifyInReleaseBuilds
proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
```

Las propiedades hacen que esos valores sean equivalentes a `minifyEnabled true`
y `shrinkResources true` en Release. Android recomienda utilizar ambos con el
[preset de optimización R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization).
El perfil `development` conserva su comportamiento; estas opciones pertenecen
al bloque Release, no al de Debug.

## Revisión de reglas ProGuard

Se conservan las reglas del preset Android, las de la plantilla y las reglas de
consumidor incluidas por las dependencias nativas. No se encontró una necesidad
concreta de añadir `extraProguardRules` o un archivo `.pro` propio al repositorio.
La configuración sí incluye `android/app/proguard-rules.pro`, generado por Expo.

| Dependencia revisada | Evidencia en los paquetes instalados y decisión |
| --- | --- |
| React Native | `ReactAndroid/build.gradle.kts` declara `consumerProguardFiles("proguard-rules.pro")`; sus reglas protegen el bridge, módulos nativos, JNI y elementos anotados. No duplicarlas. |
| Expo y Expo Modules Core | Sus `android/build.gradle` incluyen reglas de consumidor para autolinking, módulos Kotlin, records, vistas y JNI. No añadir `-keep class expo.** { *; }`. |
| `expo-camera` | Su `android/proguard-rules.pro` ya protege los constructores de `ComponentRegistrar` usados por ML Kit mediante reflexión. No añadir reglas generales para CameraX/ML Kit. |
| Expo Router | La navegación JavaScript no se ofusca mediante ProGuard. El módulo nativo utiliza Expo Modules y las pantallas nativas utilizan las reglas de `react-native-screens`. |
| `react-native-screens` | `android/consumer-rules.pro` conserva los nombres de los fragments que necesita restaurar. No reemplazar esas reglas. |
| `expo-image` | Su Gradle incluye reglas de consumidor específicas para Glide y los decodificadores usados. No duplicarlas. |
| `react-native-webview` | Su puente expone métodos anotados con `@JavascriptInterface`, contemplados por las reglas estándar Android. No añadir una conservación de todo el paquete. |
| SecureStore, Crypto, Font, Linking, Symbols y Video | Se revisó su uso como módulos Expo y no se identificó reflexión nativa propia de la aplicación que requiera reglas adicionales. Validar sus funciones en el binario Release. |

No se añaden `-dontobfuscate`, `-dontshrink`, `-dontoptimize`, `-ignorewarnings` ni
reglas que conserven todas las clases. Las reglas heredadas de la plantilla no
se amplían. La lista definitiva de reglas fusionadas solo podrá comprobarse en
`configuration.txt` después de compilar con Gradle/R8.

R8 puede afectar a reflexión o recursos referenciados por nombre. Si la APK
optimizada presenta un fallo, identificar la clase o recurso concreto y añadir
únicamente la regla necesaria; no desactivar globalmente la optimización.
Consultar la [guía de diagnóstico de Android](https://developer.android.com/topic/performance/app-optimization/troubleshoot-the-optimization).

## Verificación reproducible sin build

Con las dependencias instaladas:

```powershell
node scripts/verify-android-release.cjs
npm.cmd run lint -- --max-warnings=0
npx.cmd eslint scripts/verify-android-release.cjs --no-cache --max-warnings=0
npx.cmd tsc --noEmit
npm.cmd test -- --ci --runInBand
npm.cmd run test:acceptance -- --ci --runInBand
node scripts/eas-preview.cjs validate
```

En otras shells se pueden usar `npm` y `npx` sin el sufijo `.cmd`.

El verificador usa la plantilla local de Expo con `prebuild --platform android
--no-install --template <plantilla-local>`, sin red y sin leer `.env`. Copia los
insumos necesarios a `.expo/android-release-<identificador>/`; no copia las
pantallas ni las pruebas, y elimina el `package.json` temporal al terminar para
evitar colisiones con Jest. No crea carpetas nativas en la raíz del proyecto.

Comprueba que las dos propiedades aparecen una sola vez y valen `true`, que
Gradle las usa en Release y que referencia ambos archivos ProGuard. También
verifica que los perfiles no fuerzan Debug ni un comando Gradle distinto, y que
conservan APK/AAB y la ruta de informes.

Conserva en el directorio aislado:

- `verification.json`: versiones, hashes SHA-256 de los archivos de configuración,
  ruta generada y alcance de la comprobación.
- `prebuild.log`: resultado real de generación de Expo.
- `android/gradle.properties`, `android/app/build.gradle` y
  `android/app/proguard-rules.pro`: configuración nativa real generada.

`.expo/` ya está ignorado por Git. El workflow sube únicamente esos cinco tipos
de archivo, no el proyecto nativo completo, `.env`, keystores o código de la app.
Estos archivos demuestran generación de configuración, no ejecución del
optimizador, reducción de tamaño ni funcionamiento de una APK.

### Resultados locales del 4 de noviembre de 2026

| Comprobación | Resultado |
| --- | --- |
| Prebuild aislado y verificador R8 | Aprobados; ambas propiedades y su conexión con Gradle comprobadas. |
| ESLint de Expo y del verificador | Aprobados, sin advertencias. |
| TypeScript | Aprobado (`tsc --noEmit`). |
| Regresión Jest | 49 suites y 385 pruebas aprobadas. |
| Aceptación Jest/RNTL | 4 suites y 17 pruebas aprobadas. |
| Validador EAS preview y YAML del workflow | Aprobados. |

La evidencia final de generación está en `.expo/android-release-Y3W0nZ/`.
Los resultados Jest están en `.expo/actividad6-jest-regresion.json` y
`.expo/actividad6-jest-aceptacion.json`. La ejecución final de regresión conserva
las 49 suites originales, sin copias ni exclusiones nuevas de pruebas.

## Generar posteriormente la APK Release

Estos pasos quedan pendientes y requieren autorizar una compilación EAS:

1. Conservar una revisión identificable de los cambios y completar acceso al
   proyecto EAS, firma y cuota. En CI, verificar el secreto `EXPO_TOKEN` ya usado
   por el workflow. No cambiar las variables de API ni publicar credenciales.
2. Ejecutar las verificaciones anteriores.
3. Solicitar una APK usando el perfil existente:

   ```powershell
   npx.cmd eas-cli@latest build --platform android --profile preview --wait
   ```

   Alternativamente, ejecutar manualmente **EAS preview Android APK** en GitHub
   Actions cuando los cambios estén disponibles allí. El workflow verificará
   primero calidad y generación nativa. Ninguna de estas acciones se ejecutó
   durante esta implementación.
4. Confirmar en EAS que el build está `FINISHED` y descargar la APK de ese build.
   `preview.android.buildType=apk` selecciona `:app:assembleRelease`; no es una
   compilación Debug por llamarse preview. `production` conserva `app-bundle`
   (`:app:bundleRelease`) y su `autoIncrement` actual.
5. Descargar también los artefactos adicionales de la misma compilación:
   `android/app/build/outputs/mapping/release/**`. Guardar `mapping.txt` y
   `configuration.txt` y, si están presentes, `usage.txt`, `seeds.txt` y los
   informes de recursos. `buildArtifactPaths` solicita su recolección; no los
   produce por sí solo ni sustituye el artefacto principal APK/AAB.

Las tareas Release y la recolección de archivos se describen en la
[referencia oficial de eas.json](https://docs.expo.dev/eas/json/).
Los informes de una compilación fallida pueden ser incompletos. Asociar siempre
APK, mapping, logs, revisión y Build ID; conservar el mapping con acceso
restringido porque permite recuperar nombres originales.

## Evidencia posterior para JADX/MobSF

1. Registrar Build ID, perfil, fecha, revisión o hash de configuración y SHA-256
   de la APK descargada:

   ```powershell
   Get-FileHash -Algorithm SHA256 .\evidencia\app-release.apk
   ```

2. Conservar los logs de `:app:minifyReleaseWithR8` y de reducción de recursos
   que reporte esa versión de Gradle. Revisar `configuration.txt` para confirmar
   las reglas realmente fusionadas y `mapping.txt` para identificar cambios de
   nombres concretos. No inventar porcentajes de reducción o tamaño sin medir.
3. Abrir la APK en [JADX](https://github.com/skylot/jadx), inicialmente sin cargar
   el mapping. Por CLI:

   ```powershell
   jadx -d .\evidencia\jadx .\evidencia\app-release.apk
   ```

   Capturar ejemplos reales de nombres transformados y contrastarlos con el
   mapping. Algunas clases conservarán nombres por las reglas necesarias: eso
   no demuestra que R8 esté desactivado.
4. Cargar esa misma APK en una instancia controlada de
   [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF). Conservar el
   informe de análisis estático, el hash, las versiones de las herramientas y
   capturas de los hallazgos de ofuscación/manifest. No se garantiza una
   puntuación ni un resultado específico antes de analizar el binario.
5. Instalar la APK y probar arranque, inicio/cierre de sesión y restauración de
   sesión, navegación, permisos de cámara, lectura QR, linterna, imágenes,
   reproducción de vídeo y WebView. Registrar dispositivo, versión Android y
   resultado; si falla, conservar el stack trace y aplicar el mapping para
   diagnosticarlo. Jest no sustituye estas pruebas de la APK optimizada.

## Límites del criterio y estado pendiente

R8 optimiza y renombra código Java/Kotlin, lo que dificulta la ingeniería inversa;
no impide que JADX abra la APK. No ofusca el código TypeScript/JavaScript, no
cifra la URL pública de la API ni protege por sí solo tokens o secretos. Hermes,
ya habilitado por la plantilla, compila JavaScript a bytecode en Release; tampoco
constituye una barrera absoluta contra el análisis. Véase
[Hermes en React Native](https://reactnative.dev/docs/hermes).

| Requisito de la rúbrica | Estado |
| --- | --- |
| Configuración Android Release optimizada | Generación nativa comprobada; ejecución de Gradle pendiente. |
| `minifyEnabled true` | Propiedad y referencia Gradle comprobadas mediante Prebuild real. |
| `shrinkResources true` | Propiedad y referencia Gradle comprobadas mediante Prebuild real. |
| Reglas ProGuard | Preset, archivo generado y reglas de dependencias revisados; configuración fusionada pendiente del build. |
| Evidencia anti-descompilación | Configuración nativa disponible; APK, logs R8, mapping, JADX/MobSF y pruebas en dispositivo pendientes. |

No se modificaron backend, URL de API, JWT, pantallas, funciones, umbrales de
SonarQube ni versiones de Expo/React Native. No se ejecutaron commit, push o
merge. Este criterio no debe presentarse como validado en binario hasta completar
las evidencias pendientes.
