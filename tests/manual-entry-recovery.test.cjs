/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createLoader = require('./helpers/load-ts.cjs');
const json = (body, options) => new Response(JSON.stringify(body), options);
const plain = value => JSON.parse(JSON.stringify(value));

function operation(index, extra = {}) {
  return {
    id: `operation-${String(index).padStart(3, '0')}`, userId: `user-${index}`,
    chainId: 8453, state: 'PENDING', createdAt: new Date('2026-01-01T00:00:00.000Z'),
    raffleAddress: '0x' + '1'.repeat(40), ticketCount: 1, txHash: '0xtx',
    user: { nickname: `user ${index}` }, rawTransaction: 'must-stay-private', leaseOwner: 'private-token',
    ...extra,
  };
}

function fixture(rows = []) {
  const calls = { queries: [], recovered: [], config: 0 };
  const auth = { admin: true, user: { id: 'user-1' } };
  const outcomes = new Map();
  const matches = (row, where) => {
    if (row.chainId !== where.chainId || !where.state.in.includes(row.state)) return false;
    if (where.userId !== undefined && row.userId !== where.userId) return false;
    if (where.createdAt?.lte && row.createdAt > where.createdAt.lte) return false;
    if (where.AND) {
      const [laterDate, sameDate] = where.AND[0].OR;
      if (!(row.createdAt > laterDate.createdAt.gt ||
          (row.createdAt.getTime() === sameDate.createdAt.getTime() && row.id > sameDate.id.gt))) return false;
    }
    return true;
  };
  const prisma = {
    raffleEntryOperation: {
      count: async ({ where }) => rows.filter(row => matches(row, where)).length,
      findMany: async query => {
        calls.queries.push(query);
        return rows.filter(row => matches(row, query.where))
          .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)).slice(0, query.take);
      },
    },
    raffleSnapshot: { findMany: async () => [{ raffleAddress: '0x' + '1'.repeat(40), roundNumber: 2 }] },
  };
  const load = createLoader({
    'next/server': { NextResponse: { json } },
    '@/lib/db': { prisma },
    '@/lib/admin/auth': { requireAdminSession: async () => auth.admin ? { ok: true } : { ok: false, response: json({ error: 'unauthorized' }, { status: 401 }) } },
    '@/lib/auth/user': { getCurrentUser: async () => auth.user },
    '@/lib/chain/config': { getChainConfig: () => { calls.config++; return { chainId: 8453, blockExplorerUrl: 'https://explorer.test' }; } },
    '@/lib/raffle/entry-store': { ACTIVE_ENTRY_STATES: ['PREPARING', 'PENDING'] },
    '@/lib/raffle/entry-recovery': {
      reconcileEntryOperation: async id => {
        calls.recovered.push(id);
        const state = outcomes.get(id) ?? 'pending';
        if (state === 'throw') throw Error('RPC unavailable');
        if (state !== 'pending') rows.find(row => row.id === id).state = state === 'confirmed' ? 'CONFIRMED' : 'FAILED';
        return { id, state };
      },
      entryOperationResponse: value => ({ state: value.state }),
    },
  }, {
    fetch: async (url, init) => {
      assert.equal(url, '/api/admin/raffle/entries');
      const request = new Request(`https://kaffle.test${url}`, init);
      return load('app/api/admin/raffle/entries/route.ts').POST(request);
    },
  });
  return { load, calls, auth, outcomes, rows };
}
const request = body => new Request('https://kaffle.test', { method: 'POST', body: JSON.stringify(body) });

for (const path of ['app/api/admin/raffle/entries/route.ts', 'app/api/raffle/entries/route.ts']) {
  test(`${path}: unauthenticated GET and POST cannot read or recover entries`, async () => {
    const h = fixture([operation(1)]);
    h.auth.admin = false; h.auth.user = null;
    const route = h.load(path);
    assert.equal((await route.GET()).status, 401);
    assert.equal((await route.POST(request({}))).status, 401);
    assert.equal(h.calls.config, 0); assert.equal(h.calls.queries.length, 0); assert.equal(h.calls.recovered.length, 0);
  });
}

test('a signed-in non-admin cannot invoke the admin batch endpoint', async () => {
  const h = fixture([operation(1)]); h.auth.admin = false;
  assert.equal((await h.load('app/api/admin/raffle/entries/route.ts').POST(request({}))).status, 401);
  assert.equal(h.calls.recovered.length, 0);
});

test('user list includes prior rounds but excludes other users and chains', async () => {
  const oldRound = operation(1, { raffleAddress: '0x' + '2'.repeat(40) });
  const h = fixture([oldRound, operation(2), operation(3, { userId: 'user-1', chainId: 1 })]);
  const result = await h.load('app/api/raffle/entries/route.ts').GET();
  const body = await result.json();
  assert.equal(body.total, 1); assert.equal(body.entries[0].operationId, oldRound.id);
  assert.equal(h.calls.queries[0].where.raffleAddress, undefined);
  assert.equal(h.calls.queries[0].where.userId, 'user-1');
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('admin preview covers the configured chain, returns total count, and exposes no signed bytes or leases', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => operation(i + 1));
  const h = fixture([...rows, operation(20, { chainId: 1 })]);
  const response = await h.load('app/api/admin/raffle/entries/route.ts').GET();
  const body = await response.json();
  assert.equal(body.total, 12); assert.equal(body.entries.length, 10);
  assert.equal(body.entries[0].roundNumber, 2);
  assert.equal(JSON.stringify(body).includes('must-stay-private'), false);
  assert.equal(JSON.stringify(body).includes('private-token'), false);
  assert.equal(h.calls.queries[0].select.rawTransaction, undefined);
  assert.equal(h.calls.queries[0].select.leaseOwner, undefined);
});

test('user-supplied scope and force-refund fields cannot affect another user', async () => {
  const h = fixture([operation(1), operation(2)]);
  const response = await h.load('app/api/raffle/entries/route.ts').POST(request({ userId: 'user-2', chainId: 1, forceRefund: true }));
  assert.equal(response.status, 200);
  assert.deepEqual(h.calls.recovered, ['operation-001']);
  assert.equal((await response.json()).results[0].state, 'pending');
  assert.equal(h.rows[0].state, 'PENDING');
});

test('batch requests are capped at five and preserve cutoff plus stable cursor order', async () => {
  const h = fixture(Array.from({ length: 7 }, (_, i) => operation(i + 1)));
  const service = h.load('lib/raffle/entry-management.ts');
  const first = await service.recoverEntryBatch({ chainId: 8453 });
  assert.equal(first.results.length, 5); assert.equal(h.calls.queries[0].take, 6);
  const cursor = JSON.parse(Buffer.from(first.nextCursor, 'base64url').toString());
  assert.equal(cursor.id, 'operation-005');
  const second = await service.recoverEntryBatch({ chainId: 8453 }, first.nextCursor);
  assert.equal(second.results.length, 2); assert.equal(second.nextCursor, null);
  assert.equal(h.calls.queries[1].where.createdAt.lte.toISOString(), cursor.cutoff);
  assert.deepEqual(h.calls.recovered, Array.from({ length: 7 }, (_, i) => operation(i + 1).id));
});

test('one admin click checks every pending entry once and stops even when all stay pending', async () => {
  const h = fixture(Array.from({ length: 12 }, (_, i) => operation(i + 1)));
  const progress = [];
  const result = await h.load('lib/raffle/entry-recovery-client.ts').runEntryRecovery('/api/admin/raffle/entries', value => progress.push(value));
  assert.equal(result.checked, 12); assert.equal(result.pending, 12); assert.equal(result.refunded, 0);
  assert.equal(new Set(h.calls.recovered).size, 12); assert.equal(h.calls.recovered.length, 12);
  assert.equal(progress.length, 3); assert.equal(h.calls.queries.length, 3);
});

test('entries created after the first batch cutoff wait for the next manual run', async () => {
  const h = fixture(Array.from({ length: 6 }, (_, i) => operation(i + 1)));
  const service = h.load('lib/raffle/entry-management.ts');
  const first = await service.recoverEntryBatch({ chainId: 8453 });
  h.rows.push(operation(7, { createdAt: new Date(Date.now() + 60_000) }));
  const second = await service.recoverEntryBatch({ chainId: 8453 }, first.nextCursor);
  assert.equal(second.results.length, 1); assert.equal(second.nextCursor, null);
  assert.equal(h.calls.recovered.includes('operation-007'), false);
});

test('a per-entry RPC error does not stop other entries or force any pending result', async () => {
  const h = fixture([operation(1), operation(2), operation(3)]);
  h.outcomes.set('operation-001', 'confirmed'); h.outcomes.set('operation-002', 'failed'); h.outcomes.set('operation-003', 'throw');
  const result = await h.load('lib/raffle/entry-management.ts').recoverEntryBatch({ chainId: 8453 });
  assert.deepEqual(plain(result.results.map(row => row.state)), ['confirmed', 'failed', 'unavailable']);
  assert.equal(h.rows[2].state, 'PENDING');
});

test('an empty batch is a no-op', async () => {
  const h = fixture();
  const result = await h.load('lib/raffle/entry-management.ts').recoverEntryBatch({ chainId: 8453 });
  assert.equal(result.results.length, 0); assert.equal(result.nextCursor, null); assert.equal(h.calls.recovered.length, 0);
});

for (const path of ['app/api/admin/raffle/entries/route.ts', 'app/api/raffle/entries/route.ts']) {
  test(`${path}: malformed body and cursor return 400 without recovery`, async () => {
    const h = fixture([operation(1)]); const route = h.load(path);
    for (const body of [null, [], { cursor: {} }, { cursor: 'invalid' }, { cursor: 'x'.repeat(1025) }]) {
      assert.equal((await route.POST(request(body))).status, 400);
    }
    assert.equal(h.calls.recovered.length, 0);
  });
}

test('client reports confirmations, refunds, pending outcomes and lookup errors separately', async () => {
  const h = fixture([operation(1), operation(2), operation(3), operation(4)]);
  h.outcomes.set('operation-001', 'confirmed'); h.outcomes.set('operation-002', 'failed'); h.outcomes.set('operation-004', 'throw');
  const result = await h.load('lib/raffle/entry-recovery-client.ts').runEntryRecovery('/api/admin/raffle/entries', () => {});
  assert.deepEqual(plain(result), { checked: 4, confirmed: 1, refunded: 1, pending: 1, unavailable: 1 });
});

test('a later HTTP error preserves completed progress and stops the run', async () => {
  let calls = 0; const progress = [];
  const load = createLoader({}, { fetch: async () => {
    if (++calls === 1) return json({ results: [{ operationId: 'one', state: 'confirmed' }], nextCursor: 'next' });
    return json({ error: 'offline' }, { status: 503 });
  } });
  await assert.rejects(() => load('lib/raffle/entry-recovery-client.ts').runEntryRecovery('/endpoint', value => progress.push(value)), /처리된 결과는 저장/);
  assert.equal(calls, 2); assert.equal(progress.at(-1).confirmed, 1);
});

test('a repeated cursor cannot create an endless client loop', async () => {
  let calls = 0;
  const load = createLoader({}, { fetch: async () => { calls++; return json({ results: [], nextCursor: 'same' }); } });
  await assert.rejects(() => load('lib/raffle/entry-recovery-client.ts').runEntryRecovery('/endpoint', () => {}), /중단/);
  assert.equal(calls, 2);
});
