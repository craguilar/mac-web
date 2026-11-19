import { defineFunction, secret } from '@aws-amplify/backend';

export const contact = defineFunction({
  name: 'contact',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 10,
  memoryMB: 128,
  logging: {format:'text', retention:'1 week'},
  environment: {
    TURNSTILE_SECRET_KEY: secret('TURNSTILE_SECRET_KEY'),
    CONTACT_ENABLED: process.env.CONTACT_ENABLED === 'true' ? 'true' : 'false',
    CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? '',
    CONTACT_FROM: 'web@mactecnologia.com.mx'
  }
});
