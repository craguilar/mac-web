# Seguridad del contacto público

El formulario usa API Gateway, Lambda y SES; Turnstile valida cada intento en el servidor. La clave pública puede estar en el sitio. El secreto, el destinatario y las credenciales AWS se configuran fuera del repositorio. CORS y el honeypot no son autenticación.

## Activar el formulario en Amplify

Completar primero los [requisitos AWS](cdk-bootstrap-runbook.md) y el [despliegue](launch-runbook.md).

1. Crear un widget **Managed** en [Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile), limitado a `mactecnologia.com.mx` y `www.mactecnologia.com.mx`. No requiere cambiar DNS. No añadir localhost, previews ni comodines.
2. Configurar la rama `main` de Amplify:

   | Nombre | Ubicación | Valor |
   | --- | --- | --- |
   | `TURNSTILE_SITE_KEY` | Variables de entorno | Clave pública de producción |
   | `TURNSTILE_SECRET_KEY` | Secrets | Secreto del widget |
   | `CONTACT_EMAIL` | Variables de entorno | Buzón receptor privado |
   | `CONTACT_API_ID` | Variables de entorno | Output `ContactApiId` de los requisitos AWS |
   | `CONTACT_ENABLED` | Variables de entorno | `false` durante la preparación |

   `AWS_APP_ID` lo proporciona Amplify. No copiar secretos a GitHub, `.env` ni archivos públicos.
3. Completar el aviso de privacidad y desplegar el backend y el sitio con envíos desactivados. **El build de producción exige una clave pública válida incluso con `CONTACT_ENABLED=false`.**
4. Confirmar las alertas descritas abajo. Para abrir el formulario, cambiar `CONTACT_ENABLED=true`, volver a desplegar y verificar un envío autorizado, recepción y Reply-To. Las pruebas automáticas no envían correo real.

Lambda exige un token válido con hostname permitido y `action=contact`. La falta de configuración, una verificación fallida o los envíos desactivados impiden llamar a SES. Remitente y destinatario son fijos; el correo del visitante solo se usa como Reply-To. No se guardan mensajes ni tokens en almacenamiento del navegador ni se registran en logs.

## Proteger GitHub

Solo `craguilar` puede fusionar hacia `main`, aunque otra persona apruebe el PR. Cuatro reglas mantienen separadas las excepciones:

| Regla | Control |
| --- | --- |
| Only craguilar may merge main | Solo la cuenta exacta del propietario puede actualizar la rama mediante PR |
| Main safety without bypass | PR obligatorio, conversaciones resueltas, sin borrado ni force pushes; sin excepciones |
| Required CI for main | Rama actualizada y check `Test and build (Node 24)` de GitHub Actions; sin excepciones |
| Main enforced | Revisión de CODEOWNERS, aprobaciones caducadas al cambiar código y revisión del último push |

El propietario tiene una excepción **solo de revisión y solo mediante PR** para poder fusionar sus propios cambios. No evita CI, conversaciones pendientes ni las otras protecciones. `CODEOWNERS` asigna todos los archivos a `craguilar` cuando este archivo está en la rama base. Auto-merge está desactivado. El propietario sigue pudiendo administrar las reglas; proteger su cuenta con MFA/passkey y sus tokens es esencial.

Desde la raíz del repositorio, con Node 24 y `gh` autenticado como `craguilar`:

```powershell
node scripts/harden-github.ts           # Vista previa
node scripts/harden-github.ts --apply   # Aplicar y comprobar
node scripts/harden-github.ts --verify  # Comprobar sin cambios
```

El script comprueba identidad, propiedad, rama y permisos antes de escribir. También habilita alertas y correcciones de Dependabot, reportes privados de vulnerabilidades, secret scanning, push protection y CodeQL para JavaScript/TypeScript y Actions. CodeQL analiza de forma asíncrona; revisar sus hallazgos en Security. Es un análisis adicional, no un requisito de fusión independiente. `.github/dependabot.yml` programa actualizaciones semanales; sus PRs requieren CI y fusión del propietario.

Actions tiene permisos de lectura por defecto, no puede aprobar PRs, exige aprobación para ejecuciones de colaboradores externos y permite únicamente acciones de GitHub fijadas a SHA completo. Revisar cambios de workflows antes de autorizar su ejecución: pueden solicitar permisos adicionales. No ejecutar código de forks mediante `pull_request_target` ni guardar credenciales AWS de producción en Actions.

Si un paso falla, revisar lo ya aplicado antes de repetir. Si CodeQL sigue configurándose, esperar a que termine **CodeQL Setup** y ejecutar `--verify`. Para cambiar la cuenta activa sin modificar el protocolo Git:

```powershell
gh auth switch --hostname github.com --user craguilar
gh api user --jq .login
```

## Alertas y límites

Lambda admite dos ejecuciones concurrentes, 128 MiB y diez segundos. API Gateway aplica un límite global de mejor esfuerzo de 0.1 solicitudes/segundo y ráfaga 2; no es un límite por visitante. El backend crea alarmas de más de 60 solicitudes en 15 minutos y al menos 3 respuestas 5xx en cinco minutos.

Tras desplegar el backend, suscribir el correo operativo al tema SNS `mac-web-<APP_ID>-contact-alerts` y **confirmar el correo de suscripción**. En CloudShell:

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

Las alarmas no imponen un límite de gasto ni sustituyen el seguimiento de rebotes y quejas de SES. Configurar un presupuesto AWS y confirmar que las alertas llegan al responsable.

## Detener y restaurar envíos

Copiar el nombre físico de la función `contactlambda` desde Lambda. Para detener nuevas invocaciones en CloudShell:

```bash
REGION=us-east-2
FUNCTION_NAME="REEMPLAZAR_POR_NOMBRE_FISICO_DE_CONTACTO"
aws lambda put-function-concurrency --region "$REGION" \
  --function-name "$FUNCTION_NAME" --reserved-concurrent-executions 0
```

Las invocaciones en curso pueden terminar. Configurar también `CONTACT_ENABLED=false` y desplegar: un despliegue puede restaurar la concurrencia definida en infraestructura. Tras corregir el problema, volver a desplegar con `CONTACT_ENABLED=true` y restaurar concurrencia 2 si sigue en cero. No borrar SES, DNS ni CDKToolkit.

Turnstile reduce abuso, pero no garantiza mensajes legítimos y su rechazo de tokens reutilizados es eventualmente consistente. Un reintento manual tras un timeout puede duplicar un correo; SES aceptado tampoco garantiza llegada al buzón.

Referencias: [verificación de Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [secretos de Amplify](https://docs.amplify.aws/javascript/deploy-and-host/amplify-hosting/secrets-and-vars/), [reglas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
