# AI provider configuration

The `/api/generate` endpoint supports Gemini and Grok without exposing either key to browser code. If no provider succeeds, it returns the existing deterministic rule-based blueprint.

## Cloudflare Pages settings

Open **Workers & Pages → ai-workflow-toolkit → Settings → Variables and Secrets**. Configure the Production environment:

| Name | Type | Value |
|---|---|---|
| `GEMINI_API_KEY` | Secret | API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GROK_API_KEY` | Secret (optional) | API key from [xAI Console](https://console.x.ai/) |
| `AI_PROVIDER` | Variable (optional) | `gemini`, `grok`, or `auto` |
| `GEMINI_MODEL` | Variable (optional) | Defaults to `gemini-2.5-flash` |
| `GROK_MODEL` | Variable (optional) | Defaults to `grok-4.7` |

Do not paste API keys into source files, frontend code, GitHub issues, or chat. If a key has been exposed, revoke it and create a replacement. Secrets must be set for the Production environment.

## Provider selection and cost safety

- By default, the endpoint selects Gemini when `GEMINI_API_KEY` exists; otherwise it selects Grok if `GROK_API_KEY` exists.
- Set `AI_PROVIDER=gemini` or `AI_PROVIDER=grok` to choose one provider for all requests.
- Set `AI_PROVIDER=auto` to explicitly enable failover: try Gemini first when configured, then Grok. **This can incur Grok API charges if Gemini fails.** Do not enable auto failover unless you accept that possibility.
- A request may also send `provider: "gemini"`, `provider: "grok"`, or `provider: "auto"` in the JSON body to override the default. Only configured providers can be called. Keep the D1 daily quota in place; the current anonymous limit is three generation requests per IP per UTC day. As an additional spend guard, actual Grok API calls are globally capped at five per UTC day across all visitors, including repair attempts. This cap is enforced in D1 and can be increased in code only after monitoring real usage.
- Grok API access is separate from the Grok chat website and may be paid. Verify your xAI account's current pricing and limits before adding `GROK_API_KEY`.

If any AI key is configured, D1 must be bound under the exact variable name `DB`; the API refuses to call AI providers without D1 usage tracking. Keep `TURNSTILE_SECRET_KEY` unset unless the client sends a valid Turnstile token.

## Diagnostics

The API never returns raw provider error bodies or keys. If all configured attempts fail, the fallback response includes safe `providerDiagnostics` entries containing provider name, broad failure reason, and HTTP status where available. Common HTTP statuses include 401/403 (key, access, or billing configuration), 429 (rate/quota limit), and 5xx (provider issue). Check Cloudflare's deployment and secret configuration after changing settings; redeploy if required by the dashboard.

## Smoke test

Use the deployed endpoint with a simple workflow description:

```powershell
$body = @{
  provider = "gemini"
  goal = "When a new lead arrives, validate the email, request approval before sending a follow-up, and record the result."
} | ConvertTo-Json

$response = Invoke-RestMethod -Method Post `
  -Uri "https://ai-workflow-toolkit.pages.dev/api/generate" `
  -ContentType "application/json" -Body $body

$response | ConvertTo-Json -Depth 10
```

Use `provider = "grok"` to test Grok. Use `provider = "auto"` only when you want explicit cross-provider failover. A successful AI response has `mode: "ai"` and includes the provider and model; a fallback response has `mode: "rule-based-fallback"`. Do not share keys in test output.
