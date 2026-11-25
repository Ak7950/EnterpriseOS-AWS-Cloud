import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';

const [{ initializeLocalDevelopmentDatabase }, { q, pool }] = await Promise.all([
  import('../server/index.js'),
  import('../server/db.js')
]);

test('in-memory development startup initializes schema and demo data in the application process', async () => {
  await initializeLocalDevelopmentDatabase();
  await initializeLocalDevelopmentDatabase();

  const organizations = await q('SELECT count(*)::int count FROM organizations');
  const users = await q('SELECT count(*)::int count FROM users');

  assert.equal(organizations.rows[0].count, 1);
  assert.ok(users.rows[0].count > 0);
});

test.after(async () => {
  await pool.end();
});
