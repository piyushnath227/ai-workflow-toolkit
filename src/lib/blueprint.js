export const BLUEPRINT_VERSION = "1.0";

const VALID_KINDS = new Set(["action", "decision", "approval", "verify", "trigger", "recovery"]);
const VALID_ERRORS = new Set(["stop_and_alert", "retry_then_alert", "route_to_human", "continue_with_fallback"]);

export function validateBlueprint(bp) {
  const errors = [];
  if (!bp || typeof bp !== "object" || Array.isArray(bp)) return { valid: false, errors: ["Blueprint must be an object."] };
  if (bp.version !== BLUEPRINT_VERSION) errors.push('version must be "1.0".');
  if (!nonEmpty(bp.title)) errors.push("title is required.");
  if (!nonEmpty(bp.goal)) errors.push("goal is required.");
  if (!bp.trigger || !nonEmpty(bp.trigger.type) || !nonEmpty(bp.trigger.description)) errors.push("Exactly one trigger object with type and description is required.");
  if (!Array.isArray(bp.steps) || bp.steps.length < 2) errors.push("steps must contain at least two steps.");
  const ids = new Set();
  for (const [index, step] of (Array.isArray(bp.steps) ? bp.steps : []).entries()) {
    const at = "steps[" + index + "]";
    if (!step || typeof step !== "object") { errors.push(at + " must be an object."); continue; }
    if (!nonEmpty(step.id)) errors.push(at + ".id is required.");
    else if (ids.has(step.id)) errors.push("Step IDs must be unique: " + step.id);
    else ids.add(step.id);
    if (!nonEmpty(step.name)) errors.push(at + ".name is required.");
    if (!VALID_KINDS.has(step.kind)) errors.push(at + ".kind must be one of: " + [...VALID_KINDS].join(", ") + ".");
    if (step.kind === "action" && !VALID_ERRORS.has(step.on_error)) errors.push(at + ".on_error must define safe failure handling.");
    if (step.next != null && typeof step.next !== "string") errors.push(at + ".next must be a step ID.");
    if (step.branches != null && !Array.isArray(step.branches)) errors.push(at + ".branches must be an array.");
  }
  const stepIds = new Set((Array.isArray(bp.steps) ? bp.steps : []).map(s => s && s.id).filter(Boolean));
  for (const [index, step] of (Array.isArray(bp.steps) ? bp.steps : []).entries()) {
    if (step?.next && !stepIds.has(step.next)) errors.push("steps[" + index + "].next references missing step " + step.next + ".");
    for (const branch of (Array.isArray(step?.branches) ? step.branches : [])) {
      if (!branch || !nonEmpty(branch.label) || !nonEmpty(branch.next)) errors.push("Each branch needs a label and next step ID.");
      else if (!stepIds.has(branch.next)) errors.push("Branch references missing step " + branch.next + ".");
    }
  }
  if (!bp.safeguards || !nonEmpty(bp.safeguards.idempotency_key)) errors.push("safeguards.idempotency_key is required.");
  if (!Number.isInteger(bp.safeguards?.max_retries) || bp.safeguards.max_retries < 0 || bp.safeguards.max_retries > 5) errors.push("safeguards.max_retries must be an integer from 0 to 5.");
  if (!Array.isArray(bp.test_cases)) errors.push("test_cases must be an array.");
  else {
    for (const expected of ["happy path", "duplicate", "bad input"]) {
      if (!bp.test_cases.some(t => (t.name || "").toLowerCase().includes(expected))) errors.push('test_cases must include "' + expected + '".');
    }
  }
  if (!Array.isArray(bp.steps) || !bp.steps.some(s => s?.kind === "verify")) errors.push("At least one final verification step is required.");
  if (Array.isArray(bp.steps)) {
    const dangerous = bp.steps.findIndex(s => s?.kind === "action" && /send|publish|delete|payment|charge|refund|external|customer data/i.test(s.name || ""));
    const approval = bp.steps.findIndex(s => s?.kind === "approval");
    if (dangerous >= 0 && (approval < 0 || approval > dangerous)) errors.push("An approval step is required before external, financial, or irreversible actions.");
  }
  return { valid: errors.length === 0, errors };
}

export function createFallbackBlueprint(goal, options = {}) {
  const safeGoal = String(goal || "").trim().slice(0, 2000);
  const title = String(options.title || "Business workflow").slice(0, 100);
  return {
    version: BLUEPRINT_VERSION,
    title,
    goal: safeGoal,
    trigger: { type: "manual", description: "A user or operator starts a new workflow run." },
    steps: [
      { id: "s1", kind: "action", name: "Validate required input", tool: "generic", inputs: ["required fields"], on_error: "stop_and_alert", next: "s2" },
      { id: "s2", kind: "approval", name: "Review before external action", approver: "workflow owner", next: "s3" },
      { id: "s3", kind: "action", name: "Perform configured action", tool: "generic", inputs: ["validated input"], on_error: "retry_then_alert", next: "s4" },
      { id: "s4", kind: "verify", name: "Verify and record outcome", tool: "generic" }
    ],
    safeguards: { idempotency_key: "event_id", max_retries: 2, alert_channel: "manual review queue" },
    test_cases: [
      { name: "Happy path", input: "complete valid input", expect: "expected outcome is verified and recorded" },
      { name: "Duplicate event", input: "replay the same event_id", expect: "the duplicate does not repeat the action" },
      { name: "Bad input", input: "omit a required field", expect: "workflow stops and reports the missing field" },
      { name: "Provider failure", input: "simulate a downstream timeout", expect: "bounded retry and alert behavior is followed" }
    ]
  };
}

export function exportN8n(blueprint) {
  const check = validateBlueprint(blueprint);
  if (!check.valid) throw new Error("Invalid workflow blueprint: " + check.errors.join(" "));
  const nodes = [];
  const connections = {};
  const add = (name, type, typeVersion, parameters, position, extra = {}) => {
    nodes.push({ parameters, id: blueprint.steps.length + "-" + (nodes.length + 1), name, type, typeVersion, position, ...extra });
  };
  const triggerName = "Manual Trigger";
  add(triggerName, "n8n-nodes-base.manualTrigger", 1, {}, [0, 0]);
  let previous = triggerName;
  blueprint.steps.forEach((step, index) => {
    const name = (index + 1) + ". " + step.name;
    let type = "n8n-nodes-base.set", version = 3.4, parameters = { mode: "manual", duplicateItem: false, assignments: { assignments: [{ id: "workflow-note-" + index, name: "workflowStep", value: step.name, type: "string" }, { id: "workflow-kind-" + index, name: "workflowKind", value: step.kind, type: "string" }, { id: "workflowStatus-" + index, name: "implementationStatus", value: "TODO: configure real integration and credentials", type: "string" }] } };
    if (step.kind === "decision") { type = "n8n-nodes-base.if"; version = 2.2; parameters = { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [{ id: "replace-condition", leftValue: "={{ $json.validationPassed }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } }], combinator: "and" }, options: {} }; }
    if (step.kind === "trigger") { type = "n8n-nodes-base.stickyNote"; version = 1; parameters = { content: "Blueprint trigger: " + step.name + "\nConfigure the real trigger before production use.", height: 160, width: 260 }; }
    if (step.kind === "approval") { type = "n8n-nodes-base.stickyNote"; version = 1; parameters = { content: "HUMAN APPROVAL REQUIRED\n" + step.name + "\nReplace this note with a real approval + wait/resume integration.", height: 180, width: 300 }; }
    if (step.kind === "verify") { parameters.assignments.assignments.push({ id: "verification-note", name: "verificationRequired", value: true, type: "boolean" }); }
    add(name, type, version, parameters, [240 * (index + 1), 0], step.kind === "approval" || step.kind === "trigger" ? { notesInFlow: true } : {});
    connections[previous] = { main: [[{ node: name, type: "main", index: 0 }]] };
    previous = name;
  });
  add("Setup and safety notes", "n8n-nodes-base.stickyNote", 1, { content: "# Setup before use\n\n- This export is a scaffold, not a finished integration.\n- Configure credentials and replace every TODO placeholder.\n- Add persistent idempotency storage keyed by: " + blueprint.safeguards.idempotency_key + "\n- Max retries requested by blueprint: " + blueprint.safeguards.max_retries + "\n- Test happy path, duplicate event, bad input, provider failure, and approval behavior in a test workspace.\n- Approval and decision steps may require additional wiring; inspect them after import.", height: 300, width: 420 }, [0, 280], { notesInFlow: true });
  return { name: blueprint.title + " — AI Workflow Toolkit scaffold", nodes, connections, settings: { executionOrder: "v1" }, active: false, pinData: {}, versionId: "1", meta: { templateCredsSetupCompleted: false }, tags: [] };
}

export function blueprintToMarkdown(bp) {
  return "# " + bp.title + "\n\n" + bp.goal + "\n\n## Trigger\n" + bp.trigger.description + " (" + bp.trigger.type + ")\n\n## Steps\n" + bp.steps.map((s, i) => (i + 1) + ". **" + s.name + "** — " + s.kind + "\n   - Tool: " + (s.tool || "human / generic") + "\n   - On error: " + (s.on_error || "follow workflow policy")).join("\n") + "\n\n## Safeguards\n- Idempotency key: " + bp.safeguards.idempotency_key + "\n- Maximum retries: " + bp.safeguards.max_retries + "\n\n## Test cases\n" + bp.test_cases.map(t => "- [ ] **" + t.name + ":** " + t.expect).join("\n") + "\n\n> n8n export is a scaffold. Configure credentials and real integrations, then import and test before production use.\n";
}

function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
