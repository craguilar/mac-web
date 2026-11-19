import { defineBackend } from '@aws-amplify/backend';
import { Stack, Aspects } from 'aws-cdk-lib';
import { contact } from './functions/contact/resource';
import { configureContactApi } from './contact-api';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnRole } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({contact});
const fn = backend.contact.resources.lambda;
(fn.node.defaultChild as CfnFunction).reservedConcurrentExecutions=2;
const appId=process.env.AWS_APP_ID ?? '';
const stack=Stack.of(fn),root=stack.nestedStackParent ?? stack;
const boundary=stack.formatArn({service:'iam',region:'',resource:'policy',resourceName:`mac-web-${appId}-runtime-boundary`});
Aspects.of(root).add({visit(node){if(node instanceof CfnRole)node.permissionsBoundary=boundary;}});
const endpoint = configureContactApi(stack, fn, process.env.CONTACT_EMAIL ?? '', appId, process.env.CONTACT_API_ID ?? '');
backend.addOutput({custom:{contact_endpoint:endpoint}});
