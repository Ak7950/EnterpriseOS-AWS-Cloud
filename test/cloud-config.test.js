import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import http from 'node:http';

// Each scenario runs in a fresh Node process because db.js reads its
// configuration at import time.
function importDb(env) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "const m = await import('./server/db.js'); console.log(m.databaseMode, m.ephemeralDemo); await m.pool.end();"], {
    env: { PATH: process.env.PATH, JWT_SECRET: 'test-only-secret-with-at-least-32-characters', ...env },
    encoding: 'utf8'
  });
}

test('production still refuses the in-memory database unless the demo flag is explicit', () => {
  const refused = importDb({ NODE_ENV: 'production', DATABASE_URL: '' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /DATABASE_URL is required in production/);

  const wrongValue = importDb({ NODE_ENV: 'production', DATABASE_URL: '', DEMO_EPHEMERAL_DATABASE: 'yes' });
  assert.notEqual(wrongValue.status, 0);

  const demo = importDb({ NODE_ENV: 'production', DATABASE_URL: '', DEMO_EPHEMERAL_DATABASE: 'true' });
  assert.equal(demo.status, 0, demo.stderr);
  assert.match(demo.stdout, /ephemeral-in-memory true/);
});

test('a configured DATABASE_URL always wins over the demo flag', () => {
  const result = importDb({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pw@db.example.test:5432/x', DEMO_EPHEMERAL_DATABASE: 'true' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /postgresql false/);
});

test('local health endpoint is public, reports status, and returns a request id', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  const { default: app } = await import('../server/index.js');
  const { pool } = await import('../server/db.js');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/health`, { headers: { 'x-request-id': 'trace-123' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'trace-123');
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['database', 'databaseMode', 'status', 'version']);
    assert.equal(body.status, 'ok');
    const unsafe = await fetch(`http://127.0.0.1:${server.address().port}/health`, { headers: { 'x-request-id': 'bad id with spaces' } });
    assert.notEqual(unsafe.headers.get('x-request-id'), 'bad id with spaces');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});

test('demo seed IDs are deterministic, valid v4-format UUIDs (consistent across Lambda containers)', async () => {
  const { demoId } = await import('../server/seed.js');
  assert.equal(demoId('user:admin@demo.com'), demoId('user:admin@demo.com'));
  assert.notEqual(demoId('user:admin@demo.com'), demoId('user:manager@demo.com'));
  assert.match(demoId('x'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
