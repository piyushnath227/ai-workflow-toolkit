interface Env { DB?: D1Database; }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
 if(!env.DB) return json({error:"Service requests are not configured yet."},503);
 let body:any; try{body=await request.json();}catch{return json({error:"Send valid JSON."},400);}
 const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
 const process=typeof body?.process==="string"?body.process.trim():"";
 const role=typeof body?.role==="string"?body.role.trim().slice(0,120):"";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json({error:"Enter a valid email address."},400);
 if(process.length<10||process.length>1500)return json({error:"Describe the process in 10 to 1,500 characters."},400);
 try{await env.DB.prepare("INSERT INTO service_requests (id,email,role,process_description,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),email,role,process,Math.floor(Date.now()/1000)).run();return json({ok:true,message:"Request saved. The site owner must configure a notification channel to review new requests."},201);}
 catch{return json({error:"Request could not be saved. Please try again later."},503);}
};
function json(v:unknown,status=200){return new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
