# Despliegue de MAC Tecnología en AWS Amplify

## Flujo de publicación

Amplify Hosting está conectado directamente a `craguilar/mac-web`, rama `main`. Cada push a esa rama inicia el pipeline de `amplify.yml`: Node 24, comprobación de la rama, `npm ci`, tipos/pruebas, despliegue del backend Gen 2 y build/publicación de `dist/`. Un fallo en las pruebas o en el build impide publicar ese candidato. El historial y los logs del despliegue se consultan en Amplify.

GitHub Actions conserva **CI** para validar PR y pushes. Ambos sistemas se ejecutan de forma independiente: Amplify no espera el resultado del CI de GitHub. Para exigir CI antes de publicar, configurar la protección de `main` para requerir **Test and build (Node 24)** antes de fusionar y restringir los pushes que evadan esa revisión. Este cambio no modifica las reglas de GitHub.

La interfaz continúa siendo HTML/CSS/JavaScript estático. El contacto usa una API HTTP de API Gateway, una función Lambda administrada por Amplify y SES. No hay base de datos, Cognito ni SDK de Amplify en el navegador. La analítica permanece desconectada.

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
| Comandos de build | Backend: `npm ci`, `npm run check`, `npm test`, `npx ampx pipeline-deploy`; frontend: `npm run build -- --amplify` |
| Directorio de artefactos | `dist` |

Para una aplicación nueva, seleccionar GitHub en Amplify, autorizar su GitHub App para este repositorio y conectar `main`. Amplify gestiona esa conexión. No se necesita crear un rol OIDC de GitHub Actions ni guardar un token en Secrets Manager para el alta desde la consola. [Conexión de Amplify con GitHub](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html).

El archivo `amplify.yml` del repositorio prevalece sobre la especificación guardada en la consola. Mantener allí los comandos y el directorio de salida para que estén versionados. [Configuración del build](https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html).

### Variables de entorno

Configurar **`CONTACT_EMAIL`** en las variables de entorno de la rama **main** de Amplify. Es el buzón receptor confirmado por el propietario; no añadirlo al repositorio público, a `public/` ni a GitHub. El remitente fijo es `web@mactecnologia.com.mx`, y Reply-To contiene el correo validado del visitante. No se necesita una contraseña SMTP.

El resto de la configuración sigue usando la conexión directa:

- `AMPLIFY_APP_ID`, `AWS_ROLE_ARN` y `AWS_REGION` ya no se utilizan como variables de GitHub Actions. Se pueden retirar del entorno `production` si se crearon exclusivamente para este repositorio.
- `MAC_AMPLIFY_DEPLOY_APPROVED`, `MAC_AMPLIFY_APPROVED_BRANCH`, `MAC_AMPLIFY_APPROVED_COMMIT` y `MAC_AMPLIFY_DEPLOY_OWNER` pertenecían al flujo anterior y ya no se utilizan. Retirar esos valores si se añadieron en Amplify.
- `AWS_APP_ID`, `AWS_BRANCH` y `AWS_PULL_REQUEST_ID` los proporciona Amplify. No configurarlos manualmente. El control `scripts/check-deploy-branch.cjs` permite `main` y rechaza vistas previas; no exige una aprobación por commit. [Variables de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html).

Las dependencias del backend están fijadas en `package-lock.json`; tanto CI como Amplify usan `npm ci`. El build de producción falla si falta el endpoint en `amplify_outputs.json`. Solo copia esa URL pública a `dist/assets/contact-config.js`; los outputs completos y el destinatario no se publican.

### Preparación del backend de contacto

1. Verificar que SES en `us-east-2` tenga envío habilitado y acceso de producción. En sandbox, también debe estar verificado el destinatario.
2. Desplegar `infra/contact-prerequisites.yaml` con el ID de la aplicación existente y la zona pública de `mactecnologia.com.mx`. Crea la identidad SES, tres CNAME de Easy DKIM y un rol de servicio para esa aplicación; conserva los registros web y MX existentes. No aplicarla sobre una identidad ya administrada por otra pila: reutilizar/importar la identidad primero.
3. Esperar `VerifiedForSendingStatus=true` y DKIM `SUCCESS`. Los recursos de identidad/DNS tienen retención al borrar la pila; no borrarlos accidentalmente como parte de una reversión de código.
4. Asignar el output `ServiceRoleArn` al rol de servicio de la aplicación Amplify. Usa la política oficial `AmplifyBackendDeployFullAccess`, con confianza limitada a esa aplicación/cuenta.
5. Seguir el [runbook de bootstrap de CDK](cdk-bootstrap-runbook.md) para revisar, ejecutar manualmente y verificar la preparación de la cuenta/región. El bootstrap estándar crea almacenamiento de artefactos y roles de despliegue; su rol de ejecución CloudFormation usa `AdministratorAccess` por defecto. Revisar y aprobar ese alcance o suministrar una política de ejecución restringida antes de ejecutarlo. No se necesita este permiso en el navegador ni en la función de contacto.
6. Configurar `CONTACT_EMAIL` y mantener las vistas previas desactivadas. Confirmar el aviso de privacidad completo y un responsable de revisar el buzón antes de habilitar envíos públicos.

La identidad SES/DKIM y el rol son requisitos de la aplicación existente. `infra/amplify-prod.yaml` sigue siendo una plantilla opcional para una aplicación/rama nueva; no aplicarla encima de la rama existente.

Referencias: [rol de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-service-role.html), [bootstrap de Gen 2](https://docs.amplify.aws/react/build-a-backend/troubleshooting/cdktoolkit-stack/), [verificación DNS de SES](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ses-emailidentity.html).

### Contrato y límites operativos

- `name` obligatorio (160), `email` obligatorio (254), `message` obligatorio (3000), `company` opcional (160), `topic` opcional (`build`, `architecture`, `delivery`) y `language` (`es`/`en`). Se recortan espacios y descartan claves ajenas. Navegador y servidor usan el mismo validador.
- Solo `POST /contact`, JSON de hasta 16 KiB y orígenes raíz/www HTTPS. La dirección To y el remitente los fija el servidor. Los permisos de SES se limitan al dominio, remitente y destinatario configurados.
- Campo honeypot y throttle global de API Gateway: promedio de 0.1 solicitudes/segundo (6/minuto), ráfaga 2. Es un límite compartido y de mejor esfuerzo, no por IP. CORS no autentica y un bot puede falsificar Origin o saltarse el honeypot; revisar métricas y ajustar la protección si hay abuso.
- SES recibe texto plano y Reply-To del visitante. No hay adjuntos, autorespuesta, almacenamiento de mensajes ni reintentos automáticos. Un timeout puede ocurrir después de que SES acepte el correo; un reintento manual puede duplicarlo. No se promete entrega exactamente una vez.
- El cliente conserva el borrador ante fallos, bloquea envíos concurrentes y muestra estados ES/EN accesibles. HTTP 200 significa aceptación de SES, excepto el honeypot descartado intencionalmente. No equivale a entrega en la bandeja de entrada.
- La aplicación no registra contenido ni direcciones; los logs de la función caducan en una semana. Revisar métricas de API Gateway (429/5xx), errores Lambda y reputación/rebotes de SES. El remitente técnico no implica que exista un buzón para recibir rebotes: definir su seguimiento antes de promocionar el formulario. No se añade un sistema de alertas en esta entrega.

## Publicar y verificar

1. Ejecutar `npm ci`, `npm run check`, `npm test` y `npm run build` localmente y revisar el CI del PR.
2. Fusionar el cambio revisado en `main`. Amplify inicia automáticamente su build si auto-build está habilitado.
3. Abrir la aplicación en Amplify, seleccionar `main` y seguir los logs de ese commit. Deben ejecutarse las pruebas y el build antes de que el despliegue termine correctamente.
4. Si no se inicia, comprobar auto-build en **App settings → Branch settings**, confirmar que la conexión GitHub incluye este repositorio y que el mensaje del commit no contiene `[skip-cd]`. Se puede iniciar un build manual desde la rama en Amplify; comprobar que corresponde al commit que contiene el pipeline actualizado.
5. Abrir la URL publicada y comprobar HTTPS, español e inglés, navegación, recursos, licencias y el contacto: errores sin pérdida de borrador, doble clic y un envío sintético autorizado recibido en el buzón; comprobar Reply-To. Registrar el SHA y el identificador del build.

La publicación se sigue en Amplify; GitHub Actions muestra la validación. El workflow anterior **Deploy to AWS Amplify** deja de ejecutarse al fusionar su eliminación. Su historial anterior puede seguir apareciendo en Actions.

### Error «Deployment is not approved»

Ese mensaje procede del antiguo `scripts/check-deploy-approval.cjs`, no de una autorización pendiente de AWS. Fusionar la actualización que elimina ese control y desplegar el commit nuevo de `main`. Reintentar un build de un commit antiguo seguirá ejecutando su archivo `amplify.yml` antiguo. No hace falta añadir variables de aprobación para el flujo actual.

El backend Gen 2 lo despliega el comando `ampx pipeline-deploy`; no crear un backend Gen 1 para resolver mensajes sobre asociación de entornos. Si falta el bootstrap, completar el paso de preparación correspondiente antes de reintentar.

## Validación del sitio

Antes de anunciar el lanzamiento o cambiar el dominio:

- Servir `dist/` localmente con `python3 -m http.server 8000 --directory dist` y revisar `?lang=es` y `?lang=en`.
- Revisar 320, 390, 768 y 1440 px, teclado, foco, contraste, orden de lectura, Safari/iOS y Chrome/Android.
- Probar formulario, errores, envío en curso, timeout, reintento, borrar/deshacer y conservación del borrador al cambiar idioma. Las pruebas locales simulan la red y no mandan correos.
- Confirmar que solo la acción de enviar transmite el formulario y que analítica sigue desconectada. Aplicar los requisitos de la [especificación](PROJECT_PLAN.md) y de [contacto/privacidad](analytics-contact-readiness.md), sin confundir la explicación de finalidad/proveedores con el aviso completo pendiente.
- Comprobar CSS, fuentes, SVG, licencias y avisos. El build publica únicamente el contenido de `public/`, licencias y avisos en `dist/`; excluir archivos privados y credenciales.
- Mantener errores correctos para recursos inexistentes. El sitio usa anclas y `?lang=`, por lo que no necesita una reescritura global 200 de SPA. [Reglas de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html).
- Definir y probar cabeceras de seguridad, CSP y caché. Evitar caché `immutable` larga para assets sin hash en el nombre.
- Completar SEO bilingüe, metadatos, canonical y sitemap para el dominio confirmado. El documento inicial está en inglés y el contenido se renderiza con JavaScript.
- Confirmar titularidad y acceso DNS de `mactecnologia.com.mx`, variante canónica, certificado, responsable operativo y alertas de gasto antes del cambio de dominio.

Las pruebas automáticas no sustituyen una revisión completa de accesibilidad, navegador o recepción real de correo.

## Reversión

Registrar el último commit y build correctos. Ante un fallo del sitio publicado, integrar un PR de reversión en `main` y seguir el nuevo build automático de Amplify. Conservar el historial de Git; no forzar ni reescribir `main`.

Una reversión a la versión estática anterior no elimina los recursos de contacto. Para detener envíos de inmediato, deshabilitar la función de contacto (concurrencia reservada 0) en AWS; luego reparar y restaurar su configuración. No borrar CDKToolkit ni la identidad SES durante una reversión ordinaria.

Después de restaurar, volver a comprobar HTTPS, navegación, idioma, contacto y commit publicado. Antes del primer cambio de dominio, conservar el sitio anterior si existe y preparar la recuperación del DNS. Si aún no existe un build correcto anterior, no asumir una reversión instantánea.
