# Auditoría inicial — seguridad API y preparación Android

Auditoría previa a implementar, 7 de noviembre de 2026 (Ciudad de México).
Rama `feature/actividad6-seguridad-api`, árbol inicialmente limpio. HEAD y
`develop` remoto coinciden en `a0a33d4d1d8a58a07de4d9880987546fb0d156cf`.
No es necesario cambiar ramas ni reconstruir el panel administrativo.

| Área | Estado encontrado | Acción o pendiente |
| --- | --- | --- |
| Expo/RN | SDK 58, React Native 0.88, Router, MVVM, Repository/Observer. CNG, sin `android/` ni `ios/`. | Conservar arquitectura; cambios nativos mediante plugin. |
| API | Cliente JSON/FormData y errores tipados existentes. Acepta URL absoluta y agrega Bearer sin comprobar origen. | Validar URL/base, HTTPS Release y origen antes de leer/enviar credenciales. |
| HTTPS | Base configurable; no valida esquema. TLS estándar de `fetch`, sin pinning. | Rechazar HTTP remoto; configuración nativa declarativa sin desactivar TLS. |
| Sesión | SecureStore nativo, memoria en web, restauración mediante perfil. | Conservar. Serializar mutaciones y evitar que un 401 antiguo borre una sesión nueva. |
| 401/403 | 401 y ciertos 403 borran token; hooks cierran sesión. Un consumidor directo puede dejar AuthProvider autenticado. | Invalidación central mediante Observer, cierre de estado/caché y pruebas de concurrencia. |
| JWT | Backend verifica firma y, según middleware, sesión/revocación. No hay endpoint refresh en rutas revisadas. | No inventar refresh ni validar firma JWT en el cliente. Admin `requireAuth` no comprueba la tabla Session: limitación del backend, no corregible desde móvil. |
| ARCO | API/parsers/ViewModels/pruebas para aviso, recibos, ETag, preferencias, reautenticación y folio idempotente. Flag opt-in apagado por defecto. | Mantener. Falta validación conectada con cuentas sintéticas y confirmación de migración/aviso desplegados. |
| R8 | Minify y shrink Release explícitos. APK preview, AAB production y recolección de mapping configurados. | Conservar y verificar proyecto generado. No equivale a probar APK ofuscada. |
| Development | Perfil `developmentClient: true`, sin `expo-dev-client` instalado. | Pendiente instalar versión compatible antes de generar cliente de desarrollo; no afirmar que existe un Debug funcional. |
| Versionado | Android `com.titaniumsportgym.app`, versión 1.0.0, EAS versionado remoto y autoincremento production. | Consultar versionCode remoto y firma existentes antes del build; no generar claves. |
| Permisos | Cámara QR con explicación; grabación audio de cámara desactivada. | Inventariar manifiesto generado/dependencias; verificar el manifiesto fusionado del APK final. |
| Dispositivo | ADB disponible, build-tools 36.0.0; ningún dispositivo en `adb devices -l`. | Matriz Debug/Release y evidencias físicas pendientes. |
| Verificación nativa | El script existente falla en sandbox al crear proceso Node (`EPERM`). | Ejecutar comprobación local aislada con permisos de proceso o documentar limitación; no crear proyecto nativo a mano. |

Backend verificado en GitHub: merge
[`0be5fdeb7ad0d305a21dc3b42264f18060574f53`](https://github.com/CASTROMJRM/pry_TinaniumSportGymWeb/commit/0be5fdeb7ad0d305a21dc3b42264f18060574f53).
Once archivos descargados de ese SHA (rutas, middleware, controladores, servicios,
configuración de aviso, migración y contrato) coinciden con el checkout local
backend `1e5f1bf`. No se modificó ese repositorio ni se conectó a su base de datos.

Las rutas revisadas incluyen `/api/privacy/notice`, `/api/user/profile`,
`/api/user/privacy-consents`, `/api/user/privacy-preferences`,
`/api/auth/reauthenticate`, `/api/auth/reauthenticate/verify` y
`/api/user/account-cancellation-requests`. La migración
`20261104000100-create-arco-privacy.js` existe en Git; esto no prueba su aplicación
en Render. El aviso exige configuración real de versión, hash SHA-256 y URL HTTPS.
La cancelación termina en `pending_review`, no en eliminación automática.

El usuario identificó `https://server-titanium.onrender.com` como backend, pero es
también el host ya configurado en preview; no se ha identificado un staging
distinto ni cuentas sintéticas. Tres GET sin credenciales a aviso, perfil y planes
agotaron 20 segundos. No prueban que las rutas no existan ni que ARCO esté listo.
No se harán escrituras, migraciones ni activación del flag con esa evidencia.

Las evidencias de auditoría se guardan en `coverage/security/` (ignorado por Git).
La evaluación final y las verificaciones posteriores se documentan por separado.
