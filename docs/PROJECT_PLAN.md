# MAC Tecnología: plan de lanzamiento y arranque en Codex

Última verificación: 16 de noviembre de 2026. Este documento es el punto de entrada para continuar el proyecto sin depender del historial del chat.

## 1. Objetivo y decisiones

Lanzar la página corporativa bilingüe de **MAC Tecnología**, orientada a empresas del sur de México y Ciudad de México, con diseño móvil cuidado, contacto real, medición responsable y despliegues reproducibles.

- **Diseño aprobado:** Monolito suave. Conservar colores, fluidez, identidad chiapaneca discreta y tono cercano, práctico y sin presumir. No rediseñar desde cero.
- **Frase:** “Buenas ideas. Tecnología que las hace realidad.”
- **Contenido:** español e inglés; conservar el texto aprobado de Nosotros y los servicios actuales. No inventar clientes, testimonios, resultados ni certificaciones.
- **Código:** este repositorio público, `craguilar/mac-web`.
- **Hosting elegido:** AWS Amplify Hosting. Cloudflare y S3 directo fueron alternativas evaluadas, no el plan vigente.
- **Dominio elegido:** `mactecnologia.com.mx`. Es una intención, no prueba de compra, disponibilidad, control de DNS ni despliegue.
- **Alcance:** sitio corporativo estático. No es Flowly ni requiere convertirlo en una aplicación React/Next.js.
- **Publicación:** preparar e integrar mediante PRs. No fusionar, conectar servicios, activar seguimiento, gastar en anuncios ni publicar producción solo porque este plan exista.

## 2. Estado comprobado y trabajo existente

Revalidar estas referencias al comenzar: los PRs y sus checks pueden cambiar.

| Elemento | Estado al verificar | Qué significa |
| --- | --- | --- |
| `main` | `431cf5ae11e2e8d34e4dcfc8411c182f3224016d` | Prototipo estático aprobado; último cambio ajusta README. Diseño sincronizado previamente en `61b92ba`. |
| [PR #1](https://github.com/craguilar/mac-web/pull/1) | Abierto, draft, sin merge; `0dab065535b1e6a21364263cd11f26021d1f835a` | Política de analítica, controlador de consentimiento y validación de contacto, todavía desconectados de la página. |
| [PR #2](https://github.com/craguilar/mac-web/pull/2) | Abierto, draft, sin merge; `df16ffc84c27e644937ed1d073a539e76668a056` | CI de validación, build spec de Amplify y guard de despliegue que falla cerrado. No es una conexión real a AWS. |
| Formulario | Solo vista previa local | No envía correo ni guarda mensajes de forma persistente. |
| Analítica | No activada | No existe integración GA4 real ni consentimiento visible conectado. |
| AWS, DNS y producción | Sin verificación de configuración real en este trabajo | No asumir que existe una aplicación, región, dominio o despliegue listo. |

Evidencia histórica, no garantía del próximo commit: cada PR reporta 17 pruebas y build locales correctos; su combinación reportó 25. El [CI de #2](https://github.com/craguilar/mac-web/actions/runs/43752475117) pasó para `df16ffc`. Volver a ejecutar y revisar checks después de cada integración. No duplicar estos PRs ni copiar sus módulos a otra implementación sin revisar.

Documentos detallados disponibles en las ramas de los PRs mientras no estén fusionados:
- [Runbook de lanzamiento, PR #2](https://github.com/craguilar/mac-web/blob/prep/ci-amplify-launch/docs/launch-runbook.md).
- [Analítica/contacto/privacidad, PR #1](https://github.com/craguilar/mac-web/blob/prep/analytics-contact-privacy/docs/analytics-contact-readiness.md).

## 3. Arranque como nuevo proyecto Codex

Abrir un checkout de este repositorio. Usar Node 24 para coincidir con el CI propuesto; hoy no hay dependencias npm ni lockfile, por lo que no hace falta instalar paquetes.

```sh
git clone https://github.com/craguilar/mac-web.git
cd mac-web
git status --short
git log -1 --oneline
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

Abrir `http://localhost:8000/?lang=es` y `?lang=en`. Python es solo un servidor estático local opcional, no una dependencia del producto ni de Amplify. No hay comando `npm run dev` actualmente.

Para leer los cambios pendientes sin modificarlos:

```sh
git fetch origin refs/pull/1/head:refs/remotes/origin/pr-1
git fetch origin refs/pull/2/head:refs/remotes/origin/pr-2
git diff origin/main...origin/pr-1
git diff origin/main...origin/pr-2
```

Trabajar en una rama por cambio. Conservar cualquier trabajo local ajeno. No hacer reset destructivo, force-push, merge ni despliegue como parte de esta inspección.

### Prompt inicial para Codex

> Continúa MAC Tecnología en craguilar/mac-web. Lee README.md y docs/PROJECT_PLAN.md, inspecciona main y los PRs #1 y #2 vigentes, y ejecuta las pruebas y el build. Preserva Monolito suave, ES/EN y el carácter chiapaneco discreto. Distingue lo implementado de lo pendiente. Empieza por el siguiente paso de la fase A, sin duplicar los PRs existentes; prepara un cambio pequeño con pruebas y un PR draft. No publiques producción, actives seguimiento/envíos reales, cambies permisos o DNS, ni inventes valores de configuración. Documenta qué verificaste y qué falta. Consulta las instrucciones y skills relevantes del checkout si existen.

## 4. Plan por fases

### A. Consolidar la base y preparar integración

**Siguiente paso recomendado, sin necesitar AWS.**

- [ ] Revisar #1 y #2 contra el `main` vigente y resolver cualquier incompatibilidad en ramas de trabajo.
- [ ] Probar su combinación sin publicar un entorno ni asumir que ya están fusionados.
- [ ] Mantener los PRs separados y presentar resultados para revisión; fusionar únicamente con autorización.
- [ ] Corregir textos de prototipo obsoletos solo cuando la funcionalidad correspondiente sea real. El README aún dice que los servicios requieren confirmación; contrastarlo con los textos ya aprobados, sin inventar nuevas ofertas.
- [ ] Mantener este plan actualizado con PR, SHA y pruebas, no con estados vagos como “listo”.

**Salida:** cambios revisables, pruebas/build correctos y una lista clara de lo que sigue desactivado.

### B. Conectar un entorno dev protegido en Amplify

**Bloqueado por configuración/acceso, no por diseño.**

- [ ] Confirmar con Carlos cuenta AWS, región, responsable operativo y límite de gasto. No guardar credenciales ni detalles privados de cuenta en el repo público.
- [ ] Inspeccionar apps, ramas y dominios existentes antes de crear recursos duplicados.
- [ ] Autorizar la integración GitHub/Amplify con acceso mínimo al repo. Revisar qué permisos se conceden.
- [ ] Propuesta: `dev` para validación y `main` para producción; las ramas por sí solas no son entornos.
- [ ] Configurar el build según #2: Node 24, `npm test`, `npm run build`, artefactos `dist/`. Sin backend/SSR para el sitio.
- [ ] Proteger dev antes de compartirlo. Comprobar con una sesión no autenticada que no es público; `noindex` no sustituye control de acceso.
- [ ] Mantener previews automáticos y auto-build apagados durante la configuración inicial. Revisar hooks externos y no confiar solo en `[skip-cd]`.
- [ ] Tras autorización concreta, desplegar el SHA aprobado y verificar URL, archivos, HTTPS y protección.

**Salida:** dev comprobado, acceso restringido y registro de commit/build. No producción.

### C. Contacto real y privacidad

Puede desarrollarse con mocks mientras se resuelven los datos externos.

- [ ] Confirmar destinatario, remitente, canal, responsable y plazo de atención.
- [ ] Elegir el backend de contacto más pequeño adecuado. Si se elige AWS, evaluar endpoint serverless + SES; es una propuesta, no infraestructura creada.
- [ ] Alinear el contrato con la UI: hoy muestra empresa/tema opcionales, pero el validador de #1 solo conserva nombre, email, mensaje e idioma. Decidir qué campos son necesarios antes de conectar.
- [ ] Reutilizar la validación de #1 también del lado servidor; límites de tamaño, origen permitido, prevención de inyección, rate limit y protección contra abuso. CORS por sí solo no evita bots.
- [ ] Mantener secretos únicamente en el servidor. No registrar cuerpos de mensajes ni PII en logs/analítica.
- [ ] Implementar estados accesibles ES/EN: validación, enviando, error, timeout, reintento y éxito. Evitar doble envío y conservar texto ante error.
- [ ] Definir responsable, finalidades, proveedores, conservación y mecanismo de derechos; revisar aviso de privacidad ES/EN, sin inventar identidad legal ni plazos.
- [ ] Si se usa SES, verificar sandbox, remitente/dominio, SPF/DKIM/DMARC, rebotes y permisos mínimos.
- [ ] Probar con datos sintéticos y destinatario autorizado. Distinguir “servicio aceptó el envío” de “correo recibido”.

**Salida:** prueba de recepción comprobada, fallos manejados, aviso visible y sin falsas confirmaciones de envío.

### D. Analítica con consentimiento

- [ ] Confirmar propiedad GA4, ID real, acceso y hosts de producción permitidos.
- [ ] Conectar la política/controlador de #1 a UI ES/EN: aceptar, rechazar y retirar consentimiento, sin bloquear contacto.
- [ ] Implementar adaptador real y gestión de preferencia/versionado; comprobar revocación, colas, cargas pendientes y cookies aplicables.
- [ ] Antes de aceptar: cero solicitudes a Google. En dev, previews y localhost: tracking desactivado.
- [ ] No enviar nombres, correos, texto de mensajes, parámetros de URL ni fragmentos. Auditar referrer y configuración automática.
- [ ] Usar eventos limitados y documentados: contacto abierto, servicio visto, idioma cambiado. Habilitar `generate_lead` solo tras envío real verificado, sin duplicados.
- [ ] Validar en navegador y GA4 con consentimiento y datos sintéticos; las pruebas con adaptador falso no prueban Google.

**Salida:** medición comprobada, consentimiento efectivo y ninguna filtración de datos personales.

### E. SEO, seguridad, accesibilidad y calidad final

- [ ] Revisar títulos/descripciones ES/EN, canonical, hreflang, sitemap y robots para el dominio confirmado. Resolver metadatos iniciales en inglés antes de afirmar SEO bilingüe completo.
- [ ] Probar indexación de contenido renderizado con JavaScript; no agregar un framework sin una necesidad demostrada.
- [ ] Configurar y verificar CSP, headers de seguridad y caché sin romper fuentes/SVG/formulario. Evitar `immutable` largo en assets sin hash.
- [ ] No añadir una reescritura SPA 200 global: el sitio usa anclas y `?lang=`, no un router de cliente.
- [ ] Revisar ES/EN a 320, 390, 768 y 1440 px; Safari/iOS, Chrome/Android, teclado, foco, contraste, lectura y movimiento reducido.
- [ ] Probar navegación y contacto interrumpidos/repetidos: volver/avanzar, cambiar idioma, editar, cerrar, doble clic, borrar/deshacer y error de red.
- [ ] Comprobar recursos, licencias, enlaces rotos, rendimiento móvil y ausencia de secretos/archivos privados en `dist/`.
- [ ] Definir monitoreo de disponibilidad/errores y alertas de gasto. No prometer seguridad absoluta; documentar riesgos residuales.

**Salida:** evidencia de navegador y móvil, checks correctos y pendientes críticos resueltos.

### F. Producción y despliegue continuo

**Separar el objetivo final del guard temporal actual.**

El #2 exige aprobación por rama y SHA exacto y bloquea PR previews. Eso es una fase de preparación segura, **no CD automático terminado**. No quitar el guard para “hacer pasar” un build.

- [ ] Antes de CD, acordar explícitamente qué cambios/rama pueden desplegarse automáticamente, audiencia, presupuesto, revisión exigida y rollback.
- [ ] Preparar un PR posterior que adapte el mecanismo de aprobación a esa política: CI obligatorio, cambios revisados y promoción a producción controlada. Documentar quién aprueba y cómo se revoca; no usar un flag global permanente.
- [ ] Configurar protecciones reales del repo/entorno con autorización. Su existencia no puede deducirse del YAML.
- [ ] Confirmar compra/control de `mactecnologia.com.mx`, variante canónica raíz/www, DNS y certificado. No comprar ni modificar DNS sin autorización.
- [ ] Aprobar candidato exacto; verificar build, HTTPS, contacto y consentimiento antes/después del cambio de dominio.
- [ ] Registrar versión desplegada y rollback probado. Propuesta: tags de versión `vX.Y.Z` para releases; dev/prod son entornos, no dos tags móviles que sustituyan historial.
- [ ] Para el primer lanzamiento, conservar el sitio anterior si existe y tener plan de DNS. Después, restaurar un build conocido o revertir mediante PR; no reescribir `main`.

**Salida:** dominio real funcionando, release trazable y proceso de CD autorizado y probado.

### G. Marketing, después del lanzamiento

- [ ] Confirmar objetivo, audiencia CDMX/Chiapas, oferta, presupuesto y cuenta publicitaria.
- [ ] Preparar anuncios y landing coherentes, UTMs sin PII y conversiones de contacto real.
- [ ] Empezar un piloto limitado solo con aprobación de gasto/campaña.
- [ ] Revisar calidad de leads, conversiones y costo; no activar remarketing ni atribuir ventas a clics por defecto.

**Salida:** campaña medible con presupuesto aprobado. No hay campaña ni inversión activa como resultado de este plan.

## 5. Lo que necesita Carlos y lo que puede avanzar Codex

| Necesidad | Para qué | Se puede avanzar mientras tanto |
| --- | --- | --- |
| Cuenta/región AWS y acceso seguro | Inspeccionar y conectar Amplify | Revisión de PRs, pruebas, código y documentación |
| Autorización GitHub/Amplify y política de despliegue | Conexión/CD y permisos | CI de validación sin credenciales |
| Dominio y DNS confirmados | HTTPS, canonical y producción | SEO con configuración explícita, sin fingir dominio activo |
| Contacto y privacidad confirmados | Envíos y aviso reales | Mocks, validación, UX y pruebas de fallo |
| Propiedad/ID GA4 y hosts | Verificación de tracking | Consentimiento y pruebas negativas sin Google |
| Presupuesto y aprobación de campaña | Ads y costos | Textos y plan, sin gasto |

No pedir secretos en chat, commits, PRs ni este documento. Usar el mecanismo seguro del entorno/servicio. Los datos de formularios de visitantes tampoco pertenecen en el repositorio público.

## 6. Regla de cierre de cada PR

1. Alcance pequeño y criterio de aceptación concreto.
2. Pruebas nuevas para lo cambiado; `npm test`, `npm run build` y `git diff --check`.
3. Para UI/integraciones: evidencia de navegador, estados negativos y límites de cobertura.
4. Check remoto del SHA exacto si existe CI. “No ejecutado” no significa “pasó”.
5. PR draft con resumen sencillo: implementado, verificado, pendiente y riesgos. No fusionar/desplegar por completar el código.
6. Actualizar este plan sin borrar decisiones anteriores importantes.

Este PR de documentación no activa servicios ni cambia el comportamiento de la página.
