import { loadParameters } from './config-loader.js';
import { startLoopbackServer, forward } from './http-bridge.js';
import { log } from '../../server/logger.js';

// AWS Lambda entry point for the EnterpriseOS web application (API + static UI).
//
// Cold start sequence:
//   1. Load secrets from SSM Parameter Store (before the app module is imported,
//      because the app validates JWT_SECRET/DATABASE_URL at import time).
//   2. Optionally allow the API's own HTTPS origin for CORS (same-origin POSTs
//      from the browser carry an Origin header). The domain comes from
//      requestContext.domainName, which is set by AWS, not by the client.
//   3. Import the unchanged Express app and, only in the explicit ephemeral
//      demo mode, create the schema and synthetic demo data in memory.
//   4. Start the loopback server that each event is forwarded to.

let ready = null;

export function appendOrigin(current, origin) {
  const list = (current || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!list.includes(origin)) list.push(origin);
  return list.join(',');
}

async function initialise(event, env = process.env) {
  const started = Date.now();
  const { loaded, source } = await loadParameters({ env });
  const domain = event?.requestContext?.domainName;
  if (env.CORS_INCLUDE_API_ORIGIN === 'true' && domain && /^[a-z0-9.-]+$/i.test(domain)) {
    env.CORS_ORIGIN = appendOrigin(env.CORS_ORIGIN, `https://${domain}`);
  }
  const { default: app, initializeLocalDevelopmentDatabase } = await import('../../server/index.js');
  const { databaseMode } = await import('../../server/db.js');
  await initializeLocalDevelopmentDatabase();
  const server = await startLoopbackServer(app);
  log('info', 'cold_start_complete', { configSource: source, parametersLoaded: loaded, databaseMode, initMs: Date.now() - started });
  return server.address().port;
}

export async function handler(event) {
  if (event?.source === 'enterpriseos.warmup') return { statusCode: 204, body: '' };
  ready ??= initialise(event).catch(error => { ready = null; throw error; });
  let port;
  try {
    port = await ready;
  } catch (error) {
    log('error', 'cold_start_failed', { errorName: error.name, errorMessage: error.message });
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ success: false, message: 'Service is starting or misconfigured', errorCode: 'SERVICE_UNAVAILABLE' })
    };
  }
  return forward(event, port);
}
