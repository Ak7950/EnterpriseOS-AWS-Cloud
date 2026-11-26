import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Runs scripts/aws/preflight.sh against a fake `aws` CLI that reports a chosen
// caller identity, to prove the account check fails closed (personal-spend guard).
function preflightAs(arn, extraEnv = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'eos-fakeaws-'));
  try {
    writeFileSync(path.join(dir, 'aws'), `#!/usr/bin/env bash
case "$*" in
  *"sts get-caller-identity --query Arn"*) echo "${arn}" ;;
  *"sts get-caller-identity --query Account"*) echo "123456789012" ;;
  *"cloudformation describe-stacks"*) exit 254 ;;
  *) exit 0 ;;
esac
`);
    writeFileSync(path.join(dir, 'sam'), '#!/usr/bin/env bash\necho "SAM CLI, version 1.166.2"\n');
    chmodSync(path.join(dir, 'aws'), 0o755);
    chmodSync(path.join(dir, 'sam'), 0o755);
    const result = spawnSync('bash', ['scripts/aws/preflight.sh'], {
      encoding: 'utf8',
      env: { PATH: `${dir}:${process.env.PATH}`, AWS_REGION: 'us-east-1', CONFIRM_COST_CHECKLIST: 'yes', ...extraEnv }
    });
    const plain = text => (text || '').replace(/\x1b\[[0-9;]*m/g, '');
    return { status: result.status, stdout: plain(result.stdout), stderr: plain(result.stderr) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('preflight passes for the AWS Academy lab role', () => {
  const result = preflightAs('arn:aws:sts::123456789012:assumed-role/voclabs/user123=student@example.edu');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS Caller is an AWS Academy lab role/);
});

test('preflight refuses a personal IAM user or unknown role unless explicitly allowed', () => {
  for (const arn of ['arn:aws:iam::123456789012:user/alice', 'arn:aws:sts::123456789012:assumed-role/Admin/session', 'arn:aws:iam::123456789012:root']) {
    const refused = preflightAs(arn);
    assert.notEqual(refused.status, 0, `${arn} must be refused`);
    assert.match(refused.stdout, /FAIL Caller is not an AWS Academy lab role/);
  }
  const allowed = preflightAs('arn:aws:iam::123456789012:root', { ALLOW_NON_ACADEMY_ACCOUNT: 'yes' });
  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  assert.match(allowed.stdout, /continuing only because ALLOW_NON_ACADEMY_ACCOUNT=yes/);
});
