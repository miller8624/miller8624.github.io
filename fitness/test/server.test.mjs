import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('private account, two-device sync, conflicts, import, logout and restart persistence',async()=>{const dir=mkdtempSync(join(tmpdir(),'playa-test-'));const port=18376,origin=`http://127.0.0.1:${port}`;let child;
async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),DATA_DIR:dir,SETUP_TOKEN:'test-setup-secret',NODE_ENV:'test',APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.on('data',resolve);child.on('exit',c=>reject(Error('Server exited '+c)));child.on('error',reject)})}
async function stop(){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done}
async function request(path,{method='GET',body,cookie,originHeader=origin}={}){return fetch(origin+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:originHeader}:{})},body:body?JSON.stringify(body):undefined})}
try{await start();assert.equal((await request('/api/state')).status,401);let r=await request('/');assert.equal(r.status,200);assert.match(await r.text(),/Welcome back/);assert.match(r.headers.get('content-security-policy'),/sha256/);
assert.equal((await request('/api/setup',{method:'POST',body:{token:'wrong',password:'a-long-test-password'}})).status,403);
assert.equal((await request('/api/setup',{method:'POST',body:{token:'test-setup-secret',password:'short'}})).status,400);
r=await request('/api/setup',{method:'POST',body:{token:'test-setup-secret',password:'a-long-test-password'}});assert.equal(r.status,200);const cookieA=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);
assert.equal((await request('/api/setup',{method:'POST',body:{token:'test-setup-secret',password:'a-long-test-password'}})).status,409);
assert.equal((await request('/api/login',{method:'POST',body:{password:'incorrect'}})).status,401);
r=await request('/api/login',{method:'POST',body:{password:'a-long-test-password'}});const cookieB=r.headers.get('set-cookie').split(';')[0];assert.notEqual(cookieA,cookieB);
const value={steps:10000,weight:200,protein:180,carbs:200,fat:75,sleep:7,workout:true,notes:'Test entry'};
assert.equal((await request('/api/logs/2026-10-09',{method:'PUT',cookie:cookieA,originHeader:'https://evil.example',body:{value,revision:0}})).status,403);
assert.equal((await request('/api/logs/2026-02-31',{method:'PUT',cookie:cookieA,body:{value,revision:0}})).status,400);
assert.equal((await request('/api/logs/2026-10-09',{method:'PUT',cookie:cookieA,body:{value:{...value,notes:{bad:true}},revision:0}})).status,400);
assert.equal((await request('/api/logs/2026-10-09',{method:'PUT',cookie:cookieA,body:{value,revision:0}})).status,200);
let snap=await(await request('/api/state',{cookie:cookieB})).json();assert.deepEqual(snap.state.logs['2026-10-09'],value);assert.equal(snap.revisions.logs['2026-10-09'],1);
assert.equal((await request('/api/logs/2026-10-09',{method:'PUT',cookie:cookieB,body:{value:{...value,steps:4},revision:0}})).status,409);
assert.equal((await request('/api/logs/2026-10-10',{method:'PUT',cookie:cookieB,body:{value,revision:0}})).status,200);
assert.equal((await request('/api/import',{method:'POST',cookie:cookieB,body:{state:snap.state,version:snap.version}})).status,409);
snap=await(await request('/api/state',{cookie:cookieB})).json();let backup=structuredClone(snap.state);delete backup.logs['2026-10-10'];backup.logs['2026-10-09'].notes='Imported';assert.equal((await request('/api/import',{method:'POST',cookie:cookieB,body:{state:backup,version:snap.version}})).status,200);snap=await(await request('/api/state',{cookie:cookieA})).json();assert.equal(snap.state.logs['2026-10-09'].notes,'Imported');assert.ok(snap.state.logs['2026-10-10']);
await stop();await start();snap=await(await request('/api/state',{cookie:cookieB})).json();assert.equal(snap.state.logs['2026-10-09'].notes,'Imported');assert.equal((await request('/api/logout',{method:'POST',cookie:cookieA,body:{}})).status,200);assert.equal((await request('/api/state',{cookie:cookieA})).status,401);assert.equal((await request('/api/state',{cookie:cookieB})).status,200);
}finally{if(child?.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true})}
});
