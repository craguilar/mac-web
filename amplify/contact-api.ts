import { ArnFormat, Duration, Stack } from 'aws-cdk-lib';
import { HttpApi, HttpMethod, HttpRoute, HttpRouteKey } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export function configureContactApi(stack: Stack, fn: IFunction, recipient: string, appId: string, apiId: string) {
  if (!/^[a-z0-9]{1,32}$/.test(apiId)) throw new Error('Set CONTACT_API_ID from the prerequisites stack.');
  if (!/^[a-z0-9]+$/.test(appId)) throw new Error('Set AWS_APP_ID for the Amplify app.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('Set CONTACT_EMAIL in the Amplify main branch environment.');
  fn.addToRolePolicy(new PolicyStatement({
    actions: ['ses:SendEmail'],
    resources: [stack.formatArn({service:'ses', resource:'identity', resourceName:'mactecnologia.com.mx'})],
    conditions: {
      StringEquals: {'ses:FromAddress':'web@mactecnologia.com.mx'},
      'ForAllValues:StringEquals': {'ses:Recipients':[recipient]}
    }
  }));
  // The owner provisions this API once so deployment permissions can name its exact ID.
  const api = HttpApi.fromHttpApiAttributes(stack,'ContactApi',{
    httpApiId:apiId,apiEndpoint:`https://${apiId}.execute-api.${stack.region}.${stack.urlSuffix}`
  });
  new HttpRoute(stack,'ContactRoute',{
    httpApi:api,routeKey:HttpRouteKey.with('/contact',HttpMethod.POST),
    integration:new HttpLambdaIntegration('ContactHandler',fn)
  });
  const alerts = new Topic(stack,'ContactAlerts',{topicName:`mac-web-${appId}-contact-alerts`});
  alerts.addToResourcePolicy(new PolicyStatement({
    principals:[new ServicePrincipal('cloudwatch.amazonaws.com')],actions:['sns:Publish'],resources:[alerts.topicArn],
    conditions:{StringEquals:{'aws:SourceAccount':stack.account},ArnLike:{'aws:SourceArn':stack.formatArn({service:'cloudwatch',resource:'alarm',resourceName:`mac-web-${appId}-contact-*`,arnFormat:ArnFormat.COLON_RESOURCE_NAME})}}
  }));
  const measures = [
    {id:'Traffic',metric:api.metricCount({statistic:'Sum',period:Duration.minutes(15)}),threshold:60,description:'More than 60 contact API requests in 15 minutes. Inspect traffic and disable sending if needed.'},
    {id:'Failures',metric:api.metricServerError({statistic:'Sum',period:Duration.minutes(5)}),threshold:3,description:'At least 3 contact API server errors in 5 minutes. Check configuration and providers without logging inquiry data.'}
  ];
  for(const measure of measures){
    const alarm=new Alarm(stack,`Contact${measure.id}`,{
      alarmName:`mac-web-${appId}-contact-${measure.id.toLowerCase()}`,
      alarmDescription:measure.description,metric:measure.metric,threshold:measure.threshold,
      evaluationPeriods:1,comparisonOperator:measure.id==='Traffic'?ComparisonOperator.GREATER_THAN_THRESHOLD:ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData:TreatMissingData.NOT_BREACHING
    });
    alarm.addAlarmAction(new SnsAction(alerts));
  }
  return `${api.apiEndpoint}/contact`;
}
