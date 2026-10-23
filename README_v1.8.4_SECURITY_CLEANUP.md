# v1.8.4 — Privacy & Electron security cleanup

## Changed
- No personal Notion URL or Notion icon is shipped as a default quick link. New users receive three empty slots.
- The specific legacy preset is removed from existing saved shortcut collections. Other Notion pages and manually added links are kept. Existing events, notes, todos and backups are untouched.
- Local calendar JavaScript is moved to `renderer/app.js` so a restrictive `script-src 'self'` policy can be enforced. Inline CSS remains temporarily allowed by the style policy.
- External URLs are limited to normal http/https URLs, with credentials and control characters rejected.
- Browser permission requests/checks are denied by default. Only the packaged app main frame may invoke IPC APIs.
- Windows and macOS distribution / update settings remain unchanged. No paid code signing is included.

## Deployment / verification
1. Back up calendar data in the app first.
2. Overwrite the project with the patch, do not copy over `.git`, and review changes with GitHub Desktop.
3. Commit and push, then create and push the `v1.8.4` tag, verify Windows + macOS build jobs.
4. Check a new install displays only blank quick link placeholders.
5. On an existing install, confirm the old preset link disappears while custom shortcuts and calendar data persist.
6. Confirm external links, backup, notifications, Google Sheets feedback, daily todo and widget.

## Important limitations
- Removing a link from current source does NOT remove it from Git history, old Releases or a user's historic backups. Review the linked Notion page's sharing permissions.
- Feedback Apps Script is a public submit endpoint; its server-side spam protection is outside this desktop-only patch. Rate-limiting in the Electron client alone is not a server safeguard.
- Mac Developer ID notarization and Windows officially trusted publisher signatures require separate paid identity verification; neither is part of v1.8.4.
- Script CSP is strict; inline style is still permitted to avoid changing the existing UI. Further DOM/HTML injection review is recommended before broader external distribution.
