# Seguridad del contacto público

El código y la clave pública de Turnstile pueden estar en un repositorio público. La autorización para enviar correo se decide en Lambda: destinatario/remitente fijos, validación de campos y token verificado con Cloudflare. Origin/CORS y el honeypot son controles adicionales; no son autenticación.

## Activar Turnstile

1. Crear un widget **Managed** en [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile). Permitir solamente `mactecnologia.com.mx` y `www.mactecnologia.com.mx`. No es necesario mover DNS ni usar el CDN de Cloudflare. No añadir localhost, previews ni comodines al widget de producción.
2. En las variables de la rama `main` de Amplify, configurar `TURNSTILE_SITE_KEY` con la clave **pública**. El build rechaza valores vacíos y claves de prueba.
3. Guardar `TURNSTILE_SECRET_KEY` en **Secrets de Amplify**, para `main`. No es una variable de Hosting normal, una variable de GitHub ni un archivo `.env` del repositorio. La función obtiene el secreto desde SSM en ejecución mediante `secret('TURNSTILE_SECRET_KEY')`.
4. Conservar `CONTACT_EMAIL` como el destinatario privado confirmado. Configurar `CONTACT_API_ID` con el output de la pila de requisitos. `AWS_APP_ID` lo proporciona Amplify.
5. Mantener `CONTACT_ENABLED=false` hasta completar las claves y la revisión del aviso de privacidad. Para habilitar envíos, cambiarlo a `true` y desplegar el PR revisado. Falta de configuración, fallos de Cloudflare o tokens inválidos nunca permiten enviar correo.
6. Verificar un envío real autorizado, recepción y Reply-To después del despliegue. Las pruebas automáticas usan dobles de Cloudflare/SES y no demuestran recepción en el buzón.

El servidor exige `success=true`, hostname coincidente con el origen permitido y `action=contact`. Los tokens caducan y el navegador obtiene uno nuevo después de cada intento; cambiar de idioma elimina el widget anterior sin perder el borrador. No se guardan tokens ni mensajes en almacenamiento del navegador. La verificación no transmite el texto de la consulta a Cloudflare. La información de proveedores del formulario sigue sin reemplazar el aviso de privacidad completo.

Referencias: [widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [verificación del servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [secretos de Amplify](https://docs.amplify.aws/javascript/build-a-backend/functions/environment-variables-and-secrets/).

## Proteger GitHub

Desde PowerShell, autenticar la cuenta propietaria. Estos comandos conservan el protocolo SSH existente y omiten crear/subir claves SSH; seleccionar `craguilar` en el navegador. El permiso `workflow` permite publicar los cambios de CI:

```powershell
gh auth login --hostname github.com --web --git-protocol ssh --skip-ssh-key --scopes workflow
gh auth switch --hostname github.com --user craguilar
gh api user --jq .login
```

Desde la raíz del checkout de este PR, revisar y aplicar:

```powershell
node scripts/harden-github.ts
node scripts/harden-github.ts --apply
git config --local user.email "6916098+craguilar@users.noreply.github.com"
```

El script exige `craguilar` con permisos de administración. Conserva las restricciones y excepciones de revisión existentes, descarta aprobaciones antiguas, exige resolver conversaciones y crea una regla de CI para `main` sin excepciones. Vincula el check al ID observado de GitHub Actions. Activa secret scanning y push protection, deja el token de Actions en lectura y exige aprobación para ejecutar workflows de colaboradores externos. No fusiona PRs ni cambia Amplify. Si un paso falla, informa el error; revisar lo ya aplicado y volver a ejecutar es seguro.

`CODEOWNERS` identifica los archivos de despliegue para revisión del propietario; por sí solo no impone una aprobación adicional. Los workflows permanecen sin credenciales AWS, con acciones fijadas por SHA y checkout sin credenciales persistentes. No introducir `pull_request_target` que ejecute código de forks.

Activar MFA/passkey en la cuenta GitHub y en los accesos AWS/Cloudflare. Esa configuración personal requiere la sesión del propietario. La dirección noreply afecta commits futuros; no elimina una dirección ya publicada en el historial. No reescribir el historial como parte de este cambio.

## Alertas y límites

La función admite dos ejecuciones concurrentes, 128 MiB y diez segundos. API Gateway limita globalmente a 0.1 solicitudes/segundo, ráfaga 2. Se crean dos alarmas: más de 60 solicitudes en 15 minutos y al menos 3 respuestas 5xx en cinco minutos. Publican en `mac-web-<APP_ID>-contact-alerts`.

Después de desplegar el backend, suscribir el correo operativo desde SNS y **confirmar el correo de suscripción**. Alternativa en CloudShell (Bash):

```bash
REGION=us-east-2
APP_ID="REEMPLAZAR_POR_APP_ID"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
read -r -p "Correo para alertas: " ALERT_EMAIL
aws sns subscribe --region "$REGION" \
  --topic-arn "arn:aws:sns:${REGION}:${ACCOUNT_ID}:mac-web-${APP_ID}-contact-alerts" \
  --protocol email --notification-endpoint "$ALERT_EMAIL"
unset ALERT_EMAIL
```

Crear alarmas no confirma suscripciones ni envía correos de prueba. Revisar el estado `Confirmed` antes de contar con notificaciones. Las alertas son de tráfico/fallos, no un límite de gasto. El throttle es de mejor esfuerzo; solicitudes rechazadas y otros servicios pueden seguir generando cargos. Configurar además un presupuesto AWS según el monto elegido por el propietario. Revisar reputación, rebotes y quejas de SES; estas alarmas no los sustituyen.

## Detener envíos

Identificar en Lambda la función física `contactlambda` de esta aplicación y copiar su nombre exacto. En CloudShell:

```bash
REGION=us-east-2
FUNCTION_NAME="REEMPLAZAR_POR_NOMBRE_FISICO_DE_CONTACTO"
aws lambda put-function-concurrency --region "$REGION" \
  --function-name "$FUNCTION_NAME" --reserved-concurrent-executions 0
```

Esto bloquea nuevas invocaciones; las que ya estaban en curso pueden terminar. Configurar también `CONTACT_ENABLED=false` en Amplify y desplegar para mantener el envío desactivado. Para restaurar después de reparar y verificar claves, usar `CONTACT_ENABLED=true`, desplegar y ejecutar:

```bash
aws lambda put-function-concurrency --region "$REGION" \
  --function-name "$FUNCTION_NAME" --reserved-concurrent-executions 2
```

No deshabilitar SES para toda la cuenta ni borrar la identidad, DNS o CDKToolkit. No registrar cuerpos, tokens, secretos, correos ni respuestas completas del proveedor durante el diagnóstico.

## Alcance restante

Turnstile reduce abuso automatizado, pero no garantiza que todo mensaje sea legítimo. Su detección de reutilización es eventualmente consistente; un token reutilizado muy rápido puede validarse más de una vez. Tampoco hay deduplicación persistente de SES: un reintento manual después de un timeout ambiguo puede duplicar un correo. Se conserva la arquitectura mínima, sin base de datos, cuentas de visitantes ni respuestas automáticas.
