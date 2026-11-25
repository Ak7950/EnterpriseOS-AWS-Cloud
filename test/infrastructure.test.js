import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

// Static security and cost guard-rails for the CloudFormation/SAM template.
// CloudFormation short-form tags (!Ref, !Sub, ...) are parsed into objects.
const tagNames = ['Ref', 'Sub', 'GetAtt', 'If', 'Equals', 'Not', 'And', 'Or', 'Condition', 'Select', 'Split', 'Join'];
const customTags = tagNames.flatMap(name => ['scalar', 'seq', 'map'].map(kind => ({
  tag: `!${name}`, collection: kind === 'scalar' ? undefined : kind,
  resolve: value => ({ [`Fn::${name}`]: value?.toJSON ? value.toJSON() : value })
})));
const template = parse(readFileSync(new URL('../infrastructure/template.yaml', import.meta.url), 'utf8'), { customTags });
const resources = Object.entries(template.Resources);
const ofType = type => resources.filter(([, r]) => r.Type === type);

test('template avoids paid always-on infrastructure', () => {
  const forbidden = [
    'AWS::EC2::NatGateway', 'AWS::EC2::Instance', 'AWS::EC2::EIP', 'AWS::EC2::VPC',
    'AWS::ElasticLoadBalancingV2::LoadBalancer', 'AWS::ElasticLoadBalancing::LoadBalancer',
    'AWS::RDS::DBInstance', 'AWS::RDS::DBCluster', 'AWS::Route53::HostedZone',
    'AWS::SecretsManager::Secret', 'AWS::EC2::VPCEndpoint', 'AWS::Lambda::EventInvokeConfig',
    'AWS::ElastiCache::CacheCluster', 'AWS::KMS::Key'
  ];
  for (const [name, resource] of resources) assert.ok(!forbidden.includes(resource.Type), `${name} uses ${resource.Type}`);
});

test('no IAM Allow statement grants wildcard actions or wildcard resources', () => {
  for (const [name, role] of ofType('AWS::IAM::Role')) {
    assert.equal(role.Condition, 'CreateRoles', `${name} must only be created outside AWS Academy`);
    assert.equal(role.Properties.ManagedPolicyArns, undefined, `${name} should use scoped inline policies`);
    for (const policy of role.Properties.Policies) {
      for (const statement of policy.PolicyDocument.Statement) {
        const actions = [].concat(statement.Action);
        assert.ok(actions.every(a => !a.includes('*')), `${name}/${statement.Sid} has a wildcard action`);
        assert.notEqual(statement.Resource, '*', `${name}/${statement.Sid} has a wildcard resource`);
      }
    }
  }
});

test('secrets are never placed in Lambda environment variables', () => {
  for (const [name, fn] of ofType('AWS::Serverless::Function')) {
    const variables = Object.keys(fn.Properties.Environment?.Variables ?? {});
    for (const secret of ['JWT_SECRET', 'DATABASE_URL', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'PASSWORD']) {
      assert.ok(!variables.includes(secret), `${name} exposes ${secret} as an environment variable`);
    }
  }
  const api = template.Resources.ApiFunction.Properties.Environment.Variables;
  assert.ok(api.SSM_PARAMETER_PATH, 'API reads secrets from Parameter Store');
});

test('every log group has a short retention period', () => {
  const groups = ofType('AWS::Logs::LogGroup');
  assert.ok(groups.length >= 2);
  for (const [name, group] of groups) assert.ok(group.Properties.RetentionInDays, `${name} has no retention`);
  for (const allowed of template.Parameters.LogRetentionDays.AllowedValues) assert.ok(allowed <= 14);
});

test('queues are encrypted, TLS-only and have a dead-letter queue', () => {
  for (const [name, queue] of ofType('AWS::SQS::Queue')) assert.equal(queue.Properties.SqsManagedSseEnabled, true, `${name} not encrypted`);
  assert.equal(template.Resources.EventQueue.Properties.RedrivePolicy.maxReceiveCount, 3);
  const deny = template.Resources.EventQueuePolicy.Properties.PolicyDocument.Statement[0];
  assert.equal(deny.Effect, 'Deny');
  assert.equal(deny.Condition.Bool['aws:SecureTransport'], 'false');
});

test('public entry point is throttled and the worker reports partial batch failures', () => {
  const stage = template.Resources.HttpApiStage.Properties;
  assert.ok(stage.DefaultRouteSettings.ThrottlingRateLimit);
  assert.ok(stage.DefaultRouteSettings.ThrottlingBurstLimit);
  assert.ok(template.Parameters.ApiThrottleRateLimit.MaxValue <= 100);
  const sqs = template.Resources.WorkerFunction.Properties.Events.DomainEvents.Properties;
  assert.deepEqual(sqs.FunctionResponseTypes, ['ReportBatchItemFailures']);
});

test('optional billed features are off by default and Academy-compatible defaults are set', () => {
  assert.equal(template.Parameters.EnableDashboard.Default, 'false');
  assert.equal(template.Parameters.DatabaseMode.Default, 'ephemeral-demo');
  assert.equal(template.Parameters.LambdaRoleArn.Default, '');
  assert.ok(['nodejs24.x', 'nodejs22.x'].includes(template.Parameters.Runtime.Default));
});

test('GitHub workflows never deploy automatically and hold no inline credentials', () => {
  const dir = new URL('../.github/workflows/', import.meta.url);
  for (const file of readdirSync(dir)) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    assert.doesNotMatch(text, /AKIA[0-9A-Z]{16}/, `${file} contains an access key`);
    const workflow = parse(text);
    const triggers = workflow.on ?? workflow[true];
    if (/deploy|cleanup/i.test(file)) {
      assert.deepEqual(Object.keys(triggers), ['workflow_dispatch'], 'deployment must be manual only');
    }
    assert.ok(workflow.permissions, `${file} must declare least-privilege permissions`);
  }
});
