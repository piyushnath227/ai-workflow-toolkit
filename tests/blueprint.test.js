import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFallbackBlueprint, validateBlueprint, exportN8n, blueprintToMarkdown } from "../src/lib/blueprint.js";

test("fallback blueprint passes the contract", () => {
  const bp = createFallbackBlueprint("Onboard new clients");
  assert.deepEqual(validateBlueprint(bp), { valid: true, errors: [] });
});
test("n8n exporter creates an inactive connected scaffold", () => {
  const bp = createFallbackBlueprint("Onboard new clients");
  const out = exportN8n(bp);
  assert.equal(out.active, false);
  assert.ok(out.nodes.length >= bp.steps.length + 2);
  assert.ok(out.connections["Manual Trigger"]);
  assert.match(JSON.stringify(out), /humanApprovalRequired/);
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
test("all agency template files satisfy the blueprint contract", async () => {
  for (const file of ["client-onboarding", "lead-follow-up", "weekly-client-report", "content-approval", "support-triage"]) {
    const url = new URL("../templates/agency/" + file + ".json", import.meta.url);
    const bp = JSON.parse(await readFile(url, "utf8"));
    const result = validateBlueprint(bp);
    assert.equal(result.valid, true, file + ": " + result.errors.join("; "));
  }
});
