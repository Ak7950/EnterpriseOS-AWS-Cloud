import http from 'node:http';

// Dependency-free bridge between AWS Lambda HTTP events and the unchanged
// Express application.
//
// Supported event format: payload format version 2.0, which is used by both
// Amazon API Gateway HTTP APIs and Lambda Function URLs.
//
// The Express app is started once per execution environment on an ephemeral
// loopback port (127.0.0.1 only - never reachable from outside the sandbox).
// Each Lambda event is replayed as a real HTTP request against it. This keeps
// every middleware (CORS, security headers, JSON limits, routing, static
// files) working exactly as it does locally.

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer']);
const TEXT_TYPES = /^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded)|image\/svg\+xml)/i;

export function startLoopbackServer(app) {
  // Trust exactly one proxy hop on loopback: the bridge itself. req.ip then
  // becomes the client IP that API Gateway/Lambda reported (see below), so the
  // existing login rate limiter works per client instead of per container.
  app.set('trust proxy', 'loopback');
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.keepAliveTimeout = 60_000;
    server.once('error', reject);
    // unref(): the Lambda runtime keeps the process alive; tests can exit cleanly.
    server.listen(0, '127.0.0.1', () => { server.unref(); resolve(server); });
  });
}

export function toRequestOptions(event, port) {
  const ctx = event.requestContext ?? {};
  const method = ctx.http?.method ?? event.httpMethod ?? 'GET';
  const rawPath = event.rawPath ?? event.path ?? '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const headers = {};
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    const key = name.toLowerCase();
    if (!HOP_BY_HOP.has(key) && value !== undefined) headers[key] = value;
  }
  if (Array.isArray(event.cookies) && event.cookies.length) headers.cookie = event.cookies.join('; ');

  // Overwrite (never append to) any client-supplied X-Forwarded-For so that a
  // caller cannot spoof their IP to evade rate limiting. sourceIp is set by AWS.
  const sourceIp = ctx.http?.sourceIp;
  if (sourceIp) headers['x-forwarded-for'] = sourceIp;
  else delete headers['x-forwarded-for'];
  headers['x-forwarded-proto'] = 'https';
  if (ctx.requestId && !headers['x-request-id']) headers['x-request-id'] = ctx.requestId;

  const body = event.body == null ? null : Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  if (body) headers['content-length'] = String(body.length);
  else delete headers['content-length'];

  return { options: { host: '127.0.0.1', port, method, path: `${rawPath}${query}`, headers }, body };
}

export function toLambdaResponse(statusCode, rawHeaders, bodyBuffer) {
  const headers = {};
  const cookies = [];
  for (const [name, value] of Object.entries(rawHeaders)) {
    const key = name.toLowerCase();
    if (HOP_BY_HOP.has(key) || value === undefined) continue;
    if (key === 'set-cookie') { cookies.push(...[].concat(value)); continue; }
    headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  const isText = !headers['content-type'] || TEXT_TYPES.test(headers['content-type']);
  const response = {
    statusCode,
    headers,
    body: isText ? bodyBuffer.toString('utf8') : bodyBuffer.toString('base64'),
    isBase64Encoded: !isText
  };
  if (cookies.length) response.cookies = cookies;
  return response;
}

export function forward(event, port) {
  const { options, body } = toRequestOptions(event, port);
  return new Promise((resolve, reject) => {
    const request = http.request(options, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(toLambdaResponse(response.statusCode, response.headers, Buffer.concat(chunks))));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(25_000, () => request.destroy(new Error('Upstream application timed out')));
    if (body) request.write(body);
    request.end();
  });
}
