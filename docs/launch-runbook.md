# Despliegue de MAC Tecnología en AWS Amplify

## Estado y límites

GitHub Actions valida los PR y los pushes a `main`. Al completar correctamente el CI de un push a `main`, inicia el despliegue en AWS Amplify del mismo commit. Cada ejecución configura una aprobación temporal del SHA exacto. La publicación utiliza un único entorno de producción.

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

Confirmar quién aprueba los despliegues de `main` y quién puede iniciar o revertir un build en Amplify.

Registrar fuera del repositorio público: cuenta AWS y región correctas, aplicación existente o nueva, responsable operativo y límite de gasto. No publicar identificadores de cuenta, credenciales o enlaces de sesión en este runbook.

Acordar también:

- Dominio y variante canónica (`www` o raíz), acceso a DNS y responsable del cambio.
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

### Alta del entorno de producción

1. Confirmar que `main` contiene el pipeline revisado y que el check **Test and build (Node 24)** pasa.
2. En la región elegida, identificar si ya existe una aplicación Amplify de plataforma `WEB` conectada a `craguilar/mac-web`. Revisar sus ramas, dominios y webhooks. Para esta configuración, `main` debe ser la única rama alojada y la creación automática de ramas debe estar desactivada. Si hay otras ramas alojadas, inventariar sus dominios y dependencias antes de retirarlas.
3. Para una aplicación nueva, instalar la GitHub App regional de AWS Amplify con acceso a este repositorio y guardar el token de conexión como texto simple en AWS Secrets Manager. CloudFormation necesita permiso para leer ese secreto y descifrarlo si usa una clave KMS administrada por el cliente. [Conexión de GitHub a Amplify mediante CloudFormation](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html).
4. Desde la raíz del repositorio, aplicar la [plantilla de producción](../infra/amplify-prod.yaml). Este ejemplo crea una aplicación nueva. Para usar una aplicación existente que aún no aloja `main`, sustituir `GitHubTokenSecret="$TOKEN_SECRET"` por `ExistingAppId="$APP_ID"`.

```sh
aws cloudformation deploy --region "$AWS_REGION" --stack-name mac-web-prod \
  --template-file infra/amplify-prod.yaml \
  --parameter-overrides GitHubTokenSecret="$TOKEN_SECRET"
```

Si la aplicación ya aloja `main`, conservar esa rama y comprobar en Amplify que su stage sea `PRODUCTION`, con auto-build y previews desactivados. La plantilla crea una rama y no debe aplicarse encima de una rama existente administrada fuera de la pila.

### Configurar el despliegue desde GitHub Actions

El workflow **Deploy to AWS Amplify** aparece en Actions cuando `.github/workflows/deploy.yml` forma parte de `main`. Se inicia automáticamente después de un CI satisfactorio de un push a `main`, y también permite ejecución manual con **Run workflow**. Cada ejecución prueba y compila el commit seleccionado, solicita el build a Amplify y espera su resultado.

1. Completar el alta de la aplicación Amplify y de la rama `main` descrita arriba. Conservar el auto-build y las vistas previas desactivados.
2. Crear o reutilizar el proveedor OIDC de GitHub en IAM, con URL `https://token.actions.githubusercontent.com` y audiencia `sts.amazonaws.com`. Aplicar la [plantilla del rol de despliegue](../infra/github-deploy-role.yaml) en la cuenta y región de la aplicación, pasando su ID como `AmplifyAppId`. La operación requiere `CAPABILITY_IAM`. La salida `RoleArn` identifica el rol para GitHub. [Autenticación de GitHub Actions en AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).
3. En **Settings → Environments**, crear `production` y limitar sus ramas de despliegue a `main`. Para publicar automáticamente después de CI, configurar el entorno sin aprobación manual obligatoria. Si la política exige revisores, el workflow esperará esa aprobación antes de desplegar. El rol confía en el repositorio `craguilar/mac-web` y en ese entorno.
4. En las variables del entorno `production`, definir los siguientes valores.

| Variable | Valor |
| --- | --- |
| `AWS_REGION` | Región de la aplicación Amplify |
| `AMPLIFY_APP_ID` | ID de la aplicación conectada al repositorio |
| `AWS_ROLE_ARN` | Salida `RoleArn` de la plantilla del rol |

El workflow obtiene credenciales temporales mediante OIDC. El rol permite consultar la aplicación y administrar la aprobación y los jobs de su rama `main`. La conexión GitHub de Amplify utiliza la autorización configurada durante el alta.

### Ejecutar y comprobar un despliegue en Actions

La ruta automática empieza con un push a `main`. Cuando **CI** termina correctamente, **Deploy to AWS Amplify** usa el SHA de esa ejecución de CI. La condición comprueba el resultado, el evento de push, la rama y el repositorio de origen. [Activación mediante workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

Para publicar manualmente, abrir **Actions → Deploy to AWS Amplify → Run workflow**, seleccionar `main` y ejecutar. En ambas rutas, GitHub muestra el commit elegido, las pruebas, el inicio del job remoto y sus cambios de estado. Un error de Amplify, un commit diferente o un tiempo de espera agotado hace fallar la ejecución. Como `RELEASE` puede tomar el último commit de la rama, si `main` avanza durante el despliegue, esperar al CI y al despliegue del commit nuevo o ejecutarlo manualmente. El control en Amplify verifica el SHA real antes de compilar. [Comportamiento de StartJob](https://docs.aws.amazon.com/amplify/latest/APIReference/API_StartJob.html).

La aprobación temporal se registra en la rama con el identificador de la ejecución. El último paso restaura las variables de aprobación anteriores, conserva las demás variables y detiene un job propio que siga pendiente. Las ejecuciones de este workflow se serializan. Durante el despliegue, administrar la aprobación desde esta ejecución para evitar cambios concurrentes desde la consola.

Si el runner desaparece o AWS impide completar la limpieza, revisar el historial de Amplify y las variables de aprobación de la rama antes de reintentar. Retirar una aprobación residual únicamente después de identificar la ejecución y el job correspondientes. Una respuesta perdida al iniciar el job puede requerir comprobar en Amplify si llegó a crearse. El workflow evita reintentar automáticamente esa operación.

Tras un resultado satisfactorio, verificar la URL publicada y las comprobaciones de la sección 5. Para restaurar una versión anterior, integrar un PR de reversión en `main` y seguir el CI y el despliegue automático de ese nuevo commit.

### Aprobación de cada despliegue

`node scripts/check-deploy-approval.cjs` exige tres variables en `main`:

- `MAC_AMPLIFY_DEPLOY_APPROVED=true`
- `MAC_AMPLIFY_APPROVED_BRANCH` igual a `main`
- `MAC_AMPLIFY_APPROVED_COMMIT` igual al SHA completo de 40 caracteres del checkout Git real. Se contrasta con `AWS_COMMIT_ID`; cuando AWS informa `HEAD` en una recompilación, se sigue verificando el commit real, no una aprobación genérica.

También rechaza builds con `AWS_PULL_REQUEST_ID`. Cuando llegue la autorización, configurarlos como **overrides de esa rama**, no globalmente. Son controles operativos, no secretos ni una barrera IAM: alguien con capacidad de editar código/configuración puede cambiarlos. Habilitarlos no sustituye la aprobación del despliegue concreto.

El guard comprueba además que no existan cambios locales en archivos versionados ni archivos no versionados en los insumos del build, aunque estén ignorados por Git. Así, el SHA aprobado no puede acompañar silenciosamente a otros archivos antes del build. Si falla, revisar el checkout; no borrar archivos a ciegas ni quitar el control. Las pruebas ejercitan el comando real en un repositorio temporal y verifican byte por byte la salida completa del build.

La aprobación queda ligada al commit, no a cambios futuros. Tras un despliegue puntual, retirar los overrides de aprobación y mantener auto-build desactivado. Para el siguiente candidato se requiere su aprobación y SHA exacto. `AWS_COMMIT_ID`, `AWS_BRANCH` y `AWS_PULL_REQUEST_ID` proceden de las [variables de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html); no sustituirlas por valores escritos para saltarse el control.

Mantener desactivadas la creación automática de ramas y las vistas previas de PR.

## 4. Validación del candidato

En el commit candidato exacto:

- CI en verde y `dist/` servido localmente en el commit candidato. Registrar el SHA revisado.
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
2. Integrar el candidato revisado en `main` y comprobar el resultado de CI. Completar la revisión del entorno `production` si está configurada.
3. Seguir el workflow automático de publicación o iniciarlo manualmente desde Actions. El workflow define la aprobación del commit, inicia el job de Amplify, coteja su SHA y limpia la aprobación al terminar.
4. Comprobar URL, HTTPS, ES/EN, recursos y contacto en producción. Cambiar DNS solo cuando se haya aprobado ese cambio y se conozca el estado del dominio.
5. Si la comprobación falla, detener la promoción. Con autorización, restaurar el build anterior desde el historial de Amplify o revertir el cambio en Git y desplegar de nuevo. No forzar ni reescribir `main`.
6. Después de una reversión, volver a comprobar HTTPS, navegación, contacto y commit publicado. Si aún no existe una versión de producción anterior, no prometer una reversión instantánea: mantener el sitio anterior y preparar un plan de DNS antes del primer cambio.

La URL, el SHA y el identificador del build permiten verificar una publicación en Amplify. El resultado de CI corresponde a la validación en GitHub.
