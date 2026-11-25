# Referral email delivery

The API commits one NotificationLog row per event and recipient in the same PostgreSQL transaction as the referral or invitation. Draft saves do not enqueue messages. The worker reloads current authorization and the recipient address before sending. Revoked or expired invitations and recipients who have lost access are skipped. Invitations use the existing account-bound code in the message body. Links open the authenticated portal and contain no credentials.

For intake, active platform administrators receive notifications. Active coordinators receive notifications for open intake and their assigned desk. The submitter also receives agency approval. Agency review goes to other active owner/admin members of the originating agency. Assignment goes to the assigned agent. Subsequent stage changes and returned referrals go to the submitting account. If no eligible recipients exist, the API logs the event name and entity ID for operations.

## Enable an approved SMTP relay

Apply the additive migration through the environment's approved release process before starting the updated API. Generate the Prisma client and build the backend. Run `npm run notifications:worker` as a supervised process with the same database target as the API. The API can enqueue while the worker is stopped. Review pending rows and their age before enabling delivery in an environment with accumulated demo events.

| Server environment variable | Value |
| --- | --- |
| NOTIFICATION_TRANSPORT | Defaults to disabled. Set to smtp after relay approval. |
| SMTP_HOST / SMTP_PORT | Approved relay hostname and port. Port 465 uses implicit TLS. Other ports require STARTTLS. |
| SMTP_USER / SMTP_PASSWORD | Relay credentials from the environment's secret store. |
| SMTP_FROM | Approved sender email address. |
| NOTIFICATION_PORTAL_URL | HTTPS origin for the authenticated frontend. |

For isolated development or tests, set `NOTIFICATION_TRANSPORT=local-smtp`, a loopback capture server port, a synthetic sender, and a local portal URL. This mode connects only to 127.0.0.1 and is rejected in production.

## Delivery operations

SENT and acceptedAt mean that the SMTP relay accepted the message. Inbox delivery and bounces require separate provider evidence. Legacy status values remain valid. Workers use conditional database claims with five-minute leases and a stable Message-ID. A retry starts after 30 seconds and the delay doubles after each failure. Five failed attempts end in FAILED. Expired claims can be recovered after restart.

SMTP cannot atomically acknowledge acceptance and update PostgreSQL. A crash in that interval can cause a duplicate despite the stable Message-ID. Investigate failed rows by notification ID, attempt count and relay records before manual redelivery. Keep raw SMTP exchanges, invitation codes and recipient addresses out of application logs.
