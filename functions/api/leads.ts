interface Env { DB?: D1Database; }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return json({ error: "Email signup is not configured yet." }, 503);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Send valid JSON." }, 400); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body?.source === "string" ? body.source.slice(0, 80) : "website";
  if (body?.consent !== true) return json({ error: "Consent is required to receive launch updates." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400);
  try {
    await env.DB.prepare("INSERT INTO leads (email, source, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING").bind(email, source, Math.floor(Date.now()/1000)).run();
    return json({ ok: true, message: "You're on the list. Email delivery is not enabled until a provider is configured." }, 201);
  } catch { return json({ error: "Signup could not be saved. Please try again later." }, 503); }
};
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
