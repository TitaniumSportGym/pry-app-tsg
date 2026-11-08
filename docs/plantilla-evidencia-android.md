# Evidencia manual Android

Duplicar por caso y variante; completar solo con pruebas efectivamente ejecutadas.
No incluir contraseñas, JWT, OTP, PII real, claves, keystore ni logcat crudo.

| Campo | Valor |
| --- | --- |
| Caso y variante | BB-__ / Debug o Release |
| Fecha/hora/zona y tester | PENDIENTE |
| Build EAS y SHA fuente | PENDIENTE |
| APK SHA-256 y huella de firma | PENDIENTE |
| Package/versionName/versionCode | PENDIENTE |
| Dispositivo/modelo/Android/API | PENDIENTE |
| Backend de pruebas autorizado | PENDIENTE |
| Rol e identificador sintético | PENDIENTE; sin credenciales |
| Precondiciones y datos de prueba | PENDIENTE |
| Pasos exactos | PENDIENTE |
| Resultado esperado | Copiar de matriz y precisar |
| Resultado observado | PENDIENTE |
| Resultado final | NO EJECUTADO / APROBADO / FALLIDO / BLOQUEADO; justificar |
| Captura/video/stacktrace redactado | PENDIENTE |
| Incidencia y reproducción | PENDIENTE |

Para TLS documentar además hostname, caso de certificado (válido/caducado/hostname
incorrecto/CA no confiable), tipo de CA del proxy (usuario/sistema), modo sin root
o laboratorio controlado, y evidencia de que la petición corresponde al proceso
de Titanium. El éxito del navegador o de Node no demuestra el resultado de la app.

Para ARCO registrar versiones/ETag anonimizados, código HTTP, folio sintético e
idempotencia sin incluir la prueba de reautenticación. Confirmar que una solicitud
queda pendiente y no afirmar que el usuario fue eliminado.
