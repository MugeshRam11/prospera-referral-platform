import { describe, expect, it } from 'vitest';
import { render, smtpTransport } from '../src/modules/notifications/transport';

describe('notification transport', () => {
  it('stays disabled by default and rejects incomplete live configuration', () => {
    expect(smtpTransport({})).toBeNull();
    expect(() => smtpTransport({ NODE_ENV: 'production', NOTIFICATION_TRANSPORT: 'local-smtp', NOTIFICATION_PORTAL_URL: 'https://portal.example' })).toThrow();
    expect(() => smtpTransport({ NOTIFICATION_TRANSPORT: 'smtp', NOTIFICATION_PORTAL_URL: 'https://portal.example' })).toThrow();
  });
  it('escapes interpolated content and keeps invitation codes out of links', () => {
    const result = render({ id: 'job', to: 'invitee@example.invalid', event: 'invitation', inviteToken: '<test>' }, 'https://portal.example');
    expect(result.html).toContain('&lt;test&gt;');
    expect(result.html).not.toContain('<test>');
    expect(result.html).toContain('href="https://portal.example/settings"');
  });
});
