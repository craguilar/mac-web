import { Duration, Stack } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod, HttpStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export function configureContactApi(stack: Stack, fn: IFunction, recipient: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('Set CONTACT_EMAIL in the Amplify main branch environment.');
  fn.addToRolePolicy(new PolicyStatement({
    actions: ['ses:SendEmail'],
    resources: [stack.formatArn({service:'ses', resource:'identity', resourceName:'mactecnologia.com.mx'})],
    conditions: {
      StringEquals: {'ses:FromAddress':'web@mactecnologia.com.mx'},
      'ForAllValues:StringEquals': {'ses:Recipients':[recipient]}
    }
  }));
  const api = new HttpApi(stack, 'ContactApi', {
    createDefaultStage:false,
    corsPreflight: {
      allowOrigins:['https://mactecnologia.com.mx', 'https://www.mactecnologia.com.mx'],
      allowMethods:[CorsHttpMethod.POST], allowHeaders:['content-type'], maxAge:Duration.hours(1)
    }
  });
  api.addRoutes({path:'/contact', methods:[HttpMethod.POST], integration:new HttpLambdaIntegration('ContactHandler', fn)});
  new HttpStage(stack, 'ContactStage', {
    httpApi:api, stageName:'$default', autoDeploy:true,
    throttle:{rateLimit:0.1, burstLimit:2}
  });
  return `${api.apiEndpoint}/contact`;
}
