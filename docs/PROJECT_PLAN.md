# Especificación de lanzamiento de MAC Tecnología

## Producto y arquitectura

El sitio corporativo de MAC Tecnología se dirige a empresas del sur de México y de la Ciudad de México. El lanzamiento debe ofrecer la misma información y el mismo flujo de contacto en español e inglés, permitir consultas reales y medir interacciones con consentimiento.

| Decisión | Requisito |
| --- | --- |
| Diseño y contenido | Conservar Monolito suave, sus colores y fluidez en móvil, la identidad chiapaneca discreta y el tono cercano y práctico. Mantener «Buenas ideas. Tecnología que las hace realidad.», el texto aprobado de Nosotros y la oferta de servicios vigente. Toda mención de clientes, testimonios, resultados o certificaciones requiere evidencia aprobada. |
| Arquitectura | Servir HTML, CSS y JavaScript estáticos desde el repositorio público `craguilar/mac-web`. Mantener la navegación por anclas y `?lang=es` / `?lang=en`. El alcance excluye Flowly y una migración a React o Next.js. El envío del formulario requiere un servicio de contacto independiente del alojamiento estático. |
| Alojamiento | **AWS Amplify Hosting** es la plataforma elegida. Se evaluaron Cloudflare y el alojamiento directo en S3. La primera entrega en Amplify es un entorno de desarrollo con acceso restringido. |
| Dominio | El dominio elegido es `mactecnologia.com.mx`. La puesta en producción depende de confirmar su disponibilidad o titularidad, el control del DNS y la variante canónica (raíz o `www`). |

## Base de implementación

Estado de referencia del 16 de noviembre de 2026. Los resultados de pruebas corresponden a las revisiones indicadas.

| Revisión | Comportamiento disponible |
| --- | --- |
| [`main` en `431cf5a`](https://github.com/craguilar/mac-web/tree/431cf5ae11e2e8d34e4dcfc8411c182f3224016d) | Prototipo bilingüe aprobado. El formulario permite revisar, copiar y editar un borrador en memoria. La página carece de envío de correo, persistencia de mensajes e integración GA4. |
| [PR #1](https://github.com/craguilar/mac-web/pull/1) · borrador en `0dab065` | Incluye el validador de contacto, la política de eventos y el controlador de consentimiento. Los módulos siguen desconectados de la página. El [contrato propuesto](https://github.com/craguilar/mac-web/blob/0dab065535b1e6a21364263cd11f26021d1f835a/docs/analytics-contact-readiness.md) describe las pruebas con un adaptador simulado. |
| [PR #2](https://github.com/craguilar/mac-web/pull/2) · borrador en `df16ffc` | Incluye CI de validación, `amplify.yml` y el control de despliegue por rama y commit. El [procedimiento de Amplify](https://github.com/craguilar/mac-web/blob/df16ffc84c27e644937ed1d073a539e76668a056/docs/launch-runbook.md) describe la configuración pendiente. |

Los dos PR seguían abiertos y sin fusionar en esa revisión. Cada uno reportó 17 pruebas y una compilación local correctas. La validación local conjunta completó 25 pruebas y compiló el sitio correctamente. El [CI de #2](https://github.com/craguilar/mac-web/actions/runs/43752475117) pasó en `df16ffc`. La aplicación AWS, sus permisos, el DNS y el despliegue de producción siguen pendientes de verificación.

## A. Integración y verificación local

Revisar #1 y #2 por separado contra el `main` vigente. Reutilizar sus módulos, resolver incompatibilidades en ramas de trabajo y probar ambos cambios juntos en una rama temporal. Esta etapa puede completarse sin credenciales AWS ni despliegues. Conservar el trabajo local y el historial de las ramas durante la integración.

Desde la raíz del repositorio, con Node.js 24 para reproducir el entorno de CI, ejecutar las comprobaciones en cada candidato y en la combinación. La versión de referencia carece de dependencias npm y de archivo de bloqueo.

```sh
npm test
npm run build
git diff --check
```

Para la inspección en navegador se puede servir `dist/` con `python3 -m http.server 8000 --directory dist` y abrir `http://localhost:8000/?lang=es` y `http://localhost:8000/?lang=en`.

**Aceptación.** Registrar los SHA de base y candidatos, las pruebas, el build y las funciones que siguen desactivadas. Contrastar la oferta del README con los textos de servicios aprobados. Actualizar las indicaciones de prototipo cuando se haya verificado la función correspondiente.

## B. Desarrollo protegido en Amplify

La configuración requiere cuenta y región confirmadas, responsable operativo, límite de gasto y autorización de acceso a GitHub. Inventariar aplicaciones, ramas, dominios y conexiones existentes antes de crear recursos. Conceder a Amplify el acceso mínimo al repositorio. El pipeline de desarrollo utiliza `dev`. La asignación de `main` a producción queda pendiente de aprobación.

1. Usar la configuración de #2 para ejecutar `npm test` y `npm run build` con Node.js 24 y publicar únicamente `dist/`. El sitio se sirve como contenido estático, sin renderizado en servidor.
2. Desactivar los builds automáticos y las vistas previas de PR durante la configuración inicial. Revisar los disparadores externos incluso cuando un commit incluya `[skip-cd]`.
3. Configurar la rama protegida con la [plantilla de Amplify](../infra/amplify-dev.yaml). La activación del despliegue continuo permite publicar cada push revisado a `dev` que supere las pruebas y compile. El [procedimiento operativo](launch-runbook.md) detalla el alta, la verificación y la pausa. Los despliegues puntuales conservan la aprobación para el SHA exacto.

**Aceptación.** Una sesión anónima no puede acceder al sitio de desarrollo. En una sesión autorizada, la URL sirve por HTTPS el sitio y sus recursos. Registrar rama, SHA e identificador del build. Una directiva `noindex` por sí sola no cumple el requisito de acceso.

## C. Contacto y privacidad

La implementación puede empezar con un servicio simulado. Para habilitar envíos reales deben estar confirmados el destinatario, el remitente, el canal, el responsable de atención y el plazo de respuesta. Elegir el servicio mínimo que cumpla el contrato. Un endpoint serverless con Amazon SES es una opción pendiente de decisión.

| Campo | Formulario actual | Contrato propuesto en #1 |
| --- | --- | --- |
| Nombre | `name` obligatorio, hasta 160 caracteres | `name` opcional, hasta 100 |
| Correo | `email` obligatorio, hasta 254 | `email` obligatorio, hasta 254 |
| Mensaje | `problem` obligatorio, hasta 3000 | `message` obligatorio, hasta 4000 |
| Empresa y tema | `company` y `topic` opcionales | El validador descarta ambos |
| Idioma | Selección de la página | `language` obligatorio, `es` o `en` |

Antes de conectar el formulario, acordar qué campos se enviarán, cuáles serán obligatorios y sus límites. Alinear nombres, validación y textos de ambas interfaces. Ningún campo ofrecido para el envío debe descartarse silenciosamente.

- **Servidor.** Recibir por HTTPS, reutilizar la validación de #1 y aplicar límites de longitud y de tamaño de petición. Validar el origen permitido, bloquear la inyección de cabeceras, limitar la frecuencia e incorporar protección contra abuso además de CORS. Custodiar los secretos en el servidor. Excluir cuerpos de mensajes y datos personales de registros y analítica.
- **Interfaz.** Mantener el rótulo de vista previa hasta habilitar el servicio. Mostrar estados accesibles en ES/EN para errores de validación, envío en curso, límite de frecuencia, fallo temporal, tiempo de espera, reintento y éxito. Conservar el texto tras un fallo e impedir envíos duplicados. Mostrar éxito únicamente cuando el servicio de entrega acepte el envío.
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

## F. Producción y despliegue continuo

En producción sigue vigente el control de #2 por rama y SHA exactos. La política de despliegue continuo de `dev` se limita al entorno de desarrollo. Ambos modos rechazan vistas previas de PR.

1. Acordar ramas y cambios elegibles, audiencia, presupuesto, revisión obligatoria, responsables de aprobación, revocación y reversión. En un PR posterior, adaptar el control a esa política con CI obligatorio y promoción controlada. Excluir aprobaciones globales permanentes. Aplicar con autorización las protecciones de repositorio y entorno y comprobarlas en los servicios.
2. Confirmar titularidad o compra autorizada de `mactecnologia.com.mx`, variante canónica, control DNS y certificado. Antes del primer cambio, preparar el plan de DNS y conservar el sitio anterior si existe. La compra del dominio, los cambios DNS y la publicación requieren autorización.
3. Aprobar el SHA candidato. Comprobar build, HTTPS, recursos, contacto y consentimiento antes y después del cambio de dominio. Registrar el SHA y el build publicados. Se proponen etiquetas de versión `vX.Y.Z` para identificar las entregas.
4. Probar la reversión a un build conocido o mediante un PR de reversión, preservando el historial de `main`. Volver a verificar la versión servida, HTTPS, navegación y contacto después de restaurar.

**Aceptación.** El dominio canónico sirve el candidato aprobado. El registro de entrega permite identificarlo, reproducir la promoción autorizada y demostrar la recuperación de una versión conocida.

## G. Campaña posterior al lanzamiento

Confirmar objetivo, audiencia de Ciudad de México y Chiapas, oferta, cuenta publicitaria y presupuesto. Preparar anuncios y página de destino coherentes con la oferta, parámetros UTM sin datos personales y conversiones basadas en envíos reales. El piloto requiere aprobación expresa de campaña y gasto.

**Aceptación.** El informe del piloto relaciona inversión, conversiones verificadas, calidad de las consultas y costo. El remarketing queda desactivado por defecto y los clics por sí solos no se contabilizan como ventas.

## Evidencia por cambio

Cada PR de implementación debe tener alcance acotado, criterio de aceptación y pruebas para el comportamiento modificado. Presentar el PR como borrador con el SHA, resultados locales, estado del CI remoto de ese SHA cuando exista, pendientes y riesgos. Marcar como pendientes las comprobaciones sin ejecutar. Para cambios de interfaz o integraciones, incluir evidencia en navegador y casos de fallo.

Actualizar las decisiones y su evidencia al integrar cada cambio, conservando el historial. Mantener credenciales y datos privados de cuenta en el mecanismo seguro del entorno, y los datos de visitantes fuera del repositorio. Los chats, commits y PR deben excluir secretos y datos de formularios. La fusión y la activación de servicios requieren autorización explícita para su alcance.
