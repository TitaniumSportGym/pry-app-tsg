# Caja negra Android — Debug y Release

Estado inicial: **todos los casos físicos pendientes**. ADB no detectó dispositivos
en esta sesión. Jest/RNTL y Prebuild no ejecutan estos casos ni demuestran TLS,
firma, permisos efectivos o integridad del APK instalado.

Usar teléfono autorizado, cuentas sintéticas de cliente/entrenador/administrador y
un backend de pruebas confirmado. No pedir códigos de personas reales ni revocar
sesiones de producción. Si solo está disponible Render de producción, limitarse
a recorridos de lectura autorizados; marcar pendientes las operaciones sensibles.

Para cada caso repetir en Debug y Release y anotar: fecha, tester, ID de build EAS,
SHA de fuente, SHA-256 del APK, firma, versionCode, modelo/API Android, backend,
rol, pasos, esperado, observado, resultado y archivo de evidencia. El resultado
predeterminado es PENDIENTE, nunca aprobado por tener una captura.

| Caso | Procedimiento reproducible | Resultado esperado / evidencia |
| --- | --- | --- |
| BB-01 | Instalar APK de la variante, abrir desde el launcher y reiniciar app. | Abre sin cierre nativo; splash termina. Captura de inicio, ID/build/hash. |
| BB-02 | Login con cuenta sintética válida; repetir contraseña incorrecta. | Solo credenciales válidas abren su área; el error no revela detalles ni crea sesión. |
| BB-03 | Cuenta con 2FA: ingresar contraseña y OTP fresco; repetir OTP inválido/expirado. | No hay acceso antes del OTP; no guardar ni capturar el código/token. |
| BB-04 | Recuperación con correo de laboratorio, OTP y contraseña nueva. | Contrato de recuperación completo; sin enumeración de usuarios ni cambio de cuenta real. |
| BB-05 | Tras login válido, cerrar/abrir y verificar perfil. Cerrar sesión y reiniciar. | Persiste sesión válida; tras logout desaparecen datos privados y no reaparece la sesión. |
| BB-06 | Backend de laboratorio devuelve 401 a perfil y a dos consultas simultáneas. | Salida de área protegida, caché limpia y un solo cierre de sesión; reingreso funciona. |
| BB-07 | Backend rechaza JWT expirado, revocado e inválido (incluido 403 `Token inválido`). | Misma invalidación central; nunca imprimir JWT ni extraer SecureStore. |
| BB-08 | Backend devuelve 403 de rol y `MEMBERSHIP_REQUIRED`. | Mensaje de permisos/membresía; conservar sesión. |
| BB-09 | Retrasar petición A, iniciar sesión B y devolver 401 de A. | B conserva credencial/área; sin datos de A. Requiere servidor de pruebas controlado. |
| BB-10 | Login por cada rol y abrir rutas de otros roles mediante enlaces. | Router permite solo el área autorizada; backend también debe denegar. No basta ocultar botones. |
| BB-11 | Admin: Inicio → Pedidos → filtros/búsqueda/páginas → entrega → regresar; Socios y Más. | Totales/búsquedas reales, navegación correcta y ejemplos identificados. Guardados pendientes continúan deshabilitados. |
| BB-12 | Admin: abrir escáner; negar cámara, concederla y negar permanentemente; volver desde ajustes. | Explicación y recuperación sin bloquear otras funciones. Cámara no queda activa al salir. |
| BB-13 | Escanear QR sintético válido, inválido y vencido. | El escáner actual decodifica y evita múltiples lecturas, pero no consulta una API de validación/registro de accesos. Comprobar lectura física; autorización de entrada y vigencia siguen sin integración real y no se dan por aprobadas. |
| BB-14 | Consultar membresías, rutinas/video y catálogo/detalle; filtros y carrito. | Misma funcionalidad por rol y estados vacíos; no crear cobros reales. |
| BB-15 | Checkout Mercado Pago en sandbox aprobado, regreso exitoso/cancelado. | Regreso correcto y estado confirmado por backend. Pendiente sin credenciales sandbox. |
| BB-16 | Cortar red durante consulta, recuperarla y reintentar/refrescar. | Error recuperable, sin falsos éxitos ni logout por una falla de red. |
| BB-17 | ARCO habilitado SOLO en build contra staging confirmado: aviso/versionado y aceptación desmarcada por defecto. | Sin aceptación no se envía; servidor emite recibo y valida versión/hash. Captura de recibo sin PII. |
| BB-18 | Dos ediciones del perfil de prueba usando ETag antiguo/nuevo. | If-Match correcto; conflicto no pisa cambios, refresco recupera el estado. |
| BB-19 | Preferencias opt-out y versión; reabrir. | Persistencia real de la elección, sin interpretar ausencia como consentimiento. |
| BB-20 | Reautenticar con contraseña, OTP/TOTP fresco; prueba vencida y reutilizada. | Servidor aplica vigencia/uso único. No reutilizar OTP del login. |
| BB-21 | Solicitud ARCO de prueba; perder respuesta y reintentar con misma idempotencia; consultar folio. | Una solicitud `pending_review`, sin eliminación automática. Requiere autorización específica en staging. |
| BB-22 | Intentar API HTTP en Release y origen externo, desde fixture de laboratorio. | JS rechaza antes de credenciales y política Android bloquea cleartext. No cambiar `.env` de producción. |
| BB-23 | API HTTPS válida, luego certificado expirado, hostname incorrecto y CA no confiable en servidor de laboratorio. | Válido funciona; inválidos fallan sin botón para ignorar TLS. Prueba nativa, no inferir desde Node/Jest. |
| BB-24 | Proxy de laboratorio con CA instalada por usuario, sin root. Interceptar API. | La app rechaza esa cadena; otras apps/navegador no son evidencia del comportamiento de Titanium. No añadir trust-all/user CA para forzar éxito. |
| BB-25 | Proxy con CA del sistema en dispositivo de laboratorio controlado. | TLS estándar puede confiar en él: pinning NO está implementado. Registrar la limitación, no marcar protección completa. |
| BB-26 | Repetir flujos en APK Release ofuscada. Revisar mapping y crashes. | Sin fallos por reflexión/recursos; mapping corresponde exactamente a ese APK. |

Preparación manual, sin borrado de datos automático:

```powershell
adb devices -l
Get-FileHash -Algorithm SHA256 .\Titanium-release.apk
adb -s SERIAL install -r .\Titanium-release.apk
adb -s SERIAL shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p com.titaniumsportgym.app
adb -s SERIAL shell dumpsys package com.titaniumsportgym.app
```

Debug y Release usan actualmente el mismo identificador: instalar una variante
puede sustituir la otra; firmas distintas pueden impedir `install -r`. No usar
`adb uninstall` ni `pm clear` para resolverlo sin revisar pérdida de datos. Preferir
otro dispositivo/perfil de laboratorio. Expo Go no prueba la configuración nativa
de esta app y no sustituye un Debug/Release propio.

Para Metro con un build Debug preparado:

```powershell
adb -s SERIAL reverse tcp:8081 tcp:8081
npx.cmd expo start --dev-client --localhost
```

Solo Debug admite HTTP a `localhost`, `127.0.0.1` y `10.0.2.2`. No existe excepción
global de LAN ni CA de usuario. El teléfono necesita USB/reverse para Metro;
una conexión LAN HTTP requiere una política específica revisada, no desactivar TLS.

Captura local opcional de un caso ya recorrido:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/capture-android-evidence.ps1 -Variant Release -CaseId BB-11 -Serial SERIAL -Screenshot -Notes "Recorrido de laboratorio; completar resultado observado"
```

El script solo lee metadatos y captura pantalla si se pide; guarda evidencia en
`coverage/security/android/` con resultado pendiente. No instala, borra, cambia
permisos, lee tokens ni toma logcat crudo. Usar datos sintéticos y cerrar
notificaciones antes de capturar. Revisar y redactar PII antes de compartir.

Para errores nativos guardar únicamente stacktrace pertinente y versión del
build; logs completos pueden contener PII. No publicar `mapping.txt` ni material
de firma junto con capturas públicas.
