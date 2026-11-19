# Especificación de lanzamiento de MAC Tecnología

> Estado comprobado al 19 de noviembre de 2026: [seguridad, privacidad, GA4 y Search Console](launch-verification.md). Este registro actualiza los puntos históricos que aparecen abajo.

## Producto y arquitectura

El sitio corporativo de MAC Tecnología se dirige a empresas del sur de México y de la Ciudad de México. El lanzamiento debe ofrecer la misma información y el mismo flujo de contacto en español e inglés, permitir consultas reales y medir interacciones con consentimiento.

| Decisión | Requisito |
| --- | --- |
| Diseño y contenido | Conservar Monolito suave, sus colores y fluidez en móvil, la identidad chiapaneca discreta y el tono cercano y práctico. Mantener «Buenas ideas. Tecnología que las hace realidad.», el texto aprobado de Nosotros y la oferta de servicios vigente. Toda mención de clientes, testimonios, resultados o certificaciones requiere evidencia aprobada. |
| Arquitectura | Escribir la lógica en TypeScript estricto y compilarla con esbuild para servir HTML, CSS y JavaScript estáticos desde el repositorio público `craguilar/mac-web`. Mantener la navegación por anclas y `?lang=es` / `?lang=en`. El alcance excluye Flowly y una migración a React o Next.js. El envío del formulario requiere un servicio de contacto independiente del alojamiento estático. |
| Alojamiento | **AWS Amplify Hosting** es la plataforma elegida. Se evaluaron Cloudflare y el alojamiento directo en S3. El único entorno alojado es producción, desde `main`. |
| Dominio | El dominio elegido es `mactecnologia.com.mx`. La puesta en producción depende de confirmar su disponibilidad o titularidad, el control del DNS y la variante canónica (raíz o `www`). |

## Base de implementación

Estado de referencia del 16 de noviembre de 2026. Los resultados de pruebas corresponden a las revisiones indicadas.

| Revisión | Comportamiento disponible |
| --- | --- |
| [`main` en `431cf5a`](https://github.com/craguilar/mac-web/tree/431cf5ae11e2e8d34e4dcfc8411c182f3224016d) | Prototipo bilingüe aprobado. El formulario permite revisar, copiar y editar un borrador en memoria. La página carece de envío de correo, persistencia de mensajes e integración GA4. |
| [PR #1](https://github.com/craguilar/mac-web/pull/1) · borrador en `0dab065` | Incluye el validador de contacto, la política de eventos y el controlador de consentimiento. Los módulos siguen desconectados de la página. El [contrato propuesto](https://github.com/craguilar/mac-web/blob/0dab065535b1e6a21364263cd11f26021d1f835a/docs/analytics-contact-readiness.md) describe las pruebas con un adaptador simulado. |
| [PR #2](https://github.com/craguilar/mac-web/pull/2) · borrador en `df16ffc` | Incluye CI de validación, `amplify.yml` y el control de despliegue por rama y commit. El [procedimiento de Amplify](https://github.com/craguilar/mac-web/blob/df16ffc84c27e644937ed1d073a539e76668a056/docs/launch-runbook.md) describe la configuración pendiente. |

Los dos PR seguían abiertos y sin fusionar en esa revisión. Cada uno reportó 17 pruebas y una compilación local correctas. La validación local conjunta completó 25 pruebas y compiló el sitio correctamente. El [CI de #2](https://github.com/craguilar/mac-web/actions/runs/43752475117) pasó en `df16ffc`.

Actualización del 18 de noviembre de 2026: esos PR ya están integrados. Amplify despliega directamente desde GitHub, con builds automáticos de `main`, pruebas/build propios y vistas previas desactivadas. El job 2 terminó en `SUCCEED` para el commit `3bc6a76c3ff370ce6ac20877aa5a02dad706f030`. La asociación de `mactecnologia.com.mx` está en `AVAILABLE` y la raíz responde HTTP 200 mediante HTTPS. La publicación ya está verificada; la recepción real del contacto y la analítica siguen pendientes de verificación/activación.

## Estado frente al plan original

Evaluación del 18 de noviembre de 2026, basada en el código de `main`, los jobs y dominios de Amplify, la respuesta HTTPS pública y el ruleset activo de GitHub. «Pendiente de verificar» no significa que una configuración externa necesariamente falte.

| Área | Estado comprobado | Trabajo restante |
| --- | --- | --- |
| A. Integración | Los módulos de #1 y #2 están integrados; pruebas y build funcionan. | Conectar las funciones preparadas a la página cuando se implementen los servicios reales. |
| B. CI y alojamiento | CI valida PR; Amplify publica `main`. El dominio y HTTPS funcionan. | Exigir **Test and build (Node 24)** antes de fusionar: el ruleset actual exige una revisión, pero no contiene un check de estado obligatorio. |
| C. Contacto | Implementado envío con Amplify Gen 2, API HTTP, Lambda y SES; destinatario confirmado en configuración AWS. Contrato de cliente/servidor unificado, con estados ES/EN y pruebas simuladas. | Completar bootstrap de CDK, desplegar el cambio y verificar recepción/Reply-To con autorización; seguimiento de rebotes y aviso completo pendientes. No considerar las pruebas simuladas evidencia de entrega real. |
| C. Privacidad | No hay aviso de privacidad publicado en el sitio. | Preparar y revisar el aviso ES/EN con los datos reales del responsable, finalidad, proveedores y tratamiento antes de habilitar la recepción. |
| D. GA4 y consentimiento | Existen una política y un controlador probados, pero están desconectados. No se carga GA4. | Confirmar propiedad/ID y hosts autorizados; integrar aceptar, rechazar y retirar; verificar red y eventos. `generate_lead` requiere entrega real verificada y consentimiento. |
| E. SEO | Hay título y descripción que cambian con JavaScript; el HTML inicial está en inglés. | Resolver metadatos por idioma para indexación y enlaces compartidos; añadir canonical, hreflang, sitemap, robots y una imagen social. Verificar la variante canónica y sus redirecciones. |
| E. Seguridad | HTTPS funciona. La respuesta HTML revisada no incluye CSP, HSTS, X-Content-Type-Options ni Referrer-Policy. | Configurar y probar las cabeceras, CSP y caché con los recursos reales; verificar respuestas para rutas inexistentes. |
| E. Interfaz y accesibilidad | Contenido ES/EN, navegación y pruebas estáticas disponibles. Este cambio retira las etiquetas de prototipo y los comentarios de revisión de diseño, conservando el aviso funcional del formulario. | Completar revisión de teclado/lector de pantalla, Safari/iOS, Chrome/Android y rendimiento en dispositivos reales. Las pruebas locales de layout no sustituyen esa matriz. |
| F. Operación y recuperación | Publicación automática y dominio comprobados. El runbook describe una reversión mediante PR. | Verificar alertas de disponibilidad, errores y gasto, responsables operativos y una prueba real de reversión. Su configuración externa no se ha auditado. |
| G. Campaña | Etapa posterior al lanzamiento funcional; sin evidencia de ejecución en esta revisión. | Confirmar objetivo, oferta, cuenta y presupuesto; preparar campaña y conversiones después de verificar contacto y consentimiento. |

### Selección de idioma actual

`?lang=es` abre español; `?lang=en`, un valor no reconocido o la ausencia del parámetro abren inglés. El selector ES/EN cambia el idioma y actualiza la URL. No consulta el idioma del navegador ni guarda una preferencia entre visitas sin ese parámetro.

La detección del navegador sería una mejora adicional: el plan original exige equivalencia ES/EN, pero no define detección automática. Una política posible es respetar primero el parámetro explícito, después una elección guardada y finalmente el idioma del navegador, con español como fallback para el mercado objetivo. No se implementa esa política en esta limpieza visual.

### Prioridad de trabajo

1. Habilitar contacto real y publicar su aviso de privacidad.
2. Resolver idioma inicial y SEO bilingüe; finalizar la revisión visual y de accesibilidad.
3. Completar cabeceras, CI obligatorio, monitoreo y recuperación.
4. Integrar GA4 con consentimiento y comprobar las conversiones reales.
5. Iniciar la campaña aprobada cuando el recorrido de contacto esté verificado.


## A. Integración y verificación local

Usar el `main` vigente como base y reutilizar los módulos integrados de #1 y #2. Resolver incompatibilidades y probar los cambios juntos antes de fusionar. Esta etapa puede completarse sin credenciales AWS ni despliegues. Conservar el trabajo local y el historial de las ramas durante la integración.

Desde la raíz del repositorio, con Node.js 24 para reproducir el entorno de CI, ejecutar las comprobaciones en cada candidato y en la combinación. La versión de referencia carece de dependencias npm y de archivo de bloqueo.

```sh
npm test
npm run build
git diff --check
```

Para la inspección en navegador se puede servir `dist/` con `python3 -m http.server 8000 --directory dist` y abrir `http://localhost:8000/?lang=es` y `http://localhost:8000/?lang=en`.

**Aceptación.** Registrar los SHA de base y candidatos, las pruebas, el build y las funciones que siguen desactivadas. Contrastar la oferta del README con los textos de servicios aprobados. Actualizar las indicaciones de prototipo cuando se haya verificado la función correspondiente.

## B. Validación antes de publicar

Validar los cambios en GitHub Actions y servir `dist/` localmente para la revisión en navegador. Amplify aloja únicamente `main`, con stage `PRODUCTION` y builds automáticos habilitados. Mantener desactivadas la creación automática de ramas y las vistas previas de PR. La [plantilla opcional de Amplify](../infra/amplify-prod.yaml) reproduce esta configuración para una rama nueva; no es necesaria para la aplicación ya conectada desde la consola.

**Aceptación.** Cada PR supera las pruebas y el build en Node.js 24. El [procedimiento operativo](launch-runbook.md) cubre el alta y la verificación del entorno de producción.

## C. Contacto y privacidad

Decisión: Amplify Gen 2 con una API HTTP, una función Lambda y Amazon SES. El destinatario se configura en la rama main de Amplify; remitente `web@mactecnologia.com.mx`, Reply-To del visitante. No añadir base de datos, autenticación ni autorespuestas. Confirmar responsable de atención y plazo de respuesta antes de publicitar el canal.

| Campo | Contrato unificado |
| --- | --- |
| Nombre | `name` obligatorio, hasta 160 caracteres |
| Correo | `email` obligatorio, hasta 254 |
| Mensaje | `message` obligatorio, hasta 3000 |
| Empresa | `company` opcional, hasta 160 |
| Tema | `topic` opcional: `build`, `architecture`, `delivery` |
| Idioma | `language` obligatorio: `es` o `en` |

La [guía de despliegue](launch-runbook.md) detalla el endpoint, configuración, límites compartidos, fallos ambiguos y las verificaciones de producción pendientes. Mantener el aviso completo de privacidad como requisito; el texto breve de finalidad/proveedores no lo sustituye.

- **Servidor.** Recibir por HTTPS, reutilizar la validación de #1 y aplicar límites de longitud y de tamaño de petición. Validar el origen permitido, bloquear la inyección de cabeceras, limitar la frecuencia e incorporar protección contra abuso además de CORS. Custodiar los secretos en el servidor. Excluir cuerpos de mensajes y datos personales de registros y analítica.
- **Interfaz.** El build local sin backend debe indicar que el envío no está disponible. Mostrar estados accesibles en ES/EN para errores de validación, envío en curso, límite de frecuencia, fallo temporal, tiempo de espera, reintento y éxito. Conservar el texto tras un fallo e impedir envíos duplicados. Mostrar éxito únicamente cuando el servicio de entrega acepte el envío.
- **Privacidad y correo.** Publicar un aviso ES/EN revisado que identifique al responsable, las finalidades, los proveedores, la conservación y el mecanismo para ejercer derechos. Estos datos requieren confirmación. Si se elige SES, comprobar restricciones de sandbox, remitente y dominio verificados, SPF/DKIM/DMARC, rebotes y permisos mínimos.

**Aceptación.** Con datos sintéticos, probar campos inválidos, límites, fallo de red, reintento y doble clic. Para un envío válido, comprobar por separado la aceptación por el servicio y la recepción en el buzón autorizado. Verificar el aviso y los estados del formulario en ambos idiomas.

## D. Analítica con consentimiento

La activación requiere la propiedad GA4, acceso, ID de medición real y lista exacta de hosts HTTPS de producción. Conectar la política y el controlador de #1 a controles ES/EN para aceptar, rechazar y retirar el consentimiento. Rechazar debe ser tan sencillo como aceptar. El contacto debe funcionar en cualquier estado de consentimiento.

| Condición | Resultado verificable en el navegador |
| --- | --- |
| Perfil nuevo, decisión pendiente o rechazo | Cero solicitudes a Google. |
| Desarrollo, vista previa de PR o localhost | Seguimiento desactivado, incluso si existe una preferencia de aceptación. |
| Aceptación en un host autorizado | El adaptador real transmite solo `contact_open`, `service_view` y `language_change` con parámetros enumerados. Revisar la configuración automática y el referente para excluir datos personales, campos libres, consultas y fragmentos de URL. |
| Retirada durante la carga o con eventos pendientes | Cancelar cargas, descartar colas, detener eventos y limpiar las cookies aplicables. Guardar la preferencia con su versión y respetarla al recargar. |
| Vista previa, clic, error o reintento de contacto | Ninguna conversión por estas acciones. Incorporar `generate_lead` solo tras verificar el envío real de la sección C, una vez por envío aceptado y con consentimiento vigente. |

**Aceptación.** Inspeccionar las solicitudes de red en cada condición, incluida una URL con datos sintéticos en la consulta y el fragmento. En el host autorizado, contrastar los eventos permitidos y sus parámetros con los recibidos en la propiedad GA4. La validación previa con el adaptador simulado cubre únicamente el comportamiento local.

## E. Calidad del candidato

| Área | Comprobación de aceptación |
| --- | --- |
| SEO bilingüe | Comprobar título, descripción, canonical, hreflang, sitemap y robots para el dominio confirmado. Resolver los metadatos iniciales en inglés y comprobar la indexación del contenido generado con JavaScript en ambos idiomas. Mantener la arquitectura estática salvo necesidad demostrada. |
| Alojamiento y seguridad | Verificar las cabeceras de seguridad, la CSP y la caché con las fuentes, SVG y formulario reales. Evitar caché prolongada con `immutable` en recursos sin hash. Conservar los errores para rutas inexistentes y excluir una reescritura global a HTTP 200. |
| Interacción y accesibilidad | Probar ES/EN a 320, 390, 768 y 1440 px, Safari/iOS y Chrome/Android. Revisar teclado, foco, contraste, orden de lectura y movimiento reducido. Ejercitar volver/avanzar, cambio de idioma, edición, cierre, doble clic, borrado/deshacer y fallo de red. |
| Artefacto y operación | Comprobar enlaces, recursos, licencias y rendimiento móvil. Inspeccionar `dist/` para descartar secretos y archivos privados. Definir monitoreo de disponibilidad y errores, alertas de gasto y riesgos residuales. |

**Aceptación.** Adjuntar resultados de navegador y móvil al SHA candidato, con las incidencias críticas resueltas y los límites de las pruebas documentados.

## F. Publicación en producción

El único destino de publicación es `main`. Cada push inicia un build mediante la conexión GitHub de Amplify. `amplify.yml` verifica la rama y ejecuta las pruebas y la compilación antes de publicar `dist/`. No se requieren variables de aprobación por SHA ni un rol de despliegue de GitHub. El control de rama rechaza vistas previas de PR.

1. Confirmar cuenta, región, presupuesto y responsables de publicación y reversión. Exigir CI antes de fusionar PR en `main` mediante la protección de la rama. Amplify y GitHub CI se ejecutan de forma independiente tras un push; las pruebas ejecutadas dentro de Amplify condicionan su publicación.
2. Confirmar titularidad o compra autorizada de `mactecnologia.com.mx`, variante canónica, control DNS y certificado. Antes del primer cambio, preparar el plan de DNS y conservar el sitio anterior si existe. La compra del dominio, los cambios DNS y la publicación requieren autorización.
3. Fusionar el candidato revisado en `main` y seguir el build automático en Amplify. Comprobar build, HTTPS, recursos, contacto y consentimiento antes y después del cambio de dominio. Registrar el SHA y el build publicados. Se proponen etiquetas de versión `vX.Y.Z` para identificar las entregas.
4. Probar la reversión a un build conocido o mediante un PR de reversión, preservando el historial de `main`. Volver a verificar la versión servida, HTTPS, navegación y contacto después de restaurar.

**Aceptación.** El dominio canónico sirve el candidato aprobado. El registro de entrega permite identificarlo, reproducir la promoción autorizada y demostrar la recuperación de una versión conocida.

## G. Campaña posterior al lanzamiento

Confirmar objetivo, audiencia de Ciudad de México y Chiapas, oferta, cuenta publicitaria y presupuesto. Preparar anuncios y página de destino coherentes con la oferta, parámetros UTM sin datos personales y conversiones basadas en envíos reales. El piloto requiere aprobación expresa de campaña y gasto.

**Aceptación.** El informe del piloto relaciona inversión, conversiones verificadas, calidad de las consultas y costo. El remarketing queda desactivado por defecto y los clics por sí solos no se contabilizan como ventas.

## Evidencia por cambio

Cada PR de implementación debe tener alcance acotado, criterio de aceptación y pruebas para el comportamiento modificado. Presentar el PR como borrador con el SHA, resultados locales, estado del CI remoto de ese SHA cuando exista, pendientes y riesgos. Marcar como pendientes las comprobaciones sin ejecutar. Para cambios de interfaz o integraciones, incluir evidencia en navegador y casos de fallo.

Actualizar las decisiones y su evidencia al integrar cada cambio, conservando el historial. Mantener credenciales y datos privados de cuenta en el mecanismo seguro del entorno, y los datos de visitantes fuera del repositorio. Los chats, commits y PR deben excluir secretos y datos de formularios. La fusión y la activación de servicios requieren autorización explícita para su alcance.
