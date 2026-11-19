# Bootstrap restringido de CDK para el contacto

Este backend usa un bootstrap dedicado a la aplicación MAC y a `main`. `infra/contact-bootstrap.yaml` implementa el contrato de archivos de CDK versión 6 requerido por la síntesis actual: bucket privado/versionado, roles de publicación y despliegue, rol de ejecución CloudFormation y parámetro SSM. No instala roles de lookup ni publicación de contenedores. Añadir esos usos requiere revisar la infraestructura y los permisos.

La plantilla no adjunta `AdministratorAccess` ni `AmplifyBackendDeployFullAccess`. El plan administrativo anterior `cdk-deploy-change-set` no debe ejecutarse. La revisión automática lo había rechazado por sus permisos administrativos persistentes; este procedimiento lo sustituye por permisos limitados a la aplicación.

## Modelo de permisos

- La pila de requisitos crea SES/DKIM, el HTTP API fijo con CORS/throttle y las políticas de despliegue/runtime. El API se provisiona aquí para poder limitar los permisos a su ID exacto.
- El rol de Amplify confía solo en la aplicación/cuenta y puede asumir únicamente los roles CDK de despliegue y archivos. Las vistas previas de PR permanecen desactivadas.
- El rol CDK puede operar solo pilas `amplify-<APP_ID>-main-*` y pasar únicamente su rol de ejecución a CloudFormation. No puede actualizar la pila de requisitos ni CDKToolkit.
- CloudFormation administra funciones/roles de esa aplicación, las rutas del API concreto y las alarmas/tópico de contacto. Crear roles exige el permissions boundary de runtime; no puede quitarlo ni editar la política que lo define.
- El boundary limita permisos máximos de las tres funciones generadas: correo con destinatario/remitente fijos, un secreto Turnstile, logs de la aplicación y las operaciones mínimas del enlazador de rama de Amplify. No concede IAM ni STS a las funciones.

La escritura en `main` sigue siendo una operación de confianza: puede cambiar el código de esta aplicación y acceder a su secreto. La política limita el alcance del despliegue, no convierte código no confiable en seguro. [Permissions boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html), [bootstrap personalizado](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-customizing.html).

## Preparar y revisar

Ejecutar desde un checkout revisado de este PR en CloudShell, con Bash y una sesión propietaria autorizada. No colocar credenciales AWS en GitHub. Los bloques comparten variables.

```bash
set -euo pipefail
export AWS_PAGER=""
REGION=us-east-2
APP_ID="REEMPLAZAR_POR_APP_ID"
ZONE_ID="REEMPLAZAR_POR_ZONA_PUBLICA"
EXPECTED_ACCOUNT_ID="REEMPLAZAR_POR_ID_DE_12_DIGITOS"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
[[ "$EXPECTED_ACCOUNT_ID" =~ ^[0-9]{12}$ && "$ACCOUNT_ID" == "$EXPECTED_ACCOUNT_ID" ]] || exit 1
read -r -p "Buzón receptor privado: " CONTACT_EMAIL
aws cloudformation deploy --region "$REGION" \
  --stack-name mac-web-contact-prerequisites \
  --template-file infra/contact-prerequisites.yaml \
  --parameter-overrides "AmplifyAppId=$APP_ID" "HostedZoneId=$ZONE_ID" "ContactEmail=$CONTACT_EMAIL" \
  --capabilities CAPABILITY_NAMED_IAM --no-execute-changeset
unset CONTACT_EMAIL
```

Revisar el ARN de change set que imprime la CLI: conserva SES/DKIM y el rol existente; añade el API, stage y políticas. No reemplazar identidad/DNS ni cambiar recursos de otras aplicaciones. `ContactEmail` usa `NoEcho`; no publicar parámetros ni capturas del buzón. Si la identidad ya pertenece a otra pila, importarla/reutilizarla antes de crear una segunda.

Ejecutar **el ARN del plan restringido revisado** y esperar su finalización:

```bash
PREREQUISITES_CHANGE_SET="REEMPLAZAR_POR_ARN_REVISADO"
aws cloudformation execute-change-set --region "$REGION" --change-set-name "$PREREQUISITES_CHANGE_SET"
# Para la pila existente:
aws cloudformation wait stack-update-complete --region "$REGION" --stack-name mac-web-contact-prerequisites
# En una instalación nueva, usar stack-create-complete.
SERVICE_ROLE_ARN="$(aws cloudformation describe-stacks --region "$REGION" \
  --stack-name mac-web-contact-prerequisites --query "Stacks[0].Outputs[?OutputKey=='ServiceRoleArn'].OutputValue | [0]" --output text)"
```

El bootstrap es para una pila inexistente o `REVIEW_IN_PROGRESS`. No reemplazar un CDKToolkit ya desplegado/compartido sin inventariar sus consumidores. Preparar:

```bash
aws cloudformation deploy --region "$REGION" --stack-name CDKToolkit \
  --template-file infra/contact-bootstrap.yaml \
  --parameter-overrides "AmplifyAppId=$APP_ID" "AmplifyServiceRoleArn=$SERVICE_ROLE_ARN" \
  --capabilities CAPABILITY_NAMED_IAM --no-execute-changeset
```

Revisar que solo se creen los recursos de esta plantilla, que el rol de ejecución adjunte `mac-web-<APP_ID>-deployment` y que la confianza de despliegue/archivos nombre el rol de esta aplicación. Eliminar el change set administrativo antiguo **sin ejecutarlo** si sigue presente. Ejecutar el nuevo ARN:

```bash
BOOTSTRAP_CHANGE_SET="REEMPLAZAR_POR_ARN_RESTRINGIDO_REVISADO"
aws cloudformation execute-change-set --region "$REGION" --change-set-name "$BOOTSTRAP_CHANGE_SET"
aws cloudformation wait stack-create-complete --region "$REGION" --stack-name CDKToolkit
aws cloudformation update-termination-protection --region "$REGION" --stack-name CDKToolkit --enable-termination-protection
```

## Verificar y conectar

```bash
aws cloudformation describe-stacks --region "$REGION" --stack-name CDKToolkit \
  --query 'Stacks[0].{Status:StackStatus,Protected:EnableTerminationProtection,Outputs:Outputs}' --output json
aws ssm get-parameter --region "$REGION" --name /cdk-bootstrap/hnb659fds/version --query Parameter.Value --output text
aws iam list-attached-role-policies \
  --role-name "cdk-hnb659fds-cfn-exec-role-${ACCOUNT_ID}-${REGION}" --output table
aws cloudformation describe-stacks --region "$REGION" --stack-name mac-web-contact-prerequisites \
  --query 'Stacks[0].Outputs' --output table
```

Comprobar estados completos, versión 6, protección de borrado y únicamente la política de ejecución restringida. Asignar `ServiceRoleArn` al rol de servicio de la aplicación y `ContactApiId` a `CONTACT_API_ID` de `main`, conservando sus otras variables. Completar [Turnstile, alertas y activación](contact-security.md). No añadir claves AWS ni variables de despliegue a GitHub.

El bootstrap no publica el sitio ni envía correo. Mantener el PR sin fusionar hasta terminar la configuración pendiente y después seguir la [guía de despliegue](launch-runbook.md#publicar-y-verificar). Los primeros despliegues deben comprobar también la ejecución real con estas políticas: síntesis, lint y simulación IAM no sustituyen esa prueba.

Ante `AccessDenied`, identificar la operación/recurso y revisar una ampliación puntual; no adjuntar AdministratorAccess como solución. Consultar eventos de CloudFormation antes de reintentar. Una reversión ordinaria no borra CDKToolkit, el bucket retenido, SES ni DNS.
