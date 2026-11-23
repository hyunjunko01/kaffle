/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { keccak256 } = require('viem');
const createLoader = require('./helpers/load-ts.cjs');

const url=process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test')) throw Error('TEST_DATABASE_URL must name a disposable database ending in _test');
const db=url ? new PrismaClient({datasourceUrl:url}) : null;
const dbTest=url ? test : test.skip;
const users=[];
const load=createLoader({'@/lib/db':{prisma:db}});
const store=()=>load('lib/raffle/entry-store.ts');
const tickets=()=>load('lib/tickets.ts');

async function fixture() {
  const user=await db.user.create({data:{kakaoId:randomUUID(),nickname:'entry-test',referralCode:randomUUID()}});
  users.push(user.id);
  await db.ticketLedger.create({data:{userId:user.id,amount:5,reason:'test_grant'}});
  const input={userId:user.id,requestId:randomUUID(),chainId:8453,raffleAddress:'0x'+'1'.repeat(40),walletAddress:'0x'+randomBytes(20).toString('hex'),ticketCount:1,entryNonce:'0',deadline:2000n};
  const raw='0x'+randomBytes(16).toString('hex');
  return {input,raw,hash:keccak256(raw)};
}
async function prepare(f) {
  const {operation}=await store().reserveEntry(f.input);
  assert.equal(await store().savePreparedEntry(operation,{rawTransaction:f.raw,txHash:f.hash,entryNonce:f.input.entryNonce,deadline:f.input.deadline,startBlock:100n}),true);
  return store().readEntry(operation.id);
}
after(async()=>{
  if (!db) return;
  await db.ticketLedger.deleteMany({where:{userId:{in:users}}});
  await db.raffleEntryOperation.deleteMany({where:{userId:{in:users}}});
  await db.user.deleteMany({where:{id:{in:users}}});
  await db.$disconnect();
});

dbTest('Postgres: concurrent replay requests debit once and return one operation',async()=>{
  const f=await fixture();
  const results=await Promise.all(Array.from({length:8},()=>store().reserveEntry(f.input)));
  assert.equal(results.filter(x=>x.created).length,1);
  assert.equal(new Set(results.map(x=>x.operation.id)).size,1);
  assert.equal(await tickets().getTicketBalance(f.input.userId),4);
});

dbTest('Postgres: different concurrent requests cannot overspend or create two active entries',async()=>{
  const f=await fixture();f.input.ticketCount=4;
  const results=await Promise.allSettled(Array.from({length:5},()=>store().reserveEntry({...f.input,requestId:randomUUID()})));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert(results.filter(x=>x.status==='rejected').every(x=>x.reason.message==='entry already pending'));
  assert.equal(await tickets().getTicketBalance(f.input.userId),1);
});

dbTest('Postgres: concurrent failure workers produce exactly one refund',async()=>{
  const f=await fixture();const op=await prepare(f);
  await Promise.all(Array.from({length:8},()=>store().failEntry(op,'confirmed revert')));
  assert.equal((await store().readEntry(op.id)).state,'FAILED');
  assert.equal(await tickets().getTicketBalance(f.input.userId),5);
  assert.equal(await db.ticketLedger.count({where:{entryOperationId:op.id,reason:'raffle_entry_refund'}}),1);
});

dbTest('Postgres: failure state rolls back when the refund cannot commit',async()=>{
  const f=await fixture();const op=await prepare(f);
  const broken=db.$extends({query:{ticketLedger:{create({args,query}){
    if(args.data.reason==='raffle_entry_refund') throw Error('simulated ledger failure');
    return query(args);
  }}}});
  const failureStore=createLoader({'@/lib/db':{prisma:broken}})('lib/raffle/entry-store.ts');
  await assert.rejects(()=>failureStore.failEntry(op,'revert'),/simulated ledger failure/);
  assert.equal((await store().readEntry(op.id)).state,'PENDING');
  assert.equal(await tickets().getTicketBalance(f.input.userId),4);
  await store().failEntry(op,'revert');
  assert.equal(await tickets().getTicketBalance(f.input.userId),5);
});

dbTest('Postgres: lease takeover fences a stale signer before refunding interrupted preparation',async()=>{
  const f=await fixture();const {operation}=await store().reserveEntry(f.input);
  assert.equal(await store().acquireEntryLease(operation.id),null);
  await db.raffleEntryOperation.update({where:{id:operation.id},data:{leaseUntil:new Date(0)}});
  const replacement=await store().acquireEntryLease(operation.id);
  assert.notEqual(replacement.leaseOwner,operation.leaseOwner);
  await store().failEntry(replacement,'interrupted');
  assert.equal(await store().savePreparedEntry(operation,{rawTransaction:f.raw,txHash:f.hash,entryNonce:f.input.entryNonce,deadline:f.input.deadline,startBlock:100n}),false);
  assert.equal(await tickets().getTicketBalance(f.input.userId),5);
});

dbTest('Postgres: pending and failed operations do not count as confirmed entry tickets',async()=>{
  const f=await fixture();const op=await prepare(f);
  assert.equal(await tickets().getRaffleEntryTickets(f.input.userId,f.input.raffleAddress),0);
  assert.equal((await tickets().getRoundParticipants(f.input.raffleAddress)).some(x=>x.userId===f.input.userId),false);
  await store().confirmEntry(op);
  assert.equal(await tickets().getRaffleEntryTickets(f.input.userId,f.input.raffleAddress),1);
  const second=await prepare({...f,input:{...f.input,requestId:randomUUID(),entryNonce:'1'},raw:'0x1234',hash:keccak256('0x1234')});
  await store().failEntry(second,'reverted');
  assert.equal(await tickets().getRaffleEntryTickets(f.input.userId,f.input.raffleAddress),1);
});

dbTest('Postgres: first-entry mission ignores a pending debit and accepts a confirmed entry',async()=>{
  const f=await fixture();const op=await prepare(f);
  const missions=createLoader({'@/lib/db':{prisma:db},'@/lib/chain/config':{}})('lib/missions.ts');
  assert.equal(await missions.hasRaffleEntered(f.input.userId),false);
  await store().confirmEntry(op);
  assert.equal(await missions.hasRaffleEntered(f.input.userId),true);
});

dbTest('Postgres: a new client recovers a persisted transaction after a restart',async()=>{
  const f=await fixture();const op=await prepare(f);
  const fresh=new PrismaClient({datasourceUrl:url});
  try {
    const recovered=await fresh.raffleEntryOperation.findUniqueOrThrow({where:{id:op.id}});
    assert.equal(recovered.txHash,f.hash);assert.equal(recovered.rawTransaction,f.raw);assert.equal(recovered.state,'PENDING');
  } finally {await fresh.$disconnect();}
});

dbTest('Postgres: legacy entry and refund accounting is preserved',async()=>{
  const f=await fixture();
  await db.ticketLedger.createMany({data:[
    {userId:f.input.userId,amount:-3,reason:'raffle_entry',relatedId:f.input.raffleAddress},
    {userId:f.input.userId,amount:1,reason:'raffle_entry_refund',relatedId:f.input.raffleAddress},
  ]});
  assert.equal(await tickets().getRaffleEntryTickets(f.input.userId,f.input.raffleAddress),2);
});

dbTest('Postgres: confirming an entry prevents any later refund',async()=>{
  const f=await fixture();const op=await prepare(f);
  await store().confirmEntry(op);await store().failEntry(op,'late failure');
  assert.equal((await store().readEntry(op.id)).state,'CONFIRMED');
  assert.equal(await tickets().getTicketBalance(f.input.userId),4);
});

dbTest('Postgres: a stale snapshot cannot reserve a consumed voucher nonce twice',async()=>{
  const f=await fixture();const op=await prepare(f);await store().confirmEntry(op);
  const {operation:second}=await store().reserveEntry({...f.input,requestId:randomUUID()});
  await assert.rejects(()=>store().savePreparedEntry(second,{rawTransaction:'0xabcd',txHash:keccak256('0xabcd'),entryNonce:'0',deadline:3000n,startBlock:100n}),e=>e.code==='P2002');
  await store().failEntry(second,'stale nonce');
  assert.equal(await tickets().getTicketBalance(f.input.userId),4);
});
