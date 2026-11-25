import test from 'node:test';
import assert from 'node:assert/strict';
import { toRequestOptions, toLambdaResponse } from '../aws/lambda/http-bridge.js';
import { loadParameters, normalisePath } from '../aws/lambda/config-loader.js';
import { createHandler, parseEvent } from '../aws/lambda/event-worker.js';
import { buildEvent, publishEvent, setEventTransport, resetEvents } from '../server/events.js';
import { log } from '../server/logger.js';

// ---------- HTTP bridge ----------
test('bridge maps a v2 event to a loopback request and overwrites X-Forwarded-For', () => {
  const { options, body } = toRequestOptions({
    rawPath: '/api/tasks', rawQueryString: 'a=1',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4', connection: 'keep-alive' },
    cookies: ['a=1', 'b=2'],
    requestContext: { requestId: 'r1', http: { method: 'POST', sourceIp: '198.51.100.1' } },
    body: Buffer.from('{"x":1}').toString('base64'), isBase64Encoded: true
  }, 9999);
  assert.equal(options.method, 'POST');
  assert.equal(options.path, '/api/tasks?a=1');
  assert.equal(options.host, '127.0.0.1');
  assert.equal(options.headers['x-forwarded-for'], '198.51.100.1');
  assert.equal(options.headers.cookie, 'a=1; b=2');
  assert.equal(options.headers.connection, undefined);
  assert.equal(options.headers['x-request-id'], 'r1');
  assert.equal(body.toString(), '{"x":1}');
  assert.equal(options.headers['content-length'], '7');
});

test('bridge drops a spoofed X-Forwarded-For when AWS supplies no source IP', () => {
  const { options } = toRequestOptions({ rawPath: '/', headers: { 'x-forwarded-for': '9.9.9.9' }, requestContext: { http: { method: 'GET' } } }, 1);
  assert.equal(options.headers['x-forwarded-for'], undefined);
});

test('bridge returns text as UTF-8, binary as base64 and cookies separately', () => {
  const text = toLambdaResponse(200, { 'content-type': 'application/json', 'set-cookie': ['s=1'] }, Buffer.from('{"ok":true}'));
  assert.equal(text.isBase64Encoded, false);
  assert.equal(text.body, '{"ok":true}');
  assert.deepEqual(text.cookies, ['s=1']);
  const binary = toLambdaResponse(200, { 'content-type': 'image/png' }, Buffer.from([0, 1, 2]));
  assert.equal(binary.isBase64Encoded, true);
  assert.equal(binary.body, 'AAEC');
});

// ---------- SSM Parameter Store loader ----------
test('parameter loader copies only allow-listed names and never overwrites env', async () => {
  const env = { SSM_PARAMETER_PATH: '/enterpriseos/dev', DATABASE_URL: 'already-set' };
  const calls = [];
  const pages = [
    { Parameters: [{ Name: '/enterpriseos/dev/JWT_SECRET', Value: 'x'.repeat(40) }, { Name: '/enterpriseos/dev/AWS_SECRET_ACCESS_KEY', Value: 'nope' }], NextToken: 't2' },
    { Parameters: [{ Name: '/enterpriseos/dev/DATABASE_URL', Value: 'from-ssm' }] }
  ];
  const result = await loadParameters({ env, getParametersByPath: async input => { calls.push(input); return pages[calls.length - 1]; } });
  assert.deepEqual(result.loaded, ['JWT_SECRET']);
  assert.equal(env.JWT_SECRET.length, 40);
  assert.equal(env.DATABASE_URL, 'already-set');
  assert.equal(env.AWS_SECRET_ACCESS_KEY, undefined);
  assert.equal(calls[0].WithDecryption, true);
  assert.equal(calls[0].Path, '/enterpriseos/dev/');
  assert.equal(calls[1].NextToken, 't2');
});

test('parameter loader is a no-op without SSM_PARAMETER_PATH and rejects bad paths', async () => {
  assert.deepEqual(await loadParameters({ env: {} }), { loaded: [], source: 'environment' });
  assert.throws(() => normalisePath('relative/path'));
  assert.throws(() => normalisePath('/bad path'));
});

// ---------- Event publisher ----------
test('publishEvent validates types and never throws when the transport fails', async () => {
  assert.throws(() => buildEvent('UNKNOWN', { organizationId: 'o' }));
  const sent = [];
  setEventTransport(async event => { sent.push(event); });
  const ok = await publishEvent('TASK_ASSIGNED', { organizationId: 'org', actorId: 'u', data: { taskId: 't' } });
  assert.equal(ok.published, true);
  assert.equal(sent[0].type, 'TASK_ASSIGNED');
  assert.equal(sent[0].version, 1);
  setEventTransport(async () => { throw new Error('queue unavailable'); });
  const original = console.error; console.error = () => {};
  try {
    const failed = await publishEvent('TASK_ASSIGNED', { organizationId: 'org', actorId: 'u' });
    assert.equal(failed.published, false);
  } finally { console.error = original; resetEvents(); }
});

test('publishEvent is disabled by default (local development unaffected)', async () => {
  const previous = process.env.EVENT_TRANSPORT;
  delete process.env.EVENT_TRANSPORT;
  try { assert.deepEqual(await publishEvent('LEAVE_DECIDED', { organizationId: 'o' }), { published: false }); }
  finally { if (previous !== undefined) process.env.EVENT_TRANSPORT = previous; }
});

test('sqs transport without a queue URL fails safely', async () => {
  process.env.EVENT_TRANSPORT = 'sqs';
  delete process.env.EVENT_QUEUE_URL;
  const original = console.error; console.error = () => {};
  try { assert.equal((await publishEvent('LEAVE_DECIDED', { organizationId: 'o' })).published, false); }
  finally { console.error = original; delete process.env.EVENT_TRANSPORT; resetEvents(); }
});

// ---------- SQS worker ----------
const quiet = fn => async (...args) => { const o = [console.log, console.error]; console.log = console.error = () => {}; try { return await fn(...args); } finally { [console.log, console.error] = o; } };

test('worker processes valid events, fans out to SNS and reports only failures', quiet(async () => {
  const good = buildEvent('LEAVE_DECIDED', { organizationId: 'org', actorId: 'u', data: { leaveRequestId: 'l1', status: 'APPROVED' } });
  const published = [];
  const handler = createHandler({ env: { NOTIFICATION_TOPIC_ARN: 'arn:aws:sns:us-east-1:000000000000:test' }, publisher: async m => { published.push(m); } });
  const result = await handler({ Records: [
    { messageId: 'm1', body: JSON.stringify(good), attributes: { ApproximateReceiveCount: '1' } },
    { messageId: 'm2', body: 'not json' },
    { messageId: 'm3', body: JSON.stringify({ ...good, type: 'DROP_TABLES' }) }
  ] });
  assert.deepEqual(result.batchItemFailures, [{ itemIdentifier: 'm2' }, { itemIdentifier: 'm3' }]);
  assert.equal(published.length, 1);
  assert.match(published[0].subject, /leave approved/);
  assert.doesNotMatch(published[0].message, /@/);
}));

test('worker retries a message when SNS publishing fails', quiet(async () => {
  const good = buildEvent('TASK_ASSIGNED', { organizationId: 'org', actorId: 'u', data: { taskId: 't1' } });
  const handler = createHandler({ env: { NOTIFICATION_TOPIC_ARN: 'arn:x' }, publisher: async () => { throw new Error('throttled'); } });
  const result = await handler({ Records: [{ messageId: 'm1', body: JSON.stringify(good) }] });
  assert.deepEqual(result.batchItemFailures, [{ itemIdentifier: 'm1' }]);
}));

test('parseEvent enforces the event contract', () => {
  assert.throws(() => parseEvent('{}'), /Unsupported event type/);
  assert.throws(() => parseEvent(JSON.stringify({ type: 'TASK_ASSIGNED', version: 2 })), /version/);
});

// ---------- Structured logger ----------
test('logger writes single-line JSON and respects LOG_LEVEL', () => {
  const lines = [];
  const sink = { log: l => lines.push(l), warn: l => lines.push(l), error: l => lines.push(l) };
  process.env.LOG_LEVEL = 'warn';
  try {
    log('info', 'hidden', {}, sink);
    log('error', 'shown', { requestId: 'r1' }, sink);
  } finally { delete process.env.LOG_LEVEL; }
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.message, 'shown');
  assert.equal(entry.level, 'error');
  assert.equal(entry.requestId, 'r1');
});
