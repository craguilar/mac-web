# Despliegue de MAC Tecnología en AWS Amplify

## Estado y límites

GitHub Actions valida cada PR. Cuando el despliegue continuo está habilitado en Amplify, un push a `dev` inicia el build del commit y publica `dist/` en el entorno de desarrollo protegido por contraseña. Producción conserva la aprobación por rama y commit. El estado real se consulta en la aplicación Amplify de la cuenta y región elegidas.

El sitio contiene únicamente Monolito suave: HTML/CSS/JavaScript sin dependencias npm, contenido ES/EN y contacto de demostración. Los mensajes permanecen en memoria; copiar al portapapeles es una acción voluntaria. No confundir esta vista previa con un envío real.

## 1. Revisión del código

- Revisar este PR y cualquier PR de contacto, privacidad o analítica por separado. La preparación complementaria está en el [PR de analítica/contacto](https://github.com/craguilar/mac-web/pull/1); no se activa desde aquí. Revalidar su combinación antes del lanzamiento.
- CI ejecuta `npm test` y `npm run build` en Node 24, con permisos de lectura y sin secretos ni despliegues. Las acciones oficiales están fijadas a commits completos.
- No se usa `npm ci`: actualmente no hay dependencias ni lockfile. Si se agregan dependencias, incorporar un lockfile revisado y actualizar CI/Amplify en el mismo PR.
- El build produce `dist/` e incluye las licencias y avisos de fuentes. No subir `.git/`, `.openai/`, pruebas, archivos de entorno o notas privadas como contenido web.
- Antes de fusionar, comprobar el resultado del check **Test and build (Node 24)** en el commit vigente. Una prueba local no equivale a CI remoto ni a una auditoría integral de seguridad/accesibilidad.
- Recomendación posterior: exigir este check mediante una regla de protección de `main`. **No se aplica ninguna regla en este PR**; los permisos y las reglas se aprueban aparte.

Comandos locales, con Node 24:

```sh
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

## 2. Decisiones antes de tocar AWS

El entorno inicial es `dev`. El responsable de la aplicación puede habilitar o pausar su despliegue continuo con el parámetro `ContinuousDeploy`. Los despliegues puntuales y la publicación en producción siguen el procedimiento de aprobación por commit.

Registrar fuera del repositorio público: cuenta AWS y región correctas, aplicación existente o nueva, responsable operativo y límite de gasto. No publicar identificadores de cuenta, credenciales o enlaces de sesión en este runbook.

Acordar también:

- Dominio y variante canónica (`www` o raíz), acceso a DNS y responsable del cambio.
- Usar `dev` para validación. La rama propuesta para una futura publicación en producción es `main`.
- Quién puede ver dev, cómo se restringe y durante cuánto tiempo se conserva.
- Contacto real, destinatario, proveedor, tratamiento de errores y política de privacidad, antes de habilitar envíos.
- Analítica y consentimiento: proveedor, finalidad, datos y consentimiento cuando corresponda. No activar scripts con identificadores ficticios.
- Alertas de facturación, presupuesto y quién atenderá fallos. No se estima ni se acepta gasto en este PR.

## 3. Configuración de Amplify, solo tras autorización

Primero inspeccionar la aplicación y las ramas existentes. Si hay despliegues o integraciones, preservar su estado. Crear/conectar una aplicación puede iniciar un build y conceder acceso persistente al repositorio: detenerse en el paso que lo active hasta contar con aprobación específica.

Configuración propuesta para este proyecto:

| Elemento | Valor preparado |
| --- | --- |
| Aplicación | Sitio estático; sin backend ni SSR |
| Repositorio | `craguilar/mac-web` |
| Raíz | Raíz del repositorio |
| Imagen | Amazon Linux 2023 compatible con Node 24 |
| Build spec | `amplify.yml` del repositorio |
| Validación/build | `npm test`, después `npm run build` |
| Artefactos | `dist/**/*` |
| Credenciales de runtime | Ninguna |
| Caché de paquetes | Ninguna |

La especificación usa el formato documentado de [Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html). AWS documenta la selección de Node mediante `nvm use` y la compatibilidad de AL2023 con Node 24 en su [guía de versiones](https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html).

### Alta del entorno de desarrollo

1. En GitHub, crear o actualizar `dev` a partir de un commit revisado que incluya este pipeline. Para que solo se desplieguen cambios revisados, exigir PR y el check **Test and build (Node 24)** en la protección de `dev`, incluidos los permisos de escritura directa.
2. En la región elegida, identificar si ya existe una aplicación Amplify de plataforma `WEB` conectada a `craguilar/mac-web`. Comprobar la imagen de build con Node 24, los hooks y la configuración de ramas automáticas. La plantilla administra únicamente la rama de entorno `dev`.
3. Preparar en AWS Secrets Manager un secreto JSON con las claves `username` y `password` para el acceso HTTP de desarrollo. CloudFormation necesita permiso para leer los secretos que utilice y para descifrarlos si usan una clave KMS administrada por el cliente. En los parámetros de la plantilla solo se pasan los nombres de los secretos.
4. Para crear una aplicación nueva, instalar la GitHub App regional de AWS Amplify con acceso a este repositorio y guardar el token de conexión en otro secreto de texto simple. Si se usa una aplicación ya conectada, basta su ID. [Conexión de GitHub a Amplify mediante CloudFormation](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html).
5. Desde la raíz del repositorio, aplicar la [plantilla de desarrollo](../infra/amplify-dev.yaml) con el perfil, región y referencias del entorno. Este ejemplo usa una aplicación existente. Para crearla con la misma plantilla, sustituir `ExistingAppId="$APP_ID"` por `GitHubTokenSecret="$TOKEN_SECRET"`. El primer despliegue de la pila deja el alojamiento protegido y los builds automáticos pausados.

```sh
aws cloudformation deploy --region "$AWS_REGION" --stack-name mac-web-dev \
  --template-file infra/amplify-dev.yaml \
  --parameter-overrides ExistingAppId="$APP_ID" DevAccessSecret="$DEV_ACCESS_SECRET" ContinuousDeploy=false
```

Si Amplify ya administra la rama `dev`, conservarla y configurar en ella la protección por contraseña, los previews desactivados y la variable de rama `MAC_AMPLIFY_CONTINUOUS_DEV`. Activar o pausar conjuntamente esa variable (`true` / `false`) y el auto-build. En este caso no crear una segunda rama con CloudFormation. En aplicaciones compartidas, revisar también las variables globales de aprobación y los dominios asociados a `dev`.

### Activar, verificar y pausar el despliegue continuo

Verificar en Amplify que la protección por contraseña de `dev` está habilitada. Si la rama ya sirve contenido, comprobar que la URL HTTPS devuelve HTTP 401 a una sesión anónima. Para habilitar los pushes en una rama administrada por CloudFormation, actualizar la pila existente. La pila conserva sus otros parámetros.

```sh
aws cloudformation deploy --region "$AWS_REGION" --stack-name mac-web-dev \
  --template-file infra/amplify-dev.yaml --parameter-overrides ContinuousDeploy=true
```

El siguiente push aprobado a `dev` dispara el build nativo de Amplify. El control comprueba la rama, el SHA del checkout y la ausencia de cambios locales. Después ejecuta las pruebas y la compilación en Node 24. Si fallan, no se publica el candidato. En el historial de Amplify, cotejar el SHA y el ID del build con GitHub, comprobar el estado de despliegue y verificar que el sitio carga con credenciales y devuelve HTTP 401 sin ellas antes de compartir la URL. Repetir las comprobaciones de la sección 4 en la sesión autorizada.

Para pausar futuros despliegues, repetir la actualización con `ContinuousDeploy=false`. Si un build ya está en curso, revisar su estado y cancelarlo en Amplify si corresponde. Para revertir un cambio de desarrollo, integrar un PR de reversión en `dev` y verificar el nuevo build. Los reintentos que Amplify identifica como `HEAD` utilizan la aprobación puntual descrita a continuación.

### Despliegue puntual por rama y commit

Fuera del flujo continuo de `dev`, `node scripts/check-deploy-approval.cjs` exige tres variables en la rama aprobada:

- `MAC_AMPLIFY_DEPLOY_APPROVED=true`
- `MAC_AMPLIFY_APPROVED_BRANCH` igual al nombre exacto de `AWS_BRANCH`
- `MAC_AMPLIFY_APPROVED_COMMIT` igual al SHA completo de 40 caracteres del checkout Git real. Se contrasta con `AWS_COMMIT_ID`; cuando AWS informa `HEAD` en una recompilación, se sigue verificando el commit real, no una aprobación genérica.

También rechaza builds con `AWS_PULL_REQUEST_ID`. Cuando llegue la autorización, configurarlos como **overrides de esa rama**, no globalmente. Son controles operativos, no secretos ni una barrera IAM: alguien con capacidad de editar código/configuración puede cambiarlos. Habilitarlos no sustituye la aprobación del despliegue concreto.

El guard comprueba además que no existan cambios locales en archivos versionados ni archivos no versionados en los insumos del build, aunque estén ignorados por Git. Así, el SHA aprobado no puede acompañar silenciosamente a otros archivos antes del build. Si falla, revisar el checkout; no borrar archivos a ciegas ni quitar el control. Las pruebas ejercitan el comando real en un repositorio temporal y verifican byte por byte la salida completa del build.

La aprobación queda ligada al commit, no a cambios futuros. Tras un despliegue puntual, retirar los overrides de aprobación y mantener auto-build desactivado, salvo autorización posterior explícita de despliegue continuo. Para el siguiente candidato se requiere su aprobación y SHA exacto. `AWS_COMMIT_ID`, `AWS_BRANCH` y `AWS_PULL_REQUEST_ID` proceden de las [variables de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html); no sustituirlas por valores escritos para saltarse el control.

Mantener desactivados la creación automática de ramas y los previews de PR hasta revisar su audiencia, permisos y costos. Antes de conectar una rama, revisar también auto-build. [AWS permite desactivar auto-build y usar `[skip-cd]` en un commit](https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html). El marcador reduce disparos automáticos, pero no es una garantía de aislamiento ni reemplaza la revisión de configuración.

Si se autoriza dev, restringir su acceso antes de compartirlo y comprobar desde una sesión no autenticada que no expone la página. [Amplify admite protección por contraseña de ramas](https://docs.aws.amazon.com/amplify/latest/userguide/access-control.html). La contraseña nunca debe ir al repositorio. El código de este repositorio es público aunque dev esté restringido.

## 4. Validación de dev

En el commit candidato exacto:

- CI en verde; build remoto y URL comprobados. Registrar commit, rama, identificador de build y hora sin credenciales.
- Revisar español e inglés en 320, 390, 768 y 1440 px, teclado y un teléfono real; completar Safari/iOS y Chrome/Android antes del lanzamiento.
- Revisar navegación, contraste/foco, orden de lectura, formulario, errores, volver a editar, copiar, borrar/deshacer y conservación del borrador al cambiar idioma.
- Confirmar que la demostración no realiza solicitudes de contacto ni analítica. Si otro PR incorpora esas funciones, revisar su estado apagado y probarlas solo con autorización y datos sintéticos.
- Verificar que CSS, fuentes, SVG, licencias y avisos cargan; que recursos inexistentes devuelven un error correcto; y que no hay archivos privados publicados.
- No agregar una reescritura general 200 de SPA por costumbre: el sitio actual navega con anclas y `?lang=`, no con rutas de cliente. Revisar las [reglas y parámetros de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html) antes de cambiar redirecciones.
- Definir y probar headers de seguridad y caché en otro cambio revisado. Los assets no llevan hashes en sus nombres: evitar caché `immutable` larga hasta cambiar esa estrategia. Una CSP deberá contemplar el SVG/CSS actuales y cualquier integración futura, sin romper el sitio.
- Resolver metadatos/SEO por idioma: hoy la página se renderiza con JavaScript y los metadatos iniciales están en inglés. Confirmar indexación, título, descripción, enlaces sociales, canonical y sitemap para el dominio real. No inventar un dominio.
- Conservar rótulos de prototipo mientras contacto y detalles finales sigan pendientes. No publicar testimonios, resultados o proyectos sin evidencia aprobada.

## 5. Publicación y reversión

Solo después de aprobar el commit, dominio, audiencia, gasto y configuración:

1. Registrar el último commit/build conocido como correcto y el procedimiento de restauración disponible en la aplicación real.
2. Aprobar el paso de producción por separado. No fusionar ni lanzar automáticamente desde este runbook.
3. Configurar producción únicamente en la rama aprobada, verificar sus gates, y ejecutar el build autorizado.
4. Comprobar URL, HTTPS, ES/EN, recursos y contacto en producción. Cambiar DNS solo cuando se haya aprobado ese cambio y se conozca el estado del dominio.
5. Si la comprobación falla, detener la promoción. Con autorización, restaurar el build anterior desde el historial de Amplify o revertir el cambio en Git y desplegar de nuevo. No forzar ni reescribir `main`.
6. Después de una reversión, volver a comprobar HTTPS, navegación, contacto y commit publicado. Si aún no existe una versión de producción anterior, no prometer una reversión instantánea: mantener el sitio anterior y preparar un plan de DNS antes del primer cambio.

La URL, el SHA y el identificador del build permiten verificar una publicación en Amplify. El resultado de CI corresponde a la validación en GitHub.
