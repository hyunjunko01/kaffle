/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/entry-harness.cjs');

const enter = h => h.load('lib/raffle/enter.ts').enterRaffle(h.input);
const recover = h => h.load('lib/raffle/entry-recovery.ts').reconcileEntryOperation(h.operation.id);

test('successful entry cannot be refunded by a subsequent view refresh failure', async () => {
  const h=harness();
  const result=await enter(h);
  assert.equal(result.state,'confirmed');
  assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
  assert.equal(h.calls.status,1); // A second call would throw: view refresh is separate.
  assert.equal(result.hash,h.hash);
});

test('receipt timeout retains the debit; a fresh worker later confirms the same transaction', async () => {
  const h=harness();
  h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  assert.equal((await enter(h)).state,'pending');
  assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
  h.setReceipt({transactionHash:h.hash,status:'success',blockNumber:100n,blockHash:'0xblock'});
  const fresh=require('./helpers/load-ts.cjs')({
    '@/lib/raffle/entry-store':h.store,
    '@/lib/chain/config':{getChainConfig:()=>h.config},
    '@/lib/chain/clients':{getPublicClient:()=>h.client,getRelayerWalletClient:()=>h.relayer},
  });
  assert.equal((await fresh('lib/raffle/entry-recovery.ts').reconcileEntryOperation(h.operation.id)).state,'CONFIRMED');
  assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});

test('a lost broadcast response rebroadcasts exactly the persisted bytes without another debit', async () => {
  const h=harness();
  h.relayer.sendRawTransaction=async({serializedTransaction})=>{h.calls.broadcasts.push(serializedTransaction);throw Error('connection lost after accepting transaction');};
  h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);await recover(h);
  assert.deepEqual(h.calls.broadcasts,[h.raw,h.raw]);assert.equal(h.calls.reserves,1);assert.equal(h.balance,4);
});

test('confirmed reverted transaction refunds once across repeated reconciliation', async () => {
  const h=harness();
  h.client.waitForTransactionReceipt=async()=>{h.block.timestamp=h.operation.deadline+1n;return {transactionHash:h.hash,status:'reverted',blockNumber:100n,blockHash:'0xblock'};};
  assert.equal((await enter(h)).state,'failed');
  await recover(h);await recover(h);
  assert.equal(h.balance,5);assert.equal(h.calls.refunds,1);
});

test('an unfinalized reverted receipt is pending and cannot refund', async () => {
  const h=harness();h.block.number=99n;
  h.client.waitForTransactionReceipt=async()=>({transactionHash:h.hash,status:'reverted',blockNumber:100n,blockHash:'0xblock'});
  assert.equal((await enter(h)).state,'pending');assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});

test('preparation failure refunds without ever broadcasting', async () => {
  const h=harness();h.relayer.prepareTransactionRequest=async()=>{throw Error('estimate failed');};
  assert.equal((await enter(h)).state,'failed');assert.equal(h.balance,5);
  assert.equal(h.calls.refunds,1);assert.deepEqual(h.calls.broadcasts,[]);
});

test('persisted transaction with a lost DB response remains pending and recoverable', async () => {
  const h=harness();const save=h.store.savePreparedEntry;
  h.store.savePreparedEntry=async(...args)=>{await save(...args);throw Error('DB response lost');};
  assert.equal((await enter(h)).state,'pending');
  assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);assert.deepEqual(h.calls.broadcasts,[]);
  await recover(h);assert.deepEqual(h.calls.broadcasts,[h.raw]);
});

test('a stale preparer cannot broadcast after another worker refunds its reservation', async () => {
  const h=harness();
  h.store.savePreparedEntry=async(op)=>{await h.store.failEntry(op,'interrupted');return false;};
  assert.equal((await enter(h)).state,'failed');assert.equal(h.balance,5);assert.deepEqual(h.calls.broadcasts,[]);
});

test('an expired voucher refunds only with proof of an unchanged nonce at a finalized block', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);h.block.timestamp=h.operation.deadline+1n;
  let checkedBlock;
  h.client.readContract=async input=>{checkedBlock=input.blockNumber;return 0n;};
  await recover(h);
  assert.equal(h.operation.state,'FAILED');assert.equal(h.balance,5);assert.equal(checkedBlock,100n);
});

test('expiry with an advanced user nonce is not proof of failure', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);h.block.timestamp=h.operation.deadline+1n;h.client.readContract=async()=>1n;
  await recover(h);
  assert.equal(h.operation.state,'PENDING');assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});

test('missing finalized-block support cannot stop safe broadcasting or cause a refund', async () => {
  const h=harness();h.client.getBlock=async args=>{if(args?.blockTag==='finalized') throw Error('finalized tag unsupported');return h.block;};
  assert.equal((await enter(h)).state,'confirmed');assert.equal(h.balance,4);assert.equal(h.calls.broadcasts.length,1);
});

test('retrying the same request returns the existing result without another transaction', async () => {
  const h=harness();const first=await enter(h);const second=await enter(h);
  assert.equal(first.operationId,second.operationId);assert.equal(h.calls.reserves,1);assert.equal(h.calls.broadcasts.length,1);
});

test('reusing a request id with a different ticket count is rejected', async () => {
  const h=harness();await enter(h);h.input.ticketCount=2;
  await assert.rejects(()=>enter(h),/entry request conflict/);assert.equal(h.balance,4);
});

test('a receipt for another hash cannot settle the operation', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>({transactionHash:'0xother',status:'reverted',blockNumber:100n,blockHash:'0xblock'});
  assert.equal((await enter(h)).state,'pending');assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});

test('an active preparation lease is preserved; an abandoned preparation is refunded', async () => {
  const h=harness();await h.store.reserveEntry({...h.input,chainId:8453,raffleAddress:'0x'+'1'.repeat(40),entryNonce:'0',deadline:1000n});
  await recover(h);assert.equal(h.operation.state,'PREPARING');assert.equal(h.balance,4);
  h.operation.leaseUntil=new Date(0);
  await recover(h);assert.equal(h.operation.state,'FAILED');assert.equal(h.balance,5);
});

test('public operation responses never expose signed transaction bytes or leases', async () => {
  const h=harness();const result=await enter(h);
  assert.equal(result.rawTransaction,undefined);assert.equal(result.leaseOwner,undefined);assert.equal(result.entryNonce,undefined);
});


test('a finalized revert cannot refund while its public voucher is still valid', async () => {
  const h=harness();
  h.client.waitForTransactionReceipt=async()=>({transactionHash:h.hash,status:'reverted',blockNumber:100n,blockHash:'0xblock'});
  assert.equal((await enter(h)).state,'pending');
  assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});

test('a copied voucher submitted by another caller is confirmed instead of refunded', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);
  h.block.number=200n;h.block.timestamp=h.operation.deadline+1n;
  h.client.readContract=async()=>1n;
  h.setReceipt({transactionHash:h.hash,status:'reverted',blockNumber:150n,blockHash:'0xblock'});
  h.client.getContractEvents=async()=>[{args:{ticketCount:1n},blockNumber:120n,logIndex:0,transactionHash:'0xcopied'}];
  await recover(h);
  assert.equal(h.operation.state,'CONFIRMED');assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
  assert.equal(h.operation.confirmedTxHash,'0xcopied');
});

test('event recovery scans bounded ranges and resumes from its saved cursor', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);h.block.number=5000n;h.client.readContract=async()=>1n;
  const ranges=[];
  h.client.getContractEvents=async args=>{ranges.push([args.fromBlock,args.toBlock]);return [];};
  await recover(h);await recover(h);
  assert.deepEqual(ranges,[[101n,2100n],[2101n,4100n]]);
  assert.equal(h.calls.refunds,0);
});

test('a conflicting historical entry amount stays pending for review', async () => {
  const h=harness();h.client.waitForTransactionReceipt=async()=>{throw Error('timeout');};
  await enter(h);h.block.number=200n;h.client.readContract=async()=>1n;
  h.client.getContractEvents=async()=>[{args:{ticketCount:2n},blockNumber:120n,logIndex:0,transactionHash:'0xother'}];
  await recover(h);assert.equal(h.operation.state,'PENDING');assert.equal(h.balance,4);assert.equal(h.calls.refunds,0);
});
