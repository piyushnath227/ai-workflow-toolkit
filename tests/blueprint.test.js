import test from "node:test";
import assert from "node:assert/strict";
import { createFallbackBlueprint, validateBlueprint, exportN8n, blueprintToMarkdown } from "../src/lib/blueprint.js";

test("fallback blueprint passes the contract", () => {
  const bp = createFallbackBlueprint("Onboard new clients");
  assert.deepEqual(validateBlueprint(bp), { valid: true, errors: [] });
});
test("n8n exporter creates a connected, inactive workflow scaffold", () => {
  const bp = createFallbackBlueprint("Send a welcome email after approval");
  const out = exportN8n(bp);
  assert.equal(out.active, false);
  assert.ok(out.nodes.length >= bp.steps.length + 2);
  assert.ok(out.connections["Manual Trigger"]);
  assert.match(JSON.stringify(out), /HUMAN APPROVAL REQUIRED/);
});
test("validator rejects duplicate IDs and missing references", () => {
  const bp = createFallbackBlueprint("A process");
  bp.steps[1].id = bp.steps[0].id;
  bp.steps[2].next = "missing-step";
  const result = validateBlueprint(bp);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("unique")));
  assert.ok(result.errors.some(e => e.includes("missing-step")));
});
test("markdown export includes safety tests", () => {
  const md = blueprintToMarkdown(createFallbackBlueprint("Weekly report"));
  assert.match(md, /Duplicate event/);
  assert.match(md, /Idempotency key/);
});
