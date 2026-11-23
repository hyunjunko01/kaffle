/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { randomUUID } = require('node:crypto');
const { keccak256 } = require('viem');
const createLoader = require('./load-ts.cjs');

module.exports = function harness() {
  const raw = '0x02abcd';
  const hash = keccak256(raw);
  let operation = null;
  let balance = 5;
  let receipt = null;
  const calls = { broadcasts: [], refunds: 0, reserves: 0, status: 0 };
  const clone = value => value && { ...value };
  const store = {
    findEntryByRequest: async (userId, requestId) => operation?.userId === userId && operation?.requestId === requestId ? clone(operation) : null,
    readEntry: async () => clone(operation),
    reserveEntry: async input => {
      if (operation?.requestId === input.requestId) return { operation: clone(operation), created: false };
      if (operation && ['PENDING', 'PREPARING'].includes(operation.state)) throw Error('entry already pending');
      if (balance < input.ticketCount) throw Error('insufficient tickets');
      balance -= input.ticketCount;
      calls.reserves++;
      operation = { ...input, id: 'operation-1', state: 'PREPARING', leaseOwner: 'owner', leaseUntil: new Date(Date.now()+120000), rawTransaction: null, txHash: null, failureReason: null };
      return { operation: clone(operation), created: true };
    },
    savePreparedEntry: async (op, prepared) => {
      if (operation.state !== 'PREPARING' || operation.leaseOwner !== op.leaseOwner) return false;
      Object.assign(operation, { state:'PENDING', ...prepared });return true;
    },
    confirmEntry: async (op, confirmedTxHash=op.txHash) => {
      if (operation.state === 'PENDING' && operation.txHash === op.txHash) Object.assign(operation,{state:'CONFIRMED',confirmedTxHash});
    },
    failEntry: async (op, reason) => {
      if (operation.state !== op.state || operation.leaseOwner !== op.leaseOwner) return;
      balance += operation.ticketCount;calls.refunds++;
      Object.assign(operation, {state:'FAILED', failureReason:reason, rawTransaction:null});
    },
    releaseEntryLease: async op => {
      if (operation.leaseOwner === op.leaseOwner) Object.assign(operation, {leaseOwner:null,leaseUntil:null});
    },
    acquireEntryLease: async () => {
      if (!operation || !['PENDING','PREPARING'].includes(operation.state) || (operation.leaseUntil && operation.leaseUntil > new Date())) return null;
      Object.assign(operation,{leaseOwner:randomUUID(),leaseUntil:new Date(Date.now()+120000)});return clone(operation);
    },
    advanceEntryScan: async (op,scanBlock) => { operation.scanBlock=scanBlock; },
    listPendingEntries: async () => operation && ['PREPARING','PENDING'].includes(operation.state) ? [clone(operation)] : [],
  };
  const block = { number:100n, timestamp:BigInt(Math.floor(Date.now()/1000)), hash:'0xblock' };
  const client = {
    readContract: async () => 0n,
    getBlock: async () => block,
    getContractEvents: async () => [],
    getBlockNumber: async () => 101n,
    getTransactionReceipt: async () => { if (!receipt) throw Error('not found');return receipt; },
    waitForTransactionReceipt: async () => {
      receipt = {transactionHash:hash,status:'success',blockNumber:100n,blockHash:'0xblock'};
      return receipt;
    },
  };
  const relayer = {
    account:{address:'0x'+'3'.repeat(40)},
    prepareTransactionRequest: async x => x,
    signTransaction: async () => raw,
    sendRawTransaction: async ({serializedTransaction}) => {
      if (operation.state !== 'PENDING' || operation.txHash !== hash) throw Error('broadcast before persistence');
      calls.broadcasts.push(serializedTransaction);return hash;
    },
  };
  const config = {chainId:8453,ticketSigner:{signTypedData:async()=> '0x1234'}};
  const mocks = {
    '@/lib/raffle/entry-store':store,
    '@/lib/chain/config':{getChainConfig:()=>config},
    '@/lib/chain/clients':{getPublicClient:()=>client,getRelayerWalletClient:()=>relayer,syncChainClock:async()=>{}},
    '@/lib/raffle/status':{getRaffleStatus:async()=>{
      if (++calls.status > 1) throw Error('view refresh unavailable');
      return {current:{address:'0x'+'1'.repeat(40),isOpen:true,endTime:Math.floor(Date.now()/1000)+3600}};
    }},
  };
  const load = createLoader(mocks);
  return {
    load, store, client, relayer, block, calls, config, hash, raw,
    input:{userId:'user-1',requestId:randomUUID(),walletAddress:'0x'+'2'.repeat(40),ticketCount:1},
    get operation(){return operation;},get balance(){return balance;},
    setReceipt(value){receipt=value;},
  };
};
