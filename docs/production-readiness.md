# Production readiness and service setup

Do not advertise a feature as live until the associated provider is configured and verified.

## Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Root directory: repository root
- Bind Cloudflare D1 as `DB` and apply `migrations/0001_initial.sql`.
- Optional secrets: `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`.
- The original browser builder works without optional API or D1 bindings.

## AI endpoint
`POST /api/generate` accepts JSON `{"goal":"..."}`. It limits input to 2,000 characters, optionally checks Turnstile, tracks anonymous usage if D1 is bound, calls Gemini only server-side when `GEMINI_API_KEY` exists, validates model output and returns a deterministic fallback when generation fails. Configure provider spending alerts before enabling it publicly.

## n8n export
`POST /api/export/n8n` validates a blueprint and returns an inactive n8n JSON scaffold. It contains placeholder nodes, not completed business integrations. Configure credentials, connect decisions and human approval behavior, add persistent idempotency storage and test in a sandbox before production use or sale.

## Email capture and service requests
`POST /api/leads` and `POST /api/service-request` require D1. Lead capture stores normalized email, source and timestamp; service requests store email, role, process description and timestamp. No marketing emails are sent. Add explicit consent, retention, deletion and verified email-provider behavior before sending campaigns.

## Payments, auth, saved workflows
Checkout, magic-link auth, entitlement checks and saved-workflow APIs are not active. Confirm merchant-of-record payouts to your country, then implement signed webhooks and test purchase/refund/cancellation events before collecting money. The D1 schema is groundwork only, not a finished authentication or payment system.

## Security
- Configure Turnstile before exposing anonymous AI generation.
- Bind D1 and verify limits with concurrent requests.
- Keep AI keys in Cloudflare secrets.
- Never store third-party credentials.
- Add a clear notice before transmitting workflow descriptions to an AI provider.
- Review security headers against all scripts and fonts used by the site.
- Test API error paths, keyboard navigation and mobile layout.
