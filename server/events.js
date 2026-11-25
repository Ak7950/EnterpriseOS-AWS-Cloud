import crypto from 'node:crypto';
import { logger, errorFields } from './logger.js';

// Domain-event publisher.
//
// The existing synchronous behaviour (notification + audit rows written in
// PostgreSQL) is unchanged. In addition, selected business events are
// published to a transport so that slower side-effects (e-mail fan-out,
// analytics, integrations) can run asynchronously.
//
// EVENT_TRANSPORT:
//   none   (default) - events are dropped; local development is unaffected
//   memory           - events are kept in memory (tests, demos)
//   sqs              - events are sent to the Amazon SQS queue EVENT_QUEUE_URL
//
// Publishing never fails the user's request: errors are logged and swallowed.

export const EVENT_TYPES = Object.freeze(['LEAVE_DECIDED', 'TASK_ASSIGNED']);
export const EVENT_VERSION = 1;

const memoryEvents = [];
let transportOverride = null;
let sqsSender = null;

export function buildEvent(type, { organizationId, actorId, data = {} }) {
  if (!EVENT_TYPES.includes(type)) throw new Error(`Unknown event type: ${type}`);
  return {
    id: crypto.randomUUID(),
    type,
    version: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    organizationId,
    actorId,
    data
  };
}

async function createSqsSender(queueUrl) {
  // The AWS SDK v3 is pre-installed in the AWS Lambda Node.js runtime, so it is
  // loaded lazily and is not a dependency of local development.
  const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
  const client = new SQSClient({});
  return event => client.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(event),
    MessageAttributes: { eventType: { DataType: 'String', StringValue: event.type } }
  }));
}

async function resolveTransport() {
  if (transportOverride) return transportOverride;
  const mode = (process.env.EVENT_TRANSPORT || 'none').toLowerCase();
  if (mode === 'memory') return async event => { memoryEvents.push(event); };
  if (mode === 'sqs') {
    const queueUrl = process.env.EVENT_QUEUE_URL;
    if (!queueUrl) throw new Error('EVENT_QUEUE_URL is required when EVENT_TRANSPORT=sqs');
    sqsSender ??= await createSqsSender(queueUrl);
    return sqsSender;
  }
  return null;
}

export async function publishEvent(type, context) {
  try {
    const transport = await resolveTransport();
    if (!transport) return { published: false };
    const event = buildEvent(type, context);
    await transport(event);
    logger.debug('domain_event_published', { eventId: event.id, eventType: type });
    return { published: true, id: event.id };
  } catch (error) {
    logger.error('domain_event_publish_failed', { eventType: type, ...errorFields(error) });
    return { published: false, error: error.message };
  }
}

// Test helpers.
export function setEventTransport(transport) { transportOverride = transport; }
export function getMemoryEvents() { return [...memoryEvents]; }
export function resetEvents() { memoryEvents.length = 0; transportOverride = null; sqsSender = null; }
