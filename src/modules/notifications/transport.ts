import nodemailer from 'nodemailer';
import { z } from 'zod';
import { EmailEvent, subjects } from './events';

export interface Message {
  id: string;
  to: string;
  event: EmailEvent;
  reference?: string | null;
  inviteToken?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function render(message: Message, portal: string) {
  const invitation = message.event === 'invitation';
  const url = new URL(invitation ? '/settings' : '/referrals', portal).href;
  const lines: string[] = [subjects[message.event]];
  if (message.reference) lines.push('Referral reference: ' + message.reference);
  if (invitation && message.inviteToken) lines.push('Sign in and enter this invitation code in Settings: ' + message.inviteToken);
  return { subject: subjects[message.event], text: [...lines, url].join('\n\n'),
    html: lines.map(line => '<p>' + escapeHtml(line) + '</p>').join('') + '<p><a href="' + escapeHtml(url) + '">Open Prospera</a></p>' };
}

export function smtpTransport(env: NodeJS.ProcessEnv = process.env) {
  if (!env.NOTIFICATION_TRANSPORT || env.NOTIFICATION_TRANSPORT === 'disabled') return null;
  const local = env.NOTIFICATION_TRANSPORT === 'local-smtp' && ['development','test'].includes(env.NODE_ENV || 'development');
  const host = local ? '127.0.0.1' : env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || (local ? 1025 : 587));
  const portal = new URL(env.NOTIFICATION_PORTAL_URL || '');
  if (portal.username || portal.password || !(portal.protocol === 'https:' ||
      (local && portal.protocol === 'http:' && ['127.0.0.1','localhost'].includes(portal.hostname)))) throw new Error('Invalid notification portal');
  if ((!local && (env.NOTIFICATION_TRANSPORT !== 'smtp' || !host || !env.SMTP_USER || !env.SMTP_PASSWORD)) ||
      !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP configuration');
  const from = z.string().email().parse(env.SMTP_FROM);
  const client = nodemailer.createTransport({
    host, port, secure: !local && port === 465, requireTLS: !local, ignoreTLS: local,
    auth: local ? undefined : { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return async (message: Message) => {
    const result = await client.sendMail({ ...render(message, portal.origin), from, to: { name: '', address: z.string().email().parse(message.to) },
      messageId: '<' + message.id + '@' + from.split('@')[1] + '>' });
    if (result.accepted.length !== 1) throw new Error('SMTP recipient rejected');
  };
}
