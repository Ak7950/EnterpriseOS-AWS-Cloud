import test from 'node:test';
import assert from 'node:assert/strict';

// End-to-end: API Gateway HTTP API / Function URL (payload v2.0) events are run
// through the real Lambda handler and the unchanged Express application, in the
// same configuration the AWS demo stack uses (production + ephemeral demo DB).
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = '';
process.env.DEMO_EPHEMERAL_DATABASE = 'true';
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.CORS_ORIGIN = '';
process.env.CORS_INCLUDE_API_ORIGIN = 'true';
process.env.EVENT_TRANSPORT = 'memory';
delete process.env.SSM_PARAMETER_PATH;

const DOMAIN = 'abc123.execute-api.us-east-1.amazonaws.com';
const ORIGIN = `https://${DOMAIN}`;
const { handler, appendOrigin } = await import('../aws/lambda/api-handler.js');
const { getMemoryEvents } = await import('../server/events.js');

function event({ method = 'GET', path = '/', query = '', headers = {}, body, sourceIp = '198.51.100.10' } = {}) {
  return {
    version: '2.0',
    rawPath: path,
    rawQueryString: query,
    headers: { host: DOMAIN, ...headers },
    requestContext: { domainName: DOMAIN, requestId: 'req-test-1', http: { method, path, sourceIp } },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false
  };
}

async function login(email, password, sourceIp) {
  return handler(event({ method: 'POST', path: '/api/auth/login', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: { email, password }, sourceIp }));
}

test('health check reports the ephemeral demo database and sends no-store', async () => {
  const response = await handler(event({ path: '/health' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).databaseMode, 'ephemeral-in-memory');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.ok(response.headers['x-request-id']);
});

test('serves the static frontend with security headers through the bridge', async () => {
  const response = await handler(event({ path: '/' }));
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.body, /<html/i);
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.match(response.headers['strict-transport-security'], /max-age=/);
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('same-origin login works and the token authorises API calls', async () => {
  const response = await login('admin@demo.com', 'Demo@12345', '198.51.100.20');
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], ORIGIN);
  const { token } = JSON.parse(response.body).data;
  const me = await handler(event({ path: '/api/me', headers: { authorization: `Bearer ${token}` } }));
  assert.equal(me.statusCode, 200);
  assert.equal(JSON.parse(me.body).data.email, 'admin@demo.com');
});

test('cross-origin requests from unknown origins are rejected', async () => {
  const response = await handler(event({ method: 'POST', path: '/api/auth/login', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: { email: 'a', password: 'b' } }));
  assert.equal(response.statusCode, 500);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('API routes still require authentication', async () => {
  const response = await handler(event({ path: '/api/dashboard' }));
  assert.equal(response.statusCode, 401);
});

test('login rate limiting is per client IP and cannot be bypassed with X-Forwarded-For', async () => {
  for (let i = 0; i < 5; i += 1) {
    const response = await handler(event({ method: 'POST', path: '/api/auth/login', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` }, body: { email: 'admin@demo.com', password: 'wrong-password' }, sourceIp: '203.0.113.5' }));
    assert.equal(response.statusCode, 401);
  }
  const blocked = await login('admin@demo.com', 'Demo@12345', '203.0.113.5');
  assert.equal(blocked.statusCode, 429);
  const otherClient = await login('admin@demo.com', 'Demo@12345', '203.0.113.99');
  assert.equal(otherClient.statusCode, 200);
});

test('a manager decision publishes a LEAVE_DECIDED domain event', async () => {
  const manager = JSON.parse((await login('manager@demo.com', 'Demo@12345', '198.51.100.30')).body).data.token;
  const leaves = JSON.parse((await handler(event({ path: '/api/leaves', headers: { authorization: `Bearer ${manager}` } }))).body).data;
  const pending = leaves.find(leave => leave.status === 'PENDING');
  assert.ok(pending, 'seed data contains a pending leave request');
  const decision = await handler(event({ method: 'PUT', path: `/api/leaves/${pending.id}/decision`, headers: { authorization: `Bearer ${manager}`, 'content-type': 'application/json', origin: ORIGIN }, body: { status: 'APPROVED' } }));
  assert.equal(decision.statusCode, 200);
  const published = getMemoryEvents().filter(e => e.type === 'LEAVE_DECIDED');
  assert.equal(published.length, 1);
  assert.equal(published[0].data.leaveRequestId, pending.id);
  assert.equal(published[0].data.status, 'APPROVED');
});

test('a manager can move a task in their own project (pre-existing pg-mem defect regression)', async () => {
  const manager = JSON.parse((await login('manager@demo.com', 'Demo@12345', '198.51.100.31')).body).data.token;
  const tasks = JSON.parse((await handler(event({ path: '/api/tasks', headers: { authorization: `Bearer ${manager}` } }))).body).data;
  assert.ok(tasks.length > 0);
  const response = await handler(event({ method: 'PUT', path: `/api/tasks/${tasks[0].id}/status`, headers: { authorization: `Bearer ${manager}`, 'content-type': 'application/json', origin: ORIGIN }, body: { status: 'TESTING' } }));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).data.status, 'TESTING');
});

test('a manager cannot decide leave for an employee outside their team', async () => {
  const marketing = JSON.parse((await login('marketing.manager@demo.com', 'Demo@12345', '198.51.100.32')).body).data.token;
  const admin = JSON.parse((await login('admin@demo.com', 'Demo@12345', '198.51.100.33')).body).data.token;
  const create = await handler(event({ method: 'POST', path: '/api/leaves', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json', origin: ORIGIN }, body: { leaveType: 'Annual Leave', startDate: '2031-01-05', endDate: '2031-01-06', reason: 'Test' } }));
  assert.equal(create.statusCode, 201);
  const leaveId = JSON.parse(create.body).data.id;
  const denied = await handler(event({ method: 'PUT', path: `/api/leaves/${leaveId}/decision`, headers: { authorization: `Bearer ${marketing}`, 'content-type': 'application/json', origin: ORIGIN }, body: { status: 'APPROVED' } }));
  assert.equal(denied.statusCode, 404);
});

test('invalid bearer tokens are rejected through the bridge', async () => {
  const response = await handler(event({ path: '/api/does-not-exist', headers: { authorization: 'Bearer x' } }));
  assert.equal(response.statusCode, 401);
});

test('appendOrigin de-duplicates and preserves configured origins', () => {
  assert.equal(appendOrigin('', ORIGIN), ORIGIN);
  assert.equal(appendOrigin(`https://a.test, ${ORIGIN}`, ORIGIN), `https://a.test,${ORIGIN}`);
});
