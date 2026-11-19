"""Security invariants for the owner-provisioned infrastructure (PyYAML from cfn-lint)."""
from pathlib import Path
from fnmatch import fnmatchcase
import unittest
import yaml
def intrinsic(loader,tag,node):
 value=loader.construct_scalar(node) if isinstance(node,yaml.ScalarNode) else loader.construct_sequence(node)
 return {tag if tag=='Ref' else 'Fn::'+tag:value}
yaml.SafeLoader.add_multi_constructor('!',intrinsic)
ROOT=Path(__file__).resolve().parents[1]
class DeploymentSecurity(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.prerequisites=yaml.safe_load((ROOT/'infra/contact-prerequisites.yaml').read_text(encoding='utf-8'))
  cls.bootstrap=yaml.safe_load((ROOT/'infra/contact-bootstrap.yaml').read_text(encoding='utf-8'))
 def test_amplify_trust_accepts_only_the_production_branch(self):
  trust=self.prerequisites['Resources']['AmplifyBackendRole']['Properties']['AssumeRolePolicyDocument']['Statement']
  self.assertEqual(len(trust),1)
  statement=trust[0]
  self.assertEqual(statement['Effect'],'Allow')
  self.assertEqual(statement['Principal'],{'Service':'amplify.amazonaws.com'})
  self.assertEqual(statement['Action'],'sts:AssumeRole')
  conditions=statement['Condition']
  self.assertEqual(set(conditions),{'StringEquals','ArnEquals'})
  self.assertEqual(conditions['StringEquals'],{'aws:SourceAccount':{'Ref':'AWS::AccountId'}})
  self.assertEqual(set(conditions['ArnEquals']),{'aws:SourceArn'})
  source=conditions['ArnEquals']['aws:SourceArn']['Fn::Sub']
  substitutions={'AWS::Partition':'aws','AWS::Region':'us-east-2','AWS::AccountId':'123456789012','AmplifyAppId':'testapp'}
  for key,value in substitutions.items():source=source.replace('${'+key+'}',value)
  app_arn='arn:aws:amplify:us-east-2:123456789012:apps/testapp'
  # Amplify assumes its service role using the branch ARN, not the app ARN.
  self.assertEqual(source,app_arn+'/branches/main')
  for rejected in [app_arn,app_arn+'/branches/dev',app_arn+'/branches/pr-1',app_arn+'other/branches/main',app_arn.replace('123456789012','999999999999')+'/branches/main']:
   with self.subTest(source_arn=rejected):self.assertNotEqual(source,rejected)
 def test_fixed_api_and_throttle(self):
  resources=self.prerequisites['Resources']
  cors=resources['ContactApi']['Properties']['CorsConfiguration']
  self.assertEqual(cors['AllowOrigins'],['https://mactecnologia.com.mx','https://www.mactecnologia.com.mx'])
  self.assertEqual(cors['AllowMethods'],['POST'])
  self.assertEqual(resources['ContactStage']['Properties']['DefaultRouteSettings'],{'ThrottlingBurstLimit':2,'ThrottlingRateLimit':0.1})
  policy=resources['DeploymentExecutionPolicy']['Properties']['PolicyDocument']['Statement']
  for statement in policy:
   if any(action.startswith('apigateway:') for action in statement['Action']):
    self.assertTrue(all('/apis/${ContactApi}' in resource['Fn::Sub'] for resource in statement['Resource']))
 def test_roles_cannot_escape_runtime_boundary(self):
  statements=self.prerequisites['Resources']['DeploymentExecutionPolicy']['Properties']['PolicyDocument']['Statement']
  create=next(s for s in statements if 'iam:CreateRole' in s['Action'])
  self.assertEqual(create['Condition'],{'ArnEquals':{'iam:PermissionsBoundary':{'Ref':'RuntimeBoundary'}}})
  actions={a for s in statements for a in s['Action']}
  self.assertTrue(actions.isdisjoint({'iam:DeleteRolePermissionsBoundary','iam:CreatePolicy','iam:CreatePolicyVersion','iam:SetDefaultPolicyVersion','iam:CreateUser','iam:CreateAccessKey','iam:*','*'}))
  passed=next(s for s in statements if 'iam:PassRole' in s['Action'])
  self.assertEqual(passed['Condition']['StringEquals']['iam:PassedToService'],'lambda.amazonaws.com')
 def test_nested_stacks_can_pass_only_the_scoped_execution_role(self):
  statements=self.prerequisites['Resources']['DeploymentExecutionPolicy']['Properties']['PolicyDocument']['Statement']
  passed=[s for s in statements if 'iam:PassRole' in s['Action']]
  self.assertEqual(len(passed),2)
  expected={
   'lambda.amazonaws.com':'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/amplify-${AmplifyAppId}-*',
   'cloudformation.amazonaws.com':'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/cdk-hnb659fds-cfn-exec-role-${AWS::AccountId}-${AWS::Region}'
  }
  self.assertEqual({s['Condition']['StringEquals']['iam:PassedToService'] for s in passed},set(expected))
  for statement in passed:
   service=statement['Condition']['StringEquals']['iam:PassedToService']
   self.assertEqual(statement['Effect'],'Allow')
   self.assertEqual(statement['Action'],['iam:PassRole'])
   self.assertEqual(statement['Condition'],{'StringEquals':{'iam:PassedToService':service}})
   self.assertEqual(statement['Resource'],[{'Fn::Sub':expected[service]}])
 def test_log_permissions_cover_generated_main_groups_without_cross_app_access(self):
  substitutions={'AWS::Partition':'aws','AWS::Region':'us-east-2','AWS::AccountId':'123456789012','AmplifyAppId':'testapp'}
  def resolve(resource):
   value=resource if isinstance(resource,str) else resource['Fn::Sub']
   for key,replacement in substitutions.items():value=value.replace('${'+key+'}',replacement)
   return value
  base='arn:aws:logs:us-east-2:123456789012:log-group:'
  generated='amplify-testapp-main-branch-build-functionNested-hash-contactloggroup-hash'
  allowed=[base+generated,base+'/aws/lambda/amplify-testapp-main-contact']
  denied=[base+generated.replace('testapp','otherapp'),base+generated.replace('testapp','testappevil'),base+generated.replace('-main-','-dev-'),base+generated.replace('-main-','-pr-1-'),base+'/aws/lambda/unrelated',allowed[0].replace('123456789012','999999999999'),allowed[0].replace('us-east-2','us-west-2')]
  cases={
   'DeploymentExecutionPolicy':['logs:CreateLogGroup','logs:DeleteLogGroup','logs:PutRetentionPolicy','logs:TagResource'],
   'RuntimeBoundary':['logs:CreateLogGroup','logs:CreateLogStream','logs:PutLogEvents']
  }
  for policy,actions in cases.items():
   statements=self.prerequisites['Resources'][policy]['Properties']['PolicyDocument']['Statement']
   for action in actions:
    patterns=[resolve(r) for s in statements if s['Effect']=='Allow' and any(fnmatchcase(action,a) for a in s['Action']) for r in s['Resource']]
    suffix=':log-stream:2026/11/19/test-stream' if action in ['logs:CreateLogStream','logs:PutLogEvents'] else ''
    for resource in allowed:
     with self.subTest(policy=policy,action=action,resource=resource):self.assertTrue(any(fnmatchcase(resource+suffix,p) for p in patterns))
    for resource in denied:
     with self.subTest(policy=policy,action=action,resource=resource):self.assertFalse(any(fnmatchcase(resource+suffix,p) for p in patterns))
 def test_runtime_cannot_administer_account_or_send_to_arbitrary_recipients(self):
  statements=self.prerequisites['Resources']['RuntimeBoundary']['Properties']['PolicyDocument']['Statement']
  self.assertFalse(any(a.startswith(('iam:','sts:','cloudformation:','s3:')) for s in statements for a in s['Action']))
  ses=next(s for s in statements if 'ses:SendEmail' in s['Action'])
  self.assertEqual(ses['Condition']['StringEquals']['ses:FromAddress'],'web@mactecnologia.com.mx')
  self.assertEqual(ses['Condition']['ForAllValues:StringEquals']['ses:Recipients'],[{'Ref':'ContactEmail'}])
  self.assertTrue(self.prerequisites['Parameters']['ContactEmail']['NoEcho'])
 def test_bootstrap_is_dedicated_and_cannot_modify_other_stacks(self):
  resources=self.bootstrap['Resources']
  for name in ['DeploymentActionRole','FilePublishingRole']:
   trust=resources[name]['Properties']['AssumeRolePolicyDocument']['Statement']
   self.assertEqual(len(trust),1)
   self.assertEqual(trust[0]['Principal'],{'AWS':{'Ref':'AmplifyServiceRoleArn'}})
  deploy=resources['DeploymentActionRole']['Properties']['Policies'][0]['PolicyDocument']['Statement']
  for statement in deploy:
   writes=[a for a in statement['Action'] if a.startswith('cloudformation:') and not a.split(':')[1].startswith(('Get','Describe','List'))]
   if writes:self.assertTrue(all('stack/amplify-${AmplifyAppId}-main-*/*' in r['Fn::Sub'] for r in statement['Resource']))
  self.assertEqual(resources['CloudFormationExecutionRole']['Properties']['ManagedPolicyArns'],[{'Fn::Sub':'arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/mac-web-${AmplifyAppId}-deployment'}])
  self.assertNotIn('AdministratorAccess',str(self.bootstrap))
  self.assertNotIn('AmplifyBackendDeployFullAccess',str(self.prerequisites))
  self.assertEqual(resources['CdkBootstrapVersion']['Properties']['Value'],self.bootstrap['Outputs']['BootstrapVersion']['Value'])
if __name__=='__main__':unittest.main()
