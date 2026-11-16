# Reemplazo local de deepmerge para Jest

Este paquete privado `@titaniumsportgym/deepmerge-safe@1.0.0` sustituye únicamente
la dependencia `deepmerge` de `jest-config` mediante un override de npm. La
referencia local se declara también como dependencia de desarrollo raíz para
que npm resuelva el archivo relativo de forma consistente en `npm ci`. No es una
versión publicada ni oficial de deepmerge. No se añade una dependencia de runtime
de la aplicación ni se cambia la configuración o API de Jest.

Verificación de la resolución instalada:

```sh
npm ls minimatch glob deepmerge --all
npm explain node_modules/deepmerge
```

Se usa la ruta en `npm explain` porque el paquete instalado tiene el nombre
privado indicado arriba y `deepmerge` funciona como alias. La instalación limpia
y el árbol completo deben terminar sin paquetes faltantes o inválidos.

Se deriva de `deepmerge@4.3.1/dist/cjs.js`, bajo la licencia MIT incluida. Conserva
la función CommonJS, `.all`, concatenación/clonado de arrays, símbolos, Date/RegExp,
elementos React y las opciones `clone`, `customMerge`, `arrayMerge` e
`isMergeableObject`. Jest 30.5.2 usa la función y `.all` al combinar configuraciones.

La diferencia de seguridad es explícita: rechazar `__proto__`, `constructor` y
`prototype` en los dos bucles de copia, escribir propiedades de datos con
`Object.defineProperty` y fallar de forma cerrada si un Proxy impide comprobar
propiedades. El filtrado de esos nombres también afecta a campos legítimos con
esos nombres; no se usan en la configuración del proyecto.

Se reprodujo el cambio de prototipo del objeto retornado con el original 4.3.1
al fusionar un destino sin prototipo. No modificó `Object.prototype` global.
Las pruebas de `tests/security/dependency-security.test.ts` cubren ese caso,
destinos con una clave propia `__proto__`, placeholders y el contrato usado por
Jest. No se trata simplemente de cambiar un número de versión para la auditoría.

Consulta del 15 de noviembre de 2026: npm publica 4.3.1 como última versión de
deepmerge y el aviso GHSA sigue activo en npm/GitHub sin versión corregida.
La discusión upstream incluye una disputa del CVE; se conserva el endurecimiento
real de la operación y no se descarta la alerta manualmente.

Fuentes:

- [Aviso GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
- [Reporte y discusión upstream #273](https://github.com/TehShrike/deepmerge/issues/273).
- [Implementación upstream 4.3.1](https://github.com/TehShrike/deepmerge/tree/v4.3.1).

Mantenimiento: cuando Jest elimine esta dependencia o upstream publique una
corrección verificada, retirar el override y este paquete después de repetir la
regresión de seguridad, las suites completas y `npm audit`. No aplicar un
downgrade de deepmerge para salir del rango del aviso.
