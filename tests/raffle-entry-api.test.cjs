/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createLoader = require('./helpers/load-ts.cjs');
const json=(body,options)=>new Response(JSON.stringify(body),{...options,headers:{'content-type':'application/json'}});

function api(overrides={}) {
  const calls={enter:0,reconcile:0};
  const auth={getCurrentUser:async()=>({id:'user-a',wallet:{address:'0x'+'a'.repeat(40)}})};
  const store={findEntryByRequest:async()=>null,findUserEntry:async()=>null,readEntry:async()=>null,EntryAlreadyPendingError:class extends Error {}};
  const result={operationId:'op',requestId:'11111111-1111-4111-8111-111111111111',state:'pending',hash:'0xhash'};
  const load=createLoader({
    'next/server':{NextResponse:{json}},
    '@/lib/auth/user':auth,
    '@/lib/chain/config':{getChainConfig:()=>({chainId:8453})},
    '@/lib/raffle/entry-store':store,
    '@/lib/raffle/enter':{enterErrorMessage:e=>e.message,enterRaffle:async input=>{calls.enter++;calls.input=input;return result;}},
    '@/lib/raffle/entry-recovery':{entryOperationResponse:x=>x,reconcileEntryOperation:async id=>{calls.reconcile++;return {...result,operationId:id};}},
    ...overrides,
  });
  return {route:load('app/api/raffle/enter/route.ts'),auth,store,calls,result};
}
const request=body=>new Request('https://kaffle.test/api/raffle/enter',{method:'POST',body:JSON.stringify(body)});

test('entry API requires authentication before accepting a spend',async()=>{
  const h=api();h.auth.getCurrentUser=async()=>null;
  assert.equal((await h.route.POST(request({}))).status,401);assert.equal(h.calls.enter,0);
});

test('entry API rejects missing idempotency keys and malformed JSON',async()=>{
  const h=api();
  assert.equal((await h.route.POST(request({ticketCount:1}))).status,400);
  assert.equal((await h.route.POST(new Request('https://kaffle.test',{method:'POST',body:'{'}))).status,400);
  assert.equal(h.calls.enter,0);
});

test('entry API returns 202 for an unresolved operation without refreshing the view',async()=>{
  const h=api();const response=await h.route.POST(request({requestId:h.result.requestId,ticketCount:1}));
  assert.equal(response.status,202);assert.equal((await response.json()).operationId,'op');assert.equal(h.calls.enter,1);
});

test('entry API returns a confirmed outcome independently of view availability',async()=>{
  const h=api();h.result.state='confirmed';
  const response=await h.route.POST(request({requestId:h.result.requestId,ticketCount:1}));
  assert.equal(response.status,200);assert.equal((await response.json()).state,'confirmed');
});

test('entry status lookup is scoped to the signed-in user',async()=>{
  const h=api();let lookup;
  h.store.findUserEntry=async(...args)=>{lookup=args;return null;};
  const response=await h.route.GET(new Request('https://kaffle.test/api/raffle/enter?operationId=another-users-op'));
  assert.equal(response.status,404);assert.deepEqual(lookup,['user-a',8453,'another-users-op']);assert.equal(h.calls.reconcile,0);
});

test('entry status lookup rejects operations from another chain',async()=>{
  const h=api();h.store.findEntryByRequest=async()=>({id:'op',chainId:1});
  const response=await h.route.GET(new Request('https://kaffle.test/api/raffle/enter?requestId=abc'));
  assert.equal(response.status,404);assert.equal(h.calls.reconcile,0);
});

test('cron rejects unauthenticated callers and runs only with its configured bearer token',async()=>{
  let calls=0;
  const load=createLoader({
    'next/server':{NextResponse:{json}},
    '@/lib/raffle/entry-recovery':{reconcilePendingEntries:async limit=>{calls++;assert.equal(limit,5);return [];}},
  },{process:{env:{CRON_SECRET:'test-cron-secret'}}});
  const route=load('app/api/cron/raffle-entries/route.ts');
  assert.equal((await route.GET(new Request('https://kaffle.test'))).status,401);
  assert.equal((await route.GET(new Request('https://kaffle.test',{headers:{authorization:'Bearer wrong'}}))).status,401);
  assert.equal(calls,0);
  assert.equal((await route.GET(new Request('https://kaffle.test',{headers:{authorization:'Bearer test-cron-secret'}}))).status,200);
  assert.equal(calls,1);
});

test('cron fails closed when no secret is configured',async()=>{
  const load=createLoader({'next/server':{NextResponse:{json}},'@/lib/raffle/entry-recovery':{}},{process:{env:{}}});
  assert.equal((await load('app/api/cron/raffle-entries/route.ts').GET(new Request('https://kaffle.test'))).status,503);
});
