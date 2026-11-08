# Titanium Sport Gym: preparación de Google Play

Estado al 8 de noviembre de 2026: código preparado localmente, sin build remoto, submit, despliegues, commits o push. Rama móvil `feature/google-play-release-ready`, desde `origin/develop` (`6babca4`). Backend/web: `feature/google-play-account-deletion`, desde `origin/main` (`ff0b5c5`). Cada historial permanece en su repositorio; el repositorio raíz y el otro worktree no se usan para cambios.

## Configuración preparada

- Nombre visible `Titanium Sport Gym`; paquete `com.titaniumsportgym.app`; mismo icono, slug, scheme y proyecto EAS `e2d585a9-0d83-4bcb-ac53-d1a240ed6e74`.
- Expo SDK 58, Expo Router y MVVM conservados. `production` genera `app-bundle`, usa API `https://server-titanium.onrender.com` y activa ARCO explícitamente.
- Dependencias alineadas con Expo 58.0.23 y React Native 0.88.1 mediante Expo install; Doctor final 20/20. El lockfile conserva la resolución y se verificó otra vez Android.
- `appVersionSource=remote` y `autoIncrement=true`: se incrementa el versionCode remoto al compilar. No se inventó uno local ni se consultó el valor remoto en esta tarea.
- Target SDK 36 explícito mediante config plugin, conservando el compile SDK compatible de Expo; R8, reducción de recursos y política TLS con CAs del sistema. Verificar luego el manifiesto/binario fusionados.
- `development`, `preview` y perfiles ARCO internos preservan su uso. `.github/workflows/eas-preview.yml` permanece intacto.

El móvil recupera los últimos folios del servidor al volver al centro de privacidad. No persiste contraseñas, pruebas o claves de reintento nuevas en almacenamiento. Las pantallas se aíslan por identidad, descartan respuestas tardías y usan la invalidación de sesión existente. Distingue estados `pending_review`, `under_review`, `awaiting_policy`, `rejected` y `completed`; exige contrato coherente para una resolución. Una recepción 202 sigue mostrando revisión pendiente.

La página pública configurada es `https://titaniumsportgym.vercel.app/eliminar-cuenta`, sin tokens o IDs en la URL. Su código está en el proyecto web, pendiente de despliegue autorizado. El backend añade consulta de folios y verificación adicional para cuentas Google sin contraseña; revisar `backend/docs/google-play-account-deletion.md` en ese repositorio.

## Workflow AAB

Archivo nuevo `.github/workflows/eas-production.yml`, exclusivamente `workflow_dispatch`, permisos `contents: read` y exclusión de builds de producción simultáneos.

Calidad instala el lockfile, verifica perfil/proyecto, dependencias Expo/Doctor, Android aislado, ESLint, TypeScript y suites unitarias/integración/aceptación. La comprobación pública del backend exige HTTPS, `/health`, aviso disponible, contrato ARCO v2 con `databaseReady=true` y denegación de consulta anónima. El backend comprueba metadatos del esquema, índice de solicitudes abiertas y trigger de auditoría; no basta con que la ruta exista. Se repite el preflight en el trabajo de build antes de solicitar el AAB. No hace escrituras ni autentica cuentas reales. Las pruebas usan sus fixtures, no datos de producción.

El trabajo de compilación solo se ejecuta tras calidad. Usa `EXPO_TOKEN` desde GitHub Secrets, perfil production y credenciales existentes con `--freeze-credentials`, espera y vuelve a consultar `build:view`. Valida estado `FINISHED`, proyecto, commit, distribución STORE, versionCode y extensión AAB. El resumen contiene el enlace público de la compilación; no publica logs crudos, secretos ni URL firmada del archivo. Verificar formato por metadatos no certifica firma/ABI/16 KB del binario.

No hay auto-submit ni publicación en Play. No se ejecutó este workflow en remoto. Antes de activarlo: desplegar el contrato compatible y la página web mediante otro paso autorizado, configurar el secreto, comprobar permisos/credenciales EAS y revisar Quality Gate del commit.

GitHub requiere que el workflow manual exista en la rama predeterminada para habilitar workflow_dispatch. Incorporarlo mediante un PR revisado/autorizado antes de usar Run workflow y seleccionar la rama a compilar. Esta tarea no realiza ese merge.

Comando de compilación solicitado, **para ejecutar posteriormente con autorización**:

```powershell
npx.cmd eas-cli@latest build --platform android --profile production
```

La variante CI usa además `--non-interactive --freeze-credentials --wait --json`. Si faltan claves se detiene; no genera otras para sortearlo. El secreto no requiere agregar una service account de Play porque no se hace submit.

## Distribución y pruebas cerradas con docentes

1. Revisar el mismo commit en ambas ramas y ensayar migración/contrato en infraestructura aislada. Nunca usar Neon Primary para pruebas destructivas.
2. Después de autorizar un build, conservar hash, proyecto, commit, versionCode, firma y mapping R8. Comprobar targetSdk, permisos fusionados, 64 bits, alineación/16 KB, instalación, QR y segundo factor en dispositivo real. Un AAB no se instala con `adb install`.
3. Subir manualmente el AAB firmado a la pista de pruebas correspondiente en Play Console. Para APK docente fuera de Play, usar el workflow preview existente; no renombrar un AAB a APK.
4. El titular añade por canal privado los correos Google de docentes/testers a su lista o grupo y comparte el enlace de participación de la pista. No guardar correos, contraseñas, JWT o códigos en Git, capturas o workflow.
5. Proporcionar cuentas sintéticas y acceso estable para cada rol a revisar. Explicar OTP/TOTP sin desactivar factores ni compartir datos de usuarios reales. Recoger consentimiento para grabaciones/capturas y redactarlas.
6. Ejecutar login/registro/Google, ARCO, membresías, Mercado Pago en sandbox, catálogo, pedidos/entregas, rutinas, QR y administración. En eliminación: folio, nueva sesión, actualización de estado, cuenta ajena, rechazo y fallos de red; la ejecución destructiva solo en entorno aislado con política sintética.
7. Registrar dispositivo/Android, commit, versión, resultado y evidencia. Revisar pre-launch report, crashes y ANR. Si aplica a la cuenta personal del titular, Google exige prueba cerrada con al menos 12 testers que permanezcan inscritos 14 días consecutivos antes de solicitar producción; confirmar aplicabilidad en Console.

## Checklist antes de publicar

- [ ] Política por categoría aprobada; ejecutor compatible y procedimiento real de resolución, notificación, conservación y borrado de respaldos/proveedores. Actualmente pendiente.
- [ ] Página `/eliminar-cuenta` pública y funcional, aviso coherente con la operación real y acceso sin instalar la app.
- [ ] Backend compatible desplegado, migración autorizada y permisos revisados. El cliente con ARCO activo exige ese orden.
- [ ] Credenciales existentes, titularidad del paquete/EAS/Play y versionCode superior al publicado.
- [ ] AAB firmado probado; targetSdk 36+, permisos efectivos, 64 bits, 16 KB y mapping verificados.
- [ ] Ficha comercial, soporte, capturas, clasificación, público objetivo, anuncios y acceso de revisión aprobados.
- [ ] [Inventario de Seguridad de datos](google-play-data-safety.md) revisado por el responsable y contrastado con tráfico/SDKs reales; ninguna declaración por defecto.
- [ ] Pruebas internas/cerradas y revisión de calidad del commit que se subirá.
- [ ] Revisar los 31 avisos de npm audit con una solución compatible con SDK 58; no aplicar degradaciones forzadas propuestas por npm.
- [ ] Autorización separada de envío y lanzamiento gradual. Esta tarea no publica.

## Validación local

Los resultados exactos y archivos se registran en `docs/google-play-validation.md`. Prebuild comprueba configuración generada sin Gradle; pruebas JS/HTTP simulado no sustituyen Android físico ni el backend desplegado. No se puede declarar la app lista para publicar mientras falte el proceso aprobado de eliminación y la evidencia del binario.

Fuentes consultadas: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [BuildProperties](https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/), [CI con EAS](https://docs.expo.dev/build/building-on-ci/), [versionado remoto](https://docs.expo.dev/build-reference/app-versions/), [EAS CLI](https://docs.expo.dev/eas/cli/), [target API de Play](https://support.google.com/googleplay/android-developer/answer/11926878), [pruebas para cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465). Revalidar requisitos al publicar.
