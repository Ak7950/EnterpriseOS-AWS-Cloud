import { EVENT_TYPES, EVENT_VERSION } from '../../server/events.js';
import { log } from '../../server/logger.js';

// Asynchronous consumer for EnterpriseOS domain events delivered by Amazon SQS.
//
// - Validates each message against the event contract.
// - Writes a structured CloudWatch log line (the audit trail of async work).
// - Optionally fans out a short, PII-free summary to an Amazon SNS topic
//   (NOTIFICATION_TOPIC_ARN), e.g. for e-mail subscribers.
// - Uses SQS partial batch responses: only failed messages are retried, and
//   after maxReceiveCount attempts they move to the dead-letter queue.

export function parseEvent(body) {
  let event;
  try { event = JSON.parse(body); } catch { throw new Error('Message body is not valid JSON'); }
  if (!event || typeof event !== 'object') throw new Error('Message body must be an object');
  if (!EVENT_TYPES.includes(event.type)) throw new Error(`Unsupported event type: ${event.type}`);
  if (event.version !== EVENT_VERSION) throw new Error(`Unsupported event version: ${event.version}`);
  if (typeof event.id !== 'string' || typeof event.organizationId !== 'string') throw new Error('Event id and organizationId are required');
  return event;
}

export function summarise(event) {
  if (event.type === 'LEAVE_DECIDED') {
    return { subject: `EnterpriseOS: leave ${String(event.data?.status).toLowerCase()}`, message: `Leave request ${event.data?.leaveRequestId} was ${String(event.data?.status).toLowerCase()}.` };
  }
  return { subject: 'EnterpriseOS: task assigned', message: `Task ${event.data?.taskId} (priority ${event.data?.priority ?? 'MEDIUM'}) was assigned.` };
}

let snsPublisher = null;
async function defaultPublisher(topicArn) {
  const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
  const client = new SNSClient({});
  return ({ subject, message, type }) => client.send(new PublishCommand({
    TopicArn: topicArn,
    Subject: subject.slice(0, 100),
    Message: message,
    MessageAttributes: { eventType: { DataType: 'String', StringValue: type } }
  }));
}

export function createHandler({ env = process.env, publisher } = {}) {
  return async function handler(event) {
    const batchItemFailures = [];
    const topicArn = env.NOTIFICATION_TOPIC_ARN;
    for (const record of event.Records ?? []) {
      try {
        const domainEvent = parseEvent(record.body);
        if (topicArn) {
          const publish = publisher ?? (snsPublisher ??= await defaultPublisher(topicArn));
          await publish({ ...summarise(domainEvent), type: domainEvent.type });
        }
        log('info', 'domain_event_processed', {
          eventId: domainEvent.id,
          eventType: domainEvent.type,
          organizationId: domainEvent.organizationId,
          receiveCount: Number(record.attributes?.ApproximateReceiveCount ?? 1),
          fannedOut: Boolean(topicArn)
        });
      } catch (error) {
        log('error', 'domain_event_failed', { messageId: record.messageId, errorMessage: error.message });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures };
  };
}

export const handler = createHandler();
