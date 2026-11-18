# Despliegue de MAC Tecnología en AWS Amplify

## Flujo de publicación

Amplify Hosting está conectado directamente a `craguilar/mac-web`, rama `main`. Cada push a esa rama inicia el pipeline de `amplify.yml`: Node 24, comprobación de la rama, `npm test`, `npm run build` y publicación de `dist/`. Un fallo en las pruebas o en el build impide publicar ese candidato. El historial y los logs del despliegue se consultan en Amplify.

GitHub Actions conserva **CI** para validar PR y pushes. Ambos sistemas se ejecutan de forma independiente: Amplify no espera el resultado del CI de GitHub. Para exigir CI antes de publicar, configurar la protección de `main` para requerir **Test and build (Node 24)** antes de fusionar y restringir los pushes que evadan esa revisión. Este cambio no modifica las reglas de GitHub.

El sitio es HTML/CSS/JavaScript estático, sin dependencias npm ni backend. El contacto sigue siendo una demostración: no envía mensajes. La publicación del sitio no activa correo ni analítica.

## Configuración en Amplify

Para una aplicación ya conectada, conservarla y verificar estos valores:

| Elemento | Valor |
| --- | --- |
| Región de la aplicación actual | `us-east-2` |
| Repositorio | `craguilar/mac-web` |
| Plataforma | `WEB`, sitio estático |
| Única rama alojada | `main`, stage `PRODUCTION` |
| Builds automáticos de `main` | Habilitados |
| Creación automática de ramas | Desactivada |
| Vistas previas de PR | Desactivadas |
| Raíz del proyecto | Raíz del repositorio |
| Imagen de build | Amazon Linux 2023, Node 24 mediante `nvm use 24` |
| Build spec | `amplify.yml` del repositorio |
| Comandos de build | `npm test`, después `npm run build` |
| Directorio de artefactos | `dist` |

Para una aplicación nueva, seleccionar GitHub en Amplify, autorizar su GitHub App para este repositorio y conectar `main`. Amplify gestiona esa conexión. No se necesita crear un rol OIDC de GitHub Actions ni guardar un token en Secrets Manager para el alta desde la consola. [Conexión de Amplify con GitHub](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html).

El archivo `amplify.yml` del repositorio prevalece sobre la especificación guardada en la consola. Mantener allí los comandos y el directorio de salida para que estén versionados. [Configuración del build](https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html).

### Variables de entorno

Este sitio no necesita variables personalizadas para compilar o publicar con la conexión directa:

- `AMPLIFY_APP_ID`, `AWS_ROLE_ARN` y `AWS_REGION` ya no se utilizan como variables de GitHub Actions. Se pueden retirar del entorno `production` si se crearon exclusivamente para este repositorio.
- `MAC_AMPLIFY_DEPLOY_APPROVED`, `MAC_AMPLIFY_APPROVED_BRANCH`, `MAC_AMPLIFY_APPROVED_COMMIT` y `MAC_AMPLIFY_DEPLOY_OWNER` pertenecían al flujo anterior y ya no se utilizan. Retirar esos valores si se añadieron en Amplify.
- `AWS_BRANCH` y `AWS_PULL_REQUEST_ID` los proporciona Amplify. No configurarlos manualmente. El control `scripts/check-deploy-branch.cjs` permite `main` y rechaza vistas previas; no exige una aprobación por commit. [Variables de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html).

No se usa `npm ci` ni caché de paquetes porque no hay dependencias ni lockfile. Si se agregan dependencias, incorporar un lockfile revisado y actualizar CI y Amplify en el mismo cambio.

### Infraestructura opcional

La [plantilla CloudFormation](../infra/amplify-prod.yaml) permite crear una aplicación y su rama `main`, o crear `main` en una aplicación existente que todavía no aloje esa rama. Habilita auto-build para `main` y mantiene desactivadas las vistas previas y la creación automática de ramas.

No es necesario desplegar esta plantilla para una aplicación ya conectada desde la consola. Tampoco debe aplicarse encima de una rama existente administrada fuera de la pila. La creación de una aplicación mediante CloudFormation conserva sus propios requisitos de conexión de GitHub, descritos en la documentación de AWS; no son requisitos del flujo desde la consola.

## Publicar y verificar

1. Ejecutar `npm test` y `npm run build` localmente y revisar el CI del PR.
2. Fusionar el cambio revisado en `main`. Amplify inicia automáticamente su build si auto-build está habilitado.
3. Abrir la aplicación en Amplify, seleccionar `main` y seguir los logs de ese commit. Deben ejecutarse las pruebas y el build antes de que el despliegue termine correctamente.
4. Si no se inicia, comprobar auto-build en **App settings → Branch settings**, confirmar que la conexión GitHub incluye este repositorio y que el mensaje del commit no contiene `[skip-cd]`. Se puede iniciar un build manual desde la rama en Amplify; comprobar que corresponde al commit que contiene el pipeline actualizado.
5. Abrir la URL publicada y comprobar HTTPS, español e inglés, navegación, recursos, licencias y el comportamiento de demostración del contacto. Registrar el SHA y el identificador del build.

La publicación se sigue en Amplify; GitHub Actions muestra la validación. El workflow anterior **Deploy to AWS Amplify** deja de ejecutarse al fusionar su eliminación. Su historial anterior puede seguir apareciendo en Actions.

### Error «Deployment is not approved»

Ese mensaje procede del antiguo `scripts/check-deploy-approval.cjs`, no de una autorización pendiente de AWS. Fusionar la actualización que elimina ese control y desplegar el commit nuevo de `main`. Reintentar un build de un commit antiguo seguirá ejecutando su archivo `amplify.yml` antiguo. No hace falta añadir variables de aprobación para el flujo actual.

El mensaje «No backend environment association found, continuing...» es compatible con este sitio estático: no hay backend de Amplify asociado.

## Validación del sitio

Antes de anunciar el lanzamiento o cambiar el dominio:

- Servir `dist/` localmente con `python3 -m http.server 8000 --directory dist` y revisar `?lang=es` y `?lang=en`.
- Revisar 320, 390, 768 y 1440 px, teclado, foco, contraste, orden de lectura, Safari/iOS y Chrome/Android.
- Probar formulario, errores, volver a editar, copiar, borrar/deshacer y conservación del borrador al cambiar idioma. Conservar los rótulos de demostración hasta implementar el envío real.
- Confirmar que contacto y analítica no realizan solicitudes mientras sigan desconectados. Para habilitarlos, aplicar los requisitos de la [especificación](PROJECT_PLAN.md) y de [contacto/privacidad](analytics-contact-readiness.md), con destinatario real y pruebas de fallo.
- Comprobar CSS, fuentes, SVG, licencias y avisos. El build publica únicamente el contenido de `public/`, licencias y avisos en `dist/`; excluir archivos privados y credenciales.
- Mantener errores correctos para recursos inexistentes. El sitio usa anclas y `?lang=`, por lo que no necesita una reescritura global 200 de SPA. [Reglas de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html).
- Definir y probar cabeceras de seguridad, CSP y caché. Evitar caché `immutable` larga para assets sin hash en el nombre.
- Completar SEO bilingüe, metadatos, canonical y sitemap para el dominio confirmado. El documento inicial está en inglés y el contenido se renderiza con JavaScript.
- Confirmar titularidad y acceso DNS de `mactecnologia.com.mx`, variante canónica, certificado, responsable operativo y alertas de gasto antes del cambio de dominio.

Las pruebas automáticas no sustituyen una revisión completa de accesibilidad, navegador o recepción real de correo.

## Reversión

Registrar el último commit y build correctos. Ante un fallo del sitio publicado, integrar un PR de reversión en `main` y seguir el nuevo build automático de Amplify. Conservar el historial de Git; no forzar ni reescribir `main`.

Después de restaurar, volver a comprobar HTTPS, navegación, idioma, contacto y commit publicado. Antes del primer cambio de dominio, conservar el sitio anterior si existe y preparar la recuperación del DNS. Si aún no existe un build correcto anterior, no asumir una reversión instantánea.
