# Especificación de lanzamiento de MAC Tecnología

## Producto y arquitectura

El sitio corporativo de MAC Tecnología se dirige a empresas del sur de México y de la Ciudad de México. El lanzamiento debe ofrecer la misma información y el mismo flujo de contacto en español e inglés, permitir consultas reales y medir interacciones con consentimiento.

| Decisión | Requisito |
| --- | --- |
| Diseño y contenido | Conservar Monolito suave, sus colores y fluidez en móvil, la identidad chiapaneca discreta y el tono cercano y práctico. Mantener «Buenas ideas. Tecnología que las hace realidad.», el texto aprobado de Nosotros y la oferta de servicios vigente. Toda mención de clientes, testimonios, resultados o certificaciones requiere evidencia aprobada. |
| Arquitectura | Escribir la lógica en TypeScript estricto y compilarla con esbuild para servir HTML, CSS y JavaScript estáticos desde el repositorio público `craguilar/mac-web`. Mantener navegación por anclas, español en `/` e inglés en `/en/`; conservar compatibilidad con enlaces antiguos `?lang=es` / `?lang=en`. El alcance excluye Flowly y una migración a React o Next.js. El envío del formulario requiere un servicio de contacto independiente del alojamiento estático. |
| Alojamiento | **AWS Amplify Hosting** es la plataforma elegida. Se evaluaron Cloudflare y el alojamiento directo en S3. El único entorno alojado es producción, desde `main`. |
| Dominio | `mactecnologia.com.mx` es el host canónico HTTPS; `www.mactecnologia.com.mx` redirige con 301 y conserva la ruta. |

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

Evaluación del 19 de noviembre de 2026: el [PR #16](https://github.com/craguilar/mac-web/pull/16) está integrado en `fa39d9d` y publicado mediante el job 12 de Amplify (`SUCCEED` en build, deploy y verify), con 55 pruebas correctas. Se verificaron HTML ES/EN, sitemap, robots e imágenes mediante HTTPS. El [PR #17](https://github.com/craguilar/mac-web/pull/17) registra la corrección de la regla 404 comprobada contra Amplify. El propietario confirmó la recepción del formulario real tras el job 11 y la notificación de prueba SNS. Esa confirmación no documenta todavía la comprobación de Reply-To ni la matriz de dispositivos. «Pendiente de verificar» no significa que una configuración externa necesariamente falte.

| Área | Estado comprobado | Trabajo restante |
| --- | --- | --- |
| A. Integración | Formulario, validación compartida, Turnstile y backend de contacto conectados; tipos, pruebas y build pasan. | Mantener la regresión del contacto al incorporar funciones nuevas. La activación y recepción de eventos de analítica siguen pendientes en D. |
| B. CI y alojamiento | Amplify publica `main`; job 12 correcto. El ruleset activo **Required CI for main** exige **Test and build (Node 24)** antes de fusionar. PR y restricciones de actualización de `main` también están activos. | Mantener estas reglas y verificar una reversión controlada. |
| C. Contacto | Amplify Gen 2, API HTTP, Lambda y SES desplegados; Turnstile configurado y secreto cifrado de la rama. El propietario confirmó recepción real. La API rechaza una petición sin token con 403 y la preflight permite POST desde los dominios aprobados. | Comprobar Reply-To, responsable y plazo de atención; añadir seguimiento de rebotes/quejas de SES. |
| C. Privacidad | Hay un texto breve ES/EN sobre finalidad y proveedores; falta el aviso completo revisado. | Prioridad inmediata: preparar y publicar el aviso ES/EN con datos reales del responsable, conservación y mecanismo de derechos. El contacto ya está habilitado. |
| D. GA4 y consentimiento | Interfaz ES/EN, preferencia versionada, carga después de aceptar y revocación implementadas; pruebas de DOM y proveedor simulado pasan. Producción mantiene `enabled:false`, sin cargar Google. | Crear propiedad/flujo GA4 y obtener `G-…`; desactivar Medición mejorada, configurar Amplify y verificar red y recepción Realtime. `generate_lead` representa aceptación por la API/SES, no una venta. |
| E. SEO | HTML completo ES en `/` y EN en `/en/`, canonical/hreflang, metadatos sociales, sitemap, robots e imágenes 1200 × 630 publicados. `www` redirige al host canónico. | Verificar dominio y enviar sitemap en Search Console; comprobar indexación. Repetir pruebas HTTP de redirects tras cambios de alojamiento y su invalidación de caché. |
| E. Seguridad | HTTPS funciona. La respuesta HTML del 19 de noviembre no incluye CSP, HSTS, X-Content-Type-Options ni Referrer-Policy. | Configurar y probar las cabeceras, CSP y caché con Turnstile y la API reales; verificar respuestas para rutas inexistentes. |
| E. Dependencias | Dependabot reporta 10 alertas abiertas en `package-lock.json`: 2 críticas, 5 altas y 3 medias; todas clasificadas como dependencias transitivas de desarrollo. Afectan Handlebars, GraphQL Tools, Immutable, Lodash y Minimatch. | Priorizar revisión de exposición y actualización de la cadena de herramientas. Validar instalación, tipos, pruebas, síntesis y build. La clasificación de desarrollo no sustituye una revisión de explotabilidad; esta auditoría no hizo esa revisión. |
| E. Interfaz y accesibilidad | Revisión de código: formulario de una columna en móvil, campos de 16 px y Turnstile compacto. La herramienta de navegador falló antes de abrir la página; no hay aprobación visual móvil en esta revisión. | Probar Safari/iOS, Chrome/Android, teclado, lector de pantalla, zoom, errores y rendimiento; documentar tamaños y resultados. |
| F. Operación y recuperación | Alarmas de API desplegadas y en `OK`: al menos 3 respuestas 5xx en 5 minutos y más de 60 peticiones en 15 minutos. Suscripción SNS al mismo buzón de contacto confirmada; el propietario confirmó recepción de la notificación TEST. El runbook describe la reversión por PR. | Probar de forma controlada el disparo de alarmas: la prueba SNS verificó el canal de correo, no los umbrales. Añadir monitoreo de disponibilidad, rebotes/quejas y gasto; definir responsables y ensayar reversión. Las alarmas de API no acreditan entrega final de SES. |
| G. Campaña | [Borrador Search en español](seo-analytics.md#primera-campaña-propuesta-pendiente-de-cuenta-y-presupuesto) con grupos, palabras, negativas y textos. No hay anuncios creados ni gasto autorizado. | Confirmar cuenta, presupuesto mensual y ubicaciones; verificar integración y consentimiento específicos de Ads. GA4 por sí solo no acredita atribución publicitaria. |

### Selección de idioma actual

Español en `/`, inglés en `/en/`, según la elección del propietario. El selector usa enlaces reales y conserva el borrador en memoria al cambiar de idioma. Los enlaces antiguos `?lang=es` / `?lang=en` se reconocen y tienen reglas 301 hacia las rutas canónicas. No se aplica detección automática del navegador ni se guarda una preferencia de idioma.

### Prioridad de trabajo

1. Comprobar Reply-To y el formulario en móvil. Publicar el aviso de privacidad con datos aprobados; el canal de correo para alertas ya está verificado.
2. Resolver las alertas de dependencias, priorizando las críticas/altas de la cadena de herramientas. Añadir cabeceras de seguridad compatibles con Turnstile y el endpoint; completar accesibilidad y rendimiento.
3. Crear GA4, activar la integración de consentimiento ya implementada y comprobar eventos reales. Verificar Search Console y enviar el sitemap; el idioma inicial y el SEO técnico bilingüe ya están resueltos.
4. Completar monitoreo de disponibilidad, rebotes/quejas, presupuesto y recuperación. Revisar por separado la actualización mayor de TypeScript del [PR #11](https://github.com/craguilar/mac-web/pull/11); sigue pendiente de fusión al 19 de noviembre.
5. Definir y comprobar atribución de Ads por separado; confirmar cuenta, ubicaciones y presupuesto del borrador Search.
6. Iniciar la campaña aprobada cuando el recorrido de contacto y su medición estén verificados.


## A. Integración y verificación local

Usar el `main` vigente como base y reutilizar los módulos integrados de #1 y #2. Resolver incompatibilidades y probar los cambios juntos antes de fusionar. Esta etapa puede completarse sin credenciales AWS ni despliegues. Conservar el trabajo local y el historial de las ramas durante la integración.

Desde la raíz del repositorio, con Node.js 24 para reproducir el entorno de CI, instalar las dependencias del lockfile y ejecutar las comprobaciones en cada candidato y en la combinación.

```sh
npm ci
npm run check
npm test
npm run build
git diff --check
```

Para la inspección en navegador se puede servir `dist/` con `python3 -m http.server 8000 --directory dist` y abrir `http://localhost:8000/` y `http://localhost:8000/en/`.

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

La activación requiere la propiedad GA4, acceso, ID de medición real y lista exacta de hosts HTTPS de producción. Los controles ES/EN para aceptar, rechazar y retirar ya están implementados; seguir la [guía de activación](seo-analytics.md#crear-y-conectar-ga4) y verificar su comportamiento real. Rechazar debe ser tan sencillo como aceptar. El contacto debe funcionar en cualquier estado de consentimiento.

| Condición | Resultado verificable en el navegador |
| --- | --- |
| Perfil nuevo, decisión pendiente o rechazo | Cero solicitudes a Google. |
| Desarrollo, vista previa de PR o localhost | Seguimiento desactivado, incluso si existe una preferencia de aceptación. |
| Aceptación en un host autorizado | El adaptador transmite `page_view`, `contact_open`, `language_change` y `generate_lead` confirmado, con parámetros enumerados. `service_view` existe en la política pero no está conectado a la interfaz. Revisar la configuración automática y el referente para excluir datos personales, campos libres, consultas y fragmentos de URL. |
| Retirada durante la carga o con eventos pendientes | Cancelar cargas, descartar colas, detener eventos y limpiar las cookies aplicables. Guardar la preferencia con su versión y respetarla al recargar. |
| Vista previa, clic, error o reintento de contacto | Ninguna conversión por estas acciones. Incorporar `generate_lead` solo tras verificar el envío real de la sección C, una vez por envío aceptado y con consentimiento vigente. |

**Aceptación.** Inspeccionar las solicitudes de red en cada condición, incluida una URL con datos sintéticos en la consulta y el fragmento. En el host autorizado, contrastar los eventos permitidos y sus parámetros con los recibidos en la propiedad GA4. La validación previa con el adaptador simulado cubre únicamente el comportamiento local.

## E. Calidad del candidato

| Área | Comprobación de aceptación |
| --- | --- |
| SEO bilingüe | Comprobar título, descripción, canonical, hreflang, sitemap y robots para el dominio confirmado. Verificar los metadatos y el contenido ya prerenderizados en ambos idiomas y comprobar su indexación. Mantener la arquitectura estática salvo necesidad demostrada. |
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

Confirmar objetivo, audiencia de Ciudad de México y Chiapas, oferta, cuenta publicitaria y presupuesto. Preparar anuncios y página de destino coherentes con la oferta, parámetros UTM sin datos personales y conversiones basadas en envíos reales. El piloto requiere aprobación expresa de campaña y gasto. La implementación actual deniega consentimiento publicitario y elimina parámetros de campaña/clic de los eventos; preparar y probar esa atribución por separado antes de optimizar por conversiones.

**Aceptación.** El informe del piloto relaciona inversión, conversiones verificadas, calidad de las consultas y costo. El remarketing queda desactivado por defecto y los clics por sí solos no se contabilizan como ventas.

## Evidencia por cambio

Cada PR de implementación debe tener alcance acotado, criterio de aceptación y pruebas para el comportamiento modificado. Presentar el PR como borrador con el SHA, resultados locales, estado del CI remoto de ese SHA cuando exista, pendientes y riesgos. Marcar como pendientes las comprobaciones sin ejecutar. Para cambios de interfaz o integraciones, incluir evidencia en navegador y casos de fallo.

Actualizar las decisiones y su evidencia al integrar cada cambio, conservando el historial. Mantener credenciales y datos privados de cuenta en el mecanismo seguro del entorno, y los datos de visitantes fuera del repositorio. Los chats, commits y PR deben excluir secretos y datos de formularios. La fusión y la activación de servicios requieren autorización explícita para su alcance.
