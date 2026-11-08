# Decisión de transporte y Certificate Pinning

La implementación conserva validación TLS estándar y **no implementa Certificate
Pinning**. HTTPS con `fetch` no demuestra pinning. No se agregan librerías nativas
ni validadores permisivos, trust-all, CA de usuario o excepciones globales Debug.

`api-url-policy.ts` exige HTTPS para API remota en todos los modos y también para
localhost en Release. Debug admite HTTP exclusivamente para localhost, 127.0.0.1
y el puente de emulador 10.0.2.2. La URL base no puede contener credenciales,
fragmentos o query. Todas las peticiones de `apiClient`, incluidas login y OTP,
quedan limitadas al origen configurado antes de leer/enviar credenciales. Un
request público elimina Authorization; uno privado obtiene Bearer de SecureStore.

El plugin CNG `with-network-security.cjs` genera una política Android con
cleartext bloqueado y CA del sistema. Debug añade solo los tres hosts locales.
Release usa la política main sin esas excepciones. No se editan proyectos nativos
a mano. La comprobación de Prebuild verifica manifiesto/XML y preserva R8.
La aplicación en iOS conserva ATS del sistema y la misma política JS; falta
validación binaria iOS, fuera de la matriz Android de esta actividad.

Se solicita `redirect: 'error'` y se rechaza un origen final inesperado. React
Native documenta limitaciones de redirección en fetch nativo: **esta comprobación
posterior no evita ni revierte un redirect que el motor haya seguido**. Confirmar
que endpoints API no redirigen fuera de su origen y probarlo en laboratorio.
La política Android sí prohíbe HTTP; no es una allowlist nativa de hosts HTTPS.
Imágenes, video y navegador de pagos usan sus propios clientes, sin recibir el JWT
del `apiClient`; también requieren pruebas del binario final.

Render administra y renueva automáticamente certificados de `onrender.com` y
dominios personalizados. No existe evidencia de que el proyecto controle las
claves SPKI, su reutilización, dos claves de respaldo ni calendario de rotación.
Extraer el certificado actual y fijarlo crearía un riesgo de dejar versiones
instaladas sin acceso cuando cambie. No se hace esa extracción como configuración
de confianza ni se pinnea una CA pública compartida como sustituto de control real.

Alternativa nativa evaluada: Android Network Security Configuration admite
`pin-set` SHA-256 de claves públicas SPKI sin otra dependencia React Native. Un
config plugin compatible con CNG/EAS puede generar esa política, pero la viabilidad
operativa depende de la infraestructura, no de Expo solamente. En iOS requeriría
una implementación nativa equivalente revisada; no prometer soporte cruzado por
implementar solo XML Android.

Antes de habilitar pinning se necesita:

1. Endpoint TLS bajo control operativo del equipo (por ejemplo un borde/proxy
   controlado), con claves gestionadas y sin fijar el leaf temporal de Render.
2. Pin SPKI activo y respaldo de una clave distinta, disponible para recuperación
   y probada antes de distribuir. No almacenar claves privadas en móvil/repositorio.
3. Rotación solapada: distribuir A+B, comprobar adopción, servir B, distribuir B+C.
   Probar cadenas/intermedios y clientes antiguos antes de cada cambio.
4. Política de expiración explícita: el atributo de expiración de un pin-set puede
   dejar de aplicar los pins; no es una garantía de continuidad segura ni un
   mecanismo silencioso de recuperación aprobado.
5. Plan de emergencia y distribución de un binario nuevo, con firma y canal
   existentes. Un cambio JS/OTA no actualiza por sí solo el pin-set nativo.
6. Pruebas de pin activo, respaldo, rotación, pin incorrecto, reloj/expiración y
   proxy con CA confiable. Sin esas pruebas no declarar pinning aprobado.

Con TLS estándar el riesgo residual incluye un atacante con CA ya confiable en el
sistema/dispositivo comprometido. La CA instalada por usuario no está incluida en
la política Android; demostrar su rechazo requiere teléfono y proxy. Los casos
BB-22 a BB-25 de la matriz siguen pendientes. No se infiere su resultado de un
cliente Node ni de un mock de `fetch`.

Fuentes primarias consultadas para SDK 58 y decisión técnica:

- [Config plugins Expo](https://docs.expo.dev/config-plugins/plugins/).
- [Network Security Configuration Android](https://developer.android.com/privacy-and-security/security-config).
- [TLS y rotación de certificados Android](https://developer.android.com/privacy-and-security/security-ssl).
- [TLS administrado Render](https://render.com/docs/tls).
- [Limitaciones de networking React Native](https://reactnative.dev/docs/network).
- [SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).
