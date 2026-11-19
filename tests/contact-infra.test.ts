import test from 'node:test';
import assert from 'node:assert/strict';
import {App,Stack} from 'aws-cdk-lib';
import {Template,Match} from 'aws-cdk-lib/assertions';
import {Function,Runtime,Code} from 'aws-cdk-lib/aws-lambda';
import {configureContactApi} from '../amplify/contact-api';
test('contact infrastructure limits route, origins, traffic and SES delivery permissions',()=>{
 const stack=new Stack(new App(),'ContactTest',{env:{account:'123456789012',region:'us-east-2'}});
 const fn=new Function(stack,'Handler',{runtime:Runtime.NODEJS_22_X,handler:'index.handler',code:Code.fromInline('exports.handler=async()=>{}')});
 configureContactApi(stack,fn,'owner@example.test');
 const template=Template.fromStack(stack);
 template.resourceCountIs('AWS::ApiGatewayV2::Route',1);
 template.hasResourceProperties('AWS::ApiGatewayV2::Route',{RouteKey:'POST /contact',AuthorizationType:'NONE'});
 template.hasResourceProperties('AWS::ApiGatewayV2::Api',{CorsConfiguration:{AllowOrigins:['https://mactecnologia.com.mx','https://www.mactecnologia.com.mx'],AllowMethods:['POST'],AllowHeaders:['content-type'],MaxAge:3600}});
 template.hasResourceProperties('AWS::ApiGatewayV2::Stage',{DefaultRouteSettings:{ThrottlingBurstLimit:2,ThrottlingRateLimit:0.1}});
 template.hasResourceProperties('AWS::IAM::Policy',{PolicyDocument:{Statement:Match.arrayWith([Match.objectLike({Action:'ses:SendEmail',Effect:'Allow',Resource:{'Fn::Join':['',['arn:',{Ref:'AWS::Partition'},':ses:us-east-2:123456789012:identity/mactecnologia.com.mx']]},Condition:{StringEquals:{'ses:FromAddress':'web@mactecnologia.com.mx'},'ForAllValues:StringEquals':{'ses:Recipients':['owner@example.test']}}})])}});
 assert.throws(()=>configureContactApi(stack,fn,''),/CONTACT_EMAIL/);
});
