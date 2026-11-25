#!/usr/bin/env node
// Loads the BUILT package from dist/lambda (production dependencies only) and
// invokes its handlers exactly as Lambda would. Proves the artifact is
// self-contained before anything is uploaded. No AWS calls are made.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'dist', 'lambda');
if (!existsSync(pkg)) { console.error('Run `npm run package:lambda` first.'); process.exit(1); }

Object.assign(process.env, {
  NODE_ENV: 'production', DATABASE_URL: '', DEMO_EPHEMERAL_DATABASE: 'true',
  JWT_SECRET: 'smoke-test-only-secret-with-at-least-32-chars', CORS_INCLUDE_API_ORIGIN: 'true',
  EVENT_TRANSPORT: 'none', LOG_LEVEL: 'warn'
});
delete process.env.SSM_PARAMETER_PATH;

const { handler } = await import(pathToFileURL(path.join(pkg, 'aws/lambda/api-handler.js')));
const { handler: worker } = await import(pathToFileURL(path.join(pkg, 'aws/lambda/event-worker.js')));
const domain = 'smoke.execute-api.us-east-1.amazonaws.com';
const event = (method, rawPath, body) => ({
  version: '2.0', rawPath, rawQueryString: '', headers: { host: domain, 'content-type': 'application/json', origin: `https://${domain}` },
  requestContext: { domainName: domain, requestId: 'smoke', http: { method, sourceIp: '192.0.2.1' } },
  body: body && JSON.stringify(body), isBase64Encoded: false
});

const health = await handler(event('GET', '/health'));
assert.equal(health.statusCode, 200, health.body);
const page = await handler(event('GET', '/'));
assert.equal(page.statusCode, 200);
const login = await handler(event('POST', '/api/auth/login', { email: 'admin@demo.com', password: 'Demo@12345' }));
assert.equal(login.statusCode, 200, login.body);
const result = await worker({ Records: [{ messageId: 'smoke', body: '{}' }] });
assert.deepEqual(result.batchItemFailures, [{ itemIdentifier: 'smoke' }]);
console.log('Lambda package smoke test passed: /health 200, UI 200, login 200, worker contract OK');
