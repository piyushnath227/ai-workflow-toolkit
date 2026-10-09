export const BLUEPRINT_VERSION = "1.0";
const VALID_KINDS = new Set(["action", "decision", "approval", "verify", "trigger", "recovery"]);
const VALID_ERRORS = new Set(["stop_and_alert", "retry_then_alert", "route_to_human", "continue_with_fallback"]);
export function validateBlueprint(bp) {
 const errors=[];
 if(!bp||typeof bp!=="object"||Array.isArray(bp)) return {valid:false,errors:["Blueprint must be an object."]};
 if(bp.version!==BLUEPRINT_VERSION) errors.push('version must be "1.0".');
 if(!nonEmpty(bp.title)) errors.push("title is required.");
 if(!nonEmpty(bp.goal)) errors.push("goal is required.");
 if(!bp.trigger||!nonEmpty(bp.trigger.type)||!nonEmpty(bp.trigger.description)) errors.push("Exactly one trigger object with type and description is required.");
 if(!Array.isArray(bp.steps)||bp.steps.length<2) errors.push("steps must contain at least two steps.");
 const ids=new Set();
 for(const [i,s] of (Array.isArray(bp.steps)?bp.steps:[]).entries()){
  if(!s||typeof s!=="object"){errors.push("steps["+i+"] must be an object.");continue;}
  if(!nonEmpty(s.id)) errors.push("steps["+i+"].id is required."); else if(ids.has(s.id)) errors.push("Step IDs must be unique: "+s.id); else ids.add(s.id);
  if(!nonEmpty(s.name)) errors.push("steps["+i+"].name is required.");
  if(!VALID_KINDS.has(s.kind)) errors.push("steps["+i+"].kind is invalid.");
  if(s.kind==="action"&&!VALID_ERRORS.has(s.on_error)) errors.push("steps["+i+"] needs safe error handling.");
  if(s.branches!=null&&!Array.isArray(s.branches)) errors.push("steps["+i+"].branches must be an array.");
 }
 const stepIds=new Set((Array.isArray(bp.steps)?bp.steps:[]).map(s=>s&&s.id).filter(Boolean));
 for(const [i,s] of (Array.isArray(bp.steps)?bp.steps:[]).entries()){
  if(s?.next&&!stepIds.has(s.next)) errors.push("steps["+i+"].next references missing step "+s.next+".");
  for(const b of (Array.isArray(s?.branches)?s.branches:[])){if(!b||!nonEmpty(b.label)||!nonEmpty(b.next)) errors.push("Each branch needs label and next."); else if(!stepIds.has(b.next)) errors.push("Branch references missing step "+b.next+".");}
 }
 if(!bp.safeguards||!nonEmpty(bp.safeguards.idempotency_key)) errors.push("safeguards.idempotency_key is required.");
 if(!Number.isInteger(bp.safeguards?.max_retries)||bp.safeguards.max_retries<0||bp.safeguards.max_retries>5) errors.push("max_retries must be 0 to 5.");
 if(!Array.isArray(bp.test_cases)) errors.push("test_cases must be an array."); else for(const n of ["happy path","duplicate","bad input"]) if(!bp.test_cases.some(t=>(t.name||"").toLowerCase().includes(n))) errors.push('test_cases must include "'+n+'".');
 if(!Array.isArray(bp.steps)||!bp.steps.some(s=>s?.kind==="verify")) errors.push("A verification step is required.");
 if(Array.isArray(bp.steps)){const d=bp.steps.findIndex(s=>s?.kind==="action"&&/send|publish|delete|payment|charge|refund|external|customer data/i.test(s.name||""));const a=bp.steps.findIndex(s=>s?.kind==="approval");if(d>=0&&(a<0||a>d))errors.push("Approval is required before risky actions.");}
 return {valid:errors.length===0,errors};
}
export function createFallbackBlueprint(goal,options={}) {
 return {version:BLUEPRINT_VERSION,title:String(options.title||"Business workflow").slice(0,100),goal:String(goal||"").trim().slice(0,2000),trigger:{type:"manual",description:"A user or operator starts a new workflow run."},steps:[
 {id:"s1",kind:"action",name:"Validate required input",tool:"generic",inputs:["required fields"],on_error:"stop_and_alert",next:"s2"},
 {id:"s2",kind:"approval",name:"Review before external action",approver:"workflow owner",next:"s3"},
 {id:"s3",kind:"action",name:"Perform configured action",tool:"generic",inputs:["validated input"],on_error:"retry_then_alert",next:"s4"},
 {id:"s4",kind:"verify",name:"Verify and record outcome",tool:"generic"}],
 safeguards:{idempotency_key:"event_id",max_retries:2,alert_channel:"manual review queue"},
 test_cases:[{name:"Happy path",input:"complete valid input",expect:"outcome is verified"},{name:"Duplicate event",input:"same event_id twice",expect:"duplicate action is prevented"},{name:"Bad input",input:"required field missing",expect:"run stops and reports missing field"},{name:"Provider failure",input:"downstream timeout",expect:"bounded retry and alert"}]};
}
export function exportN8n(bp) {
 const check=validateBlueprint(bp); if(!check.valid) throw new Error("Invalid blueprint: "+check.errors.join(" "));
 const nodes=[],connections={},names=new Map();
 const add=(name,type,typeVersion,parameters,position,extra={})=>{nodes.push({parameters,id:"awt-"+nodes.length,name,type,typeVersion,position,...extra});return name;};
 const trigger=add("Manual Trigger","n8n-nodes-base.manualTrigger",1,{},[0,0]);
 bp.steps.forEach((s,i)=>{const name=(i+1)+". "+s.name;names.set(s.id,name);let type="n8n-nodes-base.set",version=3.4,parameters={mode:"manual",duplicateItem:false,assignments:{assignments:[
 {id:"step-"+i,name:"workflowStep",value:s.name,type:"string"},{id:"kind-"+i,name:"workflowKind",value:s.kind,type:"string"},{id:"status-"+i,name:"implementationStatus",value:s.kind==="approval"?"needs-human-review":"TODO: configure real integration",type:"string"},{id:"key-"+i,name:"idempotencyKeyField",value:bp.safeguards.idempotency_key,type:"string"}]}};
 if(s.kind==="decision"){type="n8n-nodes-base.if";version=2.2;parameters={conditions:{options:{caseSensitive:true,leftValue:"",typeValidation:"strict",version:2},conditions:[{id:"replace-condition",leftValue:"={{ $json.validationPassed }}",rightValue:true,operator:{type:"boolean",operation:"true",singleValue:true}}],combinator:"and"},options:{}};}
 if(s.kind==="approval")parameters.assignments.assignments.push({id:"approval-"+i,name:"humanApprovalRequired",value:true,type:"boolean"},{id:"instructions-"+i,name:"approvalInstructions",value:"Replace this placeholder with a real human approval and wait/resume integration.",type:"string"});
 if(s.kind==="verify")parameters.assignments.assignments.push({id:"verify-"+i,name:"verificationRequired",value:true,type:"boolean"});
 add(name,type,version,parameters,[260*(i+1),0]);});
 if(bp.steps[0])connections[trigger]={main:[[{node:names.get(bp.steps[0].id),type:"main",index:0}]]};
 for(const s of bp.steps){const from=names.get(s.id);if(s.kind==="decision"&&s.branches?.length){const outs=[[],[]];s.branches.forEach((b,i)=>{const ix=/no|false|invalid|incomplete|duplicate/i.test(b.label)?1:(i===0?0:1);outs[ix].push({node:names.get(b.next),type:"main",index:0});});connections[from]={main:outs};}else if(s.next&&names.has(s.next))connections[from]={main:[[{node:names.get(s.next),type:"main",index:0}]]};}
 add("Setup and safety notes","n8n-nodes-base.stickyNote",1,{content:"# Setup before use\n\n- This is a scaffold, not a finished integration.\n- Configure credentials and replace TODO placeholders.\n- Add persistent idempotency storage keyed by "+bp.safeguards.idempotency_key+".\n- Requested max retries: "+bp.safeguards.max_retries+".\n- Test happy path, duplicate event, bad input, provider failure and approval in a sandbox.\n- IF nodes use placeholder validationPassed; wire real conditions after import.",height:300,width:420},[0,280],{notesInFlow:true});
 return {name:bp.title+" — AI Workflow Toolkit scaffold",nodes,connections,settings:{executionOrder:"v1"},active:false,pinData:{},versionId:"1",meta:{templateCredsSetupCompleted:false},tags:[]};
}
export function blueprintToMarkdown(bp){return "# "+bp.title+"\n\n"+bp.goal+"\n\n## Trigger\n"+bp.trigger.description+" ("+bp.trigger.type+")\n\n## Steps\n"+bp.steps.map((s,i)=>(i+1)+". **"+s.name+"** — "+s.kind+"\n   - Tool: "+(s.tool||"human / generic")+"\n   - On error: "+(s.on_error||"follow workflow policy")).join("\n")+"\n\n## Safeguards\n- Idempotency key: "+bp.safeguards.idempotency_key+"\n- Maximum retries: "+bp.safeguards.max_retries+"\n\n## Test cases\n"+bp.test_cases.map(t=>"- [ ] **"+t.name+":** "+t.expect).join("\n")+"\n\n> n8n export is a scaffold. Configure credentials and test before production use.\n";}
function nonEmpty(v){return typeof v==="string"&&v.trim().length>0;}
