import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { contact } from './functions/contact/resource';
import { configureContactApi } from './contact-api';

const backend = defineBackend({contact});
const fn = backend.contact.resources.lambda;
const endpoint = configureContactApi(Stack.of(fn), fn, process.env.CONTACT_EMAIL ?? '');
backend.addOutput({custom:{contact_endpoint:endpoint}});
