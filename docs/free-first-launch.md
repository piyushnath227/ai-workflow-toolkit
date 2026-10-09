# Free-first launch checklist

This project can be demonstrated without paid services. Keep the deterministic browser builder as the default; add external services only when they are needed and configured.

## Free-first stack

| Need | Start with | Important limit |
| --- | --- | --- |
| Website and API | Cloudflare Pages + Pages Functions | Functions have free-plan quotas; monitor usage. Static assets are free to serve on the documented Pages plans. |
| Small database | Cloudflare D1 | The free plan is for prototyping and experimentation; daily limits can stop queries when exceeded. |
| Optional AI generation | Gemini API free tier, if your account/model is eligible | Quotas vary by model and project. Review current limits in AI Studio. Free-tier prompts may be used to improve Google products; do not send secrets, personal data, or confidential customer information. |
| Tests and CI | Node.js built-in test runner + GitHub Actions | Keep tests deterministic and never put API keys in logs or fixtures. |
| Workflow execution during development | A local/self-hosted automation engine or a client-owned instance | Review the engine's licence before offering it as part of a hosted workflow-builder product. n8n's own licensing FAQ says a product that lets customers build/configure workflows on n8n can require an Enterprise licence. |
| Email capture | D1 table only, until a sender is deliberately chosen | Saving an email address is not the same as sending email. Add consent, unsubscribe, retention and deletion behavior before marketing. |
| Payments and accounts | Do not activate yet | Implement only after choosing a provider that supports payouts in your country and testing signed webhooks, refunds, access rules and account recovery. |

Useful official references:
- Cloudflare Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare D1 FAQ: https://developers.cloudflare.com/d1/reference/faq/
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini API billing and data-use notes: https://ai.google.dev/gemini-api/docs/billing
- n8n licence FAQ: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case

## Deploy the static site first

In Cloudflare Dashboard → Workers & Pages → your Pages project, confirm:
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

After a successful deployment, open the homepage, `/builder/`, `/templates/`, and `/guides/`. A green GitHub build alone does not prove the Cloudflare deployment or API bindings are working.

## Configure D1 (only in your own Cloudflare account)

1. Create a D1 database in Cloudflare and note its database name/ID.
2. In the Pages project settings, add a D1 binding named exactly `DB` and select that database.
3. From a local clone with Node.js installed, apply the existing migration to the **remote** database:

   ```bash
   npx wrangler d1 execute YOUR_DATABASE_NAME --remote --file=migrations/0001_initial.sql
   ```

4. Check the command output and verify that the tables were created. Do not run a migration against production without confirming the selected database.
5. Re-deploy or retry the API after the binding is available.

The migration creates groundwork tables for usage, leads, service requests, users, sessions, workflows and purchases. It does **not** implement a finished account, subscription, or payment system.

## Enable optional Gemini generation safely

1. Create an API key in Google AI Studio and inspect the selected model's current free-tier availability and limits.
2. In Cloudflare Pages → Settings → Variables and Secrets, add `GEMINI_API_KEY` as a **secret** (not a public build variable).
3. Bind D1 as `DB` first. The current API deliberately refuses live AI generation if the key exists but the usage-limit database is missing.
4. Do not configure `TURNSTILE_SECRET_KEY` yet unless the client UI has also been updated to render Turnstile and send its token. The current server rejects requests without a token whenever that secret is configured.
5. Re-deploy and test with a non-sensitive example such as “When a new lead arrives, validate its email, ask a human before sending a reply, then record the outcome.”
6. Confirm the response says `mode: "ai"` when the provider succeeds, and verify fallback/error behavior too. Check quotas in AI Studio. Never expose the API key in frontend code, Git, screenshots, or browser logs.

## Smoke-test the public API

Use a harmless sample; never include customer data. Run after deployment:

```bash
curl -i -X POST "https://ai-workflow-toolkit.pages.dev/api/generate" \
  -H "content-type: application/json" \
  --data '{"goal":"When a lead arrives, validate the fields, request approval before sending an email, and record the outcome."}'
```

Expected outcomes depend on account setup:
- `200`: a validated AI or deterministic fallback blueprint was returned.
- `400`: malformed JSON or missing goal.
- `403`: anti-bot check is enabled but a valid token was not sent.
- `429`: configured daily generation quota was exceeded.
- `503`: required database/provider configuration is missing or unavailable.

Also test `POST /api/export/n8n` with a valid blueprint produced by the builder. Import the downloaded JSON into a disposable n8n instance and inspect every node. The current export is explicitly a scaffold with placeholder actions and is not safe to run against real customers without further wiring and tests.

## Minimum customer-validation loop

1. Find 5 agency owners or freelancers who regularly automate client onboarding, lead follow-up or weekly reporting.
2. Ask how they do the task today, what breaks, how often it happens, and what they have already tried. Do not pitch first.
3. Ask each person to try the builder with a real but sanitized example. Observe without guiding them.
4. Record whether they can generate, understand, edit and export a blueprint without help.
5. Ask what they would use this for next week, what they would not trust it to do, and whether they would pay for a done-for-you setup.
6. Fix the most common failure, then repeat. Only publish testimonials with explicit permission; do not invent or imply customer validation.

## Keep these features labelled as not live

Until implemented and tested, do not advertise these as available: user accounts, saved workflows, subscription entitlements, checkout, purchase delivery, marketing email automation, or production-ready integrations. Do not charge users for an n8n scaffold as though it were a fully working automation.
