# Correcciones de los 17 hallazgos de SonarQube Cloud

Validación local del 27 de octubre de 2026 en `fix/sonarqube-issues`, basada en
`59a7ae37aa02c2e1e3e463a47996a6525317e9df`. Al comenzar, el árbol estaba limpio y
`HEAD` coincidía con `develop`. No se realizaron commits, push ni merge.

Los cambios están comprobados en código y pruebas locales. **El cierre de los
hallazgos en SonarQube Cloud está pendiente del siguiente análisis remoto**;
no se ejecutó el scanner ni se consultaron los identificadores de los issues.
La numeración siguiente corresponde a los 17 problemas descritos en la solicitud.

## Hallazgos y evidencia

| N.º | Hallazgo original | Corrección aplicada | Evidencia local |
| --- | --- | --- | --- |
| 1 | `checkout.ts`: alternativa con `Math.random()` para idempotencia | Se utiliza exclusivamente `randomUUID()` de `expo-crypto`. Se conserva el mapa por firma y su invalidación explícita. Un fallo criptográfico se propaga, sin crear una clave insegura. | `checkout.test.ts`: UUID devuelto por el proveedor, reutilización, firmas diferentes, renovación y fallo/reintento. Integración de compra: conserva la misma clave después de un fallo de red. |
| 2 | `_layout.tsx`: rechazo de `preventAutoHideAsync()` sin gestionar | Se añade `catch` con diagnóstico; la llamada permanece a nivel de módulo y no bloquea el montaje. | `tests/splash/root-layout.test.tsx`: rechazo nativo y navegación montada; también permite continuar ante un error de fuentes. |
| 3 | `app-splash-screen.tsx`: rechazo de `hideAsync()` propagado por `finally` | Se gestiona el rechazo antes de `finally`; la animación personalizada puede continuar aunque falle el ocultamiento nativo. | `app-splash-screen.test.tsx`: éxito/rechazo, espera de sesión, tiempo mínimo, layout único y web. |
| 4 | `env.ts`: eliminación de barras con retroceso excesivo | Recorrido desde el final y `slice`, sin expresión regular. | `env.test.ts`: trim, URL/ruta, barras internas/finales, configuración ausente/vacía y cadenas de hasta 200 000 caracteres. |
| 5 | `auth-validation.ts`: expresión de correo con retroceso excesivo | Búsqueda de `@`, último punto y ausencia de espacios con recorridos lineales. Se conserva el formato permisivo existente. | `auth-validation.test.ts`: normalización, formatos aceptados previamente, inválidos, espacios Unicode y entradas largas; códigos OTP de longitud fija y ceros iniciales. |
| 6 | `membership.ts`: expresión para separar miles | Delega a `formatMxnAmount(amount, true)` y agrupación lineal compartida. | Pruebas existentes de membresías y `money.test.ts`; conserva la omisión de `.00`. |
| 7 | `payment.ts`: expresión para separar miles | Delega a `formatMxnAmount(amount)`. | Pruebas existentes de pagos y `money.test.ts`; conserva dos decimales. |
| 8 | `product.ts`: expresión para separar miles | Delega a la misma utilidad monetaria. | Pruebas existentes de productos y `money.test.ts`; conserva dos decimales. |
| 9 | `memberships-repository.ts`: objeto literal como valor predeterminado | Fuente predeterminada extraída a una constante tipada del módulo. | `repository-factories.test.ts`: API predeterminada, inyección, TTL de 10 minutos y aislamiento de sesión. |
| 10 | `payments-repository.ts`: objeto literal como valor predeterminado | Misma extracción, manteniendo Factory y Repository. | Pruebas de factories: TTL de 1 minuto, force, error/reintento, invalidación y Observer. |
| 11 | `products-repository.ts`: objeto literal como valor predeterminado | Misma extracción sin mover datos a la constante. | Pruebas de factories: TTL de 5 minutos, caché compartida entre instancias y conservación del catálogo al invalidar pagos. |
| 12 | `trainer-repository.ts`: objeto literal como valor predeterminado | Fuente con sus cuatro funciones extraída a una constante tipada. | Pruebas de factories: TTL de 2 minutos e inyección; integración de pantallas de entrenador. |
| 13 | `routines-repository.ts`: objeto literal como valor predeterminado | Misma extracción; se conserva la lectura de detalles desde la lista y la invalidación. | Pruebas de factories: TTL de 5 minutos. `routines-repository.test.ts`: detalle desde lista, force e invalidación. |
| 14 | `authService.ts`: función con el mismo valor en todos sus retornos | La función es `login`: tanto la rama `twoFactorRequired === true` como el final devolvían `response`. Ahora sólo se guarda el token si no se exige doble factor y existe `accessToken`, y se devuelve la respuesta una vez. | `tests/auth/authService.test.ts`: login normal, doble factor con/sin token, respuesta sin token/token vacío, doble factor desactivado y errores HTTP/almacenamiento. Se devuelve el mismo objeto del backend. |
| 15 | Rendimiento de `AppButton`: prueba sin aserciones | En cada ejecución medida se comprueba que el botón de inicio de sesión existe y está habilitado. | Reassure: escenario aprobado y un render por ejecución. |
| 16 | Rendimiento de `AppInput`: prueba sin aserciones | Se comprueba el valor escrito, `secureTextEntry` y el último valor enviado a `onChangeText`. | Reassure y RNTL: escenario aprobado y tres renders por ejecución. |
| 17 | Rendimiento de `PasswordRequirementsView`: prueba sin aserciones | Se comprueban cinco requisitos cumplidos y ninguno pendiente para la contraseña segura. | Reassure: escenario aprobado y un render por ejecución. |

La utilidad compartida elimina también la duplicación del redondeo y del formato
monetario. Las pruebas conservan salidas existentes para cero, negativos,
redondeos, importes grandes y valores no finitos, además de agrupar cadenas de
miles de dígitos. No se endureció la validación de correo ni se cambiaron los
resultados de las funciones monetarias para aprovechar esta corrección.

Los cinco repositorios se prueban con una petición del usuario A pendiente,
cierre de sesión, inicio del usuario B y respuesta tardía de A: esa respuesta no
sobrescribe la caché de B. Se conservan el Singleton de caché, los eventos de
sesión, las interfaces, la inyección y las funciones Factory.

## Dependencia

Se añadió únicamente `expo-crypto: ~58.0.7`, instalado mediante
`npx expo install expo-crypto`. Coincide con la recomendación del SDK 58 en
`expo/bundledNativeModules.json` y la
[documentación oficial de Crypto para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/).
`npx expo install --check` terminó con código 0: dependencias actualizadas.
El lockfile sólo cambia la dependencia raíz y la entrada nueva de `expo-crypto`;
no se actualizaron versiones de otros paquetes.

Se incorporó un mock de infraestructura Jest que usa el UUID criptográfico de
Node, porque el mock nativo generado por Expo devuelve `undefined` para
`ExpoCrypto.randomUUID()`. Las pruebas unitarias de checkout sustituyen ese
proveedor explícitamente para comprobar también errores y reutilización.

## Resultados reales de verificación

| Comando | Resultado | Suites | Pruebas |
| --- | --- | --- | --- |
| `npm run lint` | Código 0, sin errores ni advertencias | — | — |
| `npx tsc --noEmit` | Código 0, sin errores | — | — |
| `npm run test:unit -- --ci --runInBand` | Código 0 | 36/36 | 271/271 |
| `npm run test:integration -- --ci --runInBand` | Código 0 | 10/10 | 75/75 |
| `npm run test:acceptance -- --ci --runInBand` | Código 0 | 4/4 | 17/17 |
| `npm test -- --ci --runInBand` | Código 0 | 46/46 | 346/346 |
| `npm run test:perf -- --baseline --branch develop` | Código 0 | 1/1 | 3/3 |
| `npm run test:perf -- --branch fix/sonarqube-issues` | Código 0 | 1/1 | 3/3 |

Los conteos de unitarias e integración se incluyen en la suite completa, por lo
que no deben sumarse. Aceptación y rendimiento usan descubrimiento separado.
También se ejecutó ESLint explícitamente sobre los archivos cambiados dentro
de `tests/`, ya que `expo lint` se concentra en los directorios de la aplicación.
Las últimas correcciones de formato/mock se verificaron con las dos suites de
checkout y layout: 8/8 pruebas aprobadas. `git diff --check` pasó.

En Windows se utilizaron `npm.cmd` y `npx.cmd`, porque la política local impide
ejecutar los wrappers PowerShell. No se modificó esa política.

La primera comprobación, previa a las correcciones, encontró dos dependencias
ausentes en `node_modules`: `expo-video` y `react-native-webview`; Jest pasó
40 suites/251 pruebas y una suite no pudo cargar. ESLint y TypeScript también
detectaron esos módulos ausentes y TypeScript encontró rutas generadas antiguas.
Se restauró la instalación con `npm ci` y se regeneraron los tipos mediante
`npx expo customize tsconfig.json`, como en CI, sin cambiar archivos de rutas.
Para descargar paquetes fue necesario `NODE_OPTIONS=--use-system-ca` en el
proceso de instalación: se usó el almacén de confianza de Windows y se mantuvo
la verificación TLS.

Los logs de los seis comandos obligatorios y sus códigos están en
[`coverage/sonarqube-fixes/results.json`](../coverage/sonarqube-fixes/results.json)
y los archivos `.log` del mismo directorio. Son artefactos locales ignorados.

## Rendimiento

Se siguió el procedimiento de Reassure configurado en CI: medición base y
medición actual con comparación. Se conservaron los archivos anteriores de
`.reassure/` en un subdirectorio `before-sonarqube-*` antes de generar resultados.

La línea base se tomó con los tres escenarios originales y los componentes
medidos sin modificaciones; `HEAD` y `develop` tenían el mismo hash. Ya estaban
aplicándose otras correcciones ajenas a esos componentes. No se cambió de rama.
Los escenarios actuales añaden aserciones y el callback de entrada; ambas
mediciones usan 10 ejecuciones y una de calentamiento por escenario.

| Escenario | Duración media base → actual | Renders base → actual |
| --- | --- | --- |
| AppButton | 1.4 → 1.1 ms | 1 → 1 |
| AppInput | 2.0 → 2.0 ms | 3 → 3 |
| PasswordRequirementsView | 1.7 → 1.5 ms | 1 → 1 |

Reassure no reportó aumentos del número de renders, problemas de renderizado,
ni escenarios añadidos o eliminados. Las reducciones de duración son mediciones
locales; no demuestran una mejora de la aplicación en un dispositivo físico.
Informe completo: [`.reassure/output.md`](../.reassure/output.md).

## Archivos cambiados

Código de aplicación:

```text
src/app/_layout.tsx
src/components/splash/app-splash-screen.tsx
src/config/env.ts
src/features/authentication/models/auth-validation.ts
src/features/memberships/models/checkout.ts
src/features/memberships/models/membership.ts
src/features/memberships/repositories/memberships-repository.ts
src/features/payments/models/payment.ts
src/features/payments/repositories/payments-repository.ts
src/features/store/models/product.ts
src/features/store/repositories/products-repository.ts
src/features/trainer/repositories/trainer-repository.ts
src/features/training/repositories/routines-repository.ts
src/services/authService.ts
src/utils/money.ts (nuevo)
```

Pruebas e infraestructura de pruebas:

```text
src/components/splash/app-splash-screen.test.tsx (nuevo)
src/config/env.test.ts (nuevo)
src/core/repository/repository-factories.test.ts (nuevo)
src/features/authentication/models/auth-validation.test.ts
src/features/memberships/models/checkout.test.ts
src/utils/money.test.ts (nuevo)
tests/auth/authService.test.ts
tests/performance/auth-components.perf-test.tsx
tests/setup/expo-crypto.ts (nuevo)
tests/splash/root-layout.test.tsx (nuevo)
```

Dependencias y documentación:

```text
package.json
package-lock.json
docs/sonarqube-fixes.md (nuevo)
```

## Límites y revisión pendiente

- Falta ejecutar el análisis remoto de SonarQube Cloud y confirmar los 17
  hallazgos y el Quality Gate. No se modificaron reglas, exclusiones, workflows
  ni configuración de SonarQube.
- Las pruebas de autenticación, navegación y compra usan límites de
  infraestructura simulados. No se realizó un pago real, una autenticación
  Google real ni una prueba de APK/dispositivo. El splash se verificó con
  animaciones controladas en Jest; su aspecto nativo debe comprobarse en una
  compilación de lanzamiento, como recomienda
  [Expo SplashScreen](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/).
- Si la API criptográfica no está disponible, la compra falla con el manejo de
  error existente en lugar de generar una clave insegura. En web se requiere un
  contexto seguro para las funciones criptográficas. Las compilaciones nativas
  deben incluir la nueva dependencia antes de distribuir este cambio.
- `npm audit` reportó cuatro entradas de severidad alta en el árbol existente:
  `node-forge`, `zod`, `@expo/cli` y `expo` (las dos últimas por propagación).
  Ninguna corresponde a `expo-crypto`; las versiones previas se conservaron.
  Requieren revisión de dependencias aparte de los 17 hallazgos solicitados.
- La validez sintáctica permisiva de los correos y las salidas históricas para
  importes no finitos se conservan deliberadamente. Cambiarlas necesitaría una
  decisión funcional adicional.

No se modificaron endpoints, contratos del backend ni la integración de Mercado
Pago. Se mantuvieron MVVM, Singleton, Factory, Repository y Observer, sin
cambios de diseño visual.
