import crypto from 'node:crypto';

// Structured JSON logging. CloudWatch Logs Insights can query these fields
// directly (e.g. `fields status, durationMs | filter status >= 500`).
// Never pass secrets, tokens, passwords or request bodies to these functions.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold() {
  return LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;
}

export function log(level, message, fields = {}, sink = console) {
  if ((LEVELS[level] ?? LEVELS.info) < threshold()) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: process.env.SERVICE_NAME || 'enterpriseos',
    ...fields
  };
  const line = JSON.stringify(entry);
  if (level === 'error') sink.error(line);
  else if (level === 'warn') sink.warn(line);
  else sink.log(line);
}

export const logger = {
  debug: (message, fields) => log('debug', message, fields),
  info: (message, fields) => log('info', message, fields),
  warn: (message, fields) => log('warn', message, fields),
  error: (message, fields) => log('error', message, fields)
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:\-=]{1,128}$/;

// Adds an X-Request-Id to every response and, when enabled, writes one
// structured access-log line per request. The query string is deliberately
// omitted because it may contain search terms (personal data).
export function requestLogger({ enabled = process.env.REQUEST_LOGGING === 'true' } = {}) {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
    req.requestId = requestId;
    res.set('X-Request-Id', requestId);
    if (!enabled) return next();
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      log(res.statusCode >= 500 ? 'error' : 'info', 'http_request', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        role: req.user?.role
      });
    });
    next();
  };
}

export function errorFields(error) {
  return { errorName: error?.name, errorCode: error?.code, errorMessage: error?.message };
}
