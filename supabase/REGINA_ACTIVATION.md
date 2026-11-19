# Regina Slack operating rollout (owner approval required)

This source is deliberately **not active** merely because its functions are deployed.
The first connection test has a separate at-most-once delivery record.

## Verified design

- Slack workspace: `111percent` (`T8LGNJGSK`); private channel: `쌤띵-소재의-방` (`C09S1BE5YN9`).
- Only owners can opt an existing **shared event** into notifications. The desktop app shows title/date only; personal calendars, todos, notes, member details, and email addresses are excluded.
- Owner opt-in stores a pending first snapshot. With both operating send gates off, this **never posts**; after activation, pending opted-in snapshots can be posted.
- Subsequent title/date edits replace the pending snapshot. A deletion can update a previously posted Slack message with a cancellation marker.
- A completed first-test receipt (`slack_first_test_delivery.sent_at`) is required for regular dispatch. The temporary `test_message_approved` flag can remain `false` forever afterward.
- The server-only `slack-regina-dispatch` requires an unpredictable `x-kuns-dispatch-secret` and validates Slack workspace/channel before posting. It is not called by the desktop app.

## Remaining activation work — **do not run without approval**

1. Confirm the exact notification wording and which shared events should be opted in. Review pending queue entries before enabling live delivery.
2. Enable the Supabase `pg_cron` and `pg_net` extensions if approved. Neither extension was installed at the time this file was drafted.
3. Store a separate, high-entropy dispatcher invocation secret in Supabase Vault, and configure the Edge Function's `SLACK_DISPATCH_SECRET` to the same value. Never put Slack bot tokens, service keys, or invocation secrets in source code, migrations, or the chat.
4. Create a minute-scale Cron job that POSTs to `slack-regina-dispatch` using only the Vault-backed custom header. Review job ownership, retry behavior, and the pause mechanism before scheduling.
5. Enable `slack_integration_control.send_enabled` and `SLACK_SEND_ENABLED` **only after** the owner separately authorizes automatic delivery. Keep `SLACK_TEST_SEND_ENABLED=false` and `test_message_approved=false`.
6. Verify one owner-approved, disposable shared event end-to-end (create → edit → cancel). Monitor the outbox and Slack channel. Do not use anyone else's shared event as a test.

Supabase documentation: https://supabase.com/docs/guides/functions/schedule-functions

## Emergency stop

1. Set `SLACK_SEND_ENABLED=false` in Edge Function Secrets.
2. Set `slack_integration_control.send_enabled=false` in the database.
3. Disable the scheduled Cron job, if one exists.
4. Inspect pending/failed outbox records **without** automatically replaying or deleting them.

Changing the first-test approval switch is not a substitute for stopping normal notifications.
