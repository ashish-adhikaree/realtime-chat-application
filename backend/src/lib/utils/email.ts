import logger from '@/lib/utils/logger';

export type EmailAddress = string | string[];

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

export type SendEmailPayload = {
  to: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: EmailAddress;
  bcc?: EmailAddress;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  success: boolean;
  messageId: string;
};

const DEFAULT_FROM = 'Realtime Chat <no-reply@realtime-chat.local>';

function toList(value?: EmailAddress) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const log = logger({ service: 'email', method: 'sendEmail' });

  const { to, subject, text, html, from, replyTo, cc, bcc, attachments } = payload;

  const recipients = toList(to);

  if (recipients.length === 0) {
    throw new Error('sendEmail requires at least one recipient');
  }

  const messageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  log.info('Email dispatched', {
    messageId,
    from: from ?? DEFAULT_FROM,
    to: recipients,
    cc: toList(cc),
    bcc: toList(bcc),
    replyTo,
    subject,
    text,
    html,
    attachments: attachments?.map((file) => ({
      filename: file.filename,
      contentType: file.contentType,
      size: file.content.length,
    })),
  });

  return { success: true, messageId };
}

export default sendEmail;
