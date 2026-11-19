import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createHandler } from './delivery.cjs';

// Avoid automatic retries: a lost response can mean SES accepted the message.
const ses = new SESv2Client({ maxAttempts: 1 });
export const handler = createHandler({
  sendEmail: (input: ConstructorParameters<typeof SendEmailCommand>[0]) => ses.send(new SendEmailCommand(input)),
  recipient: process.env.CONTACT_EMAIL,
  sender: process.env.CONTACT_FROM,
  origins: ['https://mactecnologia.com.mx', 'https://www.mactecnologia.com.mx']
});
