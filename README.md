# AI Workflow Toolkit

A browser-first workflow design toolkit for small agencies and solo operators. The product focuses on documented workflows, human approval, duplicate-event safeguards, failure handling and test cases.

**Live site:** https://ai-workflow-toolkit.pages.dev  
**Workflow Builder:** https://ai-workflow-toolkit.pages.dev/builder/  
**AI Generator:** https://ai-workflow-toolkit.pages.dev/ai-builder/  
**Templates:** https://ai-workflow-toolkit.pages.dev/templates/

## What's included
- Ten practical guide pages covering onboarding, lead follow-up, testing, n8n error handling, duplicate prevention, approvals and reporting.
- Existing local, rule-based workflow builder and editable ready-to-use message.
- Blueprint contract, validation and deterministic Markdown/n8n scaffold exporter.
- Five agency workflow blueprint templates: client onboarding, lead follow-up, weekly client reporting, content approval and support triage.
- AI generation endpoint using Gemini when configured, with schema validation and deterministic fallback.
- n8n export API, D1 migrations, lead capture endpoint and workflow audit request endpoint.
- Sample output, templates, pricing, services, about and draft legal pages.
- Automated Node.js tests and CI build.

## Important limitations
The AI generator is **not live until** `GEMINI_API_KEY` is configured in Cloudflare Pages Functions. D1 must be bound as `DB` before live AI generation can be enabled because it tracks anonymous usage. Do not set `TURNSTILE_SECRET_KEY` until the client widget is implemented and sending tokens. No checkout, paid subscription, magic-link login, or saved-workflow API is active. The D1 schema is groundwork, not a complete account system.

The n8n exporter creates an **inactive scaffold**, not a production-ready integration. It uses placeholder actions and placeholder validation conditions. Import the output into a current n8n instance, wire decision branches and human approval behavior, add persistent idempotency storage, configure credentials and test all failure cases in a sandbox before using it in production or selling it as tested.

## Local development
The social preview asset is `public/og-image.svg`; page metadata references it for sharing cards. Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run build
npm run dev
```

## Cloudflare Pages
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Apply `migrations/0001_initial.sql` to a Cloudflare D1 database and bind it as `DB` only when enabling API storage.
- Secrets: `GEMINI_API_KEY`; optional Turnstile server secret only after client integration. Never commit secrets.
- Setup steps and a free-first stack: [docs/free-first-launch.md](docs/free-first-launch.md)
- Production limitations: [docs/production-readiness.md](docs/production-readiness.md)

## Privacy
The original browser builder processes workflow descriptions locally. The AI Generator sends the description to the server and, when configured, to the selected AI provider. Do not submit secrets or sensitive customer data. Review the draft Privacy page and update it with actual providers and contact information before launch.

## License
MIT
