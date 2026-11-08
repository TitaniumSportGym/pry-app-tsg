# Seguridad de datos: inventario para revisión del responsable

Revisión de código del 8 de noviembre de 2026. Borrador para preparar Play Console; no enviar respuestas automáticamente. Se revisaron `package.json`, `src/features`, servicios de autenticación/privacidad, configuración Android y modelos/rutas del backend web. No se inspeccionaron datos de personas, tráfico productivo ni contratos con proveedores.

| Datos observados | Código/uso | Qué confirmar en la declaración |
| --- | --- | --- |
| Identificador, correo, nombre y teléfono | Login/Google, perfil, administración, ARCO y pedidos. | Datos transmitidos por rol, obligatoriedad, finalidades, acceso del personal y retención. |
| Contraseña, OTP, TOTP y JWT | Login y reautenticación por HTTPS; JWT móvil en SecureStore. | Conservación en servidor, metadatos de sesión, registros operativos y protección de secretos. No declarar cifrado de extremo a extremo por usar TLS/SecureStore. |
| Pedidos, pagos, membresías y comprobantes | REST y checkout de Mercado Pago abierto en navegador. | Historial de compras y tratamiento financiero; revisar qué recibe cada proveedor. No se encontró captura móvil directa del número de tarjeta en el flujo revisado; verificar el binario y checkout final. |
| Domicilio y contacto de entrega | `UserAddresses`, snapshots de `OrderFulfillments`, pedidos. | Campos efectivamente usados por el móvil y páginas de checkout abiertas; receptores de envíos, copias históricas y conservación. |
| Rutinas y datos de ejercicio | Funcionalidades de entrenamiento; backend con perfiles y registros físicos/deportivos. | Clasificación real de salud/ejercicio y si cada campo se captura/transmite en esta versión móvil. La presencia de una tabla web no prueba que el móvil recolecte todos sus campos. |
| Consentimientos, preferencias y eliminación | Avisos versionados, recibos, folios, eventos administrativos. | Evidencias, finalidades, responsables y políticas por aprobar. Una solicitud no implica borrado ejecutado. |
| Uso de cámara y contenido QR | `expo-camera`, escaneo administrativo. | Decodificación, módulos transitivos, metadatos y telemetría. No se observó carga de la imagen de cámara desde este flujo JS; eso no prueba ausencia total de tratamiento por SDKs. |
| Actividad y diagnóstico | Backend `BehaviorEvents`: vistas, búsquedas, carrito y rutinas; sesiones con IP/User-Agent, logs y servicios ML. | Qué clientes emiten eventos en producción, campos reales, identificadores, usos derivados, retención, exportaciones y tratamiento por proveedores. |

## Servicios externos identificados

- **Google OAuth:** identidad del proveedor y autenticación. Confirmar datos y permisos del cliente OAuth, así como pruebas con una cuenta sintética verificada.
- **Render / Neon PostgreSQL / Vercel:** API, almacenamiento y web pública. Confirmar regiones, accesos, logs, respaldos, contratos y borrado.
- **Brevo:** correo transaccional de autenticación y reto ARCO. Confirmar destinatarios, contenido, retención y webhooks del proveedor.
- **Mercado Pago:** checkout, pagos y conciliación. Separar datos tratados por la app/backend de los introducidos directamente en el proveedor.
- **Cloudinary:** imágenes/video del sistema y perfiles. Auditar archivos con datos personales y el proceso de borrado/retención externo.
- **Expo/EAS:** compilación y distribución; auditar módulos/transitivos y servicios efectivamente habilitados en el binario. Su presencia no demuestra por sí sola analítica de usuarios.
- Servicios Python/ML, respaldos y exportaciones del backend: determinar si usan identificadores, datos derivados o conjuntos identificables y su política aplicable.

La clasificación entre recolección, compartición, encargados del tratamiento y las excepciones de Play debe revisarse contra el funcionamiento real y los acuerdos. Este inventario no selecciona «no se comparten datos», «no se recopilan datos» ni otra respuesta por defecto.

## Permisos

El Prebuild Release comprueba `CAMERA` e `INTERNET` en el manifiesto main. Cámara se solicita para QR administrativo, con explicación contextual y manejo de denegación. Se conservan bloqueos de micrófono, almacenamiento externo, superposiciones y vibración. No se añaden ubicación, contactos, SMS o notificaciones.

El manifiesto fusionado y los SDKs del AAB todavía requieren inspección: Prebuild no ejecuta Gradle. Revisar también permisos aportados por dependencias, 64 bits y bibliotecas de páginas de memoria de 16 KB.

## Decisiones pendientes

El responsable debe aprobar alcance/finalidades, fundamento y calendario por categoría, tratamiento de respaldos/exportaciones/medios, resolución y comunicación de bajas, datos de revisores y declaración final. La política continúa `pending_approval`; no hay plazos inventados ni eliminación de datos reales en esta tarea.

Fuentes de revisión: [formulario de Seguridad de datos](https://support.google.com/googleplay/android-developer/answer/10787469), [eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111), [páginas de 16 KB](https://developer.android.com/guide/practices/page-sizes). Contrastar de nuevo antes de enviar la ficha.
