import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

const { compare } = bcrypt;
import { bootstrapAdmin } from '../server/bootstrap-admin.js';

const environment = {
  DATABASE_URL: 'postgresql://bootstrap:password@db.example.test:5432/enterpriseos?sslmode=require',
  BOOTSTRAP_ADMIN_CONFIRM: 'CREATE_PRODUCTION_ADMIN',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@example.test',
  BOOTSTRAP_ADMIN_FIRST_NAME: 'Production',
  BOOTSTRAP_ADMIN_LAST_NAME: 'Admin'
};

function fakePool(respond) {
  const calls = [];
  const client = {
    query: async (text, params = []) => {
      calls.push({ text, params });
      return respond(text, params);
    },
    release: () => { client.released = true; }
  };
  const pool = {
    connect: async () => client,
    end: async () => { pool.ended = true; }
  };
  return { pool, client, calls };
}

test('creates a forced-password-change production administrator and prints the credential once', async () => {
  const fixture = fakePool(async text => {
    if (text === 'SELECT id FROM organizations ORDER BY created_at') return { rowCount: 1, rows: [{ id: 'organization-1' }] };
    if (text.includes("role IN ('ADMIN','SUPER_ADMIN')")) return { rowCount: 0, rows: [] };
    if (text.startsWith('INSERT INTO users')) return { rowCount: 1, rows: [{ id: 'admin-1' }] };
    return { rowCount: 0, rows: [] };
  });
  const logs = [];

  const result = await bootstrapAdmin({ env: environment, createPool: () => fixture.pool, logger: { log: message => logs.push(message) } });
  const insert = fixture.calls.find(call => call.text.startsWith('INSERT INTO users'));
  const initialPassword = logs[0].match(/: (.+)$/)[1];

  assert.deepEqual(result, { id: 'admin-1', organizationId: 'organization-1' });
  assert.equal(logs.length, 1);
  assert.ok(initialPassword.length >= 32);
  assert.equal(await compare(initialPassword, insert.params[4]), true);
  assert.match(insert.text, /must_change_password\) VALUES/);
  assert.ok(fixture.calls.some(call => call.text === 'BEGIN'));

assert.ok(
  fixture.calls.some(call =>
    call.text.includes('pg_advisory_xact_lock')
  )
);

assert.ok(fixture.calls.some(call => call.text === 'COMMIT'));
  assert.equal(fixture.client.released, true);
  assert.equal(fixture.pool.ended, true);
});

test('refuses bootstrap when an administrator already exists', async () => {
  const fixture = fakePool(async text => {
    if (text === 'SELECT id FROM organizations ORDER BY created_at') return { rowCount: 1, rows: [{ id: 'organization-1' }] };
    if (text.includes("role IN ('ADMIN','SUPER_ADMIN')")) return { rowCount: 1, rows: [{ id: 'existing-admin' }] };
    return { rowCount: 0, rows: [] };
  });

  await assert.rejects(
    bootstrapAdmin({ env: environment, createPool: () => fixture.pool, logger: { log: () => assert.fail('Credential must not be printed') } }),
    /administrator already exists/
  );
  assert.ok(fixture.calls.some(call => call.text === 'ROLLBACK'));
  assert.equal(fixture.client.released, true);
  assert.equal(fixture.pool.ended, true);
});

test('requires explicit PostgreSQL and administrator configuration before connecting', async () => {
  let poolCreated = false;

  await assert.rejects(
    bootstrapAdmin({ env: { ...environment, DATABASE_URL: '', BOOTSTRAP_ADMIN_CONFIRM: '' }, createPool: () => { poolCreated = true; } }),
    /DATABASE_URL is required/
  );
  assert.equal(poolCreated, false);
});
