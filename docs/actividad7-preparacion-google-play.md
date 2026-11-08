# Actividad 7 — preparación técnica, sin publicación

Revisión al 7 de noviembre de 2026. Este documento prepara pasos y decisiones;
no certifica cumplimiento legal, aceptación de Google ni pruebas físicas.

| Criterio | Evidencia actual | Pendiente antes de publicar |
| --- | --- | --- |
| Identidad Android | `com.titaniumsportgym.app`, scheme `pryapptsg`. | Confirmar titularidad del identificador y cuenta de desarrollador. No cambiar package después de publicar. |
| Marca | Versión 1.0.0; nombre técnico `pry-app-tsg`. | Aprobar nombre comercial, ficha, icono, capturas y correo de soporte. |
| versionCode | EAS `appVersionSource: remote`; production `autoIncrement: true`. | Consultar valor remoto real, comprobar que supera lo publicado. No inventar un versionCode local. |
| AAB | Production usa `app-bundle`; preview genera APK interna Release. | Build firmado con credenciales existentes y pruebas internas sobre ese artefacto. |
| Firma | Proyecto EAS configurado, sin claves nuevas generadas. | Confirmar upload key, Play App Signing y recuperación con responsable. No adjuntar keystore, contraseñas o service account al repo. |
| SDK objetivo | Expo SDK 58; proyecto CNG verificado. | Comprobar targetSdk del binario; Google exige API 36 para nuevas apps/actualizaciones desde 31-08-2026. |
| Bibliotecas nativas | R8 y shrink activados; sin dependencias de pinning. | Verificar ABI de 64 bits, compatibilidad de páginas de memoria de 16 KB y todas las dependencias en APK/AAB real. |
| Permisos | Política CNG deja cámara/Internet en manifiesto main generado. | Confirmar manifiesto fusionado y permisos efectivos del artefacto final; no inferirlos solo de app.json. |
| Privacidad | Aviso local y ARCO versionado implementados; flag permanece apagado por defecto. | URL pública aprobada, contenido acorde a producción y recibo/ARCO conectados verificados. |
| Eliminación de cuenta | Solicitud ARCO es `pending_review`, sin borrado automático. | Proceso operativo real, ruta dentro de app y recurso web público para solicitar eliminación, con retenciones justificadas. No declarar cumplimiento solo por recibir un folio. |
| Seguridad de datos | Inventario preliminar abajo. | Responsable confirma finalidades, compartición, SDKs, retención y borrado; no seleccionar respuestas por defecto. |
| Testing | Suites JS y matriz Debug/Release. | Capturas y resultados físicos, pre-launch report y pruebas internas en Play. |
| Acceso de revisión | Roles y OTP existen. | Instrucciones/cuentas sintéticas estables para revisores, sin exponer cuentas reales. |

**Permisos y justificación**

| Permiso | Uso y decisión |
| --- | --- |
| `android.permission.INTERNET` | REST/JWT, catálogo, rutinas, imágenes/video y flujos de pago. Permiso normal, sin diálogo runtime. |
| `android.permission.CAMERA` | Escaneo QR por administrador. Solicitud contextual, explicación en español y manejo de denegación. No se graba audio. |
| `RECORD_AUDIO` | Bloqueado; no hay captura de voz/video con micrófono. |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Bloqueados; el código actual no selecciona/exporta archivos del usuario. Caché interna de imágenes no justifica acceso general al almacenamiento. |
| `SYSTEM_ALERT_WINDOW` | Bloqueado; la aplicación no muestra superposiciones sobre otras apps. |
| `VIBRATE` | Bloqueado; no se encontró uso de Vibration/Haptics en `src`. |

No se añaden ubicación, contactos, SMS, teléfono, notificaciones ni almacenamiento
amplio para cubrir posibles funciones futuras. Si una nueva función los necesita,
debe justificarlos y probarlos de nuevo. El inventario del manifiesto main no
sustituye el merge de manifiestos de dependencias realizado por Gradle.

**Borrador para Seguridad de datos: no enviar sin confirmación del responsable**

| Categoría por revisar | Uso observado en código | Confirmación requerida |
| --- | --- | --- |
| Identificadores y correo | Login, identidad, roles y perfiles por API. | Recolección, obligatoriedad, propósito y conservación. |
| Nombre/teléfono/dirección | Perfil y pedidos/envíos; administrador puede consultar datos de socios/pedidos. | Campos reales de cada rol, acceso del personal y periodo de retención. |
| Historial de compras/pagos/membresía | REST y redirección Mercado Pago. | Qué recibe el backend/proveedor, datos financieros tratados y si constituyen compartición según definiciones de Google. |
| Credenciales/OTP/JWT | Password/OTP por HTTPS, token en SecureStore. | Seguridad y conservación del servidor; no interpretar token cifrado local como cifrado de extremo a extremo. |
| Consentimiento/ARCO | Aviso/versiones, recibos, preferencias, solicitudes. | Producción habilitada, metadatos como IP/User-Agent, retenciones y resolución real. |
| Cámara/códigos QR | Captura para decodificar QR; no se observó carga de fotos en el código actual. | Confirmar comportamiento de Camera/ML Kit, telemetría de SDKs y terceros del binario. No responder «sin recolección» solo por no subir fotos desde JS. |
| Diagnóstico/identificadores de dispositivo | No se añadió SDK analítico en esta tarea. | Auditar SDKs transitivos, builds, logs de backend y herramientas de monitoreo existentes. |
| Datos de salud/ejercicio | Rutinas/membresías del gimnasio. | Responsable determina clasificación y sensibilidad reales de lo tratado; no asumir que todo es solo datos de cuenta. |

Separar recolección de compartición, tratamiento efímero de persistencia y datos
opcionales de obligatorios según las definiciones de Play. Incluir SDKs y servicios
terceros; verificar también contenido abierto en navegador y proveedor de pago.
No declarar «no se comparten datos», «borrado garantizado» o «todo cifrado» sin evidencia.

**Comandos de calidad y preparación local**

PowerShell usa `.cmd` para evitar el bloqueo de `npm.ps1`; no requiere cambiar la
política global de ejecución. Ejecutar desde el repo con dependencias instaladas:

```powershell
npm.cmd run lint
npx.cmd eslint src tests scripts plugins --no-cache
npx.cmd tsc --noEmit
npm.cmd run test:unit -- --ci --runInBand
npm.cmd run test:integration -- --ci --runInBand
npm.cmd run test:acceptance -- --ci --runInBand
npm.cmd test -- --ci --runInBand --coverage --collectCoverageFrom='src/**/*.{ts,tsx}' --coverageDirectory=coverage/security/regresion --coverageReporters=text --coverageReporters=json-summary --coverageReporters=lcov
node scripts/verify-android-release.cjs
node scripts/eas-preview.cjs validate
```

Si el wrapper `expo lint` no termina por restricciones de procesos del entorno,
el comando ESLint directo cubre fuentes, pruebas, scripts y plugins. El script
R8 genera solamente una copia aislada en `.expo`, sin Gradle ni cloud build.
En sandbox necesita permiso para iniciar el proceso Node de Prebuild.

**Builds preparados, no ejecutados aquí**

Primero confirmar backend y variables EAS para cada entorno, credenciales remotas
existentes, versionCode y cuotas. Los comandos siguientes crean builds remotos;
ejecutarlos solo cuando el responsable decida hacerlo, sin `--auto-submit`:

```powershell
npx.cmd eas-cli@latest whoami
npx.cmd eas-cli@latest build:version:get --platform android --profile production
npx.cmd eas-cli@latest build:list --platform android --limit 5
npx.cmd eas-cli@latest build --platform android --profile development --non-interactive --freeze-credentials
npx.cmd eas-cli@latest build --platform android --profile preview --non-interactive --freeze-credentials
npx.cmd eas-cli@latest build --platform android --profile production --non-interactive --freeze-credentials
```

`--freeze-credentials` impide cambios de credenciales en ejecución no interactiva.
Si faltan, detenerse y coordinar con el responsable; no crear otra clave para
superar el error. El perfil development necesita `expo-dev-client` compatible;
consultar su estado final en el informe de esta tarea. Requiere Metro, mientras
preview/production incorporan el bundle Release. Se conserva `eas.json`.

Preview fija actualmente Render; production toma su configuración del entorno
de build. No utilizar el mismo backend real para escrituras destructivas de QA.
No activar `EXPO_PUBLIC_ARCO_BACKEND_ENABLED=true` sin aprobación/configuración
del backend, migración aplicada, aviso aprobado y cuentas de laboratorio.

Descargar desde el build correcto el APK/AAB y artefactos R8 de
`android/app/build/outputs/mapping/release/` (`mapping.txt`, `configuration.txt`,
`seeds.txt`/`usage.txt` cuando existan). Registrar hashes y guardar privadamente.
No afirmar que existe mapping nuevo hasta completar un build Release.

Ejemplo de revisión de APK con Android build-tools instaladas:

```powershell
$tools = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0'
& (Join-Path $tools 'aapt.exe') dump badging .\Titanium-release.apk
& (Join-Path $tools 'aapt.exe') dump permissions .\Titanium-release.apk
& (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs .\Titanium-release.apk
Get-FileHash -Algorithm SHA256 .\Titanium-release.apk
```

Comprobar targetSdk/versionCode/package/firma/ausencia de debuggable y permisos
contra el artefacto. Un AAB no se instala con `adb install`: usar pista interna de
Play o `bundletool` en laboratorio, preservando la firma prevista.

**Publicación manual posterior**

1. Completar pruebas físicas de la matriz y resolver bloqueos de privacidad,
   firma, binario, acceso de revisores y compatibilidad. Verificar Quality Gate
   del commit que efectivamente vaya a publicarse.
2. En Play Console del titular, preparar ficha y contacto, política pública,
   clasificación de contenido, público objetivo, anuncios y acceso a la app.
3. Revisar Seguridad de datos con el responsable y la URL externa de eliminación.
   No prometer eliminación automática si el proceso es una revisión pendiente.
4. Configurar Play App Signing y upload key existentes con el titular. Subir
   manualmente el AAB a prueba interna, revisar avisos y pre-launch report.
5. Invitar testers de laboratorio y conservar evidencia/versiones. Para cuentas
   personales nuevas revisar si aplica prueba cerrada de 12 testers durante 14 días
   consecutivos antes de solicitar acceso a producción.
6. Aprobar notas de versión y un lanzamiento gradual; verificar nuevamente los
   requisitos vigentes en Console. No se ejecuta submit/publicación en esta tarea.

Fuentes primarias consultadas:

- [Target API vigente en Play](https://support.google.com/googleplay/android-developer/answer/11926878).
- [Páginas de memoria de 16 KB](https://developer.android.com/guide/practices/page-sizes).
- [Seguridad de datos](https://support.google.com/googleplay/android-developer/answer/10787469).
- [Requisitos de eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111).
- [Pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465).
- [EAS CLI y freeze-credentials](https://docs.expo.dev/eas/cli/).
- [Versionado remoto](https://docs.expo.dev/build-reference/app-versions/).
- [APK interno con EAS](https://docs.expo.dev/build-reference/apk/).
- [DevClient SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/dev-client/).
