# Bootstrap de AWS CDK para Amplify Gen 2

Este procedimiento prepara una cuenta/región para desplegar el backend de contacto. Lo ejecuta el propietario desde **AWS CloudShell, con Bash**, en `us-east-2`. No requiere clonar el repositorio ni guardar claves AWS en GitHub. Los bloques siguientes comparten variables: ejecutarlos en la misma sesión.

## Alcance de los permisos

El bootstrap estándar crea la pila `CDKToolkit`, un bucket privado de artefactos, un repositorio ECR, roles IAM y un parámetro de versión en SSM. El rol de ejecución de CloudFormation conserva **`AdministratorAccess`** después del bootstrap: «una vez» se refiere a preparar la cuenta/región, no a permisos temporales. Otros despliegues CDK que utilicen este bootstrap pueden compartir esos recursos y permisos.

El rol de servicio de Amplify puede asumir los roles de despliegue del bootstrap. Por eso el código que se publique desde `main` debe ser de confianza. El rol de la función de contacto sigue teniendo sus permisos propios y limitados de SES. Consultar el [alcance del bootstrap y sus recursos](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html) y la [opción de políticas de ejecución](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-bootstrap.html).

La revisión automática no ejecutó el bootstrap por el alcance administrativo persistente. El procedimiento queda disponible para ejecución manual del propietario. Si se desea una política restringida, usar la alternativa al final antes de ejecutar el change set administrativo.

## 1. Confirmar cuenta y región

Entrar a AWS con una sesión autorizada para crear estos recursos, abrir CloudShell y sustituir el marcador por el ID de 12 dígitos de la cuenta que aloja MAC Tecnología. No publicar ese valor ni las salidas de la sesión en este repositorio.

```bash
set -euo pipefail
export AWS_PAGER=""
REGION="us-east-2"
STACK_NAME="CDKToolkit"
EXPECTED_ACCOUNT_ID="REEMPLAZAR_POR_ID_DE_12_DIGITOS"

[[ "$EXPECTED_ACCOUNT_ID" =~ ^[0-9]{12}$ ]] || { echo "Sustituye el ID de cuenta antes de continuar."; exit 1; }
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
[[ "$ACCOUNT_ID" == "$EXPECTED_ACCOUNT_ID" ]] || { echo "La sesión pertenece a otra cuenta."; exit 1; }
aws sts get-caller-identity --query '{Account:Account,Arn:Arn}' --output table
```

Consultar el estado sin modificar recursos:

```bash
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].{Status:StackStatus,TerminationProtection:EnableTerminationProtection}' --output table
```

- `REVIEW_IN_PROGRESS`: continuar con el change set preparado.
- `CREATE_COMPLETE` o `UPDATE_COMPLETE`: ir directamente a verificación; no recrear ni sustituir un bootstrap existente.
- La pila no existe: usar la alternativa de preparación al final y después continuar en el paso 2. Si Bash cerró la sesión por el error, repetir el paso 1 hasta la comprobación de identidad para recuperar las variables.
- Otro estado: revisar los eventos de CloudFormation antes de continuar.

## 2. Revisar el change set preparado

Al redactar este procedimiento, `CDKToolkit` estaba en `REVIEW_IN_PROGRESS`, y `cdk-deploy-change-set` estaba en `CREATE_COMPLETE` / `AVAILABLE`. Estos son estados del plan de cambios: todavía no se han creado sus recursos.

Obtener su ARN y comprobar que sigue disponible. La ejecución usará ese ARN para apuntar al mismo plan revisado, aunque después se reutilice su nombre.

```bash
CHANGE_SET_ID="$(aws cloudformation describe-change-set \
  --stack-name "$STACK_NAME" --change-set-name cdk-deploy-change-set --region "$REGION" \
  --query ChangeSetId --output text)"

CHANGE_SET_STATE="$(aws cloudformation describe-change-set --change-set-name "$CHANGE_SET_ID" \
  --region "$REGION" --query '[Status,ExecutionStatus]' --output text)"
[[ "$CHANGE_SET_STATE" == $'CREATE_COMPLETE\tAVAILABLE' ]] || { echo "El change set no está disponible; revisar su estado."; exit 1; }

aws cloudformation describe-change-set --change-set-name "$CHANGE_SET_ID" --region "$REGION" \
  --query 'Changes[].ResourceChange.{Action:Action,Resource:LogicalResourceId,Type:ResourceType}' --output table
aws cloudformation describe-change-set --change-set-name "$CHANGE_SET_ID" --region "$REGION" \
  --query Parameters --output table
aws cloudformation get-template --change-set-name "$CHANGE_SET_ID" --region "$REGION" \
  --template-stage Original --output json > cdk-bootstrap-review.json
```

Revisar también la plantilla en **CloudFormation → CDKToolkit → Change sets → cdk-deploy-change-set → Template**. Para este primer bootstrap, esperar solo altas de recursos de CDK, sin modificaciones ni eliminaciones de infraestructura existente. Verificar:

- `Qualifier`: `hnb659fds`.
- `TrustedAccounts` y `TrustedAccountsForLookup`: vacíos; no se añade confianza a otras cuentas.
- `PublicAccessBlockConfiguration`: `true`.
- `CloudFormationExecutionPolicies`: vacío en el plan preparado significa que la plantilla aplica **`AdministratorAccess` por defecto**, no que el rol carezca de permisos. Revisar `CloudFormationExecutionRole` en la plantilla.

Si el change set cambió, no existe o contiene operaciones inesperadas, detenerse y revisar/preparar uno nuevo. `cdk-bootstrap-review.json` es evidencia local, no un archivo para subir al repositorio.

## 3. Ejecutar manualmente

Ejecutar este bloque únicamente después de revisar y aceptar el alcance persistente descrito arriba. Es el paso que crea los recursos AWS.

```bash
aws cloudformation execute-change-set --change-set-name "$CHANGE_SET_ID" --region "$REGION" \
  --no-disable-rollback
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
```

Si la espera termina con error, consultar el estado y los eventos antes de reintentar. Un timeout del comando no demuestra que AWS haya detenido la creación. [Ejecución de change sets](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/execute-change-set.html), [espera de creación](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-create-complete.html).

## 4. Verificar y proteger la pila

```bash
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].{Status:StackStatus,Outputs:Outputs}' --output json
aws ssm get-parameter --name /cdk-bootstrap/hnb659fds/version --region "$REGION" \
  --query Parameter.Value --output text

EXECUTION_ROLE_NAME="$(aws cloudformation describe-stack-resource --stack-name "$STACK_NAME" \
  --logical-resource-id CloudFormationExecutionRole --region "$REGION" \
  --query StackResourceDetail.PhysicalResourceId --output text)"
aws iam list-attached-role-policies --role-name "$EXECUTION_ROLE_NAME" --output table

aws cloudformation update-termination-protection --stack-name "$STACK_NAME" --region "$REGION" \
  --enable-termination-protection
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].{Status:StackStatus,TerminationProtection:EnableTerminationProtection}' --output table
```

La salida debe mostrar `CREATE_COMPLETE` (o `UPDATE_COMPLETE` si ya existía), una versión numérica de bootstrap, la política de ejecución elegida y protección de borrado `true`. Registrar fecha y resultado en un registro privado. Conservar los roles para los despliegues posteriores; no borrar `CDKToolkit` ni retirar sus políticas como parte de una reversión ordinaria del sitio.

El bootstrap no publica el sitio ni envía correo. Volver a la [guía de despliegue](launch-runbook.md#publicar-y-verificar): comprobar CI, configuración y pendientes de lanzamiento, fusionar el PR revisado y seguir el build de Amplify. Mantener las vistas previas de PR desactivadas. No se añaden `AWS_ROLE_ARN` ni `AMPLIFY_APP_ID` a GitHub.

## Si falta el plan o se elige una política restringida

Esta alternativa es para una pila inexistente o todavía en `REVIEW_IN_PROGRESS`; no aplicarla a una pila ya desplegada sin revisar sus parámetros y consumidores. En CloudShell se necesitan Node.js/npm para usar la CLI oficial de CDK.

Para preparar el mismo alcance administrativo explícito, sin ejecutarlo:

```bash
npx --yes --package aws-cdk@2 cdk bootstrap "aws://${ACCOUNT_ID}/${REGION}" \
  --toolkit-stack-name "$STACK_NAME" --qualifier hnb659fds \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --public-access-block-configuration true --execute false
```

Para preparar una variante restringida, sustituir el ARN anterior por el de una política IAM previamente creada y revisada para los recursos de Amplify/CDK de esta aplicación. No hay una política restringida implementada en este PR; no sustituirla por la política de envío SES de la función ni por `AmplifyBackendDeployFullAccess`, que corresponden a roles distintos. Si se cambia un parámetro de un bootstrap previamente configurado, revisar también `--previous-parameters false` y volver a suministrar todos sus parámetros necesarios según la [referencia de CDK](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-bootstrap.html).

La CLI imprime el ARN del nuevo change set. Volver al paso 2 y revisar ese plan antes de ejecutarlo; si la CLI usó otro nombre, utilizar el nombre/ARN que imprimió. No añadir `--trust`, `--force` ni desactivar TLS para resolver errores.

## Diagnóstico

```bash
aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'StackEvents[0:15].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' --output table
```

- `AccessDenied`: revisar los permisos de la sesión sobre CloudFormation, IAM, S3, ECR y SSM. No colocar credenciales en el repositorio.
- `ROLLBACK_COMPLETE` o fallos de creación: identificar el recurso y la causa; no borrar automáticamente una pila compartida ni sus artefactos.
- Amplify sigue indicando falta de bootstrap: comprobar cuenta, región, parámetro SSM y rol de servicio de la aplicación. [Diagnóstico de Amplify Gen 2](https://docs.amplify.aws/react/build-a-backend/troubleshooting/cdktoolkit-stack/).
