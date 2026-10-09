import { exportN8n, validateBlueprint } from "../../../src/lib/blueprint.js";
export const onRequestPost: PagesFunction = async ({ request }) => {
  let blueprint: any;
  try { blueprint = await request.json(); } catch { return new Response(JSON.stringify({ error: "Send a valid JSON blueprint." }), { status: 400, headers: { "content-type": "application/json" } }); }
  const check = validateBlueprint(blueprint);
  if (!check.valid) return new Response(JSON.stringify({ error: "Blueprint validation failed.", details: check.errors }), { status: 422, headers: { "content-type": "application/json" } });
  try {
    const file = exportN8n(blueprint);
    const safeName = String(blueprint.title || "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "workflow";
    return new Response(JSON.stringify(file, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="' + safeName + '-n8n-scaffold.json"', "cache-control": "no-store" } });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Export failed." }), { status: 422, headers: { "content-type": "application/json" } }); }
};
